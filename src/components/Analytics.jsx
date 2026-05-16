import { useState, useEffect } from 'react';
import { getDaysToRace, getPlanProgress, getSwimPlan } from '../lib/engine';

const API = 'https://coach-tiago-api-production.up.railway.app';

function MiniChart({ data, color = '#1D9E75' }) {
  if (!data.length) return <div className="mini-chart-empty">sem dados</div>;
  const max = Math.max(...data);
  return (
    <div className="mini-chart">
      {data.map((v, i) => (
        <div key={i} className="mini-bar" style={{ height: max ? `${Math.round((v / max) * 100)}%` : '4px', background: color }} />
      ))}
    </div>
  );
}

function MetricCard({ label, value, sub, color, chartData, chartColor }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color }}>{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
      {chartData && chartData.length > 0 && <MiniChart data={chartData} color={chartColor || color} />}
    </div>
  );
}

export default function Analytics() {
  const [period, setPeriod] = useState(7);
  const [history, setHistory] = useState([]);
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const daysToRace = getDaysToRace();
  const progress = getPlanProgress();
  const swimPlan = getSwimPlan();

  useEffect(() => {
    Promise.all([
      fetch(`${API}/health-data/latest`).then(r => r.json()),
      fetch(`${API}/health-data/range?days=365`).then(r => r.json()),
    ]).then(([lat, hist]) => {
      if (lat.date) setLatest(lat);
      if (Array.isArray(hist)) setHistory(hist.reverse());
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = history.slice(-period);

  const avgSleep = filtered.length
    ? (filtered.reduce((s, d) => s + (d.sleep_hours || 0), 0) / filtered.filter(d => d.sleep_hours).length).toFixed(1)
    : '—';

  const totalSwim = filtered.reduce((s, d) => s + (d.swim_meters || 0), 0);
  const swimSessions = filtered.filter(d => d.swim_meters > 0);
  const avgPace = swimSessions.length ? null : null;

  const sleepData = filtered.map(d => d.sleep_hours || 0);
  const swimData = filtered.map(d => d.swim_meters || 0);
  const caloriesData = filtered.map(d => d.active_calories || 0);
  const hrvData = filtered.map(d => d.hrv || 0);
  const stepsData = filtered.map(d => d.steps || 0);

  const avgCalories = filtered.filter(d => d.active_calories).length
    ? Math.round(filtered.reduce((s, d) => s + (d.active_calories || 0), 0) / filtered.filter(d => d.active_calories).length)
    : '—';

  const avgHRV = filtered.filter(d => d.hrv).length
    ? Math.round(filtered.reduce((s, d) => s + (d.hrv || 0), 0) / filtered.filter(d => d.hrv).length)
    : '—';

  const avgSteps = filtered.filter(d => d.steps).length
    ? Math.round(filtered.reduce((s, d) => s + (d.steps || 0), 0) / filtered.filter(d => d.steps).length)
    : '—';

  const avgRHR = filtered.filter(d => d.resting_hr).length
    ? Math.round(filtered.reduce((s, d) => s + (d.resting_hr || 0), 0) / filtered.filter(d => d.resting_hr).length)
    : '—';

  const weeklyVols = [];
  for (let i = 0; i < 8; i++) {
    const weekData = history.slice(-(8-i)*7, -(7-i)*7 || undefined);
    weeklyVols.push(weekData.reduce((s, d) => s + (d.swim_meters || 0), 0));
  }

  const monthlyVols = [];
  for (let i = 0; i < 6; i++) {
    const monthData = history.slice(-(6-i)*30, -(5-i)*30 || undefined);
    monthlyVols.push(monthData.reduce((s, d) => s + (d.swim_meters || 0), 0));
  }

  const yearlyVol = history.reduce((s, d) => s + (d.swim_meters || 0), 0);

  return (
    <div className="analytics">
      <div className="race-countdown">
        <div className="countdown-num">{daysToRace}</div>
        <div className="countdown-label">dias para a prova · 19 julho</div>
        <div className="bar-track"><div className="bar-fill green" style={{ width: `${progress}%` }} /></div>
        <div className="countdown-sub">{progress}% do plano concluído</div>
      </div>

      {latest && (
        <div className="card" style={{ marginBottom: '0.75rem' }}>
          <div className="card-label">hoje · {latest.date} · última sync: {new Date(latest.ts * 1000).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</div>
          <div className="grid2">
            <MetricCard label="sono" value={`${latest.sleep_hours?.toFixed(1) || '—'}h`} color="#7F77DD" />
            <MetricCard label="hrv" value={latest.hrv ? `${Math.round(latest.hrv)}ms` : '—'} color="#1D9E75" />
            <MetricCard label="fc repouso" value={latest.resting_hr ? `${Math.round(latest.resting_hr)}bpm` : '—'} color="#D85A30" />
            <MetricCard label="passos" value={latest.steps ? Math.round(latest.steps).toLocaleString() : '—'} color="#378ADD" />
            <MetricCard label="calorias" value={latest.active_calories ? `${Math.round(latest.active_calories)} kcal` : '—'} color="#EF9F27" />
            <MetricCard label="natação" value={latest.swim_meters ? `${Math.round(latest.swim_meters)}m` : '—'} color="#1D9E75" />
          </div>
        </div>
      )}

      <div className="period-tabs">
        {[7, 30, 90].map(d => (
          <button key={d} className={`period-tab ${period === d ? 'active' : ''}`} onClick={() => setPeriod(d)}>
            {d === 7 ? '7 dias' : d === 30 ? '30 dias' : '90 dias'}
          </button>
        ))}
      </div>

      {loading && <div className="card center"><p>a carregar histórico...</p></div>}

      {!loading && (
        <>
          <div className="section-title">sono</div>
          <div className="grid2">
            <MetricCard label="média" value={`${avgSleep}h`} color="var(--text)" chartData={sleepData} chartColor="#7F77DD" />
            <MetricCard label="noites 7h+" value={filtered.filter(d => d.sleep_hours >= 7).length} sub={`em ${period} dias`} color="#1D9E75" />
          </div>

          <div className="section-title">recuperação</div>
          <div className="grid2">
            <MetricCard label="hrv médio" value={`${avgHRV}ms`} color="#1D9E75" chartData={hrvData} chartColor="#1D9E75" />
            <MetricCard label="fc repouso" value={`${avgRHR}bpm`} color="#D85A30" />
          </div>

          <div className="section-title">atividade</div>
          <div className="grid2">
            <MetricCard label="calorias médias" value={`${avgCalories} kcal`} color="#EF9F27" chartData={caloriesData} chartColor="#EF9F27" />
            <MetricCard label="passos médios" value={avgSteps.toLocaleString()} color="#378ADD" chartData={stepsData} chartColor="#378ADD" />
          </div>

          <div className="section-title">natação</div>
          <div className="grid2">
            <MetricCard label="volume total" value={`${(totalSwim/1000).toFixed(1)}km`} color="#1D9E75" chartData={swimData} chartColor="#1D9E75" />
            <MetricCard label="sessões" value={swimSessions.length} sub={`em ${period} dias`} color="#378ADD" />
          </div>

          <div className="section-title">volume semanal</div>
          <div className="card">
            <div className="bar-chart">
              {weeklyVols.some(v => v > 0) ? weeklyVols.map((v, i) => (
                <div key={i} className="bar-col">
                  <div className="bar-col-fill" style={{ height: `${Math.round((v / Math.max(...weeklyVols, 1)) * 100)}%`, background: '#1D9E75' }} />
                  <div className="bar-col-label">s{i + 1}</div>
                </div>
              )) : swimPlan.map((w, i) => (
                <div key={i} className="bar-col">
                  <div className="bar-col-fill" style={{ height: `${Math.round((w.daily / 2600) * 100)}%`, background: w.deload ? '#FAEEDA' : w.taper ? '#E1F5EE' : '#1D9E75', opacity: 0.4 }} />
                  <div className="bar-col-label">s{w.week}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="section-title">volume mensal</div>
          <div className="card">
            <div className="bar-chart">
              {monthlyVols.some(v => v > 0) ? monthlyVols.map((v, i) => (
                <div key={i} className="bar-col">
                  <div className="bar-col-fill" style={{ height: `${Math.round((v / Math.max(...monthlyVols, 1)) * 100)}%`, background: '#378ADD' }} />
                  <div className="bar-col-label">m{i + 1}</div>
                </div>
              )) : [1,2,3,4,5,6].map(i => (
                <div key={i} className="bar-col">
                  <div className="bar-col-fill" style={{ height: '4px', background: '#378ADD', opacity: 0.3 }} />
                  <div className="bar-col-label">m{i}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="section-title">volume anual</div>
          <div className="card">
            <div className="bar-chart">
              <div className="bar-col">
                <div className="bar-col-fill" style={{ height: yearlyVol > 0 ? '100%' : '4px', background: '#7F77DD', opacity: yearlyVol > 0 ? 1 : 0.3 }} />
                <div className="bar-col-label">2026</div>
              </div>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '8px' }}>{(yearlyVol / 1000).toFixed(1)}km acumulados</div>
          </div>
        </>
      )}
    </div>
  );
}
