import { useState, useEffect } from 'react';
import CheckIn from './components/CheckIn';
import WorkoutDay from './components/WorkoutDay';
import Analytics from './components/Analytics';
import Progress from './components/Progress';
import { getTodayCheckin, getMissedDays } from './lib/store';
import { decideWorkout } from './lib/engine';
import './App.css';

const API = 'https://coach-tiago-api.onrender.com';

export default function App() {
  const savedCheckin = getTodayCheckin();
  const missedDays = getMissedDays();
  const [tab, setTab] = useState(savedCheckin ? 'hoje' : 'checkin');
  const [checkin, setCheckin] = useState(savedCheckin);
  const [workout, setWorkout] = useState(savedCheckin ? decideWorkout({ sleep: savedCheckin.sleep, hasBJJ: savedCheckin.hasBJJ, missedDays }) : null);
  const [liveHealth, setLiveHealth] = useState(null);

  useEffect(() => {
    fetch(`${API}/health-data/latest`)
      .then(r => r.json())
      .then(d => { if (d.date) setLiveHealth(d); })
      .catch(() => {});
  }, []);

  function handleCheckinDone(c) {
    const w = decideWorkout({ sleep: c.sleep, hasBJJ: c.hasBJJ, missedDays });
    setCheckin(c);
    setWorkout(w);
    setTab('hoje');
  }

  return (
    <div className="app">
      <div className="tabs">
        {['hoje','checkin','analytics','plano'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      <div className="content">
        {tab === 'hoje' && <WorkoutDay checkin={checkin} workout={workout} />}
        {tab === 'checkin' && <CheckIn onCheckinDone={handleCheckinDone} liveHealth={liveHealth} />}
        {tab === 'analytics' && <Analytics />}
        {tab === 'plano' && <Progress />}
      </div>
    </div>
  );
}
