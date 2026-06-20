import { useEffect, useState } from 'react';
import { useWorkoutStore, WorkoutSnapshot } from '../stores/workoutStore';

export function useWorkoutTimer(): WorkoutSnapshot {
  const tick = useWorkoutStore((store) => store.tick);
  const getSnapshot = useWorkoutStore((store) => store.getSnapshot);
  useWorkoutStore((store) => store.state);
  useWorkoutStore((store) => store.session);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const nextNow = Date.now();
      setNow(nextNow);
      void tick(nextNow);
    }, 250);
    return () => clearInterval(interval);
  }, [tick]);

  return getSnapshot(now);
}
