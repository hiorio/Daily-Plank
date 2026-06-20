import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useWorkoutStore } from '../stores/workoutStore';

export function useAppLifecycle(): void {
  const persistActiveWorkout = useWorkoutStore((store) => store.persistActiveWorkout);
  const tick = useWorkoutStore((store) => store.tick);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        void persistActiveWorkout();
      }
      if (nextState === 'active') {
        void tick(Date.now());
      }
    });

    return () => subscription.remove();
  }, [persistActiveWorkout, tick]);
}
