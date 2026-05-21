import { useEffect, useRef } from 'react';
import { Chart, BarController, LineController, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';

Chart.register(BarController, LineController, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip);

export default function AnalyticsChart({ id, height = 80, type, labels, datasets, yCallback }) {
  const ref = useRef();

  useEffect(() => {
    if (!ref.current) return;
    const isDark = matchMedia('(prefers-color-scheme: dark)').matches;
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)';

    const existing = Chart.getChart(ref.current);
    if (existing) existing.destroy();

    const chart = new Chart(ref.current, {
      type,
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: textColor, font: { size: 9 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 7 }, grid: { display: false } },
          y: { ticks: { color: textColor, font: { size: 9 }, callback: yCallback }, grid: { color: gridColor } },
          ...(datasets.length > 1 && datasets[1].yAxisID === 'y2' ? {
            y2: { position: 'right', ticks: { color: '#D85A30', font: { size: 9 } }, grid: { display: false } }
          } : {})
        }
      }
    });

    return () => chart.destroy();
  }, [labels, datasets, type]);

  return (
    <div style={{ position: 'relative', height: `${height}px`, marginTop: '8px' }}>
      <canvas ref={ref} id={id} role="img" aria-label={id} />
    </div>
  );
}
