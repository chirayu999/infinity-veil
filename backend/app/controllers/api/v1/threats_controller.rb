# frozen_string_literal: true

module Api
  module V1
    class ThreatsController < BaseController
      # GET /api/v1/threats
      def index
        scope  = apply_filters(Threat.all)
        scope  = apply_sort(scope)
        page   = page_param
        per    = per_page_param

        threats  = scope.offset((page - 1) * per).limit(per)
        total    = scope.count

        render json: {
          threats: threats.map { |t| threat_summary_json(t) },
          meta:    { current_page: page, per_page: per, total_count: total, total_pages: (total.to_f / per).ceil }
        }
      end

      # GET /api/v1/threats/:id
      def show
        threat = Threat.includes(:threat_actions).find(params[:id])

        render json: {
          threat:  threat_detail_json(threat),
          actions: threat.threat_actions.recent.map { |a| action_json(a) }
        }
      end

      # PATCH /api/v1/threats/:id
      def update
        threat       = Threat.find(params[:id])
        new_status   = params.require(:threat).permit(:status)[:status]
        performed_by = params[:performed_by] || "analyst"
        notes        = params[:notes]

        threat.update!(status: new_status)

        threat.threat_actions.create!(
          action_type:  status_to_action_type(new_status),
          performed_by: performed_by,
          notes:        notes
        )

        render json: { threat: { id: threat.id, status: threat.read_attribute_before_type_cast(:status), updated_at: threat.updated_at.iso8601 } }
      end

      private

      def apply_filters(scope)
        scope = scope.where(status: params[:status].split(",")) if params[:status].present?
        scope = scope.where(severity: params[:severity].split(",")) if params[:severity].present?
        scope = scope.where("confidence_score >= ?", params[:confidence_min].to_i) if params[:confidence_min].present?
        scope = scope.where("confidence_score <= ?", params[:confidence_max].to_i) if params[:confidence_max].present?
        scope = scope.where("detected_at >= ?", params[:date_from]) if params[:date_from].present?
        scope = scope.where("detected_at <= ?", params[:date_to]) if params[:date_to].present?
        scope = scope.where(attack_phase: params[:attack_phase]) if params[:attack_phase].present?

        if params[:search].present?
          term = "%#{params[:search]}%"
          scope = scope.where("title LIKE ? OR description LIKE ?", term, term)
        end

        if params[:asset].present?
          term = "%#{params[:asset]}%"
          scope = scope.where("JSON_SEARCH(affected_assets, 'one', ?) IS NOT NULL", params[:asset])
        end

        scope
      end

      def apply_sort(scope)
        sort_field = %w[detected_at confidence_score severity].include?(params[:sort_by]) ? params[:sort_by] : "detected_at"
        sort_dir   = params[:sort_order] == "asc" ? :asc : :desc
        scope.order(sort_field => sort_dir)
      end

      def threat_summary_json(t)
        {
          id:               t.id,
          hunt_cycle_id:    t.hunt_cycle_id,
          title:            t.title,
          description:      t.description,
          confidence_score: t.confidence_score,
          severity:         t.severity,
          # Use the stored DB value (e.g. "new") not the Rails enum key (e.g. "new_threat")
          status:           t.read_attribute_before_type_cast(:status),
          attack_phase:     t.attack_phase,
          affected_assets:  t.affected_assets,
          mitre_techniques: t.mitre_techniques,
          detected_at:      t.detected_at&.iso8601,
          created_at:       t.created_at.iso8601
        }
      end

      def threat_detail_json(t)
        threat_summary_json(t).merge(
          agent_reasoning:    t.agent_reasoning,
          esql_queries_used:  t.esql_queries_used,
          auto_actions_taken: t.auto_actions_taken,
          timeline_events:    t.timeline_events,
          elastic_dashboard_url: t.elastic_dashboard_url,
          resolved_at:        t.resolved_at&.iso8601,
          updated_at:         t.updated_at.iso8601
        )
      end

      def action_json(a)
        {
          id:           a.id,
          action_type:  a.action_type,
          performed_by: a.performed_by,
          notes:        a.notes,
          created_at:   a.created_at.iso8601
        }
      end

      def status_to_action_type(status)
        {
          "investigating"  => "investigating",
          "confirmed"      => "confirmed",
          "escalated"      => "escalated",
          "resolved"       => "resolved"
        }.fetch(status, "note_added")
      end
    end
  end
end

