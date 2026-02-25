# NIGHTWATCH

**Adversarial Multi-Agent Threat Hunting System** (Elasticsearch Agent Builder Hackathon 2026)

---

## Inspiration

Every major breach had the signals sitting in logs: SolarWinds, Target, Equifax, Colonial Pipeline, MOVEit. Nobody connected the dots in time. SOCs drown in 11,000+ alerts per day; analysts can triage only a fraction. I built NIGHTWATCH to change that: an AI system that hunts threats automatically, correlates signals across sources, challenges its own findings to cut false positives, and keeps humans in the loop.

---

## What it does

NIGHTWATCH is an adversarial multi-agent threat hunting system built on Elasticsearch Agent Builder. It deploys four specialized AI agents that independently hunt for threats across security log data, debate their findings and take automated response actions. All while maintaining full transparency and human oversight.

**Two interaction modes:**

- **PUSH (automated):** Sidekiq-Cron triggers a hunt cycle every 1 hour. The Rails backend sends a hunt request to the COMMANDER agent, which orchestrates SCANNER, TRACER, and ADVOCATE. Findings are synthesized into a threat assessment with a confidence score. HIGH confidence (70–100%) triggers simulated response actions (host isolation, ticket creation). MEDIUM confidence adds the finding to a review queue; LOW confidence is logged for audit only.
- **PULL (analyst-initiated):** Analysts can chat directly with the COMMANDER agent from the dashboard such as *"Investigate user john.doe over the last 48 hours"* or *"Were there any suspicious RDP connections to the database servers this week?* and receive synthesized, streamed responses in real time. Findings can be promoted to formal Threat records with one click.

**The four-agent adversarial loop (each agent queries specific Elasticsearch indices):**

- **SCANNER** scans for initial compromise and exfiltration. Uses `nightwatch-auth-logs` (brute force), `nightwatch-process-logs` (suspicious process chains), `nightwatch-network-logs` (anomalous DNS, data exfiltration). It casts a wide net and prefers to flag something suspicious rather than miss a real threat.
- **TRACER** traces lateral movement and privilege escalation. Uses `nightwatch-auth-logs` (lateral movement), `nightwatch-process-logs` (privilege escalation), `nightwatch-threat-intel` (historical patterns). It takes SCANNER's findings and maps the full attack path across hosts and users.
- **ADVOCATE** plays devil's advocate. Uses only `nightwatch-threat-intel` (exception patterns, IOCs, asset inventory). It actively tries to disprove findings by checking against known legitimate patterns. *"This user is an IT admin; multi-host RDP is expected."* When it cannot explain a finding, the threat stands.
- **COMMANDER** is the arbiter. Has access to all four indices for orchestration and ad-hoc investigation. It receives all findings and challenges, resolves disagreements, assigns final confidence scores, and triggers response actions. Every decision is explained transparently.

The dashboard surfaces the full agent reasoning chain for every threat; the "debate" between agents is visible to analysts. NIGHTWATCH also exposes agents via MCP and A2A for external clients like Claude Desktop and SOAR platforms.

---

## How I built it

**Backend:** I built on Ruby on Rails 7.2 in API mode. MySQL stores threats, hunt cycles, threat actions, the review queue, exception patterns, and chat history. Redis powers Sidekiq for background jobs and ActionCable for WebSockets. Faraday drives all communication with the Kibana Agent Builder REST API. I don't use the Elasticsearch Ruby client directly; every detection runs through Kibana.

**Frontend:** React 18 with TypeScript, Vite, Tailwind CSS, and shadcn/ui. React Query handles data fetching and caching. Real-time updates flow through ActionCable via a single `FrontendUpdatesChannel`; when the backend broadcasts an event, I invalidate the relevant React Query cache so the UI updates without polling.

**Elasticsearch / Kibana:** Four agents (SCANNER, TRACER, ADVOCATE, COMMANDER) use custom ES|QL tools to query four Elasticsearch indices. Each agent has access to specific data: **SCANNER** uses `nightwatch-auth-logs` (brute force), `nightwatch-process-logs` (suspicious process chains), and `nightwatch-network-logs` (anomalous DNS, data exfiltration). **TRACER** uses `nightwatch-auth-logs` (lateral movement), `nightwatch-process-logs` (privilege escalation), and `nightwatch-threat-intel` (historical patterns). **ADVOCATE** uses only `nightwatch-threat-intel` (exception patterns, IOCs, asset inventory). **COMMANDER** has access to all four indices for orchestration and ad-hoc investigation. The agents are defined in Elastic Agent Builder and invoked via the Kibana REST API. `KibanaAgentService` sends hunt prompts and chat messages and parses responses into structured Threat records via `ThreatBuilderService`.

**Services and jobs:** `HuntOrchestratorService` runs each hunt cycle end-to-end. `FalsePositiveService` manages the dual-confirmation FP workflow. Sidekiq jobs handle `HuntCycleJob`, `SyncExceptionToElasticsearchJob`, and `FalsePositiveAnalysisJob` (daily).

**Docker:** I used Docker for local development and deployment. It was my first time working with Docker in a multi-service setup, coordinating Rails, MySQL, Redis, and Elasticsearch in a single environment.

---

## Challenges I ran into

- **Learning Elasticsearch and ES|QL from scratch:** I had never used Elasticsearch before. Writing ES|QL queries for security log analysis (time-window aggregations, cross-index correlation, anomaly detection) took significant iteration to get right.
- **Parsing agent responses:** COMMANDER returns markdown-wrapped JSON. When parsing fails or the format drifts, I fall back to heuristics (regex for confidence scores, MITRE IDs, affected assets). Building a robust `ThreatBuilderService` that handles both well-formed and malformed responses was non-trivial.
- **Orchestrating four agents:** Giving each agent distinct personality, tools, and instructions so they genuinely debate (rather than echo each other) required careful prompt engineering.
- **Docker and multi-service coordination:** First time using Docker. Spinning up Rails, MySQL, Redis, Sidekiq, and Elasticsearch in a coherent dev environment, with proper networking and health checks, was a steep learning curve.

---

## Accomplishments I'm proud of

- **End-to-end adversarial multi-agent system:** A genuine debate loop where SCANNER and TRACER surface findings, ADVOCATE challenges them, and COMMANDER synthesizes a verdict. This is the core differentiator from traditional rule-based SIEMs.
- **Full transparency:** Every threat shows the complete agent reasoning chain, the ES|QL queries used, and a visual attack timeline. Analysts can see exactly why the system made each decision.
- **Human-in-the-loop:** Dual-confirmation false positive review (analyst marks FP → senior confirms or rejects). Confirmed FPs become exception patterns that the ADVOCATE references in future hunts, creating a learning loop.
- **Real-time dashboard:** WebSocket-driven cache invalidation means no polling. New threats and hunt completions appear immediately.
- **MITRE ATT&CK coverage:** NIGHTWATCH detects across initial compromise, lateral movement, privilege escalation, and data exfiltration, mapped to concrete techniques (T1110, T1021.001, T1003, etc.).
- **MCP and A2A integration:** External LLM clients and SOAR platforms can invoke NIGHTWATCH agents directly via Model Context Protocol and Agent-to-Agent protocols.

---

## What I learned

**This was my first time using Elasticsearch and Docker.** Elasticsearch's ES|QL proved remarkably powerful for time-window aggregations, cross-index correlation, and anomaly detection over security logs. Docker Compose made it possible to spin up the full stack locally with a single command, a game-changer for local development and demos.

I learned that orchestrating AI agents with distinct roles (and having them actively challenge each other) meaningfully reduces false positives. A single detection pipeline tends to either flood alerts (broad rules) or miss sophisticated attacks (narrow rules). An adversarial design surfaces more nuanced verdicts.

ActionCable combined with React Query invalidation yields a responsive, live UI without any polling. The backend drives cache invalidation through WebSocket events; the frontend stays in sync automatically.

The dual-confirmation false positive workflow and exception patterns create a feedback loop: the system gets smarter over time as analysts confirm benign patterns and the ADVOCATE learns to exclude them.

---

## What's next for NIGHTWATCH

- **Production deployment and hardening:** Configurable hunt frequency, alert thresholds, and scaling considerations for real SOC workloads.
- **Syncing exceptions to Elasticsearch:** `SyncExceptionToElasticsearchJob` is currently stubbed. I want to index confirmed exception patterns into Elasticsearch so agents can reference them directly in ES|QL.
- **Expanding ES|QL detectors:** More MITRE techniques, additional log sources, and finer-grained anomaly detection.
- **Deeper MCP/A2A integrations:** Full SOAR workflows, incident response tooling, and programmatic agent invocation from external systems.
- **Real automated response actions:** Replace simulated host isolation and ticket creation with integrations to actual network management and ticketing APIs.
- **False-positive pattern analysis:** Use the daily `FalsePositiveAnalysisJob` to surface recurring benign patterns and suggest new exception rules to analysts.

