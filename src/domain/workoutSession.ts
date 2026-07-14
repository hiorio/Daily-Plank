export type WorkoutStepType = 'PREPARE' | 'EXERCISE' | 'REST' | 'COOLDOWN';

export interface WorkoutCue {
  remainingSeconds?: number;
  elapsedSeconds?: number;
  message: string;
  cueType: 'VOICE' | 'SOUND' | 'HAPTIC';
}

export interface WorkoutStep {
  id: string;
  type: WorkoutStepType;
  title: string;
  durationSeconds: number;
  exerciseId?: string;
  startMessage?: string;
  cues?: WorkoutCue[];
}

export type WorkoutLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface WorkoutSession {
  id: string;
  title: string;
  description: string;
  level: WorkoutLevel;
  totalDurationSeconds: number;
  estimatedCalories?: number;
  steps: WorkoutStep[];
}

export function getExerciseDurationSeconds(session: WorkoutSession): number {
  return session.steps.reduce(
    (total, step) => total + (step.type === 'EXERCISE' ? step.durationSeconds : 0),
    0,
  );
}
