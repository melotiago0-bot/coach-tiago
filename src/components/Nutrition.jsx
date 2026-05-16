import { useState, useEffect, useRef } from 'react';

const API = 'https://coach-tiago-api-production.up.railway.app';
const CALORIE_GOAL = 2300;
const PROTEIN_GOAL = 160;
const FAT_GOAL = 90;
const FIBER_GOAL = 25;

function MacroBar({ label, current, goal, color }) {
  const pct = Math.min(100, Math.round((current / goal) * 100));
  const ok = pct >= 80;
  return (
    <div className="metric-card">
      <div className="metric-label" style={{ color, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: 500, color: 'var(--text)' }}>
        {Math.round(current)}<span style={{ fontSize: '12px', color: 'var(--text2)' }}>/{goal}</span>
      </div>
      <div style={{ height: '5px', background: 'var(--bg3)', borderRadius: '4px', marginTop: '6px', overflow: 'hidden' }}>
        <div style={{ height: '5px', borderRadius: '4px', width: `${pct}%`, background: ok ? color : '#EF9F27' }} />
      </div>
      <div style={{ fontSize: '10px', color: ok ? '#1D9E75' : '#EF9F27', marginTop: '3px' }}>{pct}%</div>
    </div>
  );
}

function MealCard({ meal, onDelete }) {
  const time = new Date(meal.ts * 1000).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  return (
    <div style={{ padding: '10px 0', borderBottom: '0.5px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 500 }}>{meal.meal_type} · {time}</div>
          <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px' }}>{meal.description}</div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: '#FAECE7', color: '#712B13' }}>P {Math.round(meal.protein)}g</span>
            <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: '#FAEEDA', color: '#633806' }}>G {Math.round(meal.fat)}g</span>
            <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: '#E6F1FB', color: '#0C447C' }}>F {Math.round(meal.fiber)}g</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
          <div style={{ fontSize: '16px', fontWeight: 500 }}>{Math.round(meal.calories)}</div>
          <div style={{ fontSize: '10px', color: 'var(--text3)' }}>kcal</div>
        </div>
      </div>
    </div>
  );
}

export default function Nutrition() {
  const [tab, setTab] = useState('hoje');
  const [meals, setMeals] = useState([]);
  const [healthData, setHealthData] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [pending, setPending] = useState(null);
  const [deficits, setDeficits] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState('text');
  const [textInput, setTextInput] = useState('');
  const [mealType, setMealType] = useState('almoço');
  const fileRef = useRef();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [mealsRes, healthRes] = await Promise.all([
      fetch(`${API}/meals/today`).then(r => r.json()).catch(() => ({ meals: [] })),
      fetch(`${API}/health-data/latest`).then(r => r.json()).catch(() => null)
    ]);
    setMeals(mealsRes.meals || []);
    setHealthData(healthRes);
  }

  const totalCals = meals.reduce((s, m) => s + (m.calories || 0), 0);
  const totalProtein = meals.reduce((s, m) => s + (m.protein || 0), 0);
  const totalFat = meals.reduce((s, m) => s + (m.fat || 0), 0);
  const totalFiber = meals.reduce((s, m) => s + (m.fiber || 0), 0);
  const totalCarbs = meals.reduce((s, m) => s + (m.carbs || 0), 0);

  const burned = healthData?.active_calories || 0;
  const basal = 1950;
  const totalBurned = burned + basal;
  const deficit = totalBurned - totalCals;
  const remaining = CALORIE_GOAL - totalCals;

  const lastMeal = meals.length ? meals[meals.length - 1] : null;
  const fastingHours = lastMeal ? Math.round((Date.now() - lastMeal.ts * 1000) / 3600000 * 10) / 10 : null;
  const nextWindow = lastMeal ? new Date((lastMeal.ts + 57600) * 1000).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : null;

  async function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setAnalyzing(true);
    setShowAdd(false);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const b64 = ev.target.result.split(',')[1];
      const res = await fetch(`${API}/meals/analyze-photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: b64, meal_type: mealType })
      }).then(r => r.json());
      setAnalyzing(false);
      if (res.status === 'ok') setPending({ ...res.analysis, meal_type: mealType });
    };
    reader.readAsDataURL(file);
  }

  async function handleText() {
    if (!textInput.trim()) return;
    setAnalyzing(true);
    setShowAdd(false);
    const res = await fetch(`${API}/meals/analyze-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: textInput, meal_type: mealType })
    }).then(r => r.json());
    setAnalyzing(false);
    setTextInput('');
    if (res.status === 'ok') setPending({ ...res.analysis, meal_type: mealType });
  }

  async function confirmMeal() {
    await fetch(`${API}/meals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pending)
    });
    setPending(null);
    loadData();
    analyzeDeficits();
  }

  async function analyzeDeficits() {
    const totals = { calories: totalCals, protein: totalProtein, fat: totalFat, fiber: totalFiber, carbs: totalCarbs };
    const res = await fetch(`${API}/meals/deficits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meals, totals })
    }).then(r => r.json());
    setDeficits(res);
  }

  const deficitColor = deficit < 300 ? '#D85A30' : deficit > 800 ? '#EF9F27' : '#1D9E75';
  const deficitLabel = deficit < 300 ? 'défice insuficiente' : deficit > 800 ? 'défice elevado' : 'zona ideal';

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)', marginBottom: '1rem' }}>
        {['hoje', 'analytics'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'hoje' && (
        <>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>défice calórico</div>
                <div style={{ fontSize: '32px', fontWeight: 500, color: deficitColor }}>{deficit > 0 ? '-' : '+'}{Math.abs(Math.round(deficit))} <span style={{ fontSize: '16px', fontWeight: 400, color: 'var(--text2)' }}>kcal</span></div>
                <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '2px' }}>{deficitLabel}</div>
              </div>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: deficit >= 300 && deficit <= 800 ? '#E1F5EE' : '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                {deficit >= 300 && deficit <= 800 ? '✓' : '⚠'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#D85A30', fontWeight: 500 }}>gastas</div>
                <div style={{ fontSize: '18px', fontWeight: 500 }}>{Math.round(totalBurned)}</div>
                <div style={{ fontSize: '10px', color: 'var(--text3)' }}>kcal</div>
              </div>
              <div style={{ fontSize: '20px', color: 'var(--text3)', alignSelf: 'center' }}>−</div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#1D9E75', fontWeight: 500 }}>consumidas</div>
                <div style={{ fontSize: '18px', fontWeight: 500 }}>{Math.round(totalCals)}</div>
                <div style={{ fontSize: '10px', color: 'var(--text3)' }}>kcal</div>
              </div>
              <div style={{ fontSize: '20px', color: 'var(--text3)', alignSelf: 'center' }}>=</div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#7F77DD', fontWeight: 500 }}>disponível</div>
                <div style={{ fontSize: '18px', fontWeight: 500, color: remaining < 0 ? '#D85A30' : 'var(--text)' }}>{Math.max(0, Math.round(remaining))}</div>
                <div style={{ fontSize: '10px', color: 'var(--text3)' }}>kcal</div>
              </div>
            </div>
            {remaining < 0 && <div style={{ background: '#FCEBEB', borderRadius: 'var(--border-radius-md)', padding: '.5rem .75rem', fontSize: '12px', color: '#501313' }}>Já atingiste o objetivo calórico de hoje.</div>}
          </div>

          {lastMeal && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>jejum intermitente · {fastingHours}h</div>
                  <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '2px' }}>próxima janela: {nextWindow}</div>
                </div>
                <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '20px', background: fastingHours >= 14 ? '#E1F5EE' : '#FAEEDA', color: fastingHours >= 14 ? '#085041' : '#633806' }}>
                  {fastingHours >= 14 ? 'zona fat-burn' : 'a acumular'}
                </span>
              </div>
              <div style={{ height: '8px', background: 'var(--bg3)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '8px', borderRadius: '4px', width: `${Math.min(100, (fastingHours / 16) * 100)}%`, background: '#1D9E75' }} />
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '3px' }}>objetivo 16h · {Math.round((fastingHours / 16) * 100)}%</div>
            </div>
          )}

          <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '1rem 0 .5rem' }}>macros</div>
          <div className="grid2">
            <MacroBar label="proteína" current={totalProtein} goal={PROTEIN_GOAL} color="#D85A30" />
            <MacroBar label="gordura" current={totalFat} goal={FAT_GOAL} color="#EF9F27" />
            <MacroBar label="fibra" current={totalFiber} goal={FIBER_GOAL} color="#378ADD" />
            <div className="metric-card">
              <div className="metric-label" style={{ color: '#5DCAA5', fontWeight: 500 }}>hidratos</div>
              <div style={{ fontSize: '20px', fontWeight: 500 }}>{Math.round(totalCarbs)}<span style={{ fontSize: '12px', color: 'var(--text2)' }}>g</span></div>
              <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '4px' }}>só vegetais e fruta</div>
            </div>
          </div>

          {deficits && deficits.deficits && deficits.deficits.length > 0 && (
            <>
              <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '1rem 0 .5rem' }}>défices · sugestões</div>
              {deficits.deficits.map((d, i) => (
                <div key={i} className="card" style={{ padding: '.75rem 1rem', marginBottom: '.5rem' }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#EF9F27', marginBottom: '4px' }}>
                    {d.nutrient} — {Math.round(d.current)}/{d.target} {d.unit || 'g'}
                  </div>
                  {d.suggestions.map((s, j) => (
                    <div key={j} style={{ fontSize: '12px', color: 'var(--text2)', padding: '3px 0' }}>
                      · {s.food} ({s.amount}) → +{s.value}{s.unit}
                    </div>
                  ))}
                </div>
              ))}
              {deficits.overall && (
                <div style={{ background: '#E1F5EE', borderRadius: 'var(--border-radius-md)', padding: '.6rem .9rem', fontSize: '12px', color: '#085041', marginBottom: '.75rem', lineHeight: 1.5 }}>
                  {deficits.overall}
                </div>
              )}
            </>
          )}

          <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '1rem 0 .5rem' }}>refeições</div>
          <div className="card">
            {meals.length === 0 ? <div style={{ fontSize: '13px', color: 'var(--text3)', textAlign: 'center', padding: '1rem 0' }}>ainda sem refeições hoje</div>
              : meals.map((m, i) => <MealCard key={i} meal={m} />)}
          </div>

          {analyzing && (
            <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <div style={{ fontSize: '13px', color: 'var(--text2)' }}>a analisar com Claude...</div>
            </div>
          )}

          {pending && (
            <div className="card">
              <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>Confirma a refeição</div>
              <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '8px' }}>{pending.description}</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: 'var(--bg3)' }}>{Math.round(pending.calories)} kcal</span>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#FAECE7', color: '#712B13' }}>P {Math.round(pending.protein)}g</span>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#FAEEDA', color: '#633806' }}>G {Math.round(pending.fat)}g</span>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#E6F1FB', color: '#0C447C' }}>F {Math.round(pending.fiber)}g</span>
              </div>
              {pending.items && <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '12px' }}>Identificado: {pending.items.join(', ')}</div>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-primary" style={{ flex: 1 }} onClick={confirmMeal}>confirmar</button>
                <button style={{ flex: 1, padding: '12px', border: '0.5px solid var(--border2)', borderRadius: 'var(--border-radius-md)', background: 'var(--bg)', color: 'var(--text)', fontSize: '14px', cursor: 'pointer' }} onClick={() => setPending(null)}>cancelar</button>
              </div>
            </div>
          )}

          {!showAdd && !pending && !analyzing && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => { setShowAdd(true); setAddMode('photo'); }}>📷 foto</button>
              <button className="btn-primary" style={{ flex: 1, background: 'var(--bg3)', color: 'var(--text)' }} onClick={() => { setShowAdd(true); setAddMode('text'); }}>✏️ texto</button>
            </div>
          )}

          {showAdd && (
            <div className="card">
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '6px' }}>tipo de refeição</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['almoço', 'jantar', 'snack', 'suplementos'].map(t => (
                    <button key={t} onClick={() => setMealType(t)} style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '20px', border: '0.5px solid', borderColor: mealType === t ? '#1D9E75' : 'var(--border2)', background: mealType === t ? '#E1F5EE' : 'var(--bg3)', color: mealType === t ? '#085041' : 'var(--text)', cursor: 'pointer' }}>{t}</button>
                  ))}
                </div>
              </div>
              {addMode === 'photo' ? (
                <>
                  <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} />
                  <button className="btn-primary" onClick={() => fileRef.current.click()}>tirar foto</button>
                </>
              ) : (
                <>
                  <textarea value={textInput} onChange={e => setTextInput(e.target.value)} placeholder="ex: bife de 200g com espinafres e azeite..." rows={3} style={{ width: '100%', background: 'var(--bg3)', border: '0.5px solid var(--border)', borderRadius: 'var(--border-radius-md)', color: 'var(--text)', fontSize: '13px', padding: '8px 10px', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5, marginBottom: '8px' }} />
                  <button className="btn-primary" onClick={handleText}>analisar</button>
                </>
              )}
              <button onClick={() => setShowAdd(false)} style={{ width: '100%', padding: '10px', border: 'none', background: 'none', color: 'var(--text3)', fontSize: '13px', cursor: 'pointer', marginTop: '6px' }}>cancelar</button>
            </div>
          )}
        </>
      )}

      {tab === 'analytics' && (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text2)' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
          <div style={{ fontSize: '14px' }}>analytics de nutrição em breve</div>
          <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>os dados vão acumulando com cada refeição registada</div>
        </div>
      )}
    </div>
  );
}
