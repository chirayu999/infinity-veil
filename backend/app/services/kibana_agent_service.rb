# frozen_string_literal: true

# Handles all communication with Elasticsearch Agent Builder via the Kibana REST API.
# Used by HuntOrchestratorService (automated hunts) and ChatController (ad-hoc chat).

class KibanaAgentService
  BASE_URL = ENV.fetch("KIBANA_URL", "https://your-deployment.kb.us-east-1.aws.elastic.cloud")
  API_KEY  = ENV.fetch("KIBANA_API_KEY", "")

  AGENT_IDS = {
    commander: ENV.fetch("COMMANDER_AGENT_ID", ""),
    scanner:   ENV.fetch("SCANNER_AGENT_ID",   ""),
    tracer:    ENV.fetch("TRACER_AGENT_ID",    ""),
    advocate:  ENV.fetch("ADVOCATE_AGENT_ID",  "")
  }.freeze

  def initialize
    @connection = Faraday.new(url: BASE_URL) do |f|
      f.request  :json
      f.response :json
      f.request  :retry, max: 2, interval: 1.0
      f.options.timeout      = 300  # 5 min — agent runs multiple ES|QL tool calls
      f.options.open_timeout = 15
      f.headers["Authorization"] = "ApiKey #{API_KEY}"
      f.headers["kbn-xsrf"]      = "true"
      f.headers["Content-Type"]  = "application/json"
    end
  end

  # Start a threat hunting conversation with the COMMANDER agent.
  #
  # @param message [String, nil] Custom hunt instruction; falls back to default prompt
  # @return [Hash] { conversation_id:, response:, raw: }
  def start_hunt(message = nil)
    send_message(:commander, message || default_hunt_prompt)
  end

  # Send a message to a specific agent.
  #
  # @param agent [Symbol] :commander, :scanner, :tracer, or :advocate
  # @param message [String]
  # @param conversation_id [String, nil] Existing conversation ID to continue
  # @return [Hash] { conversation_id:, response:, raw: }
  def send_message(agent, message, conversation_id: nil)
    agent_id = AGENT_IDS.fetch(agent)
    body = { input: message, agent_id: agent_id }
    body[:conversation_id] = conversation_id if conversation_id

    response = @connection.post("/api/agent_builder/converse") do |req|
      req.body = body
    end

    unless response.success?
      raise AgentCommunicationError,
            "Agent commander returned #{response.status}: #{response.body}"
    end

    parsed = response.body
    {
      conversation_id: parsed["conversation_id"],
      response:        parsed.dig("response", "message") || parsed["output"] || parsed["message"],
      raw:             parsed
    }
  end

  # Send an ad-hoc chat message to COMMANDER.
  #
  # @param user_message [String]
  # @param conversation_id [String, nil]
  # @return [Hash] { conversation_id:, response:, raw: }
  def chat(user_message, conversation_id: nil)
    send_message(:commander, user_message, conversation_id: conversation_id)
  end

  class AgentCommunicationError < StandardError; end

  private

  def default_hunt_prompt
    <<~PROMPT
      Run a comprehensive threat hunt across all available security logs for the
      last 24 hours. Use your tools to:

      1. Check for initial compromise indicators (brute force, suspicious process
         execution, unusual authentication patterns)
      2. Look for lateral movement (multi-host authentication, RDP abuse, SMB access)
      3. Detect privilege escalation (credential dumping, token manipulation)
      4. Identify data exfiltration (DNS anomalies, large outbound transfers)

      KNOWN TOOL ISSUES (do not count these as hunt failures):
      - suspicious_process_chain: may return an ES|QL parse error due to backslash
        escaping in the LIKE "*\\Temp\\*" pattern. If this tool errors, note it and
        continue — use other signals to infer process-chain risk.
      - privilege_escalation_scanner: same LIKE escaping issue. If it errors, use
        lateral_movement_tracker and threat_intel_lookup findings instead.

      For each finding, provide structured JSON in a ```json code block with this shape:
      {
        "threats": [
          {
            "title": "...",
            "description": "...",
            "confidence_score": 87,
            "attack_phase": "lateral_movement",
            "affected_assets": [{ "host": "WS-042", "type": "workstation", "role": "initial_compromise" }],
            "agent_reasoning": {
              "scanner":   { "finding": "...", "confidence": 91, "evidence": ["..."] },
              "tracer":    { "finding": "...", "confidence": 89, "evidence": ["..."] },
              "advocate":  { "challenge": "...", "upheld": false, "reason": "..." },
              "commander": { "verdict": "...", "final_confidence": 87, "reasoning": "..." }
            },
            "esql_queries_used": [{ "tool": "brute_force_detector", "query": "FROM ... | ..." }],
            "mitre_techniques": ["T1110", "T1021.001"],
            "timeline_events": [
              {
                "timestamp": "2026-02-09T14:23:00Z",
                "description": "...",
                "source_agent": "scanner",
                "attack_phase": "initial_compromise",
                "evidence": {}
              }
            ]
          }
        ]
      }

      If no threats are found, return: { "threats": [] }
    PROMPT
  end
end

