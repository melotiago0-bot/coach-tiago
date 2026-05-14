import { useState, useEffect } from 'react';
import { saveCheckin } from '../lib/store';

export default function CheckIn({ onCheckinDone, liveHealth }) {
  const [sleep, setSleep] = useState(7);
  const [feeling, setFeeling] = useState('');
  const [finger, setFinger] = useState('a recuperar');
  const [swam, setSwam] = useState(false);
  const [swimMeters, setSwimMeters] = useState(1000);
  const [swimMinutes, setSwimMinutes] = useState(22);
  const [hasBJJ, setHasBJJ] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (liveHealth?.sleep_hours) {
      setSleep(Math.round(liveHealth.sleep_hours * 2) / 2);
    }
    if (liveHealth?.swim_meters && liveHealth.swim_meters > 0) {
      setSwam(true);
      setSwimMeters(Math.round(liveHealth.swim_meters));
    }
  }, [liveHealth]);

  function handleSubmit() {
    if (!feeling) return alert('indica como te sentes');
    const checkin = { sleep, feeling, finger, swam, swimMeters: swam ? swimMeters : 0, swimMinutes: swam ? swimMinutes : 0, hasBJJ, notes };
    saveCheckin(checkin);
    onCheckinDone(checkin);
  }

  return (
    <div className="checkin">
      <div className="card">
        {liveHealth?.sleep_hours && (
          <div className="alert-box info" style={{ marginBottom: '1rem' }}>
            apple health: {liveHealth.sleep_hours.toFixed(1)}h de sono · fc repouso {Math.round(liveHealth.resting_hr)}bpm · hrv {Math.round(liveHealth.hrv)}ms
          </div>
        )}
        <div className="field">
          <label>horas de sono</label>
          <div className="slider-row">
            <input type="range" min="3" max="10" step="0.5" value={sleep} onChange={e => setSleep(parseFloat(e.target.value))} />
            <span className="slider-val">{sleep}h</span>
          </div>
          <div className="field-hint">
            {sleep < 4 ? 'menos de 4h — só caminhada leve hoje' : sleep < 5 ? 'menos de 5h — só mobilidade' : sleep < 6 ? 'menos de 6h — treino reduzido' : sleep < 7 ? 'sono moderado — treino normal' : 'sono ótimo — intensidade máxima'}
          </div>
        </div>
        <div className="field">
          <label>como te sentes</label>
          <div className="pills">
            {['bem','cansado','com energia','dorido'].map(f => (
              <button key={f} className={`pill ${feeling === f ? 'active' : ''}`} onClick={() => setFeeling(f)}>{f}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>estado do dedo</label>
          <div className="pills">
            {['sem dor','a recuperar','com dor'].map(f => (
              <button key={f} className={`pill ${finger === f ? 'active' : ''}`} onClick={() => setFinger(f)}>{f}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>nadaste hoje?</label>
          <div className="pills">
            <button className={`pill ${swam ? 'active' : ''}`} onClick={() => setSwam(true)}>sim</button>
            <button className={`pill ${!swam ? 'active' : ''}`} onClick={() => setSwam(false)}>não</button>
          </div>
          {swam && (
            <div className="swim-inputs">
              <div className="slider-row">
                <span className="slider-label">metros</span>
                <input type="range" min="200" max="5000" step="100" value={swimMeters} onChange={e => setSwimMeters(parseInt(e.target.value))} />
                <span className="slider-val">{swimMeters}m</span>
              </div>
              <div className="slider-row">
                <span className="slider-label">minutos</span>
                <input type="range" min="5" max="120" step="1" value={swimMinutes} onChange={e => setSwimMinutes(parseInt(e.target.value))} />
                <span className="slider-val">{swimMinutes}min</span>
              </div>
            </div>
          )}
        </div>
        <div className="field">
          <label>tens BJJ hoje?</label>
          <div className="pills">
            <button className={`pill ${hasBJJ ? 'active' : ''}`} onClick={() => setHasBJJ(true)}>sim</button>
            <button className={`pill ${!hasBJJ ? 'active' : ''}`} onClick={() => setHasBJJ(false)}>não</button>
          </div>
        </div>
        <div className="field">
          <label>notas opcionais</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="como te sentes, algo diferente hoje..." rows={2} />
        </div>
        <button className="btn-primary" onClick={handleSubmit}>gerar treino</button>
      </div>
    </div>
  );
}
