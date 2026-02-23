import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { DashboardStatsResponse, ActivityFeedResponse } from '@/types';

// GET /api/v1/dashboard/stats
export function useDashboardStats() {
  return useQuery<DashboardStatsResponse>({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get<DashboardStatsResponse>('/dashboard/stats'),
    refetchInterval: 30_000, // auto-refresh every 30 seconds
  });
}

// GET /api/v1/dashboard/activity_feed
export function useActivityFeed(page: number = 1) {
  return useQuery<ActivityFeedResponse>({
    queryKey: ['dashboard', 'activity_feed', page],
    queryFn: () =>
      api.get<ActivityFeedResponse>('/dashboard/activity_feed', { page }),
    refetchInterval: 30_000,
  });
}

