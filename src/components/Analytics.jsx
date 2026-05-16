import { useState, useEffect } from 'react';
import { getDaysToRace, getPlanProgress, getSwimPlan } from '../lib/engine';
import AnalyticsChart from './AnalyticsChart';

const API = 'https://coach-tiago-api-production.up.railway.app';
const PERIODS = [{ label: '7 dias', days: 7 }, { label: '1 mês', days: 30 }, { label: '1 ano', days: 365 }];

function avg(arr) {
  const v = arr.filter(x => x != null && x > 0);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '1.25rem 0 .5rem' }}>{children}</div>;
}

function KPI({ label, value, unit, sub, color, trend }) {
  const tc = trend > 0 ? '#1D9E75' : trend < 0 ? '#D85A30' : null;
  return (
    <div className="metric-card">
      <div className="metric-label" style={{ color, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 500, color: 'var(--text)' }}>
        {value != null ? (typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : typeof value === 'number' ? value.toLocaleString() : value) : '—'}
        <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text2)' }}>{unit}</span>
      </div>
      {trend != null && tc && <div style={{ fontSize: '11px', color: tc, marginTop: '2px' }}>{trend > 0 ? '↑' : '↓'} vs período anterior</div>}
      {sub && <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

function Insight({ text, warn }) {
  return <div style={{ background: warn ? '#FAEEDA' : '#E1F5EE', borderRadius: 'var(--border-radius-md)', padding: '.6rem .9rem', fontSize: '12px', color: warn ? '#633806' : '#085041', marginTop: '.5rem', lineHeight: 1.5 }}>{text}</div>;
}

export default function Analytics() {
  const [pi, setPi] = useState(0);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const daysToRace = getDaysToRace();
  const progress = getPlanProgress();
  const swimPlan = getSwimPlan();
  const days = PERIODS[pi].days;

  useEffect(() => {
    fetch(`${API}/health-data/range?days=365`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setHistory(d.sort((a, b) => a.date.localeCompare(b.date))); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = history.slice(-days);
  const prev = history.slice(-days * 2, -days);
  const recent = filtered.slice(-14);

  const sleepAvg = avg(filtered.map(d => d.sleep_hours));
  const sleepPrev = avg(prev.map(d => d.sleep_hours));
  const sleepGood = filtered.filter(d => d.sleep_hours >= 7).length;
  const sleepMod = filtered.filter(d => d.sleep_hours >= 6 && d.sleep_hours < 7).length;
  const sleepLow = filtered.filter(d => d.sleep_hours > 0 && d.sleep_hours < 6).length;
  const hrvAvg = avg(filtered.map(d => d.hrv));
  const hrvPrev = avg(prev.map(d => d.hrv));
  const rhrAvg = avg(filtered.map(d => d.resting_hr));
  const rhrPrev = avg(prev.map(d => d.resting_hr));
  const stepsAvg = avg(filtered.map(d => d.steps));
  const calAvg = avg(filtered.map(d => d.active_calories));
  const swimTotal = filtered.reduce((s, d) => s + (d.swim_meters || 0), 0);
  const swimSessions = filtered.filter(d => d.swim_meters > 0).length;

  const labels = recent.map(d => d.date.slice(5));
  const sleepVals = recent.map(d => d.sleep_hours || 0);
  const hrvVals = recent.map(d => d.hrv || 0);
  const rhrVals = recent.map(d => d.resting_hr || 0);
  const calVals = recent.map(d => d.active_calories || 0);

  const swimWeekly = swimPlan.map((w, i) => {
    const wStart = new Date('2026-05-14');
    wStart.setDate(wStart.getDate() + i * 7);
    const wEnd = new Date(wStart);
    wEnd.setDate(wEnd.getDate() + 6);
    return history.filter(d => d.date >= wStart.toISOString().slice(0,10) && d.date <= wEnd.toISOString().slice(0,10)).reduce((s, d) => s + (d.swim_meters || 0), 0);
  });

  const sleepInsight = !sleepAvg ? null : sleepAvg < 6 ? 'Média abaixo de 6h — impacto direto no HRV e recuperação muscular.' : sleepAvg < 7 ? 'Sono moderado. Aumentar para 7h+ tem impacto significativo no HRV.' : 'Sono ótimo. É um dos maiores fatores de recuperação.';
  const hrvInsight = !hrvAvg ? null : hrvAvg > 55 ? 'HRV excelente para 40 anos. Sistema nervoso bem equilibrado.' : hrvAvg > 40 ? 'HRV bom. Monitoriza tendência — quedas indicam acumulação de fadiga.' : 'HRV abaixo do ideal. Considera reduzir intensidade esta semana.';

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div className="race-countdown">
        <div className="countdown-num">{daysToRace}</div>
        <div className="countdown-label">dias para a prova · 19 julho 2026</div>
        <div className="bar-track"><div className="bar-fill green" style={{ width: `${progress}%` }} /></div>
        <div className="countdown-sub">{progress}% do plano concluído</div>
      </div>

      <div className="period-tabs">
        {PERIODS.map((p, i) => (
          <button key={i} className={`period-tab ${pi === i ? 'active' : ''}`} onClick={() => setPi(i)}>{p.label}</button>
        ))}
      </div>

      {loading && <div className="card center"><p>a carregar...</p></div>}
      {!loading && filtered.length === 0 && <div className="card center"><p>sem dados ainda.</p></div>}

      {!loading && filtered.length > 0 && <>
        <SectionTitle>sono</SectionTitle>
        <div className="grid2">
          <KPI label="média" value={sleepAvg} unit="h" color="#7F77DD" trend={sleepAvg && sleepPrev ? Math.sign(sleepAvg - sleepPrev) : null} />
          <div className="metric-card">
            <div className="metric-label" style={{ color: '#7F77DD', fontWeight: 500 }}>distribuição</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}><span style={{ color: '#1D9E75' }}>≥7h ótimo</span><strong>{sleepGood}n</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}><span style={{ color: '#EF9F27' }}>6-7h moderado</span><strong>{sleepMod}n</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}><span style={{ color: '#D85A30' }}>&lt;6h baixo</span><strong>{sleepLow}n</strong></div>
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: '.75rem 1rem' }}>
          <div className="metric-label" style={{ color: '#7F77DD', fontWeight: 500 }}>sono diário</div>
          <AnalyticsChart
            id={`sleep-${pi}`}
            height={80}
            type="bar"
            labels={labels}
            datasets={[{ data: sleepVals, backgroundColor: sleepVals.map(v => v >= 7 ? '#1D9E75' : v >= 6 ? '#EF9F27' : '#D85A30'), borderRadius: 2, borderSkipped: false }]}
          />
          {sleepInsight && <Insight text={sleepInsight} />}
        </div>

        <SectionTitle>recuperação</SectionTitle>
        <div className="grid2">
          <KPI label="hrv médio" value={hrvAvg} unit="ms" color="#1D9E75" trend={hrvAvg && hrvPrev ? Math.sign(hrvAvg - hrvPrev) : null} sub={hrvAvg > 55 ? 'ótimo' : hrvAvg > 40 ? 'bom' : 'baixo'} />
          <KPI label="fc repouso" value={rhrAvg} unit="bpm" color="#D85A30" trend={rhrAvg && rhrPrev ? Math.sign(rhrPrev - rhrAvg) : null} sub={rhrAvg < 55 ? 'zona atleta' : rhrAvg < 65 ? 'bom' : 'normal'} />
        </div>
        <div className="card" style={{ padding: '.75rem 1rem' }}>
          <div className="metric-label" style={{ color: '#1D9E75', fontWeight: 500 }}>hrv vs fc repouso</div>
          <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text2)', margin: '4px 0' }}>
            <span><span style={{ display: 'inline-block', width: '16px', height: '2px', background: '#1D9E75', marginRight: '4px', verticalAlign: 'middle' }} />hrv</span>
            <span><span style={{ display: 'inline-block', width: '16px', height: '2px', background: '#D85A30', marginRight: '4px', verticalAlign: 'middle' }} />fc rep</span>
          </div>
          <AnalyticsChart
            id={`hrv-${pi}`}
            height={90}
            type="line"
            labels={labels}
            datasets={[
              { label: 'HRV', data: hrvVals, borderColor: '#1D9E75', backgroundColor: 'transparent', tension: 0.3, pointRadius: 2, yAxisID: 'y' },
              { label: 'FC Rep', data: rhrVals, borderColor: '#D85A30', backgroundColor: 'transparent', borderDash: [4,3], tension: 0.3, pointRadius: 2, yAxisID: 'y2' }
            ]}
          />
          {hrvInsight && <Insight text={hrvInsight} />}
        </div>

        <SectionTitle>atividade</SectionTitle>
        <div className="grid2">
          <KPI label="passos médios" value={stepsAvg ? Math.round(stepsAvg) : null} color="#378ADD" sub="meta 10 000/dia" />
          <KPI label="calorias médias" value={calAvg ? Math.round(calAvg) : null} unit="kcal" color="#EF9F27" sub="ativas por dia" />
        </div>
        <div className="card" style={{ padding: '.75rem 1rem' }}>
          <div className="metric-label" style={{ color: '#EF9F27', fontWeight: 500 }}>calorias ativas diárias</div>
          <AnalyticsChart
            id={`cal-${pi}`}
            height={80}
            type="bar"
            labels={labels}
            datasets={[{ data: calVals, backgroundColor: '#EF9F2780', borderRadius: 2, borderSkipped: false }]}
            yCallback={(v) => (v/1000).toFixed(1)+'k'}
          />
        </div>

        <SectionTitle>natação</SectionTitle>
        <div className="grid2">
          <KPI label="volume total" value={(swimTotal/1000).toFixed(1)} unit="km" color="#1D9E75" />
          <KPI label="sessões" value={swimSessions} color="#5DCAA5" sub={`em ${filtered.length} dias`} />
        </div>
        <div className="card" style={{ padding: '.75rem 1rem' }}>
          <div className="metric-label" style={{ color: '#1D9E75', fontWeight: 500 }}>volume vs meta · 9 semanas</div>
          <AnalyticsChart
            id={`swim-${pi}`}
            height={100}
            type="bar"
            labels={swimPlan.map((_, i) => `s${i+1}`)}
            datasets={[
              { label: 'meta', data: swimPlan.map(w => w.target), backgroundColor: swimPlan.map(w => w.deload ? '#EF9F2740' : w.taper ? '#5DCAA540' : '#1D9E7530'), borderRadius: 2, order: 2 },
              { label: 'feito', data: swimWeekly, backgroundColor: swimPlan.map(w => w.deload ? '#EF9F27' : '#1D9E75'), borderRadius: 2, order: 1 }
            ]}
            yCallback={(v) => (v/1000).toFixed(0)+'km'}
          />
          <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text2)', marginTop: '6px' }}>
            <span><span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#1D9E75', borderRadius: '2px', marginRight: '3px' }} />feito</span>
            <span><span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#1D9E7530', borderRadius: '2px', marginRight: '3px' }} />meta</span>
            <span><span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#EF9F27', borderRadius: '2px', marginRight: '3px' }} />deload</span>
          </div>
        </div>
      </>}
    </div>
  );
}
