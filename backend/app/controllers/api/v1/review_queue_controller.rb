# frozen_string_literal: true

module Api
  module V1
    class ReviewQueueController < BaseController
      # GET /api/v1/review_queue
      def index
        page = page_param
        per  = per_page_param

        scope = ReviewQueueItem.includes(threat: :threat_actions)

        if params[:review_status].present? && params[:review_status] != "all"
          scope = scope.where(review_status: params[:review_status])
        end

        scope  = scope.recent
        total  = scope.count
        items  = scope.offset((page - 1) * per).limit(per)

        render json: {
          review_queue_items: items.map { |item| review_item_json(item) },
          meta: { current_page: page, per_page: per, total_count: total, total_pages: (total.to_f / per).ceil }
        }
      end

      # PATCH /api/v1/review_queue/:id
      def update
        item        = ReviewQueueItem.includes(:threat).find(params[:id])
        rq_params   = params.require(:review_queue_item).permit(:review_status, :verdict, :review_notes)
        verdict     = rq_params[:review_status].presence || rq_params[:verdict]
        reviewed_by = params[:reviewed_by].presence || "senior_analyst"
        notes       = rq_params[:review_notes].presence || params[:review_notes]

        service = FalsePositiveService.new

        exception_id = nil

        case verdict
        when "confirmed_fp"
          exception = service.confirm_false_positive(item, reviewed_by: reviewed_by, review_notes: notes)
          exception_id = exception.id
        when "rejected_fp"
          service.reject_false_positive(item, reviewed_by: reviewed_by, review_notes: notes)
        else
          render json: { error: "Invalid verdict. Use 'confirmed_fp' or 'rejected_fp'." }, status: :unprocessable_entity
          return
        end

        item.reload
        response_body = {
          review_item: {
            id:            item.id,
            review_status: item.review_status,
            reviewed_by:   item.reviewed_by,
            reviewed_at:   item.reviewed_at&.iso8601
          },
          threat_status: item.threat.status
        }
        response_body[:exception_pattern_id] = exception_id if exception_id

        render json: response_body
      end

      private

      def review_item_json(item)
        t = item.threat
        {
          id:            item.id,
          threat: {
            id:               t.id,
            title:            t.title,
            confidence_score: t.confidence_score,
            severity:         t.severity,
            attack_phase:     t.attack_phase
          },
          marked_by:     item.marked_by,
          reason:        item.reason,
          review_status: item.review_status,
          reviewed_by:   item.reviewed_by,
          review_notes:  item.review_notes,
          reviewed_at:   item.reviewed_at&.iso8601,
          created_at:    item.created_at.iso8601
        }
      end
    end
  end
end

