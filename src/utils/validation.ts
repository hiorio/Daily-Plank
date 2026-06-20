import { Exercise } from '../domain/exercise';
import { WorkoutSession } from '../domain/workoutSession';

export function validateWorkoutSession(session: WorkoutSession, exercises: Exercise[]): void {
  if (!session.id.trim()) {
    throw new Error('Workout session id is required.');
  }

  const exerciseIds = new Set(exercises.map((exercise) => exercise.id));
  const stepIds = new Set<string>();
  let totalDurationSeconds = 0;

  for (const step of session.steps) {
    if (stepIds.has(step.id)) {
      throw new Error(`Duplicate workout step id: ${step.id}`);
    }
    stepIds.add(step.id);

    if (step.durationSeconds < 1) {
      throw new Error(`Workout step ${step.id} must be at least 1 second.`);
    }

    if (step.type === 'EXERCISE' && !step.exerciseId) {
      throw new Error(`Exercise step ${step.id} must define exerciseId.`);
    }

    if (step.exerciseId && !exerciseIds.has(step.exerciseId)) {
      throw new Error(`Unknown exercise id "${step.exerciseId}" in step ${step.id}.`);
    }

    totalDurationSeconds += step.durationSeconds;
  }

  if (totalDurationSeconds !== session.totalDurationSeconds) {
    throw new Error(
      `Session ${session.id} duration mismatch. steps=${totalDurationSeconds}, total=${session.totalDurationSeconds}`,
    );
  }
}
