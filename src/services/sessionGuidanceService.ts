import { COUNTDOWN_TRACK_MESSAGE, COUNTDOWN_TRACK_START_SECONDS } from '../domain/countdown';
import { Exercise } from '../domain/exercise';
import { WorkoutCue, WorkoutSession, WorkoutStep } from '../domain/workoutSession';
import { exerciseById, exercises } from '../data/exercises';
import { polishSpeechMessage } from '../engine/speechText';

const SAFE_REST_DURATIONS_SECONDS = [3, 5, 15, 20] as const;
const SHORT_REST_START_MESSAGE = '잠시 쉬어 주세요.';
const ENCOURAGEMENT_MESSAGE = '이제 거의 다 왔어요. 조금만 힘내세요.';
const TEN_SECOND_MESSAGE = '10초 남았습니다.';

function hasFinalConsonant(text: string): boolean {
  const lastChar = [...text.trim()].at(-1);
  if (!lastChar) return false;
  const code = lastChar.charCodeAt(0) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
}

function objectParticle(text: string): '을' | '를' {
  return hasFinalConsonant(text) ? '을' : '를';
}

export function getExerciseStartMessage(exerciseName: string): string {
  return `${exerciseName}${objectParticle(exerciseName)} 시작해 주세요.`;
}

export function getNextExerciseMessage(exerciseName: string): string {
  return `다음 동작은 ${exerciseName}입니다.`;
}

export function getRestStartMessage(durationSeconds: number): string {
  if (durationSeconds <= COUNTDOWN_TRACK_START_SECONDS) return SHORT_REST_START_MESSAGE;
  return `${durationSeconds}초 쉬어 주세요.`;
}

function nextExerciseName(session: WorkoutSession, stepIndex: number): string | null {
  for (let index = stepIndex + 1; index < session.steps.length; index += 1) {
    const exerciseId = session.steps[index]?.exerciseId;
    if (!exerciseId) continue;
    return exerciseById.get(exerciseId)?.name ?? session.steps[index]?.title ?? null;
  }
  return null;
}

function isLastExerciseStep(session: WorkoutSession, stepIndex: number): boolean {
  return !session.steps.slice(stepIndex + 1).some((step) => step.type === 'EXERCISE');
}

function getExerciseForStep(step: WorkoutStep): Exercise | null {
  return step.exerciseId ? exerciseById.get(step.exerciseId) ?? null : null;
}

function buildGuidanceCues(session: WorkoutSession, step: WorkoutStep, stepIndex: number): WorkoutCue[] {
  const cues: WorkoutCue[] = [];
  const nextName = nextExerciseName(session, stepIndex);
  const exercise = getExerciseForStep(step);

  if (step.type === 'REST' && nextName && step.durationSeconds >= 8) {
    cues.push({
      elapsedSeconds: Math.min(3, Math.max(1, step.durationSeconds - COUNTDOWN_TRACK_START_SECONDS)),
      message: getNextExerciseMessage(nextName),
      cueType: 'VOICE',
    });
  }

  if (exercise && step.durationSeconds >= 24) {
    cues.push({
      elapsedSeconds: Math.max(8, Math.floor(step.durationSeconds / 2)),
      message: polishSpeechMessage(exercise.activeGuides[0] ?? '자세를 안정적으로 유지해 주세요.'),
      cueType: 'VOICE',
    });
  }

  if (step.type === 'EXERCISE' && isLastExerciseStep(session, stepIndex) && step.durationSeconds >= 25) {
    cues.push({
      elapsedSeconds: Math.max(8, Math.min(22, step.durationSeconds - 12)),
      message: ENCOURAGEMENT_MESSAGE,
      cueType: 'VOICE',
    });
  }

  if (step.type === 'EXERCISE' && step.durationSeconds > 12) {
    cues.push({ remainingSeconds: 10, message: TEN_SECOND_MESSAGE, cueType: 'VOICE' });
  }

  if (step.durationSeconds > COUNTDOWN_TRACK_START_SECONDS) {
    cues.push({
      remainingSeconds: COUNTDOWN_TRACK_START_SECONDS,
      message: COUNTDOWN_TRACK_MESSAGE,
      cueType: 'VOICE',
    });
  }

  return cues;
}

function normalizeStep(session: WorkoutSession, step: WorkoutStep, stepIndex: number): WorkoutStep {
  const exercise = getExerciseForStep(step);

  if (step.type === 'EXERCISE' && exercise) {
    return {
      ...step,
      title: exercise.name,
      startMessage: getExerciseStartMessage(exercise.name),
      cues: buildGuidanceCues(session, step, stepIndex),
    };
  }

  if (step.type === 'PREPARE') {
    return {
      ...step,
      title: '운동 준비',
      startMessage: '운동을 준비해 주세요.',
      cues: buildGuidanceCues(session, step, stepIndex),
    };
  }

  if (step.type === 'REST') {
    return {
      ...step,
      title: '휴식',
      startMessage: getRestStartMessage(step.durationSeconds),
      cues: buildGuidanceCues(session, step, stepIndex),
    };
  }

  if (step.type === 'COOLDOWN') {
    return {
      ...step,
      title: '마무리 호흡',
      startMessage: '운동을 마무리해 주세요.',
      cues: buildGuidanceCues(session, step, stepIndex),
    };
  }

  return {
    ...step,
    cues: buildGuidanceCues(session, step, stepIndex),
  };
}

export function buildGuidedCustomSession(session: WorkoutSession): WorkoutSession {
  const totalDurationSeconds = session.steps.reduce(
    (total, step) => total + Math.max(1, step.durationSeconds),
    0,
  );
  const durationSafeSession: WorkoutSession = {
    ...session,
    totalDurationSeconds,
    steps: session.steps.map((step) => ({
      ...step,
      durationSeconds: Math.max(1, step.durationSeconds),
    })),
  };

  return {
    ...durationSafeSession,
    steps: durationSafeSession.steps.map((step, index) =>
      normalizeStep(durationSafeSession, step, index),
    ),
  };
}

export function replaceExerciseInSession(
  session: WorkoutSession,
  stepId: string,
  exerciseId: string,
): WorkoutSession {
  const exercise = exerciseById.get(exerciseId);
  if (!exercise) return session;

  return buildGuidedCustomSession({
    ...session,
    steps: session.steps.map((step) =>
      step.id === stepId && step.type === 'EXERCISE'
        ? {
            ...step,
            exerciseId,
            title: exercise.name,
          }
        : step,
    ),
  });
}

export function replaceStepDurationInSession(
  session: WorkoutSession,
  stepId: string,
  durationSeconds: number,
): WorkoutSession {
  return buildGuidedCustomSession({
    ...session,
    steps: session.steps.map((step) =>
      step.id === stepId
        ? {
            ...step,
            durationSeconds: Math.max(1, durationSeconds),
          }
        : step,
    ),
  });
}

export function getSafeRestDurations(): number[] {
  return [...SAFE_REST_DURATIONS_SECONDS];
}

export function getCustomSessionTtsMessages(): string[] {
  const messages = new Set<string>([
    '운동을 준비해 주세요.',
    '운동을 마무리해 주세요.',
    SHORT_REST_START_MESSAGE,
    TEN_SECOND_MESSAGE,
    ENCOURAGEMENT_MESSAGE,
    COUNTDOWN_TRACK_MESSAGE,
  ]);

  for (const duration of SAFE_REST_DURATIONS_SECONDS) {
    messages.add(getRestStartMessage(duration));
  }

  for (const exercise of exercises) {
    messages.add(getExerciseStartMessage(exercise.name));
    messages.add(getNextExerciseMessage(exercise.name));
    for (const guide of exercise.activeGuides) {
      messages.add(polishSpeechMessage(guide));
    }
  }

  return [...messages];
}
