import { WorkoutSession } from '../domain/workoutSession';
import {
  resolveStepProgressAfterElapsedTime,
  shiftStepEndAfterPause,
} from './TimerEngine';

export type WorkoutStatus = 'IDLE' | 'COUNTDOWN' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface WorkoutEngineState {
  status: WorkoutStatus;
  sessionId: string | null;
  currentStepIndex: number;
  sessionStartedAt: number | null;
  stepStartedAt: number | null;
  stepEndsAt: number | null;
  pausedAt: number | null;
  accumulatedPauseMs: number;
  skippedStepCount: number;
}

export const initialWorkoutEngineState: WorkoutEngineState = {
  status: 'IDLE',
  sessionId: null,
  currentStepIndex: 0,
  sessionStartedAt: null,
  stepStartedAt: null,
  stepEndsAt: null,
  pausedAt: null,
  accumulatedPauseMs: 0,
  skippedStepCount: 0,
};

export class WorkoutEngine {
  private state: WorkoutEngineState = initialWorkoutEngineState;

  getState(): WorkoutEngineState {
    return { ...this.state };
  }

  replaceState(state: WorkoutEngineState): WorkoutEngineState {
    this.state = { ...state };
    return this.getState();
  }

  startSession(session: WorkoutSession, now = Date.now()): WorkoutEngineState {
    const firstStep = session.steps[0];
    if (!firstStep) {
      throw new Error(`Session ${session.id} has no workout steps.`);
    }

    this.state = {
      status: firstStep.type === 'PREPARE' ? 'COUNTDOWN' : 'RUNNING',
      sessionId: session.id,
      currentStepIndex: 0,
      sessionStartedAt: now,
      stepStartedAt: now,
      stepEndsAt: now + firstStep.durationSeconds * 1000,
      pausedAt: null,
      accumulatedPauseMs: 0,
      skippedStepCount: 0,
    };

    return this.getState();
  }

  pauseSession(now = Date.now()): WorkoutEngineState {
    if (this.state.status !== 'RUNNING' && this.state.status !== 'COUNTDOWN') {
      return this.getState();
    }
    this.state = { ...this.state, status: 'PAUSED', pausedAt: now };
    return this.getState();
  }

  resumeSession(session: WorkoutSession, now = Date.now()): WorkoutEngineState {
    if (this.state.status !== 'PAUSED' || this.state.pausedAt == null || this.state.stepEndsAt == null) {
      return this.getState();
    }

    const pauseDurationMs = Math.max(0, now - this.state.pausedAt);
    const currentStep = session.steps[this.state.currentStepIndex];
    this.state = {
      ...this.state,
      status: currentStep?.type === 'PREPARE' ? 'COUNTDOWN' : 'RUNNING',
      stepEndsAt: shiftStepEndAfterPause(this.state.stepEndsAt, this.state.pausedAt, now),
      accumulatedPauseMs: this.state.accumulatedPauseMs + pauseDurationMs,
      pausedAt: null,
    };
    return this.getState();
  }

  moveToNextStep(session: WorkoutSession, now = Date.now()): WorkoutEngineState {
    if (this.state.status === 'COMPLETED' || this.state.status === 'CANCELLED') {
      return this.getState();
    }

    const nextIndex = this.state.currentStepIndex + 1;
    const nextStep = session.steps[nextIndex];
    if (!nextStep) {
      return this.completeSession();
    }

    const currentStep = session.steps[this.state.currentStepIndex];
    this.state = {
      ...this.state,
      status: nextStep.type === 'PREPARE' ? 'COUNTDOWN' : 'RUNNING',
      currentStepIndex: nextIndex,
      stepStartedAt: now,
      stepEndsAt: now + nextStep.durationSeconds * 1000,
      pausedAt: null,
      skippedStepCount:
        currentStep?.type === 'EXERCISE' ? this.state.skippedStepCount + 1 : this.state.skippedStepCount,
    };
    return this.getState();
  }

  moveToPreviousStep(session: WorkoutSession, now = Date.now()): WorkoutEngineState {
    if (this.state.currentStepIndex <= 0 || this.state.status === 'COMPLETED') {
      return this.getState();
    }

    const previousIndex = this.state.currentStepIndex - 1;
    const previousStep = session.steps[previousIndex];
    if (!previousStep) return this.getState();

    this.state = {
      ...this.state,
      status: previousStep.type === 'PREPARE' ? 'COUNTDOWN' : 'RUNNING',
      currentStepIndex: previousIndex,
      stepStartedAt: now,
      stepEndsAt: now + previousStep.durationSeconds * 1000,
      pausedAt: null,
    };
    return this.getState();
  }

  cancelSession(): WorkoutEngineState {
    if (this.state.status === 'IDLE') return this.getState();
    this.state = { ...this.state, status: 'CANCELLED', pausedAt: null };
    return this.getState();
  }

  completeSession(): WorkoutEngineState {
    if (this.state.status === 'IDLE') return this.getState();
    this.state = { ...this.state, status: 'COMPLETED', pausedAt: null };
    return this.getState();
  }

  restoreSession(session: WorkoutSession, now = Date.now()): WorkoutEngineState {
    if (this.state.status === 'PAUSED') {
      return this.getState();
    }
    return this.reconcile(session, now);
  }

  reconcile(session: WorkoutSession, now = Date.now()): WorkoutEngineState {
    if (
      this.state.status !== 'RUNNING' &&
      this.state.status !== 'COUNTDOWN' &&
      this.state.status !== 'PAUSED'
    ) {
      return this.getState();
    }

    if (this.state.status === 'PAUSED') {
      return this.getState();
    }

    if (this.state.stepStartedAt == null || this.state.stepEndsAt == null) {
      return this.getState();
    }

    const progress = resolveStepProgressAfterElapsedTime(
      session,
      this.state.currentStepIndex,
      this.state.stepStartedAt,
      this.state.stepEndsAt,
      now,
    );

    if (progress.completed) {
      return this.completeSession();
    }

    const step = session.steps[progress.currentStepIndex];
    this.state = {
      ...this.state,
      status: step?.type === 'PREPARE' ? 'COUNTDOWN' : 'RUNNING',
      currentStepIndex: progress.currentStepIndex,
      stepStartedAt: progress.stepStartedAt,
      stepEndsAt: progress.stepEndsAt,
    };

    return this.getState();
  }
}
