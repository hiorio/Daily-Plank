export type WorkoutRecordStatus = 'COMPLETED' | 'CANCELLED';

export interface WorkoutRecord {
  id: string;
  sessionId: string;
  sessionTitle: string;
  startedAt: string;
  completedAt: string | null;
  plannedDurationSeconds: number;
  actualDurationSeconds: number;
  completionRate: number;
  skippedStepCount: number;
  status: WorkoutRecordStatus;
}
