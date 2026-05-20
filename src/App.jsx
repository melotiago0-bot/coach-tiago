import { useState, useEffect, useCallback } from 'react';
import WorkoutDay from './components/WorkoutDay';
import Analytics from './components/Analytics';
import Progress from './components/Progress';
import Nutrition from './components/Nutrition';
import LockScreen, { isSessionValid, markUnlocked, isPinSet } from './components/LockScreen';
import { saveCheckin, getTodayCheckin, getMissedDays } from './lib/store';
import { decideWorkout, getDaysToRace, getPlanProgress, getCurrentWeekPlan } from './lib/engine';
import { apiFetch } from './lib/config';
import './App.css';

const DEFAULT_CHECKIN = {
  sleep: 7, feeling: 'bem', finger: 'a recuperar',
  swam: false, swimMeters: 0, swimMinutes: 22, hasBJJ: false, notes: '',
};

function AppSidebar({ liveHealth, checkin }) {
  const daysToRace = getDaysToRace();
  const progress = getPlanProgress();
  const weekPlan = getCurrentWeekPlan();
  const activeCals = liveHealth?.active_calories || 0;
  const totalBurned = 1906 + activeCals;

  return (
    <div className="app-sidebar">
      <div className="sidebar-section-title">resumo do dia</div>
      {liveHealth?.swim_meters > 0 && (
        <div className="sidebar-kpi">
          <div className="sidebar-kpi-label">natação</div>
          <div className="sidebar-kpi-val">{Math.round(liveHealth.swim_meters)}m</div>
          <div className="sidebar-kpi-sub" style={{ color: '#1D9E75' }}>meta {weekPlan?.daily || 1000}m</div>
        </div>
      )}
      <div className="sidebar-kpi">
        <div className="sidebar-kpi-label">calorias gastas</div>
        <div className="sidebar-kpi-val">{Math.round(totalBurned)} kcal</div>
        <div className="sidebar-kpi-sub">basal 1906 + ativas {Math.round(activeCals)}</div>
      </div>
      <div className="sidebar-kpi">
        <div className="sidebar-kpi-label">passos</div>
        <div className="sidebar-kpi-val">{liveHealth?.steps ? Math.round(liveHealth.steps).toLocaleString() : '—'}</div>
        <div className="sidebar-kpi-sub">meta 10 000</div>
      </div>
      <div className="sidebar-kpi">
        <div className="sidebar-kpi-label">prova · 19 julho</div>
        <div className="sidebar-kpi-val">{daysToRace} dias</div>
        <div style={{ height: '4px', background: 'var(--bg)', borderRadius: '2px', overflow: 'hidden', marginTop: '6px' }}>
          <div style={{ height: '4px', borderRadius: '2px', width: `${progress}%`, background: '#1D9E75' }} />
        </div>
        <div className="sidebar-kpi-sub" style={{ marginTop: '3px' }}>semana {getCurrentWeekPlan()?.week || 1} de 9</div>
      </div>
      {liveHealth && (
        <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '1rem' }}>
          sync {new Date(liveHealth.ts * 1000).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [locked, setLocked] = useState(() => !isPinSet() || !isSessionValid());
  const [tab, setTab] = useState('hoje');
  const [liveHealth, setLiveHealth] = useState(null);
  const saved = getTodayCheckin();
  const missedDays = getMissedDays();
  const initialCheckin = saved || DEFAULT_CHECKIN;
  const [checkin, setCheckin] = useState(initialCheckin);
  const [workout, setWorkout] = useState(decideWorkout({ sleep: initialCheckin.sleep, hasBJJ: initialCheckin.hasBJJ, missedDays }));

  /* auto-lock on inactivity */
  useEffect(() => {
    if (!isPinSet()) return;
    const events = ['click', 'keydown', 'touchstart', 'scroll'];
    const refresh = () => markUnlocked();
    events.forEach(e => window.addEventListener(e, refresh, { passive: true }));
    const timer = setInterval(() => {
      if (!isSessionValid()) setLocked(true);
    }, 30_000); // check every 30s
    return () => {
      events.forEach(e => window.removeEventListener(e, refresh));
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    apiFetch('/health-data/latest')
      .then(r => r.json())
      .then(health => {
        if (!health.date) return;
        setLiveHealth(health);
        const swimMeters = Math.round(health.swim_meters || 0);
        const autoCheckin = {
          sleep: health.sleep_hours || 7, feeling: 'bem', finger: 'a recuperar',
          swam: swimMeters > 0, swimMeters, swimMinutes: 22,
          hasBJJ: health.has_bjj === 1, notes: '', fromHealth: true,
        };
        saveCheckin(autoCheckin);
        setCheckin(autoCheckin);
        setWorkout(decideWorkout({ sleep: health.sleep_hours || 7, hasBJJ: health.has_bjj === 1, missedDays }));

        apiFetch('/health-data/workouts/today')
          .then(r => r.json())
          .then(data => {
            const swim = (data.workouts || []).find(w =>
              w.workout_type?.toLowerCase().includes('swim') ||
              w.workout_type?.toLowerCase().includes('pool') ||
              w.workout_type?.toLowerCase().includes('open water')
            );
            if (swim) {
              const updated = { ...autoCheckin, swimMinutes: Math.round(swim.duration_min) };
              saveCheckin(updated);
              setCheckin(updated);
            }
          }).catch(() => {});
      }).catch(() => {});
  }, []);

  const tabs = [
    { id: 'hoje', label: 'hoje' },
    { id: 'nutrição', label: 'nutrição' },
    { id: 'analytics', label: 'analytics' },
    { id: 'plano', label: 'plano' },
  ];

  if (locked) return <LockScreen onUnlock={() => setLocked(false)} />;

  return (
    <div className="app">
      <div className="tabs">
        {tabs.map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="content">
        {tab === 'hoje' && <WorkoutDay checkin={checkin} workout={workout} liveHealth={liveHealth} />}
        {tab === 'nutrição' && <Nutrition liveHealth={liveHealth} />}
        {tab === 'analytics' && <Analytics />}
        {tab === 'plano' && <Progress />}
      </div>
      <AppSidebar liveHealth={liveHealth} checkin={checkin} />
    </div>
  );
}
