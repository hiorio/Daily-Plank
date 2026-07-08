import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { getWorkoutSessions } from '../data/sessionRepository';
import { exercises } from '../data/exercises';
import { initializeDatabase } from '../database/database';
import { getRecentWorkoutRecords } from '../database/workoutRecordRepository';
import { loadSettings } from './settingsService';
import { validateWorkoutSession } from '../utils/validation';

export type DiagnosticStatus = 'PASS' | 'WARN' | 'FAIL';

export interface DiagnosticItem {
  id: string;
  title: string;
  message: string;
  status: DiagnosticStatus;
}

export interface DiagnosticsReport {
  generatedAt: string;
  appName: string;
  appVersion: string;
  bundleIdentifier: string;
  platform: string;
  runtime: string;
  items: DiagnosticItem[];
}

const DIAGNOSTIC_STORAGE_KEY = 'daily-plank:diagnostics-probe';

export async function runAppDiagnostics(): Promise<DiagnosticsReport> {
  const items = await Promise.all([
    checkSessionData(),
    checkDatabase(),
    checkSettings(),
    checkStorage(),
    checkSpeechVoices(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    appName: Constants.expoConfig?.name ?? 'Daily Plank',
    appVersion: Constants.expoConfig?.version ?? 'unknown',
    bundleIdentifier:
      Constants.expoConfig?.ios?.bundleIdentifier ??
      Constants.expoConfig?.android?.package ??
      'unknown',
    platform: `${Platform.OS} ${Platform.Version}`,
    runtime: String(Constants.executionEnvironment ?? 'unknown'),
    items,
  };
}

async function checkSessionData(): Promise<DiagnosticItem> {
  try {
    const sessions = getWorkoutSessions();
    for (const session of sessions) {
      validateWorkoutSession(session, exercises);
    }
    return {
      id: 'session-data',
      title: '세션 데이터',
      message: `${sessions.length}개 세션 검증 완료`,
      status: 'PASS',
    };
  } catch (error) {
    return failItem('session-data', '세션 데이터', error);
  }
}

async function checkDatabase(): Promise<DiagnosticItem> {
  try {
    await initializeDatabase();
    await getRecentWorkoutRecords(1);
    return {
      id: 'database',
      title: '운동 기록 저장소',
      message: 'SQLite 초기화와 기록 조회 가능',
      status: 'PASS',
    };
  } catch (error) {
    return failItem('database', '운동 기록 저장소', error);
  }
}

async function checkSettings(): Promise<DiagnosticItem> {
  try {
    const settings = await loadSettings();
    const enabledCount = Object.values(settings).filter((value) => value === true).length;
    return {
      id: 'settings',
      title: '설정 저장소',
      message: `설정 로드 완료, ${enabledCount}개 항목 켜짐`,
      status: 'PASS',
    };
  } catch (error) {
    return failItem('settings', '설정 저장소', error);
  }
}

async function checkStorage(): Promise<DiagnosticItem> {
  try {
    await AsyncStorage.setItem(DIAGNOSTIC_STORAGE_KEY, new Date().toISOString());
    await AsyncStorage.removeItem(DIAGNOSTIC_STORAGE_KEY);
    return {
      id: 'async-storage',
      title: '로컬 임시 저장소',
      message: 'AsyncStorage 쓰기와 삭제 가능',
      status: 'PASS',
    };
  } catch (error) {
    return failItem('async-storage', '로컬 임시 저장소', error);
  }
}

async function checkSpeechVoices(): Promise<DiagnosticItem> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const koreanVoiceCount = voices.filter((voice) =>
      voice.language.toLowerCase().startsWith('ko'),
    ).length;

    if (koreanVoiceCount === 0) {
      return {
        id: 'speech',
        title: '한국어 음성',
        message: '한국어 TTS 음성이 감지되지 않았다. 기기 기본 음성으로 대체될 수 있다.',
        status: 'WARN',
      };
    }

    return {
      id: 'speech',
      title: '한국어 음성',
      message: `한국어 TTS 음성 ${koreanVoiceCount}개 감지`,
      status: 'PASS',
    };
  } catch (error) {
    return {
      id: 'speech',
      title: '한국어 음성',
      message: `음성 목록 확인 실패: ${errorToMessage(error)}`,
      status: 'WARN',
    };
  }
}

function failItem(id: string, title: string, error: unknown): DiagnosticItem {
  return {
    id,
    title,
    message: errorToMessage(error),
    status: 'FAIL',
  };
}

function errorToMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return '알 수 없는 오류가 발생했다.';
}
