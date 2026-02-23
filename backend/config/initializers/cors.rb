# frozen_string_literal: true

# Allow cross-origin requests from the React frontend (Vite dev server).
# In production, replace with the actual deployed frontend origin.

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins ENV.fetch("FRONTEND_URL") { "http://localhost:5173" }

    resource "*",
      headers: :any,
      methods: [:get, :post, :patch, :put, :delete, :options, :head],
      expose: ["X-Request-Id"],
      credentials: false
  end
end
