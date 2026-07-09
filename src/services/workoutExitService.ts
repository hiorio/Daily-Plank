import { WorkoutSession } from '../domain/workoutSession';
import { WorkoutEngineState } from '../engine/WorkoutEngine';

export function shouldCompleteWorkoutOnExit(session: WorkoutSession, state: WorkoutEngineState): boolean {
  const currentStep = session.steps[state.currentStepIndex];
  return currentStep?.type === 'COOLDOWN';
}
