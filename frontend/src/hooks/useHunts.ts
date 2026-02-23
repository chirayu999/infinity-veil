import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { HuntCycleListResponse, HuntCycleDetailResponse, HuntCycle, HuntFilters } from '@/types';

// GET /api/v1/hunts
export function useHunts(filters: HuntFilters = {}) {
  return useQuery<HuntCycleListResponse>({
    queryKey: ['hunts', filters],
    queryFn: () =>
      api.get<HuntCycleListResponse>('/hunts', filters as Record<string, any>),
  });
}

// GET /api/v1/hunts/:id
export function useHunt(id: string, refetchInterval?: number) {
  return useQuery<HuntCycleDetailResponse>({
    queryKey: ['hunts', id],
    queryFn: () => api.get<HuntCycleDetailResponse>(`/hunts/${id}`),
    enabled: !!id,
    refetchInterval,
  });
}

// POST /api/v1/hunts  (trigger a manual hunt)
export function useTriggerHunt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.post<{ hunt_cycle: HuntCycle }>('/hunts', {
        hunt_cycle: { triggered_by: 'manual' },
      }),
    onSuccess: () => {
      toast.success('Hunt cycle queued', {
        description: 'Results will appear once the hunt completes.',
      });
      queryClient.invalidateQueries({ queryKey: ['hunts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: () => {
      toast.error('Failed to trigger hunt', {
        description: 'Please try again or check the server logs.',
      });
    },
  });
}

