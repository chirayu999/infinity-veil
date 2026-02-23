# frozen_string_literal: true

module Api
  module V1
    # Base controller for all API v1 endpoints.
    # Provides shared helpers: pagination, error rendering, and JSON formatting.
    class BaseController < ApplicationController
      before_action :set_default_format

      rescue_from ActiveRecord::RecordNotFound do |e|
        render json: { error: e.message }, status: :not_found
      end

      rescue_from ActiveRecord::RecordInvalid do |e|
        render json: { error: e.message, details: e.record.errors.full_messages }, status: :unprocessable_entity
      end

      rescue_from ActionController::ParameterMissing do |e|
        render json: { error: e.message }, status: :bad_request
      end

      private

      def set_default_format
        request.format = :json
      end

      def pagination_meta(collection, current_page, per_page)
        total = collection.respond_to?(:total_count) ? collection.total_count : collection.count
        {
          current_page: current_page,
          per_page:     per_page,
          total_count:  total,
          total_pages:  (total.to_f / per_page).ceil
        }
      end

      def page_param
        [(params[:page] || 1).to_i, 1].max
      end

      def per_page_param(max: 100, default: 25)
        [(params[:per_page] || default).to_i, max].min
      end
    end
  end
end

