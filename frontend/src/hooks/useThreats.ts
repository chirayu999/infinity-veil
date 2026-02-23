import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  ThreatListResponse,
  ThreatDetailResponse,
  ThreatFilters,
  Threat,
  ThreatAction,
} from '@/types';

// GET /api/v1/threats?status=...&severity=...&page=...
export function useThreats(filters: ThreatFilters = {}) {
  return useQuery<ThreatListResponse>({
    queryKey: ['threats', filters],
    queryFn: () => api.get<ThreatListResponse>('/threats', filters as Record<string, any>),
  });
}

// GET /api/v1/threats/:id
export function useThreat(id: string) {
  return useQuery<ThreatDetailResponse>({
    queryKey: ['threats', id],
    queryFn: () => api.get<ThreatDetailResponse>(`/threats/${id}`),
    enabled: !!id,
  });
}

// PATCH /api/v1/threats/:id
export function useUpdateThreat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Threat>) =>
      api.patch<{ threat: Threat }>(`/threats/${id}`, { threat: data }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['threats', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['threats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// POST /api/v1/threats/:id/actions
export function useCreateThreatAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      threatId,
      action_type,
      notes,
    }: {
      threatId: string;
      action_type: string;
      notes?: string;
    }) =>
      api.post<{ action: ThreatAction }>(`/threats/${threatId}/actions`, {
        threat_action: { action_type, notes },
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['threats', variables.threatId] });
      queryClient.invalidateQueries({ queryKey: ['threats'] });
    },
  });
}

