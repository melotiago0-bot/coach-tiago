import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/config';

export default function FastingCard() {
  const [lastMeal, setLastMeal] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    apiFetch('/meals/last')
      .then(r => r.json())
      .then(d => { if (d.meal) setLastMeal(d.meal); })
      .catch(() => {});

    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  if (!lastMeal) return (
    <div className="card" style={{ marginBottom: '.75rem' }}>
      <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>jejum intermitente</div>
      <div style={{ fontSize: '13px', color: 'var(--text2)' }}>regista a tua primeira refeição para começar a contar.</div>
    </div>
  );

  const fastingMs = now - lastMeal.ts * 1000;
  const fastingHours = fastingMs / 3600000;
  const fastingH = Math.floor(fastingHours);
  const fastingM = Math.floor((fastingHours - fastingH) * 60);
  const pct = Math.min(100, (fastingHours / 16) * 100);

  const nextWindowTs = lastMeal.ts * 1000 + 16 * 3600000;
  const nextWindow = new Date(nextWindowTs).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  const lastTime = new Date(lastMeal.ts * 1000).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  const lastDate = new Date(lastMeal.ts * 1000).toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' });

  const isGood = fastingHours >= 14;
  const isComplete = fastingHours >= 16;
  const badgeBg = isComplete ? '#E1F5EE' : isGood ? '#E1F5EE' : '#FAEEDA';
  const badgeColor = isComplete ? '#085041' : isGood ? '#085041' : '#633806';
  const badgeLabel = isComplete ? 'jejum completo ✓' : isGood ? 'zona fat-burn' : `faltam ${Math.ceil(16 - fastingHours)}h`;

  return (
    <div className="card" style={{ marginBottom: '.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '4px' }}>jejum intermitente</div>
          <div className="num-hero" style={{ fontSize: '40px', fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
            {fastingH}<span style={{ fontSize: '18px', fontWeight: 400, color: 'var(--text2)' }}>h</span>{String(fastingM).padStart(2,'0')}<span style={{ fontSize: '18px', fontWeight: 400, color: 'var(--text2)' }}>m</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '4px' }}>desde {lastDate} às {lastTime} · {lastMeal.meal_type}</div>
        </div>
        <span style={{ fontSize: '10px', fontWeight: 500, padding: '3px 10px', borderRadius: '20px', background: badgeBg, color: badgeColor, flexShrink: 0, marginLeft: '8px' }}>{badgeLabel}</span>
      </div>
      <div style={{ height: '8px', background: 'var(--bg3)', borderRadius: '4px', overflow: 'hidden', marginBottom: '4px' }}>
        <div style={{ height: '8px', borderRadius: '4px', width: `${pct}%`, background: isGood ? '#1D9E75' : '#EF9F27', transition: 'width .3s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text3)' }}>
        <span>agora</span>
        <span>objetivo 16h</span>
        {!isComplete && <span>janela às {nextWindow}</span>}
      </div>
    </div>
  );
}
