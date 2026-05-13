const PLAN_START = new Date('2026-05-14T00:00:00');
const RACE_DATE = new Date('2026-07-19T00:00:00');

const SWIM_PLAN = [
  { week: 1, target: 7000, daily: 1000, deload: false },
  { week: 2, target: 8400, daily: 1200, deload: false },
  { week: 3, target: 9800, daily: 1400, deload: false },
  { week: 4, target: 6300, daily: 900, deload: true },
  { week: 5, target: 13300, daily: 1900, deload: false },
  { week: 6, target: 15400, daily: 2200, deload: false },
  { week: 7, target: 18200, daily: 2600, deload: false },
  { week: 8, target: 11200, daily: 1600, deload: true },
  { week: 9, target: 9800, daily: 1400, taper: true },
];

export function getDaysToRace() {
  const today = new Date();
  today.setHours(0,0,0,0);
  const race = new Date(RACE_DATE);
  race.setHours(0,0,0,0);
  return Math.max(0, Math.round((race - today) / (1000*60*60*24)));
}

export function getWeekNumber() {
  const today = new Date();
  today.setHours(0,0,0,0);
  const start = new Date(PLAN_START);
  start.setHours(0,0,0,0);
  const diffDays = Math.floor((today - start) / (1000*60*60*24));
  if (diffDays < 0) return 1;
  return Math.min(9, Math.max(1, Math.floor(diffDays / 7) + 1));
}

export function getPlanProgress() {
  const totalDays = Math.round((RACE_DATE - PLAN_START) / (1000*60*60*24));
  const today = new Date();
  const elapsed = Math.round((today - PLAN_START) / (1000*60*60*24));
  return Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)));
}

export function getCurrentWeekPlan() {
  return SWIM_PLAN[getWeekNumber() - 1];
}

export function getSwimPlan() {
  return SWIM_PLAN;
}

export function getSwimAnalysis(meters, minutes) {
  if (!meters || !minutes) return null;
  const pace = minutes / (meters / 100);
  const proj5k = pace * 50;
  const weekPlan = getCurrentWeekPlan();
  return {
    pace: `${Math.floor(pace)}:${String(Math.round((pace % 1) * 60)).padStart(2,'0')}`,
    proj5kMin: Math.floor(proj5k / 60),
    proj5kSec: Math.round(proj5k % 60),
    zone: pace < 2.0 ? 'zona 1' : pace < 2.3 ? 'zona 2-3' : 'zona 3-4',
    dailyTarget: weekPlan.daily,
    metTarget: meters >= weekPlan.daily,
  };
}

export function decideSleepLevel(hours) {
  if (hours < 4) return 'none';
  if (hours < 5) return 'recovery_only';
  if (hours < 6) return 'reduced';
  if (hours < 7) return 'moderate';
  return 'full';
}

export function decideWorkout(checkin) {
  const { sleep, hasBJJ, missedDays } = checkin;
  const sleepLevel = decideSleepLevel(sleep);
  const week = getWeekNumber();
  if (week >= 9) return { type: 'recovery', reason: 'semana de taper — só mobilidade' };
  if (sleepLevel === 'none') return { type: 'none', reason: 'menos de 4h de sono — só caminhada leve' };
  if (sleepLevel === 'recovery_only') return { type: 'recovery', reason: 'sono insuficiente — só mobilidade' };
  if (hasBJJ) return { type: 'bjj_prep', reason: 'dia de BJJ — aquecimento e core' };
  const isDeload = [4, 8].includes(week);
  if (missedDays >= 14) return { type: 'full_body', intensity: 0.6, reason: 'reset após pausa longa' };
  if (missedDays >= 4) return { type: 'full_body', intensity: 0.6, reason: 'retomar após pausa' };
  if (isDeload) return { type: 'recovery', reason: `semana ${week} é semana de deload` };
  if (sleepLevel === 'reduced') return { type: 'upper_focus', intensity: 0.6, reason: 'sono baixo — sessão mais curta' };
  if (sleepLevel === 'moderate') return { type: 'full_body', intensity: 1.0, reason: 'treino normal' };
  return { type: 'full_body', intensity: 1.0, reason: 'sono ótimo — intensidade máxima' };
}
