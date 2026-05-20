const KEY = 'coach_tiago_v1';

const DEFAULT_PROFILE = {
  name: 'Tiago',
  location: 'Lisboa',
  raceDate: '2026-07-19',
  planStart: '2026-05-14',
  equipment: ['kb8kg', 'pool25m', 'bodyweight'],
  injuries: { finger: 'recovering', hipLeft: 'limited' },
};

export function loadStore() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initStore();
    return JSON.parse(raw);
  } catch { return initStore(); }
}

function initStore() {
  const store = { profile: DEFAULT_PROFILE, checkins: [], workouts: [], lastSync: null };
  saveStore(store);
  return store;
}

export function saveStore(store) {
  localStorage.setItem(KEY, JSON.stringify(store));
}

export function saveCheckin(checkin) {
  const store = loadStore();
  const today = new Date().toISOString().split('T')[0];
  store.checkins = store.checkins.filter(c => c.date !== today);
  store.checkins.push({ ...checkin, date: today, ts: Date.now() });
  saveStore(store);
}

export function saveWorkoutDone(workout) {
  const store = loadStore();
  const today = new Date().toISOString().split('T')[0];
  store.workouts = store.workouts.filter(w => w.date !== today);
  store.workouts.push({ ...workout, date: today, ts: Date.now() });
  saveStore(store);
}

export function getTodayCheckin() {
  const store = loadStore();
  const today = new Date().toISOString().split('T')[0];
  return store.checkins.find(c => c.date === today) || null;
}

export function getCheckinByDate(date) {
  const store = loadStore();
  return store.checkins.find(c => c.date === date) || null;
}

export function getRecentCheckins(days = 30) {
  const store = loadStore();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return store.checkins.filter(c => c.ts >= cutoff).sort((a,b) => b.ts - a.ts);
}

export function getWorkoutLog(days = 30) {
  const store = loadStore();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return store.workouts.filter(w => w.ts >= cutoff).sort((a,b) => b.ts - a.ts);
}

export function getConsecutiveDays() {
  const store = loadStore();
  const sorted = [...store.checkins].sort((a,b) => b.date.localeCompare(a.date));
  let count = 0;
  let prev = null;
  for (const c of sorted) {
    if (!prev) { count = 1; prev = c.date; continue; }
    const diff = (new Date(prev) - new Date(c.date)) / (1000*60*60*24);
    if (diff === 1) { count++; prev = c.date; } else break;
  }
  return count;
}

export function getMissedDays() {
  const store = loadStore();
  if (!store.checkins.length) return 0;
  const last = [...store.checkins].sort((a,b) => b.date.localeCompare(a.date))[0];
  const diff = (Date.now() - new Date(last.date)) / (1000*60*60*24);
  return Math.max(0, Math.floor(diff) - 1);
}

export function getWeeklySwimVolume() {
  const store = loadStore();
  const weekStart = new Date();
  weekStart.setHours(0,0,0,0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  return store.checkins
    .filter(c => c.swam && new Date(c.date) >= weekStart)
    .reduce((sum, c) => sum + (c.swimMeters || 0), 0);
}

export function getAvgSleep(days = 7) {
  const checkins = getRecentCheckins(days);
  if (!checkins.length) return 0;
  return checkins.reduce((sum, c) => sum + (c.sleep || 0), 0) / checkins.length;
}

export function getSwimHistory(days = 365) {
  const checkins = getRecentCheckins(days);
  return checkins.filter(c => c.swam).map(c => ({
    date: c.date,
    meters: c.swimMeters || 0,
    minutes: c.swimMinutes || 0,
  }));
}

