import { useState, useEffect, useRef } from 'react';
import { getDaysToRace, getPlanProgress, getSwimPlan } from '../lib/engine';

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
  const ti = trend > 0 ? '↑' : '↓';
  return (
    <div className="metric-card">
      <div className="metric-label" style={{ color, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 500, color: 'var(--text)' }}>
        {value != null ? (Number.isInteger(value) ? value.toLocaleString() : typeof value === 'number' ? Math.round(value * 10) / 10 : value) : '—'}
        <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text2)' }}>{unit}</span>
      </div>
      {trend != null && tc && <div style={{ fontSize: '11px', color: tc, marginTop: '2px' }}>{ti} vs período anterior</div>}
      {sub && <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

function Insight({ text, warn }) {
  const bg = warn ? '#FAEEDA' : '#E1F5EE';
  const col = warn ? '#633806' : '#085041';
  return <div style={{ background: bg, borderRadius: 'var(--border-radius-md)', padding: '.6rem .9rem', fontSize: '12px', color: col, marginTop: '.5rem', lineHeight: 1.5 }}>{text}</div>;
}

function Chart({ id, height = 80, setup }) {
  const ref = useRef();
  useEffect(() => {
    if (!ref.current || !window.Chart) return;
    const existing = window.Chart.getChart(ref.current);
    if (existing) existing.destroy();
    setup(ref.current);
  }, [setup]);
  return <div style={{ position: 'relative', height: `${height}px`, marginTop: '8px' }}><canvas ref={ref} id={id} role="img" aria-label={id} /></div>;
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

  const isDark = typeof window !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)';

  const labels = filtered.slice(-14).map(d => d.date.slice(5));
  const sleepVals = filtered.slice(-14).map(d => d.sleep_hours || 0);
  const hrvVals = filtered.slice(-14).map(d => d.hrv || 0);
  const rhrVals = filtered.slice(-14).map(d => d.resting_hr || 0);
  const calVals = filtered.slice(-14).map(d => d.active_calories || 0);
  const swimVals = filtered.slice(-14).map(d => d.swim_meters || 0);

  const sleepInsight = sleepAvg < 6 ? 'Média abaixo de 6h — impacto direto no HRV e na recuperação muscular.'
    : sleepAvg < 7 ? 'Sono moderado. Aumentar para 7h+ melhoria significativa no HRV e desempenho.'
    : 'Sono ótimo. Continua assim — é um dos maiores fatores de recuperação.';

  const hrvInsight = hrvAvg > 55 ? 'HRV excelente para 40 anos. Sistema nervoso bem equilibrado.'
    : hrvAvg > 40 ? 'HRV na zona boa. Monitoriza tendência — quedas indicam acumulação de fadiga.'
    : 'HRV abaixo do ideal. Considera reduzir intensidade esta semana.';

  const swimInsight = `${(swimTotal/1000).toFixed(1)}km em ${swimSessions} sessões. Pace médio consistente com objetivo de 1h50 na prova.`;

  const makeBarChart = (canvasEl, labels, data, colors) => {
    if (!window.Chart) return;
    new window.Chart(canvasEl, {
      type: 'bar',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderRadius: 2, borderSkipped: false }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { x: { ticks: { color: textColor, font: { size: 9 }, maxRotation: 0 }, grid: { display: false } }, y: { ticks: { color: textColor, font: { size: 9 } }, grid: { color: gridColor } } } }
    });
  };

  const sleepSetup = (el) => makeBarChart(el, labels, sleepVals, sleepVals.map(v => v >= 7 ? '#1D9E75' : v >= 6 ? '#EF9F27' : '#D85A30'));
  const calSetup = (el) => makeBarChart(el, labels, calVals, calVals.map(() => '#EF9F2790'));

  const hrvSetup = (el) => {
    if (!window.Chart) return;
    new window.Chart(el, {
      type: 'line',
      data: { labels, datasets: [
        { label: 'HRV', data: hrvVals, borderColor: '#1D9E75', backgroundColor: 'transparent', tension: 0.3, pointRadius: 2, yAxisID: 'y1' },
        { label: 'FC Rep', data: rhrVals, borderColor: '#D85A30', backgroundColor: 'transparent', borderDash: [4,3], tension: 0.3, pointRadius: 2, yAxisID: 'y2' }
      ]},
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: textColor, font: { size: 9 }, maxRotation: 0 }, grid: { display: false } },
          y1: { position: 'left', ticks: { color: '#1D9E75', font: { size: 9 } }, grid: { color: gridColor } },
          y2: { position: 'right', ticks: { color: '#D85A30', font: { size: 9 } }, grid: { display: false } }
        }
      }
    });
  };

  const swimSetup = (el) => {
    if (!window.Chart) return;
    const targets = swimPlan.map(w => w.target);
    const actuals = swimPlan.map((w, i) => {
      const wStart = new Date('2026-05-14');
      wStart.setDate(wStart.getDate() + i * 7);
      const wEnd = new Date(wStart);
      wEnd.setDate(wEnd.getDate() + 6);
      return history.filter(d => d.date >= wStart.toISOString().slice(0,10) && d.date <= wEnd.toISOString().slice(0,10)).reduce((s, d) => s + (d.swim_meters || 0), 0);
    });
    new window.Chart(el, {
      type: 'bar',
      data: {
        labels: swimPlan.map((w, i) => `s${i+1}`),
        datasets: [
          { label: 'meta', data: targets, backgroundColor: swimPlan.map(w => w.deload ? '#EF9F2740' : w.taper ? '#5DCAA540' : '#1D9E7530'), borderRadius: 2, order: 2 },
          { label: 'feito', data: actuals, backgroundColor: swimPlan.map(w => w.deload ? '#EF9F27' : '#1D9E75'), borderRadius: 2, order: 1 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: textColor, font: { size: 9 } }, grid: { display: false } },
          y: { ticks: { color: textColor, font: { size: 9 }, callback: v => (v/1000).toFixed(0)+'km' }, grid: { color: gridColor } }
        }
      }
    });
  };

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
      {!loading && filtered.length === 0 && <div className="card center"><p>sem dados ainda — os dados vão acumulando com cada sincronização.</p></div>}

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
          <Chart id={`sleep-${pi}`} height={80} setup={sleepSetup} />
          <Insight text={sleepInsight} />
        </div>

        <SectionTitle>recuperação</SectionTitle>
        <div className="grid2">
          <KPI label="hrv médio" value={hrvAvg} unit="ms" color="#1D9E75" trend={hrvAvg && hrvPrev ? Math.sign(hrvAvg - hrvPrev) : null} sub={hrvAvg > 55 ? 'ótimo' : hrvAvg > 40 ? 'bom' : 'baixo'} />
          <KPI label="fc repouso" value={rhrAvg} unit="bpm" color="#D85A30" trend={rhrAvg && rhrPrev ? Math.sign(rhrPrev - rhrAvg) : null} sub={rhrAvg < 55 ? 'zona atleta' : rhrAvg < 65 ? 'bom' : 'normal'} />
        </div>
        <div className="card" style={{ padding: '.75rem 1rem' }}>
          <div className="metric-label" style={{ color: '#1D9E75', fontWeight: 500 }}>hrv vs fc repouso</div>
          <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text2)', marginTop: '4px' }}>
            <span><span style={{ display: 'inline-block', width: '20px', height: '2px', background: '#1D9E75', marginRight: '4px', verticalAlign: 'middle' }}></span>hrv</span>
            <span><span style={{ display: 'inline-block', width: '20px', height: '2px', background: '#D85A30', marginRight: '4px', verticalAlign: 'middle', borderTop: '2px dashed #D85A30' }}></span>fc rep</span>
          </div>
          <Chart id={`hrv-${pi}`} height={90} setup={hrvSetup} />
          <Insight text={hrvInsight} />
        </div>

        <SectionTitle>atividade</SectionTitle>
        <div className="grid2">
          <KPI label="passos médios" value={stepsAvg ? Math.round(stepsAvg) : null} color="#378ADD" sub="meta 10 000/dia" />
          <KPI label="calorias médias" value={calAvg ? Math.round(calAvg) : null} unit="kcal" color="#EF9F27" sub="ativas por dia" />
        </div>
        <div className="card" style={{ padding: '.75rem 1rem' }}>
          <div className="metric-label" style={{ color: '#EF9F27', fontWeight: 500 }}>calorias ativas diárias</div>
          <Chart id={`cal-${pi}`} height={80} setup={calSetup} />
        </div>

        <SectionTitle>natação</SectionTitle>
        <div className="grid2">
          <KPI label="volume total" value={(swimTotal/1000).toFixed(1)} unit="km" color="#1D9E75" />
          <KPI label="sessões" value={swimSessions} color="#5DCAA5" sub={`em ${filtered.length} dias`} />
        </div>
        <div className="card" style={{ padding: '.75rem 1rem' }}>
          <div className="metric-label" style={{ color: '#1D9E75', fontWeight: 500 }}>volume vs meta · 9 semanas</div>
          <Chart id={`swim-${pi}`} height={100} setup={swimSetup} />
          <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text2)', marginTop: '6px' }}>
            <span><span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#1D9E75', borderRadius: '2px', marginRight: '3px' }}></span>feito</span>
            <span><span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#1D9E7530', borderRadius: '2px', marginRight: '3px' }}></span>meta</span>
            <span><span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#EF9F27', borderRadius: '2px', marginRight: '3px' }}></span>deload</span>
          </div>
          <Insight text={swimInsight} />
        </div>
      </>}
    </div>
  );
}
