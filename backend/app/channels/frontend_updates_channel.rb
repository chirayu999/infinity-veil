# frozen_string_literal: true

# Single unified ActionCable channel the React frontend subscribes to.
# Messages are published by model callbacks and service objects with the shape:
#
#   {
#     topic: "threats" | "chat" | "hunts" | "review_queue" | "dashboard",
#     query_key: ["threats"],        # React-Query key to invalidate
#     type: "new_threat",            # optional: specific event type
#     ...payload                     # optional: inline data
#   }
#
# The frontend WebSocketProvider (WebSocketProvider.tsx) listens on this channel
# and calls queryClient.invalidateQueries({ queryKey: payload.query_key }) to
# trigger a refetch, keeping the UI in sync without polling.

class FrontendUpdatesChannel < ApplicationCable::Channel
  def subscribed
    stream_from "frontend_updates"
  end

  def unsubscribed
    # Cleanup on disconnect (handled by ActionCable automatically)
  end
end

