export const CHART_COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

export const CHART_TOOLTIP_STYLE = (dark) => ({
  borderRadius: 10,
  fontSize: 12,
  border: 'none',
  boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
  background: dark ? '#1f2937' : '#fff',
  color: dark ? '#f3f4f6' : '#111827',
});

export const CHART_GRID_COLOR = (dark) => dark ? '#374151' : '#f0f4f8';
