import { useState } from 'react';
import { saveWorkoutDone } from '../lib/store';
import { getSwimAnalysis, getDaysToRace, getCurrentWeekPlan } from '../lib/engine';
import { templates } from '../lib/exercises';
import MetricGauge, { HRV_CONFIG, RHR_CONFIG, SLEEP_CONFIG } from './MetricGauge';

function ExerciseItem({ ex, fingerState }) {
  const [open, setOpen] = useState(false);
  const needsFingerMod = fingerState !== 'sem dor' && ex.fingerMod;
  const sets = ex.sets || 1;
  const repsLabel = ex.duration ? `${ex.duration} seg` : ex.reps ? `${ex.reps} reps` : '';
  return (
    <div className="exercise-item">
      <div className="ex-header" onClick={() => setOpen(!open)}>
        <div>
          <div className="ex-title">{ex.name}</div>
          <div className="ex-meta">{sets} × {repsLabel}</div>
        </div>
        <span className={`chevron ${open ? 'open' : ''}`}>›</span>
      </div>
      {open && (
        <div className="ex-detail">
          <p className="ex-cue">{ex.cue}</p>
          {ex.hipNote && <div className="ex-mod adapt">anca esq: {ex.hipNote}</div>}
          {needsFingerMod && <div className="ex-mod adapt">dedo: {ex.fingerMod}</div>}
          <div className="ex-mods">
            {ex.easier && <span className="ex-mod easier">mais fácil: {ex.easier}</span>}
            {ex.harder && <span className="ex-mod harder">mais difícil: {ex.harder}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function SwimAnalysis({ checkin }) {
  if (!checkin?.swam || !checkin.swimMeters) return null;
  const analysis = getSwimAnalysis(checkin.swimMeters, checkin.swimMinutes);
  if (!analysis) return null;
  const weekPlan = getCurrentWeekPlan();
  const daysToRace = getDaysToRace();
  return (
    <div className="card swim-analysis">
      <div className="card-label">natação da manhã</div>
      <div className="swim-header">
        <div className="swim-big">{checkin.swimMeters}m</div>
        <span className={`badge ${analysis.metTarget ? 'badge-ok' : 'badge-warn'}`}>{analysis.metTarget ? 'meta atingida' : 'abaixo da meta'}</span>
      </div>
      <div className="swim-stats">
        <div className="swim-stat"><span>pace</span><strong>{analysis.pace}/100m</strong></div>
        <div className="swim-stat"><span>zona fc</span><strong>{analysis.zone}</strong></div>
        <div className="swim-stat"><span>projeção 5km</span><strong>{analysis.proj5kMin}h{String(analysis.proj5kSec).padStart(2,'0')}</strong></div>
        <div className="swim-stat"><span>meta diária</span><strong>{weekPlan.daily}m</strong></div>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${Math.min(100, Math.round((checkin.swimMeters / weekPlan.daily) * 100))}%` }} />
      </div>
      <div className="swim-hint">{daysToRace} dias para a prova · foco em volume, não velocidade</div>
    </div>
  );
}

function LiveMetrics({ liveHealth }) {
  if (!liveHealth) return null;
  const hrv = liveHealth.hrv;
  const rhr = liveHealth.resting_hr;
  const sleep = liveHealth.sleep_hours;
  return (
    <div className="card" style={{ marginBottom: '0.75rem' }}>
      <div className="card-label">hoje · {liveHealth.date} · sync {new Date(liveHealth.ts * 1000).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</div>
      <div className="grid2">
        {sleep && <MetricGauge label="sono" value={sleep} unit="h" {...SLEEP_CONFIG(sleep)} />}
        {hrv && <MetricGauge label="hrv" value={hrv} unit="ms" {...HRV_CONFIG(hrv)} />}
        {rhr && <MetricGauge label="fc repouso" value={rhr} unit="bpm" {...RHR_CONFIG(rhr)} />}
        <div className="metric-card">
          <div className="metric-label">calorias</div>
          <div style={{ fontSize: '22px', fontWeight: 500 }}>{liveHealth.active_calories ? Math.round(liveHealth.active_calories) : '—'}<span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text2)' }}>kcal</span></div>
          <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '4px' }}>ativas hoje</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">passos</div>
          <div style={{ fontSize: '22px', fontWeight: 500 }}>{liveHealth.steps ? Math.round(liveHealth.steps).toLocaleString() : '—'}</div>
          <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '4px' }}>meta 10 000</div>
        </div>
        {liveHealth.swim_meters > 0 && (
          <div className="metric-card">
            <div className="metric-label">natação</div>
            <div style={{ fontSize: '22px', fontWeight: 500 }}>{Math.round(liveHealth.swim_meters)}<span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text2)' }}>m</span></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorkoutDay({ checkin, workout, liveHealth }) {
  const [done, setDone] = useState(false);
  const [notes, setNotes] = useState('');

  if (!checkin || !workout) return <div className="card center"><p>a carregar dados...</p></div>;

  if (workout.type === 'none') return (
    <div>
      <LiveMetrics liveHealth={liveHealth} />
      <div className="card alert-box"><p>menos de 4h de sono — hoje é só uma caminhada leve de 10 minutos.</p></div>
    </div>
  );

  const template = templates[workout.type];
  if (!template) return null;

  function handleDone() {
    saveWorkoutDone({ type: workout.type, notes, swimMeters: checkin.swimMeters });
    setDone(true);
  }

  return (
    <div className="workout-day">
      <LiveMetrics liveHealth={liveHealth} />
      <SwimAnalysis checkin={checkin} />
      <div className="card">
        <div className="card-label">treino da tarde · {template.name} · {template.duration} min</div>
        <div className="workout-meta">
          <span className="badge badge-info">sono {checkin.sleep?.toFixed(1)}h</span>
          {checkin.hasBJJ && <span className="badge badge-warn">dia de BJJ</span>}
          <span className="badge badge-muted">{workout.reason}</span>
        </div>
        {template.blocks.map((block, i) => (
          <div key={i} className="block">
            <div className="block-title">{block.name}</div>
            {block.exercises.map((ex, j) => <ExerciseItem key={j} ex={ex} fingerState={checkin.finger} />)}
          </div>
        ))}
        {!done ? (
          <div className="done-section">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="notas do treino (opcional)..." rows={2} />
            <button className="btn-primary" onClick={handleDone}>marcar como feito</button>
          </div>
        ) : (
          <div className="done-confirm">treino registado</div>
        )}
      </div>
    </div>
  );
}
