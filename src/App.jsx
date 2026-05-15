import { useState, useEffect } from 'react';
import WorkoutDay from './components/WorkoutDay';
import Analytics from './components/Analytics';
import Progress from './components/Progress';
import { saveCheckin, getTodayCheckin, getMissedDays } from './lib/store';
import { decideWorkout } from './lib/engine';
import './App.css';

const API = 'https://coach-tiago-api-production.up.railway.app';

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
      .then(d => {
        if (d.date) {
          setLiveHealth(d);
          const w = decideWorkout({
            sleep: d.sleep_hours || 7,
            hasBJJ: d.has_bjj === 1,
            missedDays,
          });
          setWorkout(w);
          const autoCheckin = {
            sleep: d.sleep_hours || 7,
            feeling: 'bem',
            finger: 'a recuperar',
            swam: d.swim_meters > 0,
            swimMeters: Math.round(d.swim_meters || 0),
            swimMinutes: 22,
            hasBJJ: d.has_bjj === 1,
            notes: '',
            fromHealth: true,
          };
          saveCheckin(autoCheckin);
          setCheckin(autoCheckin);
        }
        setLoading(false);
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
