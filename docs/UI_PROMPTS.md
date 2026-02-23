# NIGHTWATCH -- UI Prompts for Lovable / Bolt

> Feed each prompt separately. Use the global context prompt first, then each page prompt individually.

---

## Global Context Prompt

```
I'm building a cybersecurity threat detection dashboard called "NIGHTWATCH".
It's a dark-themed, professional security operations center (SOC) UI.

Tech: React + TypeScript + Tailwind CSS.

Design direction:
- Dark background (#0a0e1a or similar deep navy/charcoal)
- Accent colors: electric blue (#3b82f6) for primary actions, amber (#f59e0b) for warnings, red (#ef4444) for critical, green (#22c55e) for success/resolved
- Clean sans-serif typography (Inter or similar)
- Subtle borders and card elevation, no heavy shadows
- Data-dense but not cluttered — think Bloomberg terminal meets modern SaaS
- Monospace font for IDs, timestamps, and technical data
- Confidence scores shown as colored progress bars (red >85, amber 40-84, green <40)
- Severity badges: critical=red, high=orange, medium=yellow, low=blue

Left sidebar navigation with icons. Top bar with notification bell and pending review count badge.

Sidebar nav items:
- Dashboard (home icon)
- Threats (shield icon)
- Review Queue (clipboard-check icon)
- Chat (message-circle icon)
- Hunt History (search icon)

All pages share this shell layout.
```

---

## Prompt 1: Dashboard Home (`/`)

```
Build the Dashboard Home page for NIGHTWATCH, a cybersecurity threat detection app.

Top row — 4 stat cards in a grid:
- "Threats Today" with a large number (e.g. 12) and a small sparkline trending up
- "Avg Confidence" showing 68% with a circular progress indicator
- "Pending Reviews" showing 5 with an amber dot
- "Active Hunts" showing a green "Running" status with a pulsing dot

Middle section — two columns:
Left column: "Severity Breakdown" — a horizontal stacked bar or small donut chart showing critical (2), high (5), medium (28), low (12) using the severity colors.

Right column: "Agent Status" — 4 small cards in a 2x2 grid for SCANNER, TRACER, ADVOCATE, COMMANDER. Each shows agent name, a green "Online" indicator, and last active time like "2m ago".

Bottom section: "Recent Activity" — a scrollable feed/timeline with mixed event types:
- "Lateral Movement Chain Detected" — high severity, 87% confidence, 2 min ago
- "Host WS-042 isolated" — auto-action by system, 2 min ago
- "Hunt cycle completed" — 3 threats found, 5 min ago
- "False positive marked for review" — by analyst@company.com, 12 min ago

Each activity item has an icon, timestamp, and a subtle severity-colored left border.

Keep it clean, data-dense, dark theme. No lorem ipsum — use realistic security data.
```

---

## Prompt 2: Threat List (`/threats`)

```
Build a Threat List page for NIGHTWATCH.

Top: page title "Threats" on the left. A "Trigger Hunt" button (blue, primary) on the right.

Filter bar below the title — horizontal row with:
- Status dropdown (All, New, Investigating, Confirmed, Escalated, Resolved)
- Severity dropdown (All, Critical, High, Medium, Low)
- Date range picker
- Search input with magnifying glass icon and placeholder "Search threats..."
- All filters are compact, inline, dark-styled

Table with these columns:
- Status (colored dot: blue=new, yellow=investigating, green=resolved, red=escalated)
- Title (text, bold)
- Severity (badge with color)
- Confidence (number + small colored bar)
- Attack Phase (text, muted)
- Assets (truncated list like "WS-042 +3 more")
- Detected (relative time like "2h ago")

Sample rows (5-6 rows):
1. New | Lateral Movement Chain | High | 87% | Lateral Movement | WS-042 +3 | 2h ago
2. Investigating | Brute Force from External IP | Critical | 94% | Initial Compromise | SRV-003 | 4h ago
3. Escalated | DNS Tunneling Exfiltration | High | 78% | Data Exfiltration | FS-001 | 6h ago
4. Resolved | Suspicious PowerShell Execution | Medium | 52% | Initial Compromise | WS-015 | 1d ago
5. False Positive | Admin RDP Session | Low | 31% | Lateral Movement | SRV-004 | 2d ago

Rows are clickable (hover state). Pagination at bottom: "Showing 1-25 of 112 threats" with page controls.

Dark theme, clean table with subtle row dividers, no heavy borders.
```

---

## Prompt 3: Threat Detail (`/threats/:id`)

```
Build a Threat Detail page for NIGHTWATCH. This is the most important page.

Top section — Summary card spanning full width:
- Left: Title "Lateral Movement Chain Detected" in large text
- Below title: severity badge (HIGH, orange), attack phase "Lateral Movement", MITRE tags as small pills (T1021.001, T1059.001, T1003)
- Right side: large confidence score "87%" in a circular gauge (amber colored), current status badge "NEW" in blue
- Below: a row of action buttons: "Acknowledge" (outline), "Investigate" (blue), "Confirm" (green), "Mark False Positive" (red outline), "Escalate" (amber)

Middle section — two panels side by side:

LEFT PANEL: "Attack Timeline" — a vertical timeline visualization
Each event is a node with:
- Timestamp on the left (e.g., "Feb 7, 09:14")
- Event description on the right
- Colored dot by attack phase (blue=initial, amber=lateral, red=escalation, purple=exfiltration)
- Agent badge (which agent found it: SCANNER, TRACER)
- Expandable to show raw evidence

4 timeline events:
1. Feb 7 09:14 — "Macro-spawned PowerShell on WS-042" — SCANNER — Initial Compromise
2. Feb 7 11:30 — "RDP lateral movement WS-042 → WS-107, SRV-003" — TRACER — Lateral Movement
3. Feb 7 14:02 — "Credential dump tool on WS-107" — SCANNER — Privilege Escalation
4. Feb 8 02:15 — "4.2GB data staged on FS-001" — TRACER — Data Exfiltration

RIGHT PANEL: "Agent Reasoning" — the adversarial debate view
4 stacked cards, one per agent:
- SCANNER card (blue accent): "Found macro-spawned PowerShell with encoded command..." — Confidence: 91%
- TRACER card (green accent): "Traced RDP lateral movement across 5 hosts..." — Confidence: 89%
- ADVOCATE card (amber accent): "CHALLENGE: john.doe is IT admin, multi-host RDP expected... OVERRIDDEN: credential dump cannot be explained" — with a strikethrough or "overridden" badge
- COMMANDER card (purple accent): "VERDICT: HIGH confidence. Adversarial challenge overridden by credential dump evidence." — Final: 87%

Bottom section — two side-by-side panels:
LEFT: "Affected Assets" — small table: Host, Type, Role (WS-042/workstation/entry point, WS-107/workstation/lateral target, etc.)
RIGHT: "Actions Log" — chronological list of actions taken (system auto-isolated host, Slack notification sent, etc.) with timestamps and actor.

Dark theme. This page should feel like a comprehensive investigation report.
```

---

## Prompt 4: Review Queue (`/review`)

```
Build a Review Queue page for NIGHTWATCH. This is where senior analysts review false positive claims.

Top: title "Review Queue" on the left. Filter toggle on the right: "Pending" (active, highlighted), "Confirmed", "Rejected", "All".

A badge next to "Pending" showing count (e.g., "5").

Content: a list of review cards (not a table). Each card has:
- Left section: threat title, severity badge, confidence score, attack phase
- Middle section: "Marked by analyst@company.com — 2 hours ago" in muted text, then the analyst's reason in a quote block style: "This is a known IT maintenance window for WS-042. The admin RDP pattern is expected every Tuesday night."
- Right section: two buttons stacked — "Confirm False Positive" (green outline) and "Reject — Re-escalate" (red outline)
- A "View Threat" link to open the full threat detail

Show 3 review cards with different scenarios:
1. Lateral Movement Chain — marked by analyst, reason about maintenance window
2. Admin RDP Session — marked by junior.analyst, reason about expected admin behavior
3. Backup Transfer Alert — marked by ops.team, reason about nightly backup schedule

Dark theme, cards with subtle borders, clear visual hierarchy. The emphasis should be on the analyst's reasoning and the action buttons.
```

---

## Prompt 5: Chat (`/chat`)

```
Build a Chat page for NIGHTWATCH. This is where analysts talk to the COMMANDER AI agent.

Full-height chat interface (like ChatGPT or Slack DM) with dark theme.

Left side: chat history taking up most of the width.

Chat messages:
1. USER message (right-aligned, dark blue bubble): "Investigate user john.doe over the last 48 hours"
2. AGENT message (left-aligned, dark gray bubble) with a "COMMANDER" badge and a purple dot:
   - "I investigated john.doe's activity across all security logs. Here's what I found:"
   - A compact findings card inside the message with: title, confidence, affected hosts list
   - "Would you like me to create a formal threat record for this finding?"
   - Small metadata line: "3 tools used · 3.4s response time"
3. USER: "Yes, create a threat for the lateral movement finding"
4. AGENT: "Threat created: THREAT-2026-0448. You can view the full investigation at /threats/..."
   - A small clickable card/link preview of the created threat

Bottom: input bar spanning full width with placeholder "Ask COMMANDER to investigate..." and a send button. A small hint below: "Try: 'Were there suspicious RDP connections this week?' or 'Check database servers for anomalies'"

Dark theme, clean messaging UI, agent messages should feel authoritative and professional.
```

---

## Prompt 6: Hunt History (`/hunts`)

```
Build a Hunt History page for NIGHTWATCH.

Top: title "Hunt History" on the left. "Trigger Manual Hunt" button (blue) on the right.

A subtle status banner at the top if a hunt is currently running: "Hunt cycle in progress... started 45 seconds ago" with a spinning indicator and a blue background.

Table with columns:
- Status (green checkmark for completed, red X for failed, blue spinner for running)
- Trigger (badge: "Scheduled" in gray, "Manual" in blue)
- Threats Found (number, bold if > 0)
- Avg Confidence (number with color)
- Duration (e.g., "3m 24s")
- Started At (absolute datetime)

Sample rows (6-7 rows):
1. Running | Scheduled | — | — | — | Feb 9, 14:30
2. Completed | Scheduled | 2 | 72% | 3m 24s | Feb 9, 14:15
3. Completed | Scheduled | 0 | — | 2m 11s | Feb 9, 14:00
4. Completed | Manual | 1 | 88% | 4m 02s | Feb 9, 13:30
5. Completed | Scheduled | 0 | — | 2m 34s | Feb 9, 13:45
6. Failed | Scheduled | 0 | — | 0m 03s | Feb 9, 13:30

Rows clickable. Pagination at bottom.

Dark theme, clean, minimal. Emphasize the "Threats Found" column when non-zero.
```

