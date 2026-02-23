import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, AlertTriangle, ExternalLink } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useChatHistory, useCreateThreatFromChat, useSendChatMessage } from "@/hooks/useChat";

const agentEmoji: Record<string, string> = {
  SCANNER: "🔍",
  TRACER: "🕵️",
  ADVOCATE: "⚖️",
  COMMANDER: "🎯",
};

function getAgentEmoji(name: string | null | undefined): string {
  return agentEmoji[(name ?? "COMMANDER").toUpperCase()] ?? "🎯";
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Strip the leading ```json … ``` fence that COMMANDER always prepends
 * (it's the internal threats array, not useful for human reading).
 * Also escape word-internal pipes so ES|QL doesn't break GFM table columns.
 */
function cleanChatMessage(content: string): string {
  return content
    .replace(/^```json[\s\S]*?```\s*/m, "")
    .replace(/(\w)\|(\w)/g, "$1\\|$2")
    .trim();
}

function ThinkingBubble({ stepText }: { stepText?: string }) {
  return (
    <div className="flex justify-start">
      <div className="flex gap-3 max-w-[600px]">
        <div className="shrink-0 mt-1">
          <div className="h-8 w-8 rounded-full bg-nw-purple/20 flex items-center justify-center text-base leading-none">
            🎯
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-2 w-2 rounded-full bg-nw-purple animate-pulse" />
            <span className="text-xs font-bold font-mono tracking-wide text-foreground">COMMANDER</span>
          </div>
          <div className="rounded-lg px-4 py-3 bg-secondary flex items-center gap-2">
            <span className="flex gap-1 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-nw-purple animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-nw-purple animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-nw-purple animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
            <span className="text-xs text-muted-foreground transition-all duration-500">
              {stepText ?? "COMMANDER is thinking…"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Chat() {
  const [input, setInput] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useChatHistory();
  const sendMessage = useSendChatMessage();
  const createThreatFromChat = useCreateThreatFromChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = data?.messages ?? [];

  // True while the optimistic thinking placeholder is in the cache — covers
  // both the brief POST /api/v1/chat round-trip and the full job duration.
  const isCommanderThinking = messages.some((msg) => msg.isThinking);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setSendError(null);
    setInput("");
    try {
      await sendMessage.mutateAsync(text);
    } catch (err) {
      setInput(text);
      setSendError(err instanceof Error ? err.message : "COMMANDER failed to respond. Please try again.");
    }
  };

  const handleCreateThreat = async (messageId: string) => {
    const response = await createThreatFromChat.mutateAsync(messageId);
    if (response.threat_id) {
      navigate(`/threats/${response.threat_id}`);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.14)-theme(spacing.12))]">
      {/* Messages */}
      <div className="flex-1 overflow-auto px-4 py-6 space-y-4">
        {isLoading && <p className="text-sm text-muted-foreground">Loading chat history...</p>}
        {isError && <p className="text-sm text-nw-red">{error instanceof Error ? error.message : "Failed to load chat history"}</p>}

        {messages.map((msg) => {
          // Render the live thinking indicator for the optimistic placeholder
          if (msg.isThinking) {
            return <ThinkingBubble key={msg.id} stepText={msg.thinkingStep} />;
          }

          return (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[680px] ${msg.role === "user" ? "" : "flex gap-3"}`}>
                {msg.role !== "user" && (
                  <div className="shrink-0 mt-1">
                    <div className="h-8 w-8 rounded-full bg-nw-purple/20 flex items-center justify-center text-base leading-none">
                      {getAgentEmoji(msg.agent_name)}
                    </div>
                  </div>
                )}
                <div className="min-w-0">
                  {msg.role !== "user" && (
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="h-2 w-2 rounded-full bg-nw-purple" />
                      <span className="text-xs font-bold font-mono tracking-wide text-foreground">
                        {msg.agent_name?.toUpperCase() || "COMMANDER"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                    </div>
                  )}
                  <div
                    className={`rounded-lg px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary/20 text-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <p>{msg.content}</p>
                    ) : (
                      <div className="
                        prose prose-sm prose-invert max-w-none
                        prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1
                        prose-h2:text-sm prose-h3:text-xs
                        prose-p:text-secondary-foreground prose-p:leading-relaxed prose-p:my-1
                        prose-strong:text-foreground
                        prose-ul:text-secondary-foreground prose-ol:text-secondary-foreground prose-li:my-0
                        prose-table:text-xs prose-table:w-full
                        prose-thead:border-b prose-thead:border-border
                        prose-th:text-left prose-th:py-1.5 prose-th:pr-3 prose-th:text-xs prose-th:font-medium prose-th:text-muted-foreground prose-th:uppercase prose-th:tracking-wider
                        prose-td:py-1.5 prose-td:pr-3 prose-td:text-secondary-foreground prose-td:border-b prose-td:border-border/50
                        prose-code:text-nw-blue prose-code:bg-card prose-code:px-1 prose-code:rounded prose-code:text-xs
                        prose-pre:bg-card prose-pre:rounded-md prose-pre:p-3 prose-pre:text-xs
                        prose-hr:border-border
                        [&>*:first-child]:mt-0
                      ">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {cleanChatMessage(msg.content)}
                        </ReactMarkdown>
                      </div>
                    )}

                    {/* Threat action row — only for agent messages that have real content */}
                    {msg.role !== "user" && msg.id !== "pending-user" && (
                      <div className="mt-3 pt-3 border-t border-border/40">
                        {msg.created_threat_id ? (
                          <Link
                            to={`/threats/${msg.created_threat_id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-nw-blue/40 text-xs text-nw-blue hover:bg-nw-blue/10 transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View Threat Record
                          </Link>
                        ) : (
                          <button
                            onClick={() => handleCreateThreat(msg.id)}
                            disabled={createThreatFromChat.isPending}
                            className="px-3 py-1.5 rounded-md border border-border text-xs text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                          >
                            {createThreatFromChat.isPending ? "Creating…" : "Create Threat Record"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Send error */}
        {sendError && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[600px]">
              <div className="shrink-0 mt-1">
                <div className="h-8 w-8 rounded-full bg-nw-red/20 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-nw-red" />
                </div>
              </div>
              <div className="rounded-lg px-4 py-3 bg-nw-red/10 border border-nw-red/30 text-sm text-nw-red">
                {sendError}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card px-4 py-4">
        <form
          className="flex items-center gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (sendError) setSendError(null);
            }}
            disabled={sendMessage.isPending || isCommanderThinking}
            placeholder={isCommanderThinking ? "COMMANDER is working…" : "Ask COMMANDER to investigate..."}
            className="flex-1 bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={sendMessage.isPending || isCommanderThinking || !input.trim()}
            className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors shrink-0 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <p className="text-[11px] text-muted-foreground mt-2 ml-1">
          Try: "Were there suspicious RDP connections this week?" or "Check database servers for anomalies"
        </p>
      </div>
    </div>
  );
}
