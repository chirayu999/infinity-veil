# frozen_string_literal: true

module Api
  module V1
    class HuntsController < BaseController
      # GET /api/v1/hunts
      def index
        page  = page_param
        per   = per_page_param

        scope = HuntCycle.all
        scope = scope.where(status: params[:status])                          if params[:status].present?
        scope = scope.where(triggered_by: params[:triggered_by])              if params[:triggered_by].present?
        scope = scope.where("started_at >= ?", params[:date_from])            if params[:date_from].present?
        scope = scope.where("started_at <= ?", params[:date_to])              if params[:date_to].present?

        sort_col = %w[started_at threats_found_count].include?(params[:sort_by]) ? params[:sort_by] : "started_at"
        sort_dir = params[:sort_order] == "asc" ? "asc" : "desc"
        scope    = scope.order(Arel.sql("#{sort_col} #{sort_dir}"))

        total = scope.count
        hunts = scope.offset((page - 1) * per).limit(per)

        render json: {
          hunt_cycles: hunts.map { |h| hunt_summary_json(h) },
          meta: { current_page: page, per_page: per, total_count: total, total_pages: (total.to_f / per).ceil }
        }
      end

      # GET /api/v1/hunts/:id
      def show
        hunt    = HuntCycle.includes(:threats).find(params[:id])
        threats = hunt.threats.recent

        render json: {
          hunt: hunt_summary_json(hunt).merge(
            threats_found_count: threats.size,
            threats: threats.map do |t|
              {
                id:               t.id,
                title:            t.title,
                confidence_score: t.confidence_score,
                severity:         t.severity,
                status:           t.status,
                attack_phase:     t.attack_phase
              }
            end
          )
        }
      end

      # POST /api/v1/hunts — trigger a manual hunt
      def create
        custom_query = params[:query]

        # Create the HuntCycle record immediately so the frontend can track it
        hunt = HuntCycle.create!(
          status:       "queued",
          triggered_by: "manual",
          started_at:   Time.current
        )

        # Enqueue the actual hunt work, passing the existing record's ID so
        # retries update the same row rather than creating new HuntCycle records.
        HuntCycleJob.perform_async("manual", custom_query, hunt.id)

        render json: {
          hunt:    { id: hunt.id, status: hunt.status, triggered_by: hunt.triggered_by, created_at: hunt.created_at.iso8601 },
          message: "Hunt cycle queued. Results will appear on the dashboard."
        }, status: :created
      end

      private

      def hunt_summary_json(h)
        {
          id:                   h.id,
          status:               h.status,
          triggered_by:         h.triggered_by,
          threats_found_count:  h.threats_found_count,
          agent_summary:        h.agent_summary,
          started_at:           h.started_at&.iso8601,
          completed_at:         h.completed_at&.iso8601,
          created_at:           h.created_at.iso8601
        }
      end
    end
  end
end

