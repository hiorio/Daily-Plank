import { WorkoutEngineState } from '../engine/WorkoutEngine';
import { WorkoutRecord, WorkoutRecordStatus } from '../domain/workoutRecord';
import { WorkoutSession } from '../domain/workoutSession';
import { calculateCompletionRate } from '../utils/duration';
import { createId } from '../utils/id';
import { insertWorkoutRecord } from '../database/workoutRecordRepository';

export function buildWorkoutRecord(
  session: WorkoutSession,
  engineState: WorkoutEngineState,
  status: WorkoutRecordStatus,
  now = new Date(),
): WorkoutRecord {
  const startedAt = engineState.sessionStartedAt
    ? new Date(engineState.sessionStartedAt).toISOString()
    : now.toISOString();
  const actualDurationSeconds = engineState.sessionStartedAt
    ? Math.max(
        0,
        Math.floor((now.getTime() - engineState.sessionStartedAt - engineState.accumulatedPauseMs) / 1000),
      )
    : 0;
  const cappedActualDurationSeconds = Math.min(actualDurationSeconds, session.totalDurationSeconds);

  return {
    id: createId('record'),
    sessionId: session.id,
    sessionTitle: session.title,
    startedAt,
    completedAt: status === 'COMPLETED' ? now.toISOString() : null,
    plannedDurationSeconds: session.totalDurationSeconds,
    actualDurationSeconds: cappedActualDurationSeconds,
    completionRate: calculateCompletionRate(cappedActualDurationSeconds, session.totalDurationSeconds),
    skippedStepCount: engineState.skippedStepCount,
    status,
  };
}

export async function saveWorkoutRecord(record: WorkoutRecord): Promise<void> {
  try {
    await insertWorkoutRecord(record);
  } catch (error) {
    if (__DEV__) console.error('Workout record save failed', error);
    throw error;
  }
}
