# frozen_string_literal: true

# Transforms raw COMMANDER agent responses into structured Threat records in MySQL.
# Called by HuntOrchestratorService after each hunt cycle.

class ThreatBuilderService
  # Parse the COMMANDER agent's response and create Threat records.
  #
  # @param hunt_cycle [HuntCycle]
  # @param agent_response [Hash] { conversation_id:, response:, raw: }
  # @return [Array<Threat>]
  def call(hunt_cycle, agent_response)
    threats_data = parse_agent_response(agent_response)
    threats = []

    threats_data.each do |data|
      threat = Threat.create!(
        hunt_cycle:        hunt_cycle,
        title:             data[:title],
        description:       data[:description],
        confidence_score:  data[:confidence_score],
        severity:          calculate_severity(data[:confidence_score]),
        status:            "new",
        attack_phase:      data[:attack_phase],
        affected_assets:   data[:affected_assets],
        agent_reasoning:   data[:agent_reasoning],
        esql_queries_used: data[:esql_queries_used],
        mitre_techniques:  data[:mitre_techniques],
        auto_actions_taken: [],
        timeline_events:   data[:timeline_events],
        detected_at:       Time.current
      )

      # Audit trail entry
      threat.threat_actions.create!(
        action_type:  "note_added",
        performed_by: "system",
        notes:        "Threat detected by NIGHTWATCH hunt cycle #{hunt_cycle.id}"
      )

      threats << threat
    end

    hunt_cycle.update!(threats_found_count: threats.size)
    threats
  end

  private

  def parse_agent_response(agent_response)
    raw_text = agent_response[:response].to_s

    begin
      json_match = raw_text.match(/```json\s*(.*?)\s*```/m)
      if json_match
        parsed = JSON.parse(json_match[1], symbolize_names: true)
        threat_list = parsed[:threats] || parsed
        return Array.wrap(threat_list).map { |t| normalize_keys(t) }
      end
    rescue JSON::ParserError
      # Fall through to heuristic parsing
    end

    # Fallback: only wrap as finding if there is actual text content
    return [] if raw_text.blank?

    [{
      title:             extract_title(raw_text),
      description:       raw_text,
      confidence_score:  extract_confidence(raw_text),
      attack_phase:      extract_attack_phase(raw_text),
      affected_assets:   extract_assets(raw_text),
      agent_reasoning:   { commander: { finding: raw_text } },
      esql_queries_used: [],
      mitre_techniques:  extract_mitre(raw_text),
      timeline_events:   []
    }]
  end

  # Ensure both string and symbol keys work from parsed JSON
  def normalize_keys(hash)
    h = hash.transform_keys(&:to_sym)
    h[:agent_reasoning]   ||= {}
    h[:esql_queries_used] ||= []
    h[:mitre_techniques]  ||= []
    h[:timeline_events]   ||= []
    h[:affected_assets]   ||= []
    h[:description]       ||= h[:title].present? ? "Detected by NIGHTWATCH: #{h[:title]}" : nil
    h[:attack_phase]        = normalize_attack_phase(h[:attack_phase])
    h
  end

  ATTACK_PHASE_ALIASES = {
    "exfiltration"               => "data_exfiltration",
    "data_exfil"                 => "data_exfiltration",
    "exfil"                      => "data_exfiltration",
    "initial"                    => "initial_compromise",
    "initial compromise"         => "initial_compromise",
    "lateral"                    => "lateral_movement",
    "lateral movement"           => "lateral_movement",
    "privilege escalation"       => "privilege_escalation",
    "privesc"                    => "privilege_escalation",
    "priv_esc"                   => "privilege_escalation",
    "persistence"                => "persistence",
    "multi-phase"                => "multi_phase",
    "multiphase"                 => "multi_phase",
    "credential_access"          => "privilege_escalation",
    "credential access"          => "privilege_escalation",
    "discovery"                  => "multi_phase",
    "collection"                 => "multi_phase",
    "command_and_control"        => "multi_phase",
    "command and control"        => "multi_phase",
    "impact"                     => "multi_phase",
    "defense_evasion"            => "multi_phase",
    "defense evasion"            => "multi_phase",
  }.freeze

  VALID_ATTACK_PHASES = %w[
    initial_compromise lateral_movement privilege_escalation
    data_exfiltration persistence multi_phase
  ].freeze

  def normalize_attack_phase(phase)
    self.class.normalize_attack_phase(phase)
  end

  def self.normalize_attack_phase(phase)
    return "multi_phase" if phase.blank?

    normalized = phase.to_s.strip.downcase.tr("-", "_")
    return normalized if VALID_ATTACK_PHASES.include?(normalized)

    ATTACK_PHASE_ALIASES[normalized] || "multi_phase"
  end

  def calculate_severity(confidence)
    case confidence.to_i
    when 85..100 then "critical"
    when 70..84  then "high"
    when 40..69  then "medium"
    else              "low"
    end
  end

  def extract_title(text)
    first_line = text.lines.find { |l| l.strip.length > 10 }
    (first_line || "Threat Detected").strip.truncate(255)
  end

  def extract_confidence(text)
    match = text.match(/confidence[:\s]*(\d+)/i)
    match ? match[1].to_i.clamp(0, 100) : 50
  end

  def extract_attack_phase(text)
    {
      "initial_compromise"   => /initial.?compromise|phishing|brute.?force|credential.?stuff/i,
      "lateral_movement"     => /lateral.?movement|rdp|smb|pivot/i,
      "privilege_escalation" => /privilege.?escalation|mimikatz|credential.?dump|token/i,
      "data_exfiltration"    => /exfiltration|dns.?tunnel|data.?stag/i
    }.each do |phase, regex|
      return phase if text.match?(regex)
    end
    "multi_phase"
  end

  def extract_assets(text)
    hosts = text.scan(/\b(?:WS|SRV|FS|DB)-\d{3}\b/).uniq
    users = text.scan(/user[:\s]+["']?(\w+\.\w+)["']?/i).flatten.uniq
    hosts.map { |h| { host: h, type: "unknown" } } +
      users.map { |u| { user: u, type: "user_account" } }
  end

  def extract_mitre(text)
    text.scan(/T\d{4}(?:\.\d{3})?/).uniq
  end
end

