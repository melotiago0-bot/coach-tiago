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
  const [loading, setLoading] = useState(true);
  const missedDays = getMissedDays();

  useEffect(() => {
    fetch(`${API}/health-data/latest`)
      .then(r => r.json())
      .then(health => {
        if (!health.date) { setLoading(false); return; }
        setLiveHealth(health);

        const w = decideWorkout({
          sleep: health.sleep_hours || 7,
          hasBJJ: health.has_bjj === 1,
          missedDays,
        });
        setWorkout(w);

        const swimMeters = Math.round(health.swim_meters || 0);

        fetch(`${API}/health-data/workouts/today`)
          .then(r => r.json())
          .then(workoutsData => {
            const workouts = workoutsData.workouts || [];
            const swimWorkout = workouts.find(w =>
              w.workout_type?.toLowerCase().includes('swim') ||
              w.workout_type?.toLowerCase().includes('pool')
            );
            const swimMinutes = swimWorkout ? Math.round(swimWorkout.duration_min) : 22;

            const autoCheckin = {
              sleep: health.sleep_hours || 7,
              feeling: 'bem',
              finger: 'a recuperar',
              swam: swimMeters > 0,
              swimMeters,
              swimMinutes,
              hasBJJ: health.has_bjj === 1,
              notes: '',
              fromHealth: true,
            };
            saveCheckin(autoCheckin);
            setCheckin(autoCheckin);
          })
          .catch(() => {
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
          })
          .finally(() => setLoading(false));
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="app">
      <div className="tabs">
        {['hoje','analytics','plano'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      <div className="content">
        {tab === 'hoje' && (
          loading
            ? <div className="card center"><p>a carregar dados do Apple Health...</p></div>
            : <WorkoutDay checkin={checkin} workout={workout} liveHealth={liveHealth} />
        )}
        {tab === 'analytics' && <Analytics />}
        {tab === 'plano' && <Progress />}
      </div>
    </div>
  );
}
