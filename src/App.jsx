import { useState, useEffect } from 'react';
import WorkoutDay from './components/WorkoutDay';
import Analytics from './components/Analytics';
import Progress from './components/Progress';
import Nutrition from './components/Nutrition';
import { saveCheckin, getTodayCheckin, getMissedDays } from './lib/store';
import { decideWorkout } from './lib/engine';
import './App.css';

const API = 'https://coach-tiago-api-production.up.railway.app';

const DEFAULT_CHECKIN = {
  sleep: 7, feeling: 'bem', finger: 'a recuperar',
  swam: false, swimMeters: 0, swimMinutes: 22, hasBJJ: false, notes: '',
};

export default function App() {
  const [tab, setTab] = useState('hoje');
  const [liveHealth, setLiveHealth] = useState(null);
  const saved = getTodayCheckin();
  const missedDays = getMissedDays();
  const initialCheckin = saved || DEFAULT_CHECKIN;
  const [checkin, setCheckin] = useState(initialCheckin);
  const [workout, setWorkout] = useState(decideWorkout({ sleep: initialCheckin.sleep, hasBJJ: initialCheckin.hasBJJ, missedDays }));

  useEffect(() => {
    fetch(`${API}/health-data/latest`)
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

        fetch(`${API}/health-data/workouts/today`)
          .then(r => r.json())
          .then(data => {
            const swim = (data.workouts || []).find(w => w.workout_type?.toLowerCase().includes('swim') || w.workout_type?.toLowerCase().includes('pool'));
            if (swim) {
              const updated = { ...autoCheckin, swimMinutes: Math.round(swim.duration_min) };
              saveCheckin(updated);
              setCheckin(updated);
            }
          }).catch(() => {});
      }).catch(() => {});
  }, []);

  const tabs = ['hoje', 'nutrição', 'analytics', 'plano'];

  return (
    <div className="app">
      <div className="tabs">
        {tabs.map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      <div className="content">
        {tab === 'hoje' && <WorkoutDay checkin={checkin} workout={workout} liveHealth={liveHealth} />}
        {tab === 'nutrição' && <Nutrition />}
        {tab === 'analytics' && <Analytics />}
        {tab === 'plano' && <Progress />}
      </div>
    </div>
  );
}
