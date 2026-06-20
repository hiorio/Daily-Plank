import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('plank-guide.db').then(async (db) => {
      await runMigrations(db);
      return db;
    });
  }
  return databasePromise;
}

export async function initializeDatabase(): Promise<void> {
  try {
    await getDatabase();
  } catch (error) {
    databasePromise = null;
    if (__DEV__) console.error('SQLite initialization failed', error);
    throw error;
  }
}
