import { useState, useEffect } from 'react';
import WorkoutDay from './components/WorkoutDay';
import Analytics from './components/Analytics';
import Progress from './components/Progress';
import { saveCheckin, getTodayCheckin, getMissedDays } from './lib/store';
import { decideWorkout } from './lib/engine';
import './App.css';

const API = 'https://coach-tiago-api.onrender.com';

export default function App() {
  const [tab, setTab] = useState('hoje');
  const [liveHealth, setLiveHealth] = useState(null);
  const [workout, setWorkout] = useState(null);
  const [checkin, setCheckin] = useState(getTodayCheckin());
  const missedDays = getMissedDays();

  useEffect(() => {
    const saved = getTodayCheckin();
    if (saved) {
      setCheckin(saved);
      setWorkout(decideWorkout({ sleep: saved.sleep, hasBJJ: saved.hasBJJ, missedDays }));
    }

    fetch(`${API}/health-data/latest`)
      .then(r => r.json())
      .then(health => {
        if (!health.date) return;
        setLiveHealth(health);
        const swimMeters = Math.round(health.swim_meters || 0);
        const autoCheckin = {
          sleep: health.sleep_hours || 7,
          feeling: 'bem',
          finger: 'a recuperar',
          swam: swimMeters > 0,
          swimMeters,
          swimMinutes: 22,
          hasBJJ: health.has_bjj === 1,
          notes: '',
          fromHealth: true,
        };
        saveCheckin(autoCheckin);
        setCheckin(autoCheckin);
        setWorkout(decideWorkout({ sleep: health.sleep_hours || 7, hasBJJ: health.has_bjj === 1, missedDays }));

        fetch(`${API}/health-data/workouts/today`)
          .then(r => r.json())
          .then(data => {
            const workouts = data.workouts || [];
            const swim = workouts.find(w => w.workout_type?.toLowerCase().includes('swim') || w.workout_type?.toLowerCase().includes('pool'));
            if (swim) {
              const updated = { ...autoCheckin, swimMinutes: Math.round(swim.duration_min) };
              saveCheckin(updated);
              setCheckin(updated);
            }
          })
          .catch(() => {});
      })
      .catch(() => {});
  }, []);

  const showWorkout = checkin && workout;

  return (
    <div className="app">
      <div className="tabs">
        {['hoje','analytics','plano'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      <div className="content">
        {tab === 'hoje' && (
          showWorkout
            ? <WorkoutDay checkin={checkin} workout={workout} liveHealth={liveHealth} />
            : <div className="card center"><p>faz o check-in primeiro para ver o treino de hoje.</p></div>
        )}
        {tab === 'analytics' && <Analytics />}
        {tab === 'plano' && <Progress />}
      </div>
    </div>
  );
}
