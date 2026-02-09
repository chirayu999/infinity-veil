import { useState } from "react";
import { Send, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ChatMessage {
  id: number;
  role: "user" | "agent";
  content: string;
  card?: { title: string; confidence: number; hosts: string[]; link?: string };
  meta?: string;
  time: string;
}

const initialMessages: ChatMessage[] = [
  {
    id: 1,
    role: "user",
    content: "Investigate user john.doe over the last 48 hours",
    time: "14:22",
  },
  {
    id: 2,
    role: "agent",
    content: "I investigated john.doe's activity across all security logs. Here's what I found:",
    card: {
      title: "Lateral Movement Chain — john.doe",
      confidence: 87,
      hosts: ["WS-042", "WS-107", "SRV-003", "FS-001"],
    },
    meta: "3 tools used · 3.4s response time",
    time: "14:22",
  },
  {
    id: 3,
    role: "agent",
    content: "Would you like me to create a formal threat record for this finding?",
    time: "14:22",
  },
  {
    id: 4,
    role: "user",
    content: "Yes, create a threat for the lateral movement finding",
    time: "14:23",
  },
  {
    id: 5,
    role: "agent",
    content: "Threat created successfully.",
    card: {
      title: "THREAT-2026-0448 — Lateral Movement Chain",
      confidence: 87,
      hosts: ["WS-042", "WS-107", "SRV-003"],
      link: "/threats/THR-2024-0847",
    },
    meta: "1 tool used · 1.2s response time",
    time: "14:23",
  },
];

export default function Chat() {
  const [messages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.14)-theme(spacing.12))]">
      {/* Messages */}
      <div className="flex-1 overflow-auto px-4 py-6 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[600px] ${msg.role === "user" ? "" : "flex gap-3"}`}>
              {msg.role === "agent" && (
                <div className="shrink-0 mt-1">
                  <div className="h-8 w-8 rounded-full bg-nw-purple/20 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-nw-purple" />
                  </div>
                </div>
              )}
              <div>
                {msg.role === "agent" && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="h-2 w-2 rounded-full bg-nw-purple" />
                    <span className="text-xs font-bold font-mono tracking-wide text-foreground">COMMANDER</span>
                  </div>
                )}
                <div
                  className={`rounded-lg px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary/20 text-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  <p>{msg.content}</p>

                  {msg.card && (
                    <div
                      className={`mt-3 rounded-md border border-border bg-card p-3 space-y-2 ${
                        msg.card.link ? "cursor-pointer hover:bg-accent/30 transition-colors" : ""
                      }`}
                      onClick={() => msg.card?.link && navigate(msg.card.link)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">{msg.card.title}</span>
                        <span className="text-xs font-mono text-nw-amber">{msg.card.confidence}%</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.card.hosts.map((h) => (
                          <span key={h} className="px-2 py-0.5 rounded bg-secondary text-xs font-mono text-muted-foreground">
                            {h}
                          </span>
                        ))}
                      </div>
                      {msg.card.link && (
                        <p className="text-xs text-primary">View full investigation →</p>
                      )}
                    </div>
                  )}
                </div>

                {msg.meta && (
                  <p className="text-[11px] text-muted-foreground mt-1.5 ml-1">{msg.meta}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card px-4 py-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask COMMANDER to investigate..."
            className="flex-1 bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors shrink-0">
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 ml-1">
          Try: "Were there suspicious RDP connections this week?" or "Check database servers for anomalies"
        </p>
      </div>
    </div>
  );
}
