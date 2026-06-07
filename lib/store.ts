// On-device persistence (expo-sqlite). Stores the intake log + the single
// user profile row. No cloud / sync in v1.

import * as SQLite from 'expo-sqlite';
import type { IntakeEntry, RecognitionMethod, UserProfile } from './types';
import { DEFAULT_HALF_LIFE_HOURS } from './halflife';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('caffeine.db').then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS intake (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          caffeine_mg REAL NOT NULL,
          product_name TEXT NOT NULL,
          method TEXT NOT NULL,
          consumed_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_intake_time ON intake (consumed_at);
        CREATE TABLE IF NOT EXISTS profile (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          weight_kg REAL NOT NULL,
          age INTEGER NOT NULL,
          is_pregnant INTEGER NOT NULL,
          half_life_hours REAL NOT NULL,
          locale TEXT NOT NULL
        );
      `);
      return db;
    });
  }
  return dbPromise;
}

export interface NewIntake {
  caffeine_mg: number;
  product_name: string;
  method: RecognitionMethod;
  consumed_at?: number;
}

export async function addIntake(entry: NewIntake): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO intake (caffeine_mg, product_name, method, consumed_at) VALUES (?, ?, ?, ?)',
    entry.caffeine_mg,
    entry.product_name,
    entry.method,
    entry.consumed_at ?? Date.now()
  );
  return result.lastInsertRowId;
}

export async function getIntakeSince(sinceMs: number): Promise<IntakeEntry[]> {
  const db = await getDb();
  return db.getAllAsync<IntakeEntry>(
    'SELECT * FROM intake WHERE consumed_at >= ? ORDER BY consumed_at DESC',
    sinceMs
  );
}

export async function getAllIntake(): Promise<IntakeEntry[]> {
  const db = await getDb();
  return db.getAllAsync<IntakeEntry>('SELECT * FROM intake ORDER BY consumed_at DESC');
}

export async function deleteIntake(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM intake WHERE id = ?', id);
}

interface ProfileRow {
  weight_kg: number;
  age: number;
  is_pregnant: number;
  half_life_hours: number;
  locale: string;
}

export async function getProfile(): Promise<UserProfile | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ProfileRow>('SELECT * FROM profile WHERE id = 1');
  if (!row) return null;
  return {
    weight_kg: row.weight_kg,
    age: row.age,
    is_pregnant: row.is_pregnant === 1,
    half_life_hours: row.half_life_hours,
    locale: row.locale === 'ko' ? 'ko' : 'en',
  };
}

export async function saveProfile(p: UserProfile): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO profile (id, weight_kg, age, is_pregnant, half_life_hours, locale)
     VALUES (1, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       weight_kg = excluded.weight_kg,
       age = excluded.age,
       is_pregnant = excluded.is_pregnant,
       half_life_hours = excluded.half_life_hours,
       locale = excluded.locale`,
    p.weight_kg,
    p.age,
    p.is_pregnant ? 1 : 0,
    p.half_life_hours,
    p.locale
  );
}

export const DEFAULT_PROFILE: UserProfile = {
  weight_kg: 65,
  age: 30,
  is_pregnant: false,
  half_life_hours: DEFAULT_HALF_LIFE_HOURS,
  locale: 'en',
};
