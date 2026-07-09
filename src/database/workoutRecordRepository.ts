import { WorkoutRecord } from '../domain/workoutRecord';
import { getDatabase } from './database';

interface WorkoutRecordRow {
  record_id: string;
  session_id: string;
  session_title: string;
  started_at: string;
  completed_at: string | null;
  planned_duration_seconds: number;
  actual_duration_seconds: number;
  completion_rate: number;
  skipped_step_count: number;
  status: WorkoutRecord['status'];
}

function fromRow(row: WorkoutRecordRow): WorkoutRecord {
  return {
    id: row.record_id,
    sessionId: row.session_id,
    sessionTitle: row.session_title,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    plannedDurationSeconds: row.planned_duration_seconds,
    actualDurationSeconds: row.actual_duration_seconds,
    completionRate: row.completion_rate,
    skippedStepCount: row.skipped_step_count,
    status: row.status,
  };
}

export async function insertWorkoutRecord(record: WorkoutRecord): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO workout_record (
      record_id,
      session_id,
      session_title,
      started_at,
      completed_at,
      planned_duration_seconds,
      actual_duration_seconds,
      completion_rate,
      skipped_step_count,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.sessionId,
      record.sessionTitle,
      record.startedAt,
      record.completedAt,
      record.plannedDurationSeconds,
      record.actualDurationSeconds,
      record.completionRate,
      record.skippedStepCount,
      record.status,
    ],
  );
}

export async function getRecentWorkoutRecords(limit = 30): Promise<WorkoutRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<WorkoutRecordRow>(
    `SELECT * FROM workout_record ORDER BY started_at DESC LIMIT ?`,
    [limit],
  );
  return rows.map(fromRow);
}

export async function getWorkoutRecordsBetween(startIso: string, endIso: string, limit = 500): Promise<WorkoutRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<WorkoutRecordRow>(
    `SELECT * FROM workout_record
     WHERE COALESCE(completed_at, started_at) >= ?
       AND COALESCE(completed_at, started_at) < ?
     ORDER BY COALESCE(completed_at, started_at) DESC
     LIMIT ?`,
    [startIso, endIso, limit],
  );
  return rows.map(fromRow);
}

export async function getWorkoutRecordById(recordId: string): Promise<WorkoutRecord | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<WorkoutRecordRow>(
    `SELECT * FROM workout_record WHERE record_id = ?`,
    [recordId],
  );
  return row ? fromRow(row) : null;
}

export async function deleteAllWorkoutRecords(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM workout_record');
}
