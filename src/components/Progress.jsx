import { useState, useEffect } from 'react';
import { saveCheckinForDate, getWorkoutLog } from '../lib/store';
import { getWeekNumber, getCurrentWeekPlan, getSwimPlan, getDaysToRace, getPlanProgress } from '../lib/engine';
import { apiFetch } from '../lib/config';

/* segunda-feira desta semana */
function getWeekStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().split('T')[0];
}

export default function Progress() {
  const weekNum  = getWeekNumber();
  const weekPlan = getCurrentWeekPlan();
  const swimPlan = getSwimPlan();
  const daysToRace = getDaysToRace();
  const progress   = getPlanProgress();
  const workoutLog = getWorkoutLog(30); // treinos manuais do localStorage

  const [healthData, setHealthData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/health-data/range?days=30')
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return;
        const today = new Date().toISOString().split('T')[0];
        // sincronizar histórico com localStorage (App.jsx já trata o dia de hoje)
        data.forEach(d => {
          if (!d.date || d.date === today) return;
          saveCheckinForDate(d.date, {
            swam:        (d.swim_meters || 0) > 100,
            swimMeters:  Math.round(d.swim_meters || 0),
            swimMinutes: 22,
            sleep:       d.sleep_hours || 7,
            hasBJJ:      d.has_bjj === 1,
            feeling:     'bem',
            finger:      'a recuperar',
            notes:       '',
            fromHealth:  true,
            ts:          (d.ts || Date.now() / 1000) * 1000,
          });
        });
        setHealthData(data.sort((a, b) => a.date.localeCompare(b.date)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* volume semanal calculado diretamente dos dados da API */
  const weekStart = getWeekStart();
  const weeklyVol = healthData
    .filter(d => d.date >= weekStart && (d.swim_meters || 0) > 100)
    .reduce((sum, d) => sum + (d.swim_meters || 0), 0);
  const pct = weekPlan.target ? Math.min(100, Math.round((weeklyVol / weekPlan.target) * 100)) : 0;

  /* últimos 7 dias */
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const hd      = healthData.find(h => h.date === dateStr);
    const workout = workoutLog.find(w => w.date === dateStr);
    last7.push({
      date:       dateStr,
      day:        ['dom','seg','ter','qua','qui','sex','sáb'][d.getDay()],
      swam:       hd ? (hd.swim_meters || 0) > 100 : false,
      swimMeters: hd ? Math.round(hd.swim_meters || 0) : 0,
      workout,
    });
  }

  /* histórico de natação para o log */
  const swimLog = healthData
    .filter(d => (d.swim_meters || 0) > 100)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  return (
    <div className="progress-tab">
      <div className="race-countdown">
        <div className="countdown-num">{daysToRace}</div>
        <div className="countdown-label">dias para a prova · 19 julho</div>
        <div className="bar-track"><div className="bar-fill green" style={{ width: `${progress}%` }} /></div>
        <div className="countdown-sub">semana {weekNum} de 9 · {progress}% do plano</div>
      </div>

      <div className="card">
        <div className="card-label">semana {weekNum} · volume de natação</div>
        <div className="week-stats">
          <div className="week-stat"><span>acumulado</span><strong>{(weeklyVol / 1000).toFixed(1)}km</strong></div>
          <div className="week-stat"><span>meta</span><strong>{(weekPlan.target / 1000).toFixed(1)}km</strong></div>
          <div className="week-stat"><span>diário</span><strong>{weekPlan.daily}m</strong></div>
          <div className="week-stat"><span>progresso</span><strong>{pct}%</strong></div>
        </div>
        <div className="bar-track"><div className="bar-fill green" style={{ width: `${pct}%` }} /></div>
        {weekPlan.deload && <div className="week-badge deload">semana de deload — volume reduzido</div>}
        {weekPlan.taper  && <div className="week-badge taper">semana de taper — preparação para a prova</div>}
      </div>

      <div className="card">
        <div className="card-label">plano · 9 semanas</div>
        <div className="swim-graph">
          {swimPlan.map((w, i) => {
            const h = Math.round((w.daily / 2600) * 100);
            const isCurrent = w.week === weekNum;
            const bg = w.taper ? '#5DCAA5' : w.deload ? '#EF9F27' : '#1D9E75';
            return (
              <div key={i} className={`swim-col ${isCurrent ? 'current' : ''}`}>
                <div className="swim-bar-wrap">
                  <div className="swim-bar" style={{ height: `${h}%`, background: bg, opacity: isCurrent ? 1 : 0.45 }} />
                </div>
                <div className="swim-label">s{w.week}</div>
                {isCurrent && <div className="swim-current-dot" />}
              </div>
            );
          })}
        </div>
        <div className="swim-legend">
          <span><span className="dot green" />treino</span>
          <span><span className="dot amber" />deload</span>
          <span><span className="dot teal" />taper</span>
        </div>
      </div>

      <div className="card">
        <div className="card-label">últimos 7 dias</div>
        <div className="week-strip">
          {last7.map((d, i) => (
            <div key={i} className="day-col">
              <div className="day-label">{d.day}</div>
              <div className={`day-swim ${d.swam ? 'done' : 'empty'}`} title={d.swam ? `${d.swimMeters}m` : ''}>
                {d.swam ? '~' : '·'}
              </div>
              <div className={`day-workout ${d.workout ? 'done' : 'empty'}`}>{d.workout ? '✓' : '·'}</div>
            </div>
          ))}
        </div>
        <div className="strip-legend"><span>~ natação</span><span>✓ treino</span></div>
      </div>

      <div className="card">
        <div className="card-label">histórico de natação</div>
        {loading && <p className="empty-state">a carregar...</p>}
        {!loading && swimLog.length === 0 && (
          <p className="empty-state">ainda sem sessões de natação registadas</p>
        )}
        {swimLog.map((d, i) => (
          <div key={i} className="log-row">
            <div className="log-date">{d.date}</div>
            <div className="log-type">natação</div>
            <div className="log-notes">{Math.round(d.swim_meters)}m</div>
          </div>
        ))}
        {workoutLog.length > 0 && (
          <>
            <div className="card-label" style={{ marginTop: '1rem' }}>outros treinos</div>
            {workoutLog.slice(0, 5).map((w, i) => (
              <div key={i} className="log-row">
                <div className="log-date">{w.date}</div>
                <div className="log-type">{w.type?.replace('_', ' ')}</div>
                {w.notes && <div className="log-notes">{w.notes}</div>}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
