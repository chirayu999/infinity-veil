Rails.application.routes.draw do
  # Health check
  get "up" => "rails/health#show", as: :rails_health_check
  #mount Sidekiq::Web => '/sidekiq'
  # ActionCable WebSocket endpoint
  mount ActionCable.server => "/cable"

  namespace :api do
    namespace :v1 do
      # Threats
      resources :threats, only: [:index, :show, :update] do
        resources :actions, only: [:create], controller: "threat_actions"
      end

      # Review Queue (false positive review)
      resources :review_queue, only: [:index, :update]

      # Hunt Cycles
      resources :hunts, only: [:index, :show, :create]

      # Chat with COMMANDER agent
      post   "chat",               to: "chat#create"
      get    "chat/history",       to: "chat#history"
      post   "chat/create_threat", to: "chat#create_threat"

      # Dashboard
      get "dashboard/stats",         to: "dashboard#stats"
      get "dashboard/activity_feed", to: "dashboard#activity_feed"

      # Exception Patterns
      resources :exception_patterns, only: [:index, :create, :update]

      # Slack interactive message webhooks
      post "slack/interactions", to: "slack#interactions"
    end
  end
end
