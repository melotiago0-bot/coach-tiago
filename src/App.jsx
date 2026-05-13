import { useState } from 'react';
import CheckIn from './components/CheckIn';
import WorkoutDay from './components/WorkoutDay';
import Analytics from './components/Analytics';
import Progress from './components/Progress';
import { getTodayCheckin } from './lib/store';
import { decideWorkout } from './lib/engine';
import './App.css';

export default function App() {
  const savedCheckin = getTodayCheckin();
  const [tab, setTab] = useState(savedCheckin ? 'hoje' : 'checkin');
  const [checkin, setCheckin] = useState(savedCheckin);
  const [workout, setWorkout] = useState(savedCheckin ? decideWorkout({ sleep: savedCheckin.sleep, hasBJJ: savedCheckin.hasBJJ, missedDays: 0 }) : null);

  function handleCheckinDone(c, w) {
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
        {tab === 'checkin' && <CheckIn onCheckinDone={handleCheckinDone} />}
        {tab === 'analytics' && <Analytics />}
        {tab === 'plano' && <Progress />}
      </div>
    </div>
  );
}
