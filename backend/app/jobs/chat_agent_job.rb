# frozen_string_literal: true

# Processes a user chat message asynchronously so the HTTP request returns
# immediately (202) while the Kibana agent runs for 2-3 minutes.
#
# Progress is streamed to the frontend via ActionCable FrontendUpdatesChannel:
#
#   thinking_step  — periodic status text while Kibana is working
#   agent_complete — final ChatMessage once Kibana responds
#   agent_error    — error details if Kibana or the job fails
#
class ChatAgentJob < ApplicationJob
  queue_as :default

  # Don't retry on failure since chat responses are time-sensitive
  retry_on StandardError, attempts: 0

  THINKING_STEPS = [
    { after:   0, message: "Analyzing your request…" },
    { after:  20, message: "Running ES|QL threat detection queries…" },
    { after:  60, message: "Cross-referencing threat intelligence data…" },
    { after: 120, message: "Synthesizing findings across all data sources…" },
  ].freeze

  def perform(user_message_id, content)
    done = false
    
    Rails.logger.info("[ChatAgentJob] Starting job for user_message=#{user_message_id}")

    # Broadcast periodic thinking-step updates in a background thread while the
    # main thread blocks on the Kibana HTTP call (up to 300s).
    thinking_thread = Thread.new do
      THINKING_STEPS.each do |step|
        sleep(step[:after])
        break if done

        Rails.logger.info("[ChatAgentJob] Broadcasting thinking step: #{step[:message]}")
        broadcast_thinking(step[:message])
      end
    end

    begin
      # Start the first thinking step immediately
      broadcast_thinking(THINKING_STEPS.first[:message])
      
      kibana = KibanaAgentService.new
      result = kibana.chat(content)
      done   = true

      Rails.logger.info("[ChatAgentJob] Kibana call completed, creating agent message")

      agent_message = ChatMessage.new(
        role:       "agent",
        content:    result[:response].to_s,
        agent_name: "COMMANDER",
        metadata:   { conversation_id: result[:conversation_id] }
      )
      
      # Skip the model's after_create broadcast since we handle it ourselves
      agent_message.skip_broadcast = true
      agent_message.save!

      # Broadcast the complete message so the frontend can update immediately
      broadcast_complete(agent_message)

    rescue KibanaAgentService::AgentCommunicationError => e
      done = true

      Rails.logger.error("[ChatAgentJob] Kibana error: #{e.message}")

      error_message = ChatMessage.new(
        role:       "agent",
        content:    "COMMANDER encountered an error and could not respond. #{e.message}",
        agent_name: "COMMANDER",
        metadata:   { error: true }
      )
      
      error_message.skip_broadcast = true
      error_message.save!

      broadcast_agent_error(e.message, error_message)

    rescue StandardError => e
      done = true

      Rails.logger.error(
        "[ChatAgentJob] Unexpected error for user_message=#{user_message_id}: " \
        "#{e.class} — #{e.message}\n#{e.backtrace&.first(5)&.join("\n")}"
      )

      broadcast_agent_error("An unexpected error occurred. Please try again.", nil)

    ensure
      done = true
      thinking_thread.join(0.5) rescue nil
      Rails.logger.info("[ChatAgentJob] Job completed for user_message=#{user_message_id}")
    end
  end

  private

  def broadcast_thinking(message)
    payload = {
      topic:   "chat",
      type:    "thinking_step",
      content: message
    }
    
    Rails.logger.info("[ChatAgentJob] Broadcasting thinking_step: #{payload}")
    ActionCable.server.broadcast("frontend_updates", payload)
  end

  def broadcast_complete(message)
    payload = {
      topic:   "chat",
      type:    "agent_complete",
      message: message_json(message)
    }
    
    Rails.logger.info("[ChatAgentJob] Broadcasting agent_complete for message #{message.id}")
    ActionCable.server.broadcast("frontend_updates", payload)
  end

  def broadcast_agent_error(error_msg, chat_message)
    ActionCable.server.broadcast("frontend_updates", {
      topic:   "chat",
      type:    "agent_error",
      error:   error_msg,
      message: chat_message ? message_json(chat_message) : nil
    })
  end

  def message_json(m)
    {
      id:                m.id,
      role:              m.role,
      content:           m.content,
      agent_name:        m.agent_name,
      metadata:          m.metadata,
      created_threat_id: m.created_threat_id,
      created_at:        m.created_at.iso8601
    }
  end
end
