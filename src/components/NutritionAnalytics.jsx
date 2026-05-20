import { useState, useEffect } from 'react';
import AnalyticsChart from './AnalyticsChart';

import { apiFetch } from '../lib/config';

const BASAL = 1906;
const PERIODS = [{ label: '7 dias', days: 7 }, { label: '1 mês', days: 30 }, { label: '1 ano', days: 365 }];

function avg(arr) {
  const v = arr.filter(x => x != null && x > 0);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

function groupByDay(meals) {
  const byDay = {};
  for (const m of meals) {
    if (!byDay[m.date]) {
      byDay[m.date] = {
        date: m.date,
        total_calories: 0, total_protein: 0, total_fat: 0, total_fiber: 0,
        first_meal_ts: Infinity, last_meal_ts: -Infinity,
      };
    }
    const d = byDay[m.date];
    d.total_calories += m.calories || 0;
    d.total_protein += m.protein || 0;
    d.total_fat += m.fat || 0;
    d.total_fiber += m.fiber || 0;
    if (m.ts < d.first_meal_ts) d.first_meal_ts = m.ts;
    if (m.ts > d.last_meal_ts) d.last_meal_ts = m.ts;
  }
  return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
}

function KPI({ label, value, unit, sub, color }) {
  return (
    <div className="metric-card">
      <div className="metric-label" style={{ color, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 500, color: 'var(--text)' }}>
        {value != null ? (typeof value === 'number' ? Math.round(value) : value) : '—'}
        <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text2)' }}>{unit}</span>
      </div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '1.25rem 0 .5rem' }}>{children}</div>;
}

export default function NutritionAnalytics() {
  const [pi, setPi] = useState(0);
  const [data, setData] = useState([]);
  const [health, setHealth] = useState([]);
  const [loading, setLoading] = useState(true);
  const days = PERIODS[pi].days;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch(`/meals/range?days=${days}`).then(r => r.json()),
      apiFetch(`/health-data/range?days=${days}`).then(r => r.json()),
    ]).then(([mealsRes, healthData]) => {
      const meals = mealsRes.meals || [];
      setData(groupByDay(meals));
      setHealth(Array.isArray(healthData) ? healthData.sort((a, b) => a.date.localeCompare(b.date)) : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [pi]);

  const avgCals = avg(data.map(d => d.total_calories));
  const avgProtein = avg(data.map(d => d.total_protein));
  const avgFat = avg(data.map(d => d.total_fat));
  const avgFiber = avg(data.map(d => d.total_fiber));

  const avgActiveCals = avg(health.map(d => d.active_calories));
  const avgTotalBurned = avgActiveCals != null ? BASAL + avgActiveCals : null;
  const avgDeficit = avgTotalBurned && avgCals ? avgTotalBurned - avgCals : null;

  const fastingData = data.map((d, i) => {
    if (i === 0) return 0;
    const prevDay = data[i - 1];
    if (!prevDay.last_meal_ts || prevDay.last_meal_ts === -Infinity) return 0;
    if (!d.first_meal_ts || d.first_meal_ts === Infinity) return 0;
    const hours = (d.first_meal_ts - prevDay.last_meal_ts) / 3600;
    return Math.max(0, Math.min(24, hours));
  });
  const avgFasting = avg(fastingData.filter(h => h > 0));

  const labels = data.map(d => d.date.slice(5));
  const calData = data.map(d => d.total_calories || 0);
  const burnedData = data.map(d => {
    const hd = health.find(h => h.date === d.date);
    return hd ? BASAL + (hd.active_calories || 0) : BASAL;
  });
  const deficitData = burnedData.map((b, i) => b - (calData[i] || 0));

  const deficitColor = avgDeficit == null ? 'var(--text2)' : avgDeficit > 800 ? '#EF9F27' : avgDeficit > 300 ? '#1D9E75' : '#D85A30';
  const deficitLabel = avgDeficit == null ? '—' : avgDeficit > 800 ? 'défice elevado' : avgDeficit > 300 ? 'zona ideal' : 'défice insuficiente';

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div className="period-tabs">
        {PERIODS.map((p, i) => (
          <button key={i} className={`period-tab ${pi === i ? 'active' : ''}`} onClick={() => setPi(i)}>{p.label}</button>
        ))}
      </div>

      {loading && <div className="card center"><p>a carregar...</p></div>}
      {!loading && data.length === 0 && <div className="card center"><p>ainda sem dados — regista refeições para ver o analytics.</p></div>}

      {!loading && data.length > 0 && <>
        <SectionTitle>balanço calórico</SectionTitle>
        <div className="grid2">
          <KPI label="consumidas médias" value={avgCals} unit=" kcal" color="#1D9E75" sub={`em ${data.length} dias`} />
          <KPI label="gastas médias" value={avgTotalBurned} unit=" kcal" color="#D85A30" sub={`basal ${BASAL} + ativas`} />
        </div>
        <div className="metric-card" style={{ marginBottom: '.75rem' }}>
          <div className="metric-label" style={{ color: deficitColor, fontWeight: 500 }}>saldo médio</div>
          <div style={{ fontSize: '28px', fontWeight: 500, color: deficitColor }}>
            {avgDeficit != null ? (avgDeficit >= 0 ? '-' : '+') : ''}{avgDeficit != null ? Math.abs(Math.round(avgDeficit)) : '—'}
            <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text2)' }}> kcal</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '2px' }}>{deficitLabel} · objetivo -500 a -700 kcal</div>
        </div>

        <div className="card" style={{ padding: '.75rem 1rem', marginBottom: '.75rem' }}>
          <div className="metric-label" style={{ color: '#1D9E75', fontWeight: 500 }}>calorias · consumidas vs gastas</div>
          <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text2)', margin: '4px 0' }}>
            <span><span style={{ display: 'inline-block', width: '16px', height: '2px', background: '#1D9E75', marginRight: '4px', verticalAlign: 'middle' }} />consumidas</span>
            <span><span style={{ display: 'inline-block', width: '16px', height: '2px', background: '#D85A30', marginRight: '4px', verticalAlign: 'middle' }} />gastas</span>
          </div>
          <AnalyticsChart
            id={`nutri-cals-${pi}`}
            height={90}
            type="line"
            labels={labels}
            datasets={[
              { label: 'consumidas', data: calData, borderColor: '#1D9E75', backgroundColor: 'transparent', tension: 0.3, pointRadius: 2, yAxisID: 'y' },
              { label: 'gastas', data: burnedData, borderColor: '#D85A30', backgroundColor: 'transparent', borderDash: [4,3], tension: 0.3, pointRadius: 2, yAxisID: 'y' }
            ]}
          />
        </div>

        <div className="card" style={{ padding: '.75rem 1rem', marginBottom: '.75rem' }}>
          <div className="metric-label" style={{ color: deficitColor, fontWeight: 500 }}>saldo diário</div>
          <AnalyticsChart
            id={`nutri-deficit-${pi}`}
            height={80}
            type="bar"
            labels={labels}
            datasets={[{ data: deficitData, backgroundColor: deficitData.map(v => v >= 300 && v <= 800 ? '#1D9E75' : v > 800 ? '#EF9F27' : '#D85A30'), borderRadius: 2, borderSkipped: false }]}
          />
        </div>

        <SectionTitle>macros médios</SectionTitle>
        <div className="grid2">
          <KPI label="proteína" value={avgProtein} unit="g" color="#D85A30" sub="objetivo ≥160g" />
          <KPI label="gordura" value={avgFat} unit="g" color="#EF9F27" sub="objetivo 80-100g" />
          <KPI label="fibra" value={avgFiber} unit="g" color="#378ADD" sub="objetivo ≥25g" />
          <KPI label="jejum médio" value={avgFasting?.toFixed(1)} unit="h" color="#7F77DD" sub="objetivo ≥16h" />
        </div>
      </>}
    </div>
  );
}
