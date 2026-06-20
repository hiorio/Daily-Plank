import { WorkoutCue, WorkoutSession, WorkoutStep } from '../domain/workoutSession';
import { validateWorkoutSession } from '../utils/validation';
import { exercises } from './exercises';
import { plank10Session } from './sessions/plank10';
import { plank5Session } from './sessions/plank5';
import { plank7Session } from './sessions/plank7';

const fiveSecondCue: WorkoutCue = {
  remainingSeconds: 5,
  message: '5초 남았다.',
  cueType: 'VOICE',
};

function withFiveSecondCue(step: WorkoutStep, isLastStep: boolean): WorkoutStep {
  if (step.durationSeconds <= 5) return step;

  const cues = step.cues ?? [];
  const alreadyHasFiveSecondVoiceCue = cues.some(
    (cue) => cue.cueType === 'VOICE' && cue.remainingSeconds === 5,
  );
  if (alreadyHasFiveSecondVoiceCue) return step;

  return {
    ...step,
    cues: [
      ...cues,
      isLastStep
        ? { ...fiveSecondCue, message: '세션 완료까지 5초 남았다.' }
        : fiveSecondCue,
    ],
  };
}

function withDefaultCues(session: WorkoutSession): WorkoutSession {
  return {
    ...session,
    steps: session.steps.map((step, index) =>
      withFiveSecondCue(step, index === session.steps.length - 1),
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
