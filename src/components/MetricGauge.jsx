export default function MetricGauge({ label, value, unit, segments, badge, badgeColor, context, labelColor }) {
  if (!value) return (
    <div className="metric-card">
      <div className="metric-label" style={{ color: labelColor }}>{label}</div>
      <div className="metric-value">—</div>
    </div>
  );
  const total = segments.reduce((s, seg) => s + seg.width, 0);
  let pct = 0;
  for (const seg of segments) {
    if (value >= seg.min && value <= seg.max) {
      const within = (value - seg.min) / (seg.max - seg.min);
      pct = (segments.slice(0, segments.indexOf(seg)).reduce((s, s2) => s + s2.width, 0) + within * seg.width) / total * 100;
      break;
    }
  }
  if (value > segments[segments.length-1].max) pct = 100;
  if (value < segments[0].min) pct = 0;
  const badgeBg = { green: '#E1F5EE', amber: '#FAEEDA', red: '#FCEBEB' }[badgeColor] || '#E1F5EE';
  const badgeText = { green: '#085041', amber: '#633806', red: '#501313' }[badgeColor] || '#085041';
  return (
    <div className="metric-card">
      <div className="metric-label" style={{ color: labelColor }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 500, color: 'var(--text)', marginBottom: '6px' }}>
        {typeof value === 'number' ? Math.round(value * 10) / 10 : value}
        <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text2)' }}>{unit}</span>
      </div>
      <div style={{ height: '5px', borderRadius: '4px', overflow: 'hidden', display: 'flex', marginBottom: '3px' }}>
        {segments.map((seg, i) => <div key={i} style={{ flex: seg.width, background: seg.color }} />)}
      </div>
      <div style={{ position: 'relative', height: '8px', marginBottom: '5px' }}>
        <div style={{ position: 'absolute', left: `${pct}%`, width: '2px', height: '8px', background: 'var(--text)', borderRadius: '1px', transform: 'translateX(-50%)' }} />
      </div>
      <div style={{ display: 'inline-block', fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '20px', background: badgeBg, color: badgeText, marginBottom: '4px' }}>{badge}</div>
      <div style={{ fontSize: '11px', color: 'var(--text2)', lineHeight: 1.4 }}>{context}</div>
    </div>
  );
}
export const HRV_CONFIG = (value) => {
  const badge = value < 30 ? 'baixo' : value < 40 ? 'normal' : value < 55 ? 'bom' : 'ótimo';
  const badgeColor = value < 30 ? 'red' : value < 40 ? 'amber' : 'green';
  return { labelColor: '#1D9E75', segments: [{ min: 0, max: 30, width: 20, color: '#F09595' },{ min: 30, max: 40, width: 15, color: '#EF9F27' },{ min: 40, max: 55, width: 30, color: '#5DCAA5' },{ min: 55, max: 100, width: 35, color: '#1D9E75' }], badge, badgeColor, context: '<30 baixo · 30-40 normal · 40-55 bom · >55 ótimo' };
};
export const RHR_CONFIG = (value) => {
  const badge = value < 55 ? 'zona atleta' : value < 65 ? 'bom' : value < 75 ? 'normal' : 'alto';
  const badgeColor = value < 65 ? 'green' : value < 75 ? 'amber' : 'red';
  return { labelColor: '#D85A30', segments: [{ min: 30, max: 55, width: 35, color: '#1D9E75' },{ min: 55, max: 65, width: 25, color: '#5DCAA5' },{ min: 65, max: 75, width: 25, color: '#EF9F27' },{ min: 75, max: 100, width: 15, color: '#F09595' }], badge, badgeColor, context: '<55 atleta · 55-65 bom · 65-75 normal · >75 alto' };
};
export const SLEEP_CONFIG = (value) => {
  const badge = value < 5 ? 'insuficiente' : value < 6 ? 'baixo' : value < 7 ? 'moderado' : 'ótimo';
  const badgeColor = value < 5 ? 'red' : value < 6 ? 'amber' : value < 7 ? 'amber' : 'green';
  return { labelColor: '#7F77DD', segments: [{ min: 0, max: 5, width: 20, color: '#F09595' },{ min: 5, max: 6, width: 15, color: '#EF9F27' },{ min: 6, max: 7, width: 25, color: '#FAC775' },{ min: 7, max: 10, width: 40, color: '#1D9E75' }], badge, badgeColor, context: '<5h insuficiente · 5-6h baixo · 6-7h moderado · >7h ótimo' };
};
