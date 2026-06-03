import { useQuery } from '@tanstack/react-query';
import type { JobPollResponse } from '../types';

const BASE_URL = '/api';

export async function uploadImage(file: File): Promise<{ job_id: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE_URL}/profiler/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}

export function useJobPoller(jobId: string | null, enabled: boolean) {
  return useQuery<JobPollResponse>({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/jobs/${jobId}`);
      if (!res.ok) throw new Error(`Job fetch failed: ${res.status}`);
      return res.json();
    },
    enabled: enabled && jobId !== null,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 400;
      if (data.status === 'SUCCESS' || data.status === 'FAILURE') return false;
      return 400;
    },
    staleTime: 0,
  });
}
