import { useState, useEffect, useCallback, useRef } from 'react';

const PIN_HASH_KEY   = 'ct_pin_hash';
const CRED_KEY       = 'ct_webauthn_cred';
const UNLOCKED_AT    = 'ct_unlocked_at';
const AUTO_LOCK_MS   = 10 * 60 * 1000; // 10 min
const MAX_ATTEMPTS   = 5;
const LOCKOUT_MS     = 60 * 1000; // 1 min bloqueio após 5 tentativas erradas

async function hashPin(pin) {
  const data = new TextEncoder().encode(pin + ':coach-tiago-v1');
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function toB64(buf)  { return btoa(String.fromCharCode(...new Uint8Array(buf))); }
function fromB64(s)  { return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }

/* ── exported helpers used by App ── */
export function isSessionValid() {
  const t = sessionStorage.getItem(UNLOCKED_AT);
  return t && (Date.now() - Number(t) < AUTO_LOCK_MS);
}
export function markUnlocked() {
  sessionStorage.setItem(UNLOCKED_AT, Date.now().toString());
}
export function isPinSet() {
  return !!localStorage.getItem(PIN_HASH_KEY);
}

/* ── main component ── */
export default function LockScreen({ onUnlock }) {
  const [pin,       setPin]       = useState('');
  const [mode,      setMode]      = useState('checking');   // checking | setup | confirm | locked
  const [setupPin,  setSetupPin]  = useState('');
  const [error,     setError]     = useState('');
  const [shake,     setShake]     = useState(false);
  const [canBio,    setCanBio]    = useState(false);
  const [attempts,  setAttempts]  = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);
  const bioTriggeredRef = useRef(false); // garante que o popup biométrico dispara só 1x

  /* check WebAuthn platform support */
  useEffect(() => {
    if (window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(ok => setCanBio(ok)).catch(() => {});
    }
  }, []);

  /* decide mode on mount */
  useEffect(() => {
    if (!localStorage.getItem(PIN_HASH_KEY)) {
      setMode('setup');
    } else {
      setMode('locked');
    }
  }, []);

  /* auto-trigger biometric when entering locked mode — só 1x por montagem */
  const onUnlockRef = useRef(onUnlock);
  useEffect(() => { onUnlockRef.current = onUnlock; }, [onUnlock]);

  const tryBiometric = useCallback(async () => {
    if (bioTriggeredRef.current) return;           // já disparou — ignora
    bioTriggeredRef.current = true;
    const credId = localStorage.getItem(CRED_KEY);
    if (!credId || !window.PublicKeyCredential) return;
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const res = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          allowCredentials: [{ id: fromB64(credId), type: 'public-key', transports: ['internal'] }],
          userVerification: 'required',
          timeout: 60000,
        },
      });
      if (res) { markUnlocked(); onUnlockRef.current(); }
    } catch { /* cancelado – mostra PIN */ }
  }, []); // sem deps externas — usa refs

  useEffect(() => {
    if (mode === 'locked' && localStorage.getItem(CRED_KEY)) tryBiometric();
  }, [mode, tryBiometric]);

  /* register biometric credential */
  async function registerBiometric() {
    if (!window.PublicKeyCredential) return;
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId    = new TextEncoder().encode('coach-tiago');
      const cred = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'Coach Tiago', id: window.location.hostname },
          user: { id: userId, name: 'tiago', displayName: 'Tiago' },
          pubKeyCredParams: [
            { alg: -7,   type: 'public-key' },
            { alg: -257, type: 'public-key' },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
          },
          timeout: 60000,
        },
      });
      if (cred) localStorage.setItem(CRED_KEY, toB64(cred.rawId));
    } catch { /* user declined */ }
  }

  /* trigger shake animation on wrong PIN */
  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  /* handle digit press */
  async function handleDigit(d) {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError('');
    if (next.length < 4) return;

    if (mode === 'setup') {
      setSetupPin(next);
      setPin('');
      setMode('confirm');
      return;
    }

    if (mode === 'confirm') {
      if (next === setupPin) {
        const hash = await hashPin(next);
        localStorage.setItem(PIN_HASH_KEY, hash);
        if (canBio) await registerBiometric();
        markUnlocked();
        onUnlock();
      } else {
        triggerShake();
        setError('PINs diferentes. Começa de novo.');
        setPin(''); setSetupPin(''); setMode('setup');
      }
      return;
    }

    /* locked – verify */
    if (lockedUntil && Date.now() < lockedUntil) {
      const secsLeft = Math.ceil((lockedUntil - Date.now()) / 1000);
      setError(`Bloqueado. Tenta em ${secsLeft}s.`);
      setPin('');
      return;
    }

    const hash   = await hashPin(next);
    const stored = localStorage.getItem(PIN_HASH_KEY);
    if (hash === stored) {
      setAttempts(0);
      setLockedUntil(null);
      markUnlocked();
      onUnlock();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      triggerShake();
      if (newAttempts >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_MS;
        setLockedUntil(until);
        setAttempts(0);
        setError(`Muitas tentativas. Bloqueado por 1 min.`);
      } else {
        setError(`PIN incorreto · ${MAX_ATTEMPTS - newAttempts} tentativa${MAX_ATTEMPTS - newAttempts !== 1 ? 's' : ''} restante${MAX_ATTEMPTS - newAttempts !== 1 ? 's' : ''}`);
      }
      setPin('');
    }
  }

  function handleDelete() {
    setPin(p => p.slice(0, -1));
    setError('');
  }

  /* ── render ── */
  const title = mode === 'setup'   ? 'Cria o teu PIN'
              : mode === 'confirm' ? 'Confirma o PIN'
              : 'Coach Tiago';

  const subtitle = mode === 'setup'   ? 'Escolhe 4 dígitos para proteger a app'
                 : mode === 'confirm' ? 'Repete o PIN para confirmar'
                 : 'Introduz o PIN para entrar';

  const showBioBtn = mode === 'locked' && canBio && localStorage.getItem(CRED_KEY);

  return (
    <div style={styles.wrap}>
      {/* logo */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>🏃</div>
        <h1 style={styles.title}>{title}</h1>
        <p  style={styles.sub}>{subtitle}</p>
      </div>

      {/* dots */}
      <div style={{ ...styles.dots, animation: shake ? 'ctShake .4s ease' : 'none' }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            ...styles.dot,
            background:    i < pin.length ? '#C6FF3A' : 'transparent',
            borderColor:   i < pin.length ? '#C6FF3A' : 'rgba(255,255,255,.3)',
          }} />
        ))}
      </div>

      {/* error */}
      <div style={{ height: 22, margin: '8px 0 20px' }}>
        {error && <p style={styles.error}>{error}</p>}
      </div>

      {/* keypad */}
      <div style={styles.grid}>
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} style={styles.btn} onClick={() => handleDigit(String(n))}>{n}</button>
        ))}
        {showBioBtn
          ? <button style={styles.btn} onClick={tryBiometric} title="Usar biometria">👆</button>
          : <div />
        }
        <button style={styles.btn} onClick={() => handleDigit('0')}>0</button>
        <button style={{ ...styles.btn, fontSize: 18, color: 'rgba(255,255,255,.6)' }} onClick={handleDelete}>⌫</button>
      </div>

      <style>{`
        @keyframes ctShake {
          0%,100% { transform:translateX(0); }
          20%      { transform:translateX(-8px); }
          40%      { transform:translateX(8px); }
          60%      { transform:translateX(-5px); }
          80%      { transform:translateX(5px); }
        }
        button:active { transform: scale(.92) !important; }
      `}</style>
    </div>
  );
}

const styles = {
  wrap: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'radial-gradient(130% 90% at 50% -10%, rgba(198,255,58,0.12), transparent 55%), #0a0b0d',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Archivo', system-ui, -apple-system, sans-serif",
  },
  title: { color: '#C6FF3A', fontSize: 24, fontWeight: 700, margin: 0, fontFamily: "'Archivo Narrow','Archivo',sans-serif", textTransform: 'uppercase', letterSpacing: '0.04em' },
  sub:   { color: 'rgba(242,244,243,.45)', fontSize: 13, marginTop: 6 },
  dots:  { display: 'flex', gap: 16 },
  dot:   { width: 14, height: 14, borderRadius: '50%', border: '2px solid', transition: 'all .15s' },
  error: { color: '#FF6B47', fontSize: 13, margin: 0, textAlign: 'center' },
  grid:  { display: 'grid', gridTemplateColumns: 'repeat(3, 72px)', gap: 12 },
  btn:   {
    width: 72, height: 72, borderRadius: '50%',
    background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)',
    color: '#f2f4f3', fontSize: 24, fontWeight: 600,
    fontFamily: "'Archivo Narrow','Archivo',sans-serif",
    cursor: 'pointer', transition: 'background .15s, transform .1s',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
};
