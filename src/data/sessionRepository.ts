import { WorkoutCue, WorkoutSession, WorkoutStep } from '../domain/workoutSession';
import { COUNTDOWN_TRACK_MESSAGE, COUNTDOWN_TRACK_START_SECONDS } from '../domain/countdown';
import { validateWorkoutSession } from '../utils/validation';
import { exerciseById, exercises } from './exercises';
import { plank10Session } from './sessions/plank10';
import { plank5Session } from './sessions/plank5';
import { plank7Session } from './sessions/plank7';
import { polishSpeechMessage } from '../engine/speechText';

function hasVoiceCue(step: WorkoutStep, matcher: (cue: WorkoutCue) => boolean): boolean {
  return (step.cues ?? []).some((cue) => cue.cueType === 'VOICE' && matcher(cue));
}

function nextExerciseTitle(session: WorkoutSession, stepIndex: number): string | null {
  for (let index = stepIndex + 1; index < session.steps.length; index += 1) {
    const exerciseId = session.steps[index]?.exerciseId;
    if (!exerciseId) continue;
    return exerciseById.get(exerciseId)?.name ?? session.steps[index]?.title ?? null;
  }
  return null;
}

function exerciseGuideMessage(step: WorkoutStep): string | null {
  if (step.type !== 'EXERCISE' || !step.exerciseId) return null;
  const exercise = exerciseById.get(step.exerciseId);
  return exercise?.activeGuides[0] ?? '자세를 안정적으로 유지해 주세요.';
}

function withDefaultStartMessage(
  session: WorkoutSession,
  step: WorkoutStep,
  stepIndex: number,
): WorkoutStep {
  if (step.startMessage?.trim()) return step;

  const nextTitle = nextExerciseTitle(session, stepIndex);
  if (step.type === 'PREPARE') {
    return {
      ...step,
      startMessage: nextTitle
        ? `운동을 준비해 주세요. 첫 동작은 ${nextTitle}입니다.`
        : '운동을 준비해 주세요.',
    };
  }

  if (step.type === 'REST') {
    return {
      ...step,
      startMessage: nextTitle ? `잠시 쉬어 주세요. 다음 동작은 ${nextTitle}입니다.` : '잠시 쉬어 주세요.',
    };
  }

  if (step.type === 'COOLDOWN') {
    return { ...step, startMessage: '운동을 마무리해 주세요.' };
  }

  return { ...step, startMessage: `${step.title}을 시작해 주세요.` };
}

function withDefaultVoiceCues(
  session: WorkoutSession,
  step: WorkoutStep,
  stepIndex: number,
): WorkoutStep {
  let cues = [...(step.cues ?? [])];
  const addCue = (cue: WorkoutCue, matcher: (existingCue: WorkoutCue) => boolean) => {
    if (hasVoiceCue({ ...step, cues }, matcher)) return;
    cues = [...cues, cue];
  };

  const nextTitle = nextExerciseTitle(session, stepIndex);
  const guideMessage = exerciseGuideMessage(step);

  if ((step.type === 'PREPARE' || step.type === 'REST') && nextTitle && step.durationSeconds >= 13) {
    addCue(
      {
        elapsedSeconds: Math.min(3, Math.max(1, step.durationSeconds - 5)),
        message: `다음 동작은 ${nextTitle}입니다.`,
        cueType: 'VOICE',
      },
      (cue) => cue.elapsedSeconds != null && cue.message.includes(nextTitle),
    );
  }

  if (guideMessage && step.durationSeconds >= 24) {
    const halfwaySeconds = Math.max(8, Math.floor(step.durationSeconds / 2));
    addCue(
      {
        elapsedSeconds: halfwaySeconds,
        message: guideMessage,
        cueType: 'VOICE',
      },
      (cue) => cue.elapsedSeconds != null && cue.elapsedSeconds <= halfwaySeconds + 2,
    );
  }

  if (step.type === 'EXERCISE' && step.durationSeconds > 12) {
    addCue(
      {
        remainingSeconds: 10,
        message: '10초 남았습니다.',
        cueType: 'VOICE',
      },
      (cue) => cue.remainingSeconds === 10,
    );
  }

  if (step.durationSeconds > COUNTDOWN_TRACK_START_SECONDS) {
    addCue(
      {
        remainingSeconds: COUNTDOWN_TRACK_START_SECONDS,
        message: COUNTDOWN_TRACK_MESSAGE,
        cueType: 'VOICE',
      },
      (cue) =>
        cue.remainingSeconds === COUNTDOWN_TRACK_START_SECONDS &&
        cue.message === COUNTDOWN_TRACK_MESSAGE,
    );
  }

  return {
    ...step,
    cues,
  };
}

function withPoliteVoiceText(step: WorkoutStep): WorkoutStep {
  const politeStep: WorkoutStep = { ...step };

  if (step.startMessage) {
    politeStep.startMessage = polishSpeechMessage(step.startMessage);
  }

  if (step.cues) {
    politeStep.cues = step.cues.map((cue) =>
      cue.cueType === 'VOICE' ? { ...cue, message: polishSpeechMessage(cue.message) } : cue,
    );
  }

  return politeStep;
}

function withDefaultStepGuidance(
  session: WorkoutSession,
  step: WorkoutStep,
  stepIndex: number,
): WorkoutStep {
  return withDefaultVoiceCues(
    session,
    withDefaultStartMessage(session, step, stepIndex),
    stepIndex,
  );
}

function withDefaultCues(session: WorkoutSession): WorkoutSession {
  return {
    ...session,
    steps: session.steps.map((step, index) =>
      withPoliteVoiceText(withDefaultStepGuidance(session, step, index)),
    ),
  };
}

export const workoutSessions: WorkoutSession[] = [plank5Session, plank7Session, plank10Session].map(
  withDefaultCues,
);

if (__DEV__) {
  for (const session of workoutSessions) {
    validateWorkoutSession(session, exercises);
  }
}

export function getWorkoutSessions(): WorkoutSession[] {
  return workoutSessions;
}

export function getWorkoutSession(sessionId: string): WorkoutSession | null {
  return workoutSessions.find((session) => session.id === sessionId) ?? null;
}
