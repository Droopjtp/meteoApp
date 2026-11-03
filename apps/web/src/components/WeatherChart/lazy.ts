import { lazy } from 'react';

// Recharts is the heaviest dependency: kept out of the initial bundle...
const load = () => import('./WeatherChart');

export const LazyWeatherChart = lazy(load);

/** ...and fetched while the browser is idle, so the first chart renders without waiting. */
export function preloadWeatherChart() {
  const preload = () => void load();
  if ('requestIdleCallback' in window) window.requestIdleCallback(preload);
  else setTimeout(preload, 2000);
}
