'use strict';

// ── STATE ──────────────────────────────────────────────────────────────────
let limit        = parseInt(localStorage.getItem('sg_limit') || '110');
let alarmOn      = localStorage.getItem('sg_alarm') !== 'off';
let muted        = false;
let currentSpeed = 0;
let lastState    = 'ok';
let modeIdx      = parseInt(localStorage.getItem('sg_mode') || '0');

const MODES = ['BIP CADENCÉ', 'ALARME CONTINUE', 'BIP RAPIDE'];
const MIN_LIMIT = 10;
const MAX_LIMIT = 150;

// ── AUDIO ──────────────────────────────────────────────────────────────────
let audioCtx    = null;
let bipInterval = null;
let contNode    = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playBip(freq, dur) {
  try {
    const ctx  = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
  } catch (e) { console.warn('Audio error:', e); }
}

function startContinuous(freq) {
  try {
    stopContinuous();
    const ctx  = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    osc.start();
    contNode = osc;
  } catch (e) { console.warn('Audio error:', e); }
}

function stopContinuous() {
  if (contNode) {
    try { contNode.stop(); } catch (e) {}
    contNode = null;
  }
}

function stopAllSounds() {
  clearInterval(bipInterval);
  bipInterval = null;
  stopContinuous();
}

function startAlarmSound(state) {
  stopAllSounds();
  if (!alarmOn || muted) return;
  const mode = MODES[modeIdx];

  if (state === 'warn') {
    playBip(880, 0.15);
    bipInterval = setInterval(() => playBip(880, 0.15), 1400);
    return;
  }

  if (state === 'alert') {
    if (mode === 'BIP CADENCÉ') {
      playBip(1200, 0.12);
      bipInterval = setInterval(() => playBip(1200, 0.12), 500);
    } else if (mode === 'ALARME CONTINUE') {
      startContinuous(900);
    } else {
      // BIP RAPIDE
      playBip(1400, 0.08);
      bipInterval = setInterval(() => playBip(1400, 0.08), 200);
    }
  }
}

// ── SPEED LOGIC ────────────────────────────────────────────────────────────
function getState(speed) {
  if (speed >= limit)         return 'alert';
  if (speed >= limit - 5)     return 'warn';
  return 'ok';
}

function setSpeed(val) {
  currentSpeed = Math.round(val);
  const state  = getState(currentSpeed);

  // speed display
  const sv = document.getElementById('speed-val');
  if (sv) {
    sv.textContent = currentSpeed;
    sv.className   = 'speed-value' + (state !== 'ok' ? ' ' + state : '');
  }

  // proximity bar
  const bar = document.getElementById('prox-bar');
  if (bar) {
    bar.style.width   = Math.min(100, Math.round(currentSpeed / 160 * 100)) + '%';
    bar.className     = 'prox-bar-fill' + (state !== 'ok' ? ' ' + state : '');
  }

  // margin stat
  const margin  = Math.max(0, limit - currentSpeed);
  const mEl     = document.getElementById('margin-stat');
  if (mEl) {
    mEl.textContent = margin;
    mEl.className   = 'stat-num' + (state !== 'ok' ? ' ' + state : '');
  }

  // state badge
  const badge = document.getElementById('state-badge');
  if (badge) {
    const labels = { ok: 'ZONE SÛRE', warn: 'AVERTISSEMENT', alert: 'ALERTE VITESSE' };
    badge.textContent = labels[state];
    badge.className   = 'state-badge' + (state !== 'ok' ? ' ' + state : '');
  }

  // status dot
  const dot = document.getElementById('status-dot');
  if (dot) dot.className = 'status-dot' + (state !== 'ok' ? ' ' + state : '');

  // sound trigger on state change
  if (state !== lastState) {
    lastState = state;
    if (state === 'ok') stopAllSounds();
    else startAlarmSound(state);
  }
}

// ── GPS SPEED ──────────────────────────────────────────────────────────────
let watchId = null;

function startGPS() {
  if (!navigator.geolocation) return;
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const kmh = pos.coords.speed != null
        ? Math.round(pos.coords.speed * 3.6)
        : 0;
      setSpeed(kmh);
    },
    (err) => console.warn('GPS error:', err.message),
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
  );
}

// ── LIMIT CONTROL ─────────────────────────────────────────────────────────
function changeLimit(delta) {
  const next = limit + delta;
  if (next < MIN_LIMIT || next > MAX_LIMIT) return;
  limit = next;
  localStorage.setItem('sg_limit', limit);

  const lVal = document.getElementById('limit-val');
  const lStat = document.getElementById('limit-stat');
  if (lVal) lVal.textContent = limit + ' KM/H';
  if (lStat) lStat.textContent = limit;

  const btnMinus = document.getElementById('btn-minus');
  const btnPlus  = document.getElementById('btn-plus');
  const badge    = document.getElementById('min-badge');
  
  if (btnMinus) btnMinus.disabled = limit <= MIN_LIMIT;
  if (btnPlus)  btnPlus.disabled  = limit >= MAX_LIMIT;
  if (badge)    badge.className = 'min-badge' + (limit <= MIN_LIMIT ? ' active' : '');

  // re-evaluate state
  lastState = '';
  setSpeed(currentSpeed);
}

// ── ALARM TOGGLE ───────────────────────────────────────────────────────────
function toggleAlarm() {
  alarmOn = !alarmOn;
  localStorage.setItem('sg_alarm', alarmOn ? 'on' : 'off');

  const tog = document.getElementById('alarm-toggle');
  if (tog) tog.className = 'toggle-wrap' + (alarmOn ? ' on' : '');

  const aText = document.getElementById('alarm-text');
  if (aText) aText.textContent = alarmOn ? MODES[modeIdx] : 'DÉSACTIVÉE';

  if (!alarmOn) stopAllSounds();
  else { lastState = ''; setSpeed(currentSpeed); }
}

// ── MUTE ──────────────────────────────────────────────────────────────────
function muteAlarm() {
  muted = !muted;
  const btn = document.getElementById('mute-btn');
  if (btn) btn.className = 'mute-btn' + (muted ? ' muted' : '');
  
  const mIcon = document.getElementById('mute-icon');
  const mLabel = document.getElementById('mute-label');
  if (mIcon) mIcon.textContent  = muted ? '🔇' : '🔊';
  if (mLabel) mLabel.textContent = muted ? 'RÉACTIVER' : 'COUPER';

  if (muted) stopAllSounds();
  else { lastState = ''; setSpeed(currentSpeed); }
}

// ── CYCLE MODE ────────────────────────────────────────────────────────────
function cycleMode() {
  modeIdx = (modeIdx + 1) % MODES.length;
  localStorage.setItem('sg_mode', modeIdx);
  const name = MODES[modeIdx];
  
  const mVal = document.getElementById('mode-val');
  const aText = document.getElementById('alarm-text');
  if (mVal) mVal.textContent  = name;
  if (aText) aText.textContent = alarmOn ? name : 'DÉSACTIVÉE';

  if (lastState !== 'ok') {
    stopAllSounds();
    startAlarmSound(lastState);
  }
}

// ── SAVE LIMIT ────────────────────────────────────────────────────────────
function saveLimit() {
  localStorage.setItem('sg_limit', limit);
  const el = document.getElementById('save-val');
  if (el) {
    el.textContent = '✓ ' + limit + ' SAUVEGARDÉ';
    el.style.color = '#2aff7a';
    setTimeout(() => {
      el.textContent = 'ENREGISTRER';
      el.style.color = '';
    }, 2000);
  }
}

// ── PWA INSTALL ───────────────────────────────────────────────────────────
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const banner = document.getElementById('install-banner');
  if (banner) banner.classList.add('visible');
});

const instBtn = document.getElementById('install-btn');
if (instBtn) {
  instBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    const banner = document.getElementById('install-banner');
    if (banner) banner.classList.remove('visible');
  });
}

function dismissInstall() {
  const banner = document.getElementById('install-banner');
  if (banner) banner.classList.remove('visible');
}

// ── OFFLINE / ONLINE ──────────────────────────────────────────────────────
const toast = document.getElementById('offline-toast');

function showOfflineToast() {
  if (toast) {
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }
}

window.addEventListener('offline', showOfflineToast);
window.addEventListener('online', () => {
  if (toast) {
    toast.textContent = 'RECONNECTÉ';
    toast.style.color = '#2aff7a';
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
      toast.textContent = 'MODE HORS LIGNE';
      toast.style.color = '';
    }, 2500);
  }
});

if (!navigator.onLine) showOfflineToast();

// ── NETTOYAGE FORCÉ DES SERVICE WORKERS BLOQUÉS ─────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (let registration of registrations) {
        registration.unregister().then(() => {
          console.log('Ancien Service Worker nettoyé pour éviter la 404.');
        });
      }
    });
  });
}

// ── WAKE LOCK (Gestion maintien écran allumé) ───────────────────────────────
async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      await navigator.wakeLock.request('screen');
    } catch (e) { console.warn('Wake lock:', e); }
  }
}
requestWakeLock();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') requestWakeLock();
});

// ── INIT ──────────────────────────────────────────────────────────────────
(function init() {
  const lVal = document.getElementById('limit-val');
  const lStat = document.getElementById('limit-stat');
  if (lVal) lVal.textContent = limit + ' KM/H';
  if (lStat) lStat.textContent = limit;

  const tog = document.getElementById('alarm-toggle');
  if (tog) tog.className = 'toggle-wrap' + (alarmOn ? ' on' : '');
  
  const aText = document.getElementById('alarm-text');
  const mVal = document.getElementById('mode-val');
  if (aText) aText.textContent = alarmOn ? MODES[modeIdx] : 'DÉSACTIVÉE';
  if (mVal) mVal.textContent   = MODES[modeIdx];

  const btnMinus = document.getElementById('btn-minus');
  const btnPlus  = document.getElementById('btn-plus');
  const badge    = document.getElementById('min-badge');
  
  if (btnMinus) btnMinus.disabled = limit <= MIN_LIMIT;
  if (btnPlus)  btnPlus.disabled  = limit >= MAX_LIMIT;
  if (badge)    badge.className = 'min-badge' + (limit <= MIN_LIMIT ? ' active' : '');

  if (navigator.geolocation) {
    navigator.permissions && navigator.permissions.query({ name: 'geolocation' })
      .then(result => {
        if (result.state === 'granted' || result.state === 'prompt') {
          startGPS();
        }
      })
      .catch(() => startGPS());
  }
})();
