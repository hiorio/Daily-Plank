import { WorkoutSession } from '../domain/workoutSession';

export interface StepProgressResult {
  currentStepIndex: number;
  stepStartedAt: number;
  stepEndsAt: number;
  completed: boolean;
}

export function calculateRemainingMs(stepEndsAt: number | null, now: number): number {
  if (stepEndsAt == null) return 0;
  return Math.max(0, stepEndsAt - now);
}

export function calculateElapsedSeconds(startedAt: number | null, now: number, pauseMs = 0): number {
  if (startedAt == null) return 0;
  return Math.max(0, Math.floor((now - startedAt - pauseMs) / 1000));
}

export function shiftStepEndAfterPause(stepEndsAt: number, pausedAt: number, resumedAt: number): number {
  return stepEndsAt + Math.max(0, resumedAt - pausedAt);
}

export function resolveStepProgressAfterElapsedTime(
  session: WorkoutSession,
  currentStepIndex: number,
  stepStartedAt: number,
  stepEndsAt: number,
  now: number,
): StepProgressResult {
  if (now < stepEndsAt) {
    return { currentStepIndex, stepStartedAt, stepEndsAt, completed: false };
  }

  let nextIndex = currentStepIndex;
  let nextStepStartedAt = stepStartedAt;
  let nextStepEndsAt = stepEndsAt;

  while (now >= nextStepEndsAt) {
    nextIndex += 1;
    nextStepStartedAt = nextStepEndsAt;

    const nextStep = session.steps[nextIndex];
    if (!nextStep) {
      return {
        currentStepIndex: session.steps.length - 1,
        stepStartedAt: nextStepStartedAt,
        stepEndsAt: nextStepEndsAt,
        completed: true,
      };
    }

    nextStepEndsAt = nextStepStartedAt + nextStep.durationSeconds * 1000;
  }

  return {
    currentStepIndex: nextIndex,
    stepStartedAt: nextStepStartedAt,
    stepEndsAt: nextStepEndsAt,
    completed: false,
  };
}

export function calculateStepElapsedSeconds(stepStartedAt: number | null, now: number): number {
  if (stepStartedAt == null) return 0;
  return Math.max(0, Math.floor((now - stepStartedAt) / 1000));
}
