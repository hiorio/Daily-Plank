import { SQLiteDatabase } from 'expo-sqlite';

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS workout_record (
      record_id TEXT PRIMARY KEY NOT NULL,
      session_id TEXT NOT NULL,
      session_title TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      planned_duration_seconds INTEGER NOT NULL,
      actual_duration_seconds INTEGER NOT NULL,
      completion_rate REAL NOT NULL,
      skipped_step_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_workout_record_started_at
    ON workout_record(started_at);
  `);
}
