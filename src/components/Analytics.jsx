import { useState } from 'react';
import { getRecentCheckins, getSwimHistory, getWeeklySummaries, getMonthlySummaries, getYearlySummaries } from '../lib/store';
import { getDaysToRace, getPlanProgress, getSwimPlan } from '../lib/engine';

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
      {chartData && <MiniChart data={chartData} color={chartColor || color} />}
    </div>
  );
}

export default function Analytics() {
  const [period, setPeriod] = useState(7);
  const daysToRace = getDaysToRace();
  const progress = getPlanProgress();
  const swimPlan = getSwimPlan();
  const checkins = getRecentCheckins(period);
  const swimHistory = getSwimHistory(period);
  const weeklySummaries = getWeeklySummaries(13);
  const monthlySummaries = getMonthlySummaries(12);
  const yearlySummaries = getYearlySummaries();
  const avgSleep = checkins.length ? (checkins.reduce((s, c) => s + (c.sleep || 0), 0) / checkins.length).toFixed(1) : '—';
  const totalSwim = swimHistory.reduce((s, h) => s + h.meters, 0);
  const avgPace = swimHistory.length ? swimHistory.reduce((s, h) => s + (h.minutes / (h.meters / 100)), 0) / swimHistory.length : null;
  const avgPaceStr = avgPace ? `${Math.floor(avgPace)}:${String(Math.round((avgPace % 1) * 60)).padStart(2, '0')}` : '—';
  const sleepData = checkins.slice(0, period).reverse().map(c => c.sleep || 0);
  const swimData = swimHistory.slice(0, period).reverse().map(h => h.meters);
  const weeklyVols = Object.values(weeklySummaries).slice(-8);
  const monthlyVols = Object.values(monthlySummaries).slice(-6);
  const yearlyVols = Object.values(yearlySummaries);
  const isMock = checkins.length === 0;

  return (
    <div className="analytics">
      {isMock && <div className="alert-box warn">a mostrar dados de demonstração — faz o check-in diário para ver os teus dados reais</div>}
      <div className="race-countdown">
        <div className="countdown-num">{daysToRace}</div>
        <div className="countdown-label">dias para a prova · 19 julho</div>
        <div className="bar-track"><div className="bar-fill green" style={{ width: `${progress}%` }} /></div>
        <div className="countdown-sub">{progress}% do plano concluído</div>
      </div>
      <div className="period-tabs">
        {[7, 30, 90].map(d => (
          <button key={d} className={`period-tab ${period === d ? 'active' : ''}`} onClick={() => setPeriod(d)}>
            {d === 7 ? '7 dias' : d === 30 ? '30 dias' : '90 dias'}
          </button>
        ))}
      </div>
      <div className="section-title">sono</div>
      <div className="grid2">
        <MetricCard label="média" value={`${avgSleep}h`} color="var(--text)" chartData={sleepData} chartColor="#7F77DD" />
        <MetricCard label="noites 7h+" value={checkins.filter(c => c.sleep >= 7).length} sub={`em ${period} dias`} color="#1D9E75" />
      </div>
      <div className="section-title">natação</div>
      <div className="grid2">
        <MetricCard label="volume total" value={`${(totalSwim/1000).toFixed(1)}km`} color="#1D9E75" chartData={swimData} chartColor="#1D9E75" />
        <MetricCard label="pace médio" value={avgPaceStr} sub="por 100m" color="var(--text)" />
        <MetricCard label="sessões" value={swimHistory.length} sub={`em ${period} dias`} color="#378ADD" />
        <MetricCard label="projeção 5km" value={avgPace ? `${Math.floor(avgPace*50/60)}h${String(Math.round(avgPace*50%60)).padStart(2,'0')}` : '—'} sub="ao pace atual" color="#7F77DD" />
      </div>
      <div className="section-title">volume semanal</div>
      <div className="card">
        <div className="bar-chart">
          {weeklyVols.length ? weeklyVols.map((v, i) => (
            <div key={i} className="bar-col">
              <div className="bar-col-fill" style={{ height: `${Math.round((v/Math.max(...weeklyVols))*100)}%`, background: '#1D9E75' }} />
              <div className="bar-col-label">s{i+1}</div>
            </div>
          )) : swimPlan.map((w, i) => (
            <div key={i} className="bar-col">
              <div className="bar-col-fill" style={{ height: `${Math.round((w.daily/2600)*100)}%`, background: w.deload ? '#FAEEDA' : w.taper ? '#E1F5EE' : '#1D9E75', opacity: 0.4 }} />
              <div className="bar-col-label">s{w.week}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="section-title">volume mensal</div>
      <div className="card">
        <div className="bar-chart">
          {monthlyVols.length ? monthlyVols.map((v, i) => (
            <div key={i} className="bar-col">
              <div className="bar-col-fill" style={{ height: `${Math.round((v/Math.max(...monthlyVols))*100)}%`, background: '#378ADD' }} />
              <div className="bar-col-label">m{i+1}</div>
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
          {yearlyVols.length ? yearlyVols.map((v, i) => (
            <div key={i} className="bar-col">
              <div className="bar-col-fill" style={{ height: `${Math.round((v/Math.max(...yearlyVols))*100)}%`, background: '#7F77DD' }} />
              <div className="bar-col-label">{Object.keys(yearlySummaries)[i]}</div>
            </div>
          )) : (
            <div className="bar-col">
              <div className="bar-col-fill" style={{ height: '4px', background: '#7F77DD', opacity: 0.3 }} />
              <div className="bar-col-label">2025</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
