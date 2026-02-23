import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ChatHistoryResponse, ChatMessage } from '@/types';

// GET /api/v1/chat/history
export function useChatHistory() {
  return useQuery<ChatHistoryResponse>({
    queryKey: ['chat', 'history'],
    queryFn: () => api.get<ChatHistoryResponse>('/chat/history'),
  });
}

// POST /api/v1/chat  →  202 Accepted  (async — ChatAgentJob does the Kibana call)
//
// The optimistic update adds a user bubble and an isThinking placeholder.
// Once the 202 arrives the mutation settles but we do NOT invalidate — the
// thinking placeholder stays visible and ActionCable events drive all further
// updates (thinking_step → agent_complete / agent_error in WebSocketProvider).
export function useSendChatMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) =>
      api.post<{ user_message_id: string; message: ChatMessage }>('/chat', { message: { content } }),

    onMutate: async (content: string) => {
      console.log("[useChat] Starting optimistic update for:", content);
      await queryClient.cancelQueries({ queryKey: ['chat', 'history'] });
      const prev = queryClient.getQueryData<ChatHistoryResponse>(['chat', 'history']);

      const now = new Date().toISOString();
      const optimisticUser: ChatMessage = {
        id: 'pending-user',
        role: 'user',
        content,
        agent_name: null,
        metadata: null,
        created_threat_id: null,
        created_at: now,
      };
      const optimisticThinking: ChatMessage = {
        id: 'pending-thinking',
        role: 'agent',
        content: '',
        agent_name: 'COMMANDER',
        metadata: null,
        created_threat_id: null,
        created_at: now,
        isThinking: true,
      };

      queryClient.setQueryData<ChatHistoryResponse>(['chat', 'history'], (old) => ({
        messages: [...(old?.messages ?? []), optimisticUser, optimisticThinking],
      }));

      console.log("[useChat] Added optimistic messages");
      return { prev };
    },

    // No onSuccess handler - let ActionCable handle all updates after 202

    onError: (_err, _vars, ctx) => {
      console.log("[useChat] Mutation error, rolling back:", _err);
      // Network or 4xx/5xx before the job was enqueued — roll back the
      // optimistic messages so the error bubble can render cleanly.
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(['chat', 'history'], ctx.prev);
      }
    },

    // No onSettled invalidation — ActionCable drives updates from here.
  });
}

// POST /api/v1/chat/create_threat  (promote chat finding to a Threat record)
export function useCreateThreatFromChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) =>
      api.post<{ threat_id: string }>('/chat/create_threat', { message_id: messageId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'history'] });
    },
  });
}
