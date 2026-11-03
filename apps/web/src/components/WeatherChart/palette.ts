import type { Theme } from '../../theme/theme';

/**
 * Categorical palette in a fixed order validated for colour-vision deficiencies
 * (adjacent pairs ΔE ≥ 8). A series keeps its slot: colour follows the series, never its rank.
 * Dark mode uses the same hues stepped for the dark surface (all ≥ 3:1 against it), not an inversion.
 */
const SERIES_COLORS: Record<Theme, readonly string[]> = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
};

export interface ChartInk {
  grid: string;
  axis: string;
  muted: string;
  secondary: string;
  surface: string;
}

const CHART_INK: Record<Theme, ChartInk> = {
  light: {
    grid: '#e1e0d9',
    axis: '#c3c2b7',
    muted: '#898781',
    secondary: '#52514e',
    surface: '#ffffff',
  },
  dark: {
    grid: '#2c2c2a',
    axis: '#45453f',
    muted: '#898781',
    secondary: '#c3c2b7',
    surface: '#1a1a19',
  },
};

export function chartInk(theme: Theme): ChartInk {
  return CHART_INK[theme];
}

export function seriesColor(index: number, theme: Theme): string {
  const colors = SERIES_COLORS[theme];
  return colors[index % colors.length] ?? colors[0] ?? '#2a78d6';
}
