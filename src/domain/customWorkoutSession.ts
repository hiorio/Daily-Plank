import { WorkoutSession } from './workoutSession';

export interface CustomWorkoutSession {
  id: string;
  baseSessionId: string;
  name: string;
  session: WorkoutSession;
  createdAt: string;
  updatedAt: string;
}

export interface CustomWorkoutSessionState {
  savedSessions: CustomWorkoutSession[];
  activeByBaseSessionId: Record<string, string | undefined>;
}

export const emptyCustomWorkoutSessionState: CustomWorkoutSessionState = {
  savedSessions: [],
  activeByBaseSessionId: {},
};
