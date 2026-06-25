import { useState, useEffect, useRef } from 'react';
import FastingCard from './FastingCard';
import NutritionAnalytics from './NutritionAnalytics';

import { apiFetch } from '../lib/config';

const BASAL = 1906;
const PROTEIN_GOAL = 160;
const FAT_GOAL = 90;
const FIBER_GOAL = 25;
const IRON_GOAL = 8;
const MAGNESIUM_GOAL = 400;
const ZINC_GOAL = 11;
const POTASSIUM_GOAL = 3500;
const B12_GOAL = 2.4;
const VITAMIN_D_GOAL = 600;

function MacroBar({ label, current, goal, color, unit = 'g' }) {
  const pct = Math.min(100, Math.round((current / goal) * 100));
  const ok = pct >= 80;
  return (
    <div className="metric-card">
      <div className="metric-label" style={{ color, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: 500, color: 'var(--text)' }}>
        {typeof current === 'number' && current < 10 ? current.toFixed(1) : Math.round(current)}
        <span style={{ fontSize: '12px', color: 'var(--text2)' }}>/{goal}{unit}</span>
      </div>
      <div style={{ height: '5px', background: 'var(--bg3)', borderRadius: '4px', marginTop: '6px', overflow: 'hidden' }}>
        <div style={{ height: '5px', borderRadius: '4px', width: `${pct}%`, background: ok ? color : '#EF9F27' }} />
      </div>
      <div style={{ fontSize: '10px', color: ok ? '#1D9E75' : '#EF9F27', marginTop: '3px' }}>{pct}%</div>
    </div>
  );
}

function nowLocalInput() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function MealCard({ meal, onDelete }) {
  const time = new Date(meal.ts * 1000).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  return (
    <div style={{ padding: '10px 0', borderBottom: '0.5px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 500 }}>{meal.meal_type} · {time}</div>
          <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px' }}>{meal.description}</div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: '#FAECE7', color: '#712B13' }}>P {Math.round(meal.protein)}g</span>
            <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: '#FAEEDA', color: '#633806' }}>G {Math.round(meal.fat)}g</span>
            <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: '#E6F1FB', color: '#0C447C' }}>F {Math.round(meal.fiber)}g</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '8px', flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '16px', fontWeight: 500 }}>{Math.round(meal.calories)}</div>
            <div style={{ fontSize: '10px', color: 'var(--text3)' }}>kcal</div>
          </div>
          <button
            onClick={() => onDelete(meal.id)}
            style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: '16px', cursor: 'pointer', padding: '4px', lineHeight: 1 }}
            title="apagar refeição"
          >×</button>
        </div>
      </div>
    </div>
  );
}

export default function Nutrition({ liveHealth }) {
  const [tab, setTab] = useState('hoje');
  const [meals, setMeals] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editFields, setEditFields] = useState({});
  const [deficits, setDeficits] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState('text');
  const [textInput, setTextInput] = useState('');
  const [mealType, setMealType] = useState('almoço');
  const [mealDT, setMealDT] = useState(nowLocalInput());
  const fileRef = useRef();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const mealsRes = await apiFetch('/meals/today').then(r => r.json()).catch(() => ({ meals: [] }));
    setMeals(mealsRes.meals || []);
    setDeficits(null);
  }

  async function handleDelete(id) {
    if (!confirm('Apagar esta refeição?')) return;
    await apiFetch(`/meals/${id}`, { method: 'DELETE' }).catch(() => {});
    await loadData();
  }

  const totalCals = meals.reduce((s, m) => s + (m.calories || 0), 0);
  const totalProtein = meals.reduce((s, m) => s + (m.protein || 0), 0);
  const totalFat = meals.reduce((s, m) => s + (m.fat || 0), 0);
  const totalFiber = meals.reduce((s, m) => s + (m.fiber || 0), 0);
  const totalCarbs = meals.reduce((s, m) => s + (m.carbs || 0), 0);
  const totalIron = meals.reduce((s, m) => s + (m.iron || 0), 0);
  const totalMagnesium = meals.reduce((s, m) => s + (m.magnesium || 0), 0);
  const totalZinc = meals.reduce((s, m) => s + (m.zinc || 0), 0);
  const totalPotassium = meals.reduce((s, m) => s + (m.potassium || 0), 0);
  const totalB12 = meals.reduce((s, m) => s + (m.b12 || 0), 0);
  const totalVitD = meals.reduce((s, m) => s + (m.vitamin_d || 0), 0);

  const activeCals = liveHealth?.active_calories || 0;
  const totalBurned = BASAL + activeCals;
  const deficit = totalBurned - totalCals;

  const deficitColor = deficit < 300 ? '#D85A30' : deficit > 800 ? '#EF9F27' : '#1D9E75';
  const deficitLabel = deficit < 300 ? 'défice insuficiente' : deficit > 800 ? 'défice elevado' : 'zona ideal';

  const MAX_PHOTO_MB = 5;

  async function compressImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, 1200 / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      alert(`Foto demasiado grande. Máximo ${MAX_PHOTO_MB}MB.`);
      e.target.value = '';
      return;
    }
    setAnalyzing(true); setShowAdd(false);
    try {
      const b64 = await compressImage(file);
      const res = await apiFetch('/meals/analyze-photo', {
        method: 'POST',
        body: JSON.stringify({ image: b64, meal_type: mealType })
      }).then(r => r.json());
      setAnalyzing(false);
      if (res.status === 'ok') {
        const analysis = { ...res.analysis, meal_type: mealType, _dt: mealDT };
        setPending(analysis);
        setEditFields({
          description: analysis.description || '',
          calories: analysis.calories || 0,
          protein: analysis.protein || 0,
          fat: analysis.fat || 0,
          fiber: analysis.fiber || 0,
          carbs: analysis.carbs || 0,
        });
        setEditMode(false);
      } else {
        alert('Erro ao analisar a foto. Tenta de novo.');
      }
    } catch {
      setAnalyzing(false);
      alert('Erro ao analisar a foto. Verifica a ligação.');
    }
  }

  async function handleText() {
    if (!textInput.trim()) return;
    setAnalyzing(true); setShowAdd(false);
    try {
      const res = await apiFetch('/meals/analyze-text', {
        method: 'POST',
        body: JSON.stringify({ text: textInput, meal_type: mealType })
      }).then(r => r.json());
      setAnalyzing(false); setTextInput('');
      if (res.status === 'ok') {
        const analysis = { ...res.analysis, meal_type: mealType, _dt: mealDT };
        setPending(analysis);
        setEditFields({
          description: analysis.description || '',
          calories: analysis.calories || 0,
          protein: analysis.protein || 0,
          fat: analysis.fat || 0,
          fiber: analysis.fiber || 0,
          carbs: analysis.carbs || 0,
        });
        setEditMode(false);
      } else {
        alert('Erro ao analisar. Tenta de novo.');
      }
    } catch {
      setAnalyzing(false);
      alert('Erro ao analisar. Verifica a ligação.');
    }
  }

  async function confirmMeal(mealData = pending) {
    setSaving(true);
    try {
      const dt = mealData._dt;
      const payload = { ...mealData };
      delete payload._dt;
      if (dt) {
        payload.ts = Math.floor(new Date(dt).getTime() / 1000);
        payload.date = dt.slice(0, 10);
      }
      const res = await apiFetch('/meals', { method: 'POST', body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('save failed');
      setPending(null); setEditMode(false);
      await loadData();
      const totals = { calories: totalCals + mealData.calories, protein: totalProtein + mealData.protein, fat: totalFat + mealData.fat, fiber: totalFiber + mealData.fiber, iron: totalIron + (mealData.iron||0), magnesium: totalMagnesium + (mealData.magnesium||0), zinc: totalZinc + (mealData.zinc||0), potassium: totalPotassium + (mealData.potassium||0), b12: totalB12 + (mealData.b12||0), vitamin_d: totalVitD + (mealData.vitamin_d||0) };
      const defRes = await apiFetch('/meals/deficits', {
        method: 'POST',
        body: JSON.stringify({ meals, totals })
      }).then(r => r.json());
      setDeficits(defRes);
    } catch {
      alert('Erro ao guardar a refeição. Tenta de novo.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmWithCorrection() {
    const corrected = {
      ...pending,
      description: editFields.description,
      calories: Number(editFields.calories),
      protein: Number(editFields.protein),
      fat: Number(editFields.fat),
      fiber: Number(editFields.fiber),
      carbs: Number(editFields.carbs),
    };
    // guardar feedback para a IA aprender
    apiFetch('/meals/feedback', {
      method: 'POST',
      body: JSON.stringify({
        meal_type: pending.meal_type,
        original_description: pending.description,
        original_calories: pending.calories,
        original_protein: pending.protein,
        original_fat: pending.fat,
        original_fiber: pending.fiber,
        corrected_description: corrected.description,
        corrected_calories: corrected.calories,
        corrected_protein: corrected.protein,
        corrected_fat: corrected.fat,
        corrected_fiber: corrected.fiber,
      })
    });
    await confirmMeal(corrected);
  }

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)', marginBottom: '1rem' }}>
        {['hoje', 'analytics'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'hoje' && (
        <>
          <FastingCard />

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>défice calórico</div>
                <div className="num-hero" style={{ fontSize: '40px', fontWeight: 700, color: deficitColor }}>{deficit >= 0 ? '-' : '+'}{Math.abs(Math.round(deficit))} <span style={{ fontSize: '16px', fontWeight: 400, color: 'var(--text2)' }}>kcal</span></div>
                <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '2px' }}>{deficitLabel} · objetivo -500 a -700</div>
              </div>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: deficit >= 300 && deficit <= 800 ? '#E1F5EE' : '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                {deficit >= 300 && deficit <= 800 ? '✓' : '⚠'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#D85A30', fontWeight: 500 }}>gastas</div>
                <div style={{ fontSize: '18px', fontWeight: 500 }}>{Math.round(totalBurned)}</div>
                <div style={{ fontSize: '10px', color: 'var(--text3)' }}>basal {BASAL} + ativas {Math.round(activeCals)}</div>
              </div>
              <div style={{ fontSize: '20px', color: 'var(--text3)', alignSelf: 'center' }}>−</div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#1D9E75', fontWeight: 500 }}>consumidas</div>
                <div style={{ fontSize: '18px', fontWeight: 500 }}>{Math.round(totalCals)}</div>
                <div style={{ fontSize: '10px', color: 'var(--text3)' }}>kcal</div>
              </div>
            </div>
          </div>

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

          <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '1rem 0 .5rem' }}>minerais e vitaminas</div>
          <div className="grid2">
            <MacroBar label="ferro" current={totalIron} goal={IRON_GOAL} color="#7F77DD" unit="mg" />
            <MacroBar label="magnésio" current={totalMagnesium} goal={MAGNESIUM_GOAL} color="#1D9E75" unit="mg" />
            <MacroBar label="zinco" current={totalZinc} goal={ZINC_GOAL} color="#378ADD" unit="mg" />
            <MacroBar label="potássio" current={totalPotassium} goal={POTASSIUM_GOAL} color="#EF9F27" unit="mg" />
            <MacroBar label="vitamina B12" current={totalB12} goal={B12_GOAL} color="#D85A30" unit="mcg" />
            <MacroBar label="vitamina D" current={totalVitD} goal={VITAMIN_D_GOAL} color="#5DCAA5" unit="IU" />
          </div>

          {deficits && deficits.deficits && deficits.deficits.length > 0 && (
            <>
              <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '1rem 0 .5rem' }}>sugestões para défices</div>
              {deficits.deficits.map((d, i) => (
                <div key={i} className="card" style={{ padding: '.75rem 1rem', marginBottom: '.5rem' }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#EF9F27', marginBottom: '6px' }}>{d.nutrient} — {Math.round(d.current)}/{d.target}{d.unit || 'g'}</div>
                  {d.suggestions.map((s, j) => (
                    <div key={j} style={{ fontSize: '12px', color: 'var(--text2)', padding: '3px 0' }}>· {s.food} ({s.amount}) → +{s.value}{s.unit}</div>
                  ))}
                </div>
              ))}
              {deficits.overall && <div style={{ background: '#E1F5EE', borderRadius: 'var(--border-radius-md)', padding: '.6rem .9rem', fontSize: '12px', color: '#085041', marginBottom: '.75rem', lineHeight: 1.5 }}>{deficits.overall}</div>}
            </>
          )}

          <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '1rem 0 .5rem' }}>refeições de hoje</div>
          <div className="card">
            {meals.length === 0
              ? <div style={{ fontSize: '13px', color: 'var(--text3)', textAlign: 'center', padding: '1rem 0' }}>ainda sem refeições hoje</div>
              : meals.map((m, i) => <MealCard key={i} meal={m} onDelete={handleDelete} />)}
          </div>

          {analyzing && <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}><div style={{ fontSize: '13px', color: 'var(--text2)' }}>a analisar com Claude...</div></div>}

          {pending && (
            <div className="card">
              {!editMode ? (
                <>
                  <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px' }}>a IA identificou</div>
                  <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>{pending.description}</div>
                  {pending.items && <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '8px' }}>{pending.items.join(', ')}</div>}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text2)', marginBottom: '4px' }}>quando comeste</div>
                    <input
                      type="datetime-local"
                      value={pending._dt || nowLocalInput()}
                      max={nowLocalInput()}
                      onChange={e => setPending(p => ({ ...p, _dt: e.target.value }))}
                      style={{ width: '100%', background: 'var(--bg3)', border: '0.5px solid var(--border)', borderRadius: 'var(--border-radius-md)', color: 'var(--text)', fontSize: '14px', padding: '8px 10px', fontFamily: 'inherit' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                    <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '10px', background: 'var(--bg3)', fontWeight: 500 }}>{Math.round(pending.calories)} kcal</span>
                    <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '10px', background: '#FAECE7', color: '#712B13' }}>P {Math.round(pending.protein)}g</span>
                    <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '10px', background: '#FAEEDA', color: '#633806' }}>G {Math.round(pending.fat)}g</span>
                    <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '10px', background: '#E6F1FB', color: '#0C447C' }}>F {Math.round(pending.fiber)}g</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <button className="btn-primary" style={{ flex: 1 }} onClick={() => confirmMeal()} disabled={saving}>{saving ? 'a guardar...' : '✅ validar'}</button>
                    <button onClick={() => setEditMode(true)} style={{ flex: 1, padding: '12px', border: '0.5px solid var(--border2)', borderRadius: 'var(--border-radius-md)', background: 'var(--bg)', color: 'var(--text)', fontSize: '14px', cursor: 'pointer' }}>✏️ corrigir</button>
                  </div>
                  <button onClick={() => { setPending(null); setEditMode(false); }} style={{ width: '100%', padding: '8px', border: 'none', background: 'none', color: 'var(--text3)', fontSize: '12px', cursor: 'pointer' }}>cancelar</button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px' }}>corrige os valores</div>
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text2)', marginBottom: '4px' }}>descrição</div>
                    <textarea
                      value={editFields.description}
                      onChange={e => setEditFields(f => ({ ...f, description: e.target.value }))}
                      rows={2}
                      style={{ width: '100%', background: 'var(--bg3)', border: '0.5px solid var(--border)', borderRadius: 'var(--border-radius-md)', color: 'var(--text)', fontSize: '13px', padding: '8px 10px', resize: 'none', fontFamily: 'inherit', lineHeight: 1.4 }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                    {[
                      { key: 'calories', label: 'calorias', unit: 'kcal', color: 'var(--text)' },
                      { key: 'protein',  label: 'proteína',  unit: 'g',    color: '#D85A30'    },
                      { key: 'fat',      label: 'gordura',   unit: 'g',    color: '#EF9F27'    },
                      { key: 'fiber',    label: 'fibra',     unit: 'g',    color: '#378ADD'    },
                    ].map(({ key, label, unit, color }) => (
                      <div key={key}>
                        <div style={{ fontSize: '11px', color, marginBottom: '3px', fontWeight: 500 }}>{label} <span style={{ color: 'var(--text3)', fontWeight: 400 }}>({unit})</span></div>
                        <input
                          type="number" min="0" step="1"
                          value={editFields[key]}
                          onChange={e => setEditFields(f => ({ ...f, [key]: e.target.value }))}
                          style={{ width: '100%', background: 'var(--bg3)', border: '0.5px solid var(--border)', borderRadius: 'var(--border-radius-md)', color: 'var(--text)', fontSize: '15px', fontWeight: 500, padding: '8px 10px', fontFamily: 'inherit' }}
                        />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <button className="btn-primary" style={{ flex: 1 }} onClick={confirmWithCorrection} disabled={saving}>{saving ? 'a guardar...' : '✅ guardar correção'}</button>
                    <button onClick={() => setEditMode(false)} style={{ flex: 1, padding: '12px', border: '0.5px solid var(--border2)', borderRadius: 'var(--border-radius-md)', background: 'var(--bg)', color: 'var(--text)', fontSize: '14px', cursor: 'pointer' }}>← voltar</button>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', textAlign: 'center' }}>a correção é guardada para melhorar a IA 🧠</div>
                </>
              )}
            </div>
          )}

          {!showAdd && !pending && !analyzing && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => { setShowAdd(true); setAddMode('photo'); setMealDT(nowLocalInput()); }}>📷 foto</button>
              <button className="btn-primary" style={{ flex: 1, background: 'var(--bg3)', color: 'var(--text)' }} onClick={() => { setShowAdd(true); setAddMode('text'); setMealDT(nowLocalInput()); }}>✏️ texto</button>
            </div>
          )}

          {showAdd && (
            <div className="card">
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '6px' }}>quando comeste</div>
                <input
                  type="datetime-local"
                  value={mealDT}
                  max={nowLocalInput()}
                  onChange={e => setMealDT(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg3)', border: '0.5px solid var(--border)', borderRadius: 'var(--border-radius-md)', color: 'var(--text)', fontSize: '14px', padding: '8px 10px', fontFamily: 'inherit' }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '6px' }}>tipo de refeição</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['pequeno-almoço', 'almoço', 'jantar', 'snack', 'suplementos'].map(t => (
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
                  <textarea value={textInput} onChange={e => setTextInput(e.target.value)} placeholder="ex: bife 200g com espinafres e azeite..." rows={3} style={{ width: '100%', background: 'var(--bg3)', border: '0.5px solid var(--border)', borderRadius: 'var(--border-radius-md)', color: 'var(--text)', fontSize: '13px', padding: '8px 10px', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5, marginBottom: '8px' }} />
                  <button className="btn-primary" onClick={handleText}>analisar</button>
                </>
              )}
              <button onClick={() => setShowAdd(false)} style={{ width: '100%', padding: '10px', border: 'none', background: 'none', color: 'var(--text3)', fontSize: '13px', cursor: 'pointer', marginTop: '6px' }}>cancelar</button>
            </div>
          )}
        </>
      )}

      {tab === 'analytics' && <NutritionAnalytics />}
    </div>
  );
}
