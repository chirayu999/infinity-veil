# frozen_string_literal: true

module Api
  module V1
    class ExceptionPatternsController < BaseController
      # GET /api/v1/exception_patterns
      def index
        page  = page_param
        per   = per_page_param

        scope = ExceptionPattern.order(created_at: :desc)
        scope = scope.where(active: params[:active] == "true") if params[:active] == "true"
        scope = scope.where(active: false) if params[:active] == "false"
        scope = scope.where(pattern_type: params[:pattern_type]) if params[:pattern_type].present?

        total    = scope.count
        patterns = scope.offset((page - 1) * per).limit(per)

        render json: {
          exception_patterns: patterns.map { |p| pattern_json(p) },
          meta: { current_page: page, per_page: per, total_count: total, total_pages: (total.to_f / per).ceil }
        }
      end

      # POST /api/v1/exception_patterns
      def create
        p = ExceptionPattern.create!(pattern_params)
        render json: { exception_pattern: pattern_json(p) }, status: :created
      end

      # PATCH /api/v1/exception_patterns/:id
      def update
        pattern = ExceptionPattern.find(params[:id])
        pattern.update!(pattern_params)
        render json: { exception_pattern: pattern_json(pattern) }
      end

      private

      def pattern_params
        params.require(:exception_pattern).permit(
          :pattern_type, :description, :esql_exclusion, :active, :source_threat_id
        )
      end

      def pattern_json(p)
        {
          id:               p.id,
          pattern_type:     p.pattern_type,
          description:      p.description,
          esql_exclusion:   p.esql_exclusion,
          active:           p.active,
          source_threat_id: p.source_threat_id,
          created_at:       p.created_at.iso8601
        }
      end
    end
  end
end

