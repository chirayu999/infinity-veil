import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ReviewQueueResponse, ReviewQueueItem, ReviewFilters } from '@/types';

// GET /api/v1/review_queue?review_status=pending
export function useReviewQueue(filters: ReviewFilters = {}) {
  return useQuery<ReviewQueueResponse>({
    queryKey: ['review_queue', filters],
    queryFn: () =>
      api.get<ReviewQueueResponse>('/review_queue', filters as Record<string, any>),
  });
}

// PATCH /api/v1/review_queue/:id  (confirm or reject FP)
export function useReviewAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      review_status,
      review_notes,
    }: {
      id: string;
      review_status: 'confirmed_fp' | 'rejected_fp';
      review_notes?: string;
    }) =>
      api.patch<{ review_queue_item: ReviewQueueItem }>(`/review_queue/${id}`, {
        review_queue_item: { review_status, review_notes },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review_queue'] });
      queryClient.invalidateQueries({ queryKey: ['threats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

