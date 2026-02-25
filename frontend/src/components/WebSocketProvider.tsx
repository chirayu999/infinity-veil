import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { createConsumer, type Cable, type ChannelNameWithParams, type Subscription } from "@rails/actioncable";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ChatHistoryResponse, ChatMessage } from "@/types";

interface WebSocketContextValue {
  subscribe: (channel: ChannelNameWithParams, callbacks: { received?: (data: any) => void }) => Subscription | null;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

// Handles ActionCable events for the "chat" topic, including streaming updates
// from ChatAgentJob (thinking_step, agent_complete, agent_error).
function handleChatEvent(
  payload: Record<string, any>,
  queryClient: QueryClient
) {
  const { type } = payload;

  if (type === "thinking_step") {
    console.log("[WebSocket] Received thinking_step:", payload.content);
    // Update the thinking placeholder text while the agent is working.
    queryClient.setQueryData<ChatHistoryResponse>(["chat", "history"], (old) => {
      if (!old) return old;
      return {
        messages: old.messages.map((msg) =>
          msg.isThinking ? { ...msg, thinkingStep: payload.content as string } : msg
        ),
      };
    });
    return;
  }

  if (type === "agent_complete") {
    console.log("[WebSocket] Received agent_complete:", payload.message?.id);
    // Replace the thinking placeholder with the final agent message.
    const finalMessage = payload.message as ChatMessage;
    queryClient.setQueryData<ChatHistoryResponse>(["chat", "history"], (old) => {
      if (!old) return old;
      const withoutThinking = old.messages.filter((msg) => !msg.isThinking);
      // Guard against duplicate insertion if a refetch already populated the message.
      const alreadyExists = withoutThinking.some((msg) => msg.id === finalMessage.id);
      console.log("[WebSocket] Adding final message, already exists:", alreadyExists);
      return {
        messages: alreadyExists ? withoutThinking : [...withoutThinking, finalMessage],
      };
    });
    // Don't invalidate queries here - we just updated the cache directly
    return;
  }

  if (type === "agent_error") {
    console.log("[WebSocket] Received agent_error:", payload.error);
    // Remove thinking placeholder and add error message if provided
    queryClient.setQueryData<ChatHistoryResponse>(["chat", "history"], (old) => {
      if (!old) return old;
      const withoutThinking = old.messages.filter((msg) => !msg.isThinking);
      // If an error message was provided, add it
      if (payload.message) {
        return { messages: [...withoutThinking, payload.message as ChatMessage] };
      }
      return { messages: withoutThinking };
    });
    return;
  }

  if (type === "new_message") {
    console.log("[WebSocket] Received new_message (legacy):", payload.message?.id);
    // Only invalidate if there's no thinking placeholder (not during streaming)
    const currentData = queryClient.getQueryData<ChatHistoryResponse>(["chat", "history"]);
    const hasThinkingPlaceholder = currentData?.messages.some((msg) => msg.isThinking);
    
    if (!hasThinkingPlaceholder) {
      console.log("[WebSocket] No streaming in progress, invalidating queries");
      queryClient.invalidateQueries({ queryKey: ["chat", "history"] });
    } else {
      console.log("[WebSocket] Streaming in progress, ignoring new_message event");
    }
    return;
  }

  // Default fallback for other chat broadcasts.
  console.log("[WebSocket] Unknown chat event type:", type);
  queryClient.invalidateQueries({ queryKey: ["chat", "history"] });
}

interface WebSocketProviderProps {
  children: React.ReactNode;
  queryClient: QueryClient;
}

export default function WebSocketProvider({ children, queryClient }: WebSocketProviderProps) {
  const cableRef = useRef<Cable | null>(null);

  useEffect(() => {
    const cableUrl = import.meta.env.VITE_CABLE_URL || "/cable";
    cableRef.current = createConsumer(cableUrl);

    const refreshSubscription = cableRef.current.subscriptions.create(
      { channel: "FrontendUpdatesChannel" },
      {
        received: (payload: Record<string, any>) => {
          console.log("[WebSocket] Received payload:", payload);
          // Show toasts for notable async events
          if (payload.type === "hunt_status_changed" && payload.hunt) {
            if (payload.hunt.status === "completed") {
              const count = payload.hunt.threats_found_count ?? 0;
              toast.success("Hunt cycle completed", {
                description: count > 0 ? `Found ${count} threat${count === 1 ? "" : "s"}.` : "No new threats detected.",
              });
            } else if (payload.hunt.status === "failed") {
              toast.error("Hunt cycle failed", {
                description: "The hunt encountered an error. Check the hunt history for details.",
              });
            }
          }

          if (payload.type === "new_threat" && payload.threat) {
            toast.warning("New threat detected", {
              description: payload.threat.title ?? "A new threat has been identified.",
            });
          }

          // Handle chat events first so new_message doesn't trigger query_key invalidation
          // and wipe the optimistic thinking placeholder during streaming.
          if (payload.topic === "chat") {
            handleChatEvent(payload, queryClient);
            return;
          }

          if (payload.query_key && payload.query_key.length > 0) {
            queryClient.invalidateQueries({ queryKey: payload.query_key });
            return;
          }

          if (payload.topic === "dashboard") {
            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          } else if (payload.topic === "threats") {
            queryClient.invalidateQueries({ queryKey: ["threats"] });
          } else if (payload.topic === "review_queue") {
            queryClient.invalidateQueries({ queryKey: ["review_queue"] });
          } else if (payload.topic === "hunts") {
            queryClient.invalidateQueries({ queryKey: ["hunts"] });
          } else {
            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            queryClient.invalidateQueries({ queryKey: ["chat", "history"] });
          }
        },
      }
    );

    return () => {
      refreshSubscription.unsubscribe();
      cableRef.current?.disconnect();
      cableRef.current = null;
    };
  }, [queryClient]);

  const value = useMemo<WebSocketContextValue>(() => {
    return {
      subscribe: (channel, callbacks) => {
        if (!cableRef.current) return null;
        return cableRef.current.subscriptions.create(channel, {
          received: callbacks.received,
        });
      },
    };
  }, []);

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within WebSocketProvider");
  }
  return context;
}

