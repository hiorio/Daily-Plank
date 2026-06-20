import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useStatisticsStore } from '../stores/statisticsStore';

export function useWorkoutStatistics() {
  const statistics = useStatisticsStore((store) => store.statistics);
  const loading = useStatisticsStore((store) => store.loading);
  const refresh = useStatisticsStore((store) => store.refresh);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { statistics, loading, refresh };
}
