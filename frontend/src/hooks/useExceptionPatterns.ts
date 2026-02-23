import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ExceptionPattern } from '@/types';

interface ExceptionFilters {
  active?: boolean;
  pattern_type?: string;
  page?: number;
  per_page?: number;
}

interface ExceptionPatternsResponse {
  exception_patterns: ExceptionPattern[];
  meta: { current_page: number; total_pages: number; total_count: number; per_page: number };
}

// GET /api/v1/exception_patterns
export function useExceptionPatterns(filters: ExceptionFilters = {}) {
  return useQuery<ExceptionPatternsResponse>({
    queryKey: ['exception_patterns', filters],
    queryFn: () =>
      api.get<ExceptionPatternsResponse>(
        '/exception_patterns',
        filters as Record<string, any>
      ),
  });
}

