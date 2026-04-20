/**
 * Shared in-memory job store for pipeline execution.
 * Acts as a fast fallback when Supabase pipeline_jobs table is not yet set up.
 * Both /api/pipeline/run and /api/pipeline/job/[id] import from here.
 */

export type JobStatus = 'queued' | 'running' | 'completed' | 'error';

export interface PipelineJob {
  id: string;
  pipeline_id: string;
  status: JobStatus;
  input: string;
  output?: string;
  current_node?: string | null;
  nodeOutputs?: Record<string, string>;
  logs: string[];
  created_at: string;
}

// Module-singleton map — shared across all imports within the same Node.js process
export const globalJobsMap = new Map<string, PipelineJob>();
