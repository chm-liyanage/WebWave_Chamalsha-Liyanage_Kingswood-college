let audioEnabled = true;
let crtPowered = true;
let turboMode = false;
let matrixActive = false;
let meltdownActive = false;
let isSpeaking = false;
let audioCtx = null;
let zCounter = 60;

function initAudio() {
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) audioCtx = new AudioCtx();
  }
}

function playTone(freq, duration = 0.06, wave = 'square', gainVal = 0.05) {
  if (!audioEnabled || !crtPowered) return;
  initAudio();
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playFormantSyllable(baseFreq, throatFreq, duration = 0.07) {
  if (!audioEnabled || !crtPowered) return;
  initAudio();
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const filter = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);

  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(throatFreq * 4, audioCtx.currentTime);
  filter.Q.setValueAtTime(4.5, audioCtx.currentTime);

  gain.gain.setValueAtTime(0.045, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

let formantTimer = null;

function speakRetroRobot(text) {
  if (!crtPowered || !text) return;
  clearInterval(formantTimer);
  isSpeaking = true;
  
  const voxLed = document.getElementById('vox-led');
  const voxStatusBadge = document.getElementById('vox-status-badge');
  const voxPitchEl = document.getElementById('vox-pitch');
  const voxSpeedEl = document.getElementById('vox-speed');
  const voxThroatEl = document.getElementById('vox-throat');

  if (voxLed) voxLed.classList.add('led-green-on');
  if (voxStatusBadge) voxStatusBadge.textContent = 'SPEAKING PHONEMES...';

  const pitchSetting = voxPitchEl ? parseInt(voxPitchEl.value, 10) : 6;
  const speedSetting = voxSpeedEl ? parseInt(voxSpeedEl.value, 10) : 9;
  const throatSetting = voxThroatEl ? parseInt(voxThroatEl.value, 10) : 130;

  const clean = text.replace(/[^a-zA-Z0-9 .,?!]/g, '');
  let charIdx = 0;
  const stepMs = Math.max(45, 135 - speedSetting * 7);

  formantTimer = setInterval(() => {
    if (charIdx >= clean.length) {
      clearInterval(formantTimer);
      isSpeaking = false;
      if (voxLed) voxLed.classList.remove('led-green-on');
      if (voxStatusBadge) voxStatusBadge.textContent = 'VOICE CHIP: READY';
      return;
    }
    const ch = clean.charCodeAt(charIdx);
    if (clean[charIdx] !== ' ') {
      const f = (75 + pitchSetting * 8) + ((ch % 7) * 12);
      playFormantSyllable(f, throatSetting + (ch % 5) * 25, stepMs / 1000);
    }
    charIdx++;
  }, stepMs);

  if ('speechSynthesis' in window && audioEnabled) {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.pitch = pitchSetting / 10;
    utter.rate = speedSetting / 10;
    utter.volume = 0.85;
    utter.onend = () => {
      clearInterval(formantTimer);
      isSpeaking = false;
      if (voxLed) voxLed.classList.remove('led-green-on');
      if (voxStatusBadge) voxStatusBadge.textContent = 'VOICE CHIP: READY';
    };
    window.speechSynthesis.speak(utter);
  }
}

document.getElementById('vox-speak-btn')?.addEventListener('click', () => {
  const txt = document.getElementById('vox-input')?.value.trim();
  if(txt) speakRetroRobot(txt);
});

document.getElementById('vox-input')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    speakRetroRobot(e.target.value.trim());
  }
});

document.querySelectorAll('[data-say]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const phrase = btn.dataset.say;
    const voxInput = document.getElementById('vox-input');
    if(voxInput) voxInput.value = phrase.toUpperCase();
    speakRetroRobot(phrase);
  });
});

document.getElementById('btn-greet-judges')?.addEventListener('click', () => {
  const wVox = document.getElementById('win-vox');
  if (wVox) {
    wVox.classList.remove('hidden-cyber');
    bringToFront(wVox);
  }
  speakRetroRobot('Greetings judges. Welcome to the Web Wave project by Chamalsha Liyanage from Kingswood College.');
});

const voxCanvas = document.getElementById('vox-canvas');
const vCtx = voxCanvas ? voxCanvas.getContext('2d') : null;
let voxAnimTick = 0;

function renderVoxFace() {
  if (!vCtx) return;
  const w = voxCanvas.width;
  const h = voxCanvas.height;
  vCtx.fillStyle = 'rgba(0, 0, 0, 0.38)';
  vCtx.fillRect(0, 0, w, h);

  const color = getComputedStyle(document.body).getPropertyValue('--phos-main').trim();
  vCtx.strokeStyle = color;
  vCtx.fillStyle = color;
  vCtx.lineWidth = 1.6;

  vCtx.strokeRect(48, 10, 22, 14);
  vCtx.strokeRect(95, 10, 22, 14);
  const eyePulse = isSpeaking ? (Math.sin(voxAnimTick * 0.5) > 0 ? 6 : 3) : 4;
  vCtx.fillRect(56, 14, 6, eyePulse);
  vCtx.fillRect(103, 14, 6, eyePulse);

  const jawOpen = isSpeaking ? 4 + Math.abs(Math.sin(voxAnimTick * 0.45)) * 18 : 2;
  vCtx.strokeRect(36, 42 - jawOpen * 0.3, 93, 12 + jawOpen);

  vCtx.beginPath();
  for (let x = 40; x < 125; x += 6) {
    const waveH = isSpeaking ? (Math.random() - 0.5) * jawOpen * 1.3 : 0;
    const y = 48 + waveH;
    if (x === 40) vCtx.moveTo(x, y);
    else vCtx.lineTo(x, y);
  }
  vCtx.stroke();

  for (let b = 0; b < 12; b++) {
    const bh = isSpeaking ? 3 + Math.random() * 14 : 2;
    vCtx.fillRect(18 + b * 11, h - bh - 4, 7, bh);
  }

  voxAnimTick++;
  requestAnimationFrame(renderVoxFace);
}
if (voxCanvas) renderVoxFace();

function playLaserSweep() {
  if (!audioEnabled || !crtPowered) return;
  initAudio();
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(880, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(140, audioCtx.currentTime + 0.11);
  gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.11);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.11);
}

function playModemHandshake(callback) {
  const modemLed = document.getElementById('modem-led');
  if (modemLed) modemLed.classList.add('led-amber-on');
  const dtmf = [697, 770, 852, 941, 1209, 1336, 1477];
  for (let i = 0; i < 7; i++) {
    setTimeout(() => playTone(dtmf[i % dtmf.length], 0.06, 'sine', 0.06), i * 85);
  }
  setTimeout(() => playTone(1050, 0.35, 'sine', 0.05), 650);
  setTimeout(() => {
    for (let j = 0; j < 14; j++) {
      setTimeout(() => playTone(900 + Math.random() * 1400, 0.04, 'sawtooth', 0.04), j * 45);
    }
  }, 1050);
  setTimeout(() => {
    if (modemLed) modemLed.classList.remove('led-amber-on');
    if (callback) callback();
  }, 1750);
}

function pulseDiskLed() {
  const led = document.getElementById('disk-led');
  if (led) led.classList.add('led-red-on');
  playTone(135, 0.04, 'sawtooth', 0.06);
  setTimeout(() => playTone(185, 0.05, 'sawtooth', 0.06), 55);
  setTimeout(() => { if (led) led.classList.remove('led-red-on'); }, 260);
}

const bootLines = [
  { t: 'VECTRA-86 MK-IV :: WEBWAVE TACTICAL BIOS v4.0', d: 800 },
  { t: 'DEVELOPER: CHAMALSHA LIYANAGE :: KINGSWOOD COLLEGE', d: 1000 },
  { t: '----------------------------------------------------', d: 400 },
  { t: 'MEMORY TEST: 640KB BASE / 1024KB EXTENDED ...... OK', d: 1400, s: 'ram' },
  { t: 'CPU: VECTRA-DX 33/66MHz VECTOR CO-PROCESSOR .... OK', d: 600 },
  { t: 'VOX.SAM 1984 FORMANT SPEECH SYNTHESIZER ........ OK', d: 600 },
  { t: 'ORBITAL TELEMETRY LINK (SATLINK.3D) ............ OK', d: 600 },
  { t: 'ASTEROID.VEC DEEP-SPACE TACTICAL ENGINE ........ OK', d: 700 },
  { t: 'SEEKING BOOT SECTOR ON DRIVE A: ...', d: 1800, s: 'floppy' },
  { t: 'MOUNTING A:\\WEBWAVE_DECK.DSK .................... OK', d: 1200 }
];

const bootOverlay = document.getElementById('boot-overlay');
const bootText = document.getElementById('boot-text');
let bootIdx = 0;
let bootTimeout = null;

function finishBoot() {
  if (bootOverlay) bootOverlay.classList.add('boot-done');
  playTone(587.33, 0.1, 'square');
  setTimeout(() => playTone(880, 0.2, 'square'), 120);
}

function processBootStep() {
  if (!bootText) return;
  if (bootIdx < bootLines.length) {
    const step = bootLines[bootIdx];
    bootText.textContent += step.t + '\n';

    if (step.s === 'floppy') {
      pulseDiskLed();
      for(let i = 0; i < 7; i++) {
        setTimeout(() => playTone(140 + Math.random()*40, 0.05, 'sawtooth', 0.06), i * 180);
        setTimeout(() => playTone(80 + Math.random()*20, 0.06, 'square', 0.04), i * 180 + 70);
      }
    } else if (step.s === 'ram') {
       for(let i = 0; i < 12; i++) {
          setTimeout(() => playTone(800 + i*40, 0.02, 'square', 0.02), i * 90);
       }
    } else {
      playTone(280 + bootIdx * 45, 0.05, 'square', 0.04);
    }

    bootIdx++;
    bootTimeout = setTimeout(processBootStep, step.d);
  } else {
    bootTimeout = setTimeout(finishBoot, 600);
  }
}

playTone(70, 0.45, 'sawtooth', 0.15);
bootTimeout = setTimeout(processBootStep, 1200);

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && bootOverlay && !bootOverlay.classList.contains('boot-done')) {
    clearTimeout(bootTimeout);
    finishBoot();
  }
});

const cyberWins = document.querySelectorAll('.cyber-win');
const taskbarStrip = document.getElementById('taskbar-strip');

function renderTaskbarPills() {
  if (!taskbarStrip) return;
  taskbarStrip.innerHTML = '';
  cyberWins.forEach((win) => {
    const titleEl = win.querySelector('.win-tag');
    if (!titleEl) return;
    const tag = titleEl.textContent.split('::')[0].trim();
    const btn = document.createElement('button');
    const isVisible = !win.classList.contains('hidden-cyber');
    const isFocused = !win.classList.contains('inactive-cyber') && isVisible;
    btn.className = 'task-pill' + (isFocused ? ' active-pill' : '');
    btn.textContent = tag;
    btn.addEventListener('click', () => {
      if (!isVisible) {
        win.classList.remove('hidden-cyber');
        bringToFront(win);
      } else if (isFocused) {
        win.classList.add('hidden-cyber');
        renderTaskbarPills();
      } else {
        bringToFront(win);
      }
      playTone(520, 0.03);
    });
    taskbarStrip.appendChild(btn);
  });
}

function bringToFront(win) {
  if (!win) return; // Prevent crashes if window is missing
  cyberWins.forEach((w) => w.classList.add('inactive-cyber'));
  win.classList.remove('inactive-cyber');
  zCounter++;
  win.style.zIndex = zCounter;
  renderTaskbarPills();
}

cyberWins.forEach((win) => {
  const bar = win.querySelector('.cyber-titlebar');
  if (!bar) return;
  
  let dragging = false;
  let startX = 0;
  let startY = 0;

  win.addEventListener('mousedown', () => bringToFront(win));

  bar.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    dragging = true;
    startX = e.clientX - win.offsetLeft;
    startY = e.clientY - win.offsetTop;
  });

  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const workspace = document.getElementById('os-workspace');
    if (!workspace) return;
    const maxX = workspace.clientWidth - 140;
    const maxY = workspace.clientHeight - 40;
    win.style.left = Math.max(0, Math.min(maxX, e.clientX - startX)) + 'px';
    win.style.top = Math.max(0, Math.min(maxY, e.clientY - startY)) + 'px';
  });

  window.addEventListener('mouseup', () => {
    dragging = false;
  });
});

document.querySelectorAll('.win-close').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const target = document.getElementById(btn.dataset.close);
    if (target) {
      target.classList.add('hidden-cyber');
      renderTaskbarPills();
      playTone(220, 0.06, 'sawtooth');
    }
  });
});

document.querySelectorAll('.dock-tile').forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = document.getElementById(btn.dataset.win);
    if (target) {
      target.classList.remove('hidden-cyber');
      bringToFront(target);
      pulseDiskLed();
    }
  });
});

const defaultCoords = {
  'win-vox': { top: '10px', left: '104px' },
  'win-globe': { top: '10px', left: '542px' },
  'win-asteroids': { top: '235px', left: '104px' },
  'win-seq': { top: '235px', left: '542px' },
  'win-scope': { top: '40px', left: '240px' },
  'win-bbs': { top: '45px', left: '220px' },
  'win-sprite': { top: '90px', left: '280px' },
  'win-cipher': { top: '120px', left: '260px' }
};

document.getElementById('btn-reset-wins')?.addEventListener('click', () => {
  Object.keys(defaultCoords).forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.style.top = defaultCoords[id].top;
      el.style.left = defaultCoords[id].left;
    }
  });
  ['win-vox', 'win-globe', 'win-asteroids', 'win-seq'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden-cyber');
  });
  ['win-scope', 'win-bbs', 'win-sprite', 'win-cipher'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden-cyber');
  });
  
  const mainWin = document.getElementById('win-vox') || document.getElementById('win-asteroids');
  bringToFront(mainWin);
  pulseDiskLed();
});

document.getElementById('btn-tile-wins')?.addEventListener('click', () => {
  const visible = Array.from(cyberWins).filter((w) => !w.classList.contains('hidden-cyber'));
  visible.forEach((win, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    win.style.left = (104 + col * 438) + 'px';
    win.style.top = (10 + row * 225) + 'px';
  });
  playTone(640, 0.05);
});

// Initial focus on boot
bringToFront(document.getElementById('win-vox') || document.getElementById('win-asteroids'));

function getPhosphorColor() {
  return getComputedStyle(document.body).getPropertyValue('--phos-main').trim();
}

const globeCanvas = document.getElementById('globe-canvas');
const gCtx = globeCanvas ? globeCanvas.getContext('2d') : null;
const satellites = [
  { name: 'KEYHOLE-86', inc: 0.65, speed: 0.025 },
  { name: 'VECTRA-SAT 1', inc: -0.5, speed: 0.038 },
  { name: 'APOLLO-RELAY', inc: 0.25, speed: 0.019 }
];
let activeSatIdx = 0;
let globeAngle = 0;
let pingWave = 0;

document.getElementById('sat-switch-btn')?.addEventListener('click', () => {
  activeSatIdx = (activeSatIdx + 1) % satellites.length;
  const nameEl = document.getElementById('sat-name');
  if (nameEl) nameEl.textContent = satellites[activeSatIdx].name;
  playTone(720, 0.05);
});

document.getElementById('sat-ping-btn')?.addEventListener('click', () => {
  pingWave = 1;
  playTone(980, 0.08, 'sine');
  setTimeout(() => playTone(1320, 0.12, 'sine'), 90);
});

function renderGlobe() {
  if (!gCtx) return;
  const w = globeCanvas.width;
  const h = globeCanvas.height;
  gCtx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  gCtx.fillRect(0, 0, w, h);

  const color = getPhosphorColor();
  gCtx.strokeStyle = color;
  gCtx.fillStyle = color;
  gCtx.lineWidth = 1.2;

  const cx = w / 2;
  const cy = h / 2;
  const r = 60;

  gCtx.beginPath();
  gCtx.arc(cx, cy, r, 0, Math.PI * 2);
  gCtx.stroke();

  for (let lat = -45; lat <= 45; lat += 45) {
    const radLat = (lat * Math.PI) / 180;
    const y = cy + Math.sin(radLat) * r;
    const rx = Math.cos(radLat) * r;
    gCtx.beginPath();
    gCtx.ellipse(cx, y, rx, rx * 0.22, 0, 0, Math.PI * 2);
    gCtx.stroke();
  }

  for (let i = 0; i < 6; i++) {
    const lon = globeAngle + (i * Math.PI) / 6;
    const rx = Math.abs(Math.sin(lon) * r);
    gCtx.beginPath();
    gCtx.ellipse(cx, cy, rx, r, 0, 0, Math.PI * 2);
    gCtx.stroke();
  }

  const sat = satellites[activeSatIdx];
  const satAng = globeAngle * 2.2;
  const sx = cx + Math.cos(satAng) * (r + 15);
  const sy = cy + Math.sin(satAng) * Math.sin(sat.inc) * (r + 15);

  gCtx.beginPath();
  gCtx.arc(sx, sy, 3.5, 0, Math.PI * 2);
  gCtx.fill();

  if (pingWave > 0) {
    gCtx.beginPath();
    gCtx.arc(sx, sy, (1 - pingWave) * 34, 0, Math.PI * 2);
    gCtx.stroke();
    pingWave = Math.max(0, pingWave - 0.03);
  }

  if (Math.random() > 0.85) {
    const latVal = (Math.sin(satAng) * 65).toFixed(2);
    const lonVal = (((globeAngle * 57) % 360) - 180).toFixed(2);
    const latEl = document.getElementById('sat-lat');
    const lonEl = document.getElementById('sat-lon');
    if (latEl) latEl.textContent = (latVal >= 0 ? '+' : '') + latVal + '°';
    if (lonEl) lonEl.textContent = (lonVal >= 0 ? '+' : '') + lonVal + '°';
  }

  globeAngle += sat.speed * (turboMode ? 1.8 : 1);
  requestAnimationFrame(renderGlobe);
}
if (globeCanvas) renderGlobe();

const bbsArticles = {
  judges: `================================================
:: WEBWAVE EVALUATION & ARCHITECTURE DOSSIER  ::
================================================
[DEVELOPER] Chamalsha Liyanage
[SCHOOL] Kingswood College
[CATEGORY] WebWave

[CREATIVITY]
- Custom 1986 Vector Hardware Cyberdeck (Zero Win95 clones)
- Talking 1984 VOX.SAM Speech Chip + 3D Satellite Tracker

[TECHNICAL SKILL]
- 100% Pure HTML5, CSS3 & Vanilla JS (No external libraries)
- Web Audio API Formant Speech + 5-Canvas Engine

[THEME & ORIGINALITY]
- Authentic P1/P3 Phosphor CRT shaders & Degauss`,
  arch: `================================================
:: VECTRA-86 MK-IV HARDWARE SPECIFICATIONS    ::
================================================
AUTHOR    : CHAMALSHA LIYANAGE (KINGSWOOD COLLEGE)
PROCESSOR : VECTRA-DX 33MHz (66MHz TURBO OVERCLOCK)
SPEECH IC : VOX.SAM 1984 FORMANT VOICE SYNTHESIZER
GRAPHICS  : DUAL-BEAM VECTOR + RASTER CRT CONTROLLER
STORAGE   : 3.5" MICROFLOPPY BAY (4 HOT-SWAP DISKS)`,
  ascii: `================================================
:: KINGSWOOD COLLEGE ASCII VAULT [NODE 0x86]  ::
================================================
       .---.
      /     \\    WEBWAVE OPERATING SYSTEM
     | () () |   "THE FUTURE OF 1986 COMPUTING"
      \\  ^  /    BY CHAMALSHA LIYANAGE
       |||||     STATUS: CONNECTED AT 2400 BAUD
       |||||`
};

document.getElementById('bbs-dial-btn')?.addEventListener('click', () => {
  const status = document.getElementById('bbs-status');
  const screen = document.getElementById('bbs-screen');
  if (status) status.textContent = 'DIALING 555-8686...';
  if (screen) screen.textContent = 'INITIALIZING 2400 BAUD ACOUSTIC HANDSHAKE...\nLISTENING FOR CARRIER TONE...';
  playModemHandshake(() => {
    if (status) status.textContent = 'CARRIER: 2400 BAUD ONLINE';
    if (screen) screen.textContent = bbsArticles.judges;
    speakRetroRobot('Kingswood College carrier connected at twenty four hundred baud.');
  });
});

document.querySelectorAll('.bbs-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    const screen = document.getElementById('bbs-screen');
    if (screen) screen.textContent = bbsArticles[btn.dataset.bbs];
    playTone(620, 0.04);
  });
});

const scopeCanvas = document.getElementById('scope-canvas');
const sCtx = scopeCanvas ? scopeCanvas.getContext('2d') : null;
const freqXInput = document.getElementById('freq-x');
const freqYInput = document.getElementById('freq-y');
const scopeReadout = document.getElementById('scope-readout');
let scopeMode = 'cube';
let phase = 0;

document.querySelectorAll('[data-scopemode]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-scopemode]').forEach((b) => b.classList.remove('active-chip'));
    btn.classList.add('active-chip');
    scopeMode = btn.dataset.scopemode;
    if (scopeReadout) scopeReadout.textContent = 'MODE: ' + scopeMode.toUpperCase();
    playTone(660, 0.05);
  });
});

function renderScope() {
  if (!sCtx) return;
  sCtx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  sCtx.fillRect(0, 0, scopeCanvas.width, scopeCanvas.height);

  const color = getPhosphorColor();
  sCtx.strokeStyle = color;
  sCtx.lineWidth = 1.8;

  const cx = scopeCanvas.width / 2;
  const cy = scopeCanvas.height / 2;
  const fx = freqXInput ? parseFloat(freqXInput.value) : 3;
  const fy = freqYInput ? parseFloat(freqYInput.value) : 2;
  const speedMult = turboMode ? 2.1 : 1;

  if (scopeMode === 'lissajous') {
    sCtx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const t = (i / 200) * Math.PI * 2;
      const x = cx + Math.sin(fx * t + phase) * 110;
      const y = cy + Math.sin(fy * t) * 52;
      if (i === 0) sCtx.moveTo(x, y);
      else sCtx.lineTo(x, y);
    }
    sCtx.stroke();
  } else if (scopeMode === 'radar') {
    sCtx.beginPath();
    sCtx.arc(cx, cy, 54, 0, Math.PI * 2);
    sCtx.stroke();
    sCtx.beginPath();
    sCtx.moveTo(cx, cy);
    sCtx.lineTo(cx + Math.cos(phase * 2) * 54, cy + Math.sin(phase * 2) * 54);
    sCtx.stroke();
  } else if (scopeMode === 'wave') {
    sCtx.beginPath();
    for (let x = 0; x < scopeCanvas.width; x += 3) {
      const y = cy + Math.sin((x * 0.03 * fx) + phase * 2) * 32 + Math.cos((x * 0.02 * fy) - phase) * 18;
      if (x === 0) sCtx.moveTo(x, y);
      else sCtx.lineTo(x, y);
    }
    sCtx.stroke();
  } else {
    const size = 38;
    const vertices = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
    ];
    const edges = [
      [0,1],[1,2],[2,3],[3,0],
      [4,5],[5,6],[6,7],[7,4],
      [0,4],[1,5],[2,6],[3,7]
    ];
    const projected = vertices.map(([vx, vy, vz]) => {
      const rx = vx * Math.cos(phase) - vz * Math.sin(phase);
      const rz = vx * Math.sin(phase) + vz * Math.cos(phase);
      const ry = vy * Math.cos(phase * 0.7) - rz * Math.sin(phase * 0.7);
      return [cx + rx * size, cy + ry * size];
    });
    sCtx.beginPath();
    edges.forEach(([a, b]) => {
      sCtx.moveTo(projected[a][0], projected[a][1]);
      sCtx.lineTo(projected[b][0], projected[b][1]);
    });
    sCtx.stroke();
  }

  phase += 0.032 * speedMult;
  requestAnimationFrame(renderScope);
}
if (scopeCanvas) renderScope();

const astCanvas = document.getElementById('asteroid-canvas');
const aCtx = astCanvas ? astCanvas.getContext('2d') : null;
const astScoreEl = document.getElementById('ast-score');
const astHighEl = document.getElementById('ast-high');
const astWaveEl = document.getElementById('ast-wave');
const astLivesEl = document.getElementById('ast-lives');

let astScore = 0;
let astHigh = 0;
let astWave = 1;
let astLives = 3;
let astKeys = {};
let bullets = [];
let asteroids = [];
let particles = [];
let ship = { x: 200, y: 78, vx: 0, vy: 0, angle: -Math.PI / 2, invuln: 90 };

function makeAsteroid(x, y, radius, tier) {
  const speed = (1.0 + (3 - tier) * 0.4 + astWave * 0.1) * (turboMode ? 1.35 : 1);
  const dir = Math.random() * Math.PI * 2;
  const verts = Array.from({ length: 8 }, () => 0.75 + Math.random() * 0.45);
  return {
    x, y,
    vx: Math.cos(dir) * speed,
    vy: Math.sin(dir) * speed,
    radius, tier,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.05,
    verts
  };
}

function spawnAsteroidWave(count) {
  if (!astCanvas) return;
  asteroids = [];
  for (let i = 0; i < count; i++) {
    let ax = Math.random() * astCanvas.width;
    let ay = Math.random() * astCanvas.height;
    if (Math.hypot(ax - ship.x, ay - ship.y) < 75) {
      ax = (ax + 160) % astCanvas.width;
    }
    asteroids.push(makeAsteroid(ax, ay, 19, 3));
  }
}

function spawnDebris(x, y, count = 8) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 0.8 + Math.random() * 2.5;
    particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 16 });
  }
}

function updateAsteroidHud() {
  if (astScoreEl) astScoreEl.textContent = String(astScore).padStart(4, '0');
  if (astHighEl) astHighEl.textContent = String(astHigh).padStart(4, '0');
  if (astWaveEl) astWaveEl.textContent = String(astWave).padStart(2, '0');
  if (astLivesEl) astLivesEl.textContent = astLives > 0 ? '▲'.repeat(astLives) : 'DEAD';
}

function resetAsteroidGame() {
  astScore = 0;
  astWave = 1;
  astLives = 3;
  bullets = [];
  particles = [];
  ship = { x: astCanvas ? astCanvas.width / 2 : 200, y: astCanvas ? astCanvas.height / 2 : 100, vx: 0, vy: 0, angle: -Math.PI / 2, invuln: 90 };
  spawnAsteroidWave(4);
  updateAsteroidHud();
  playTone(520, 0.07, 'square');
}

function hyperspaceJump() {
  if (astLives <= 0 || !astCanvas) return;
  ship.x = 30 + Math.random() * (astCanvas.width - 60);
  ship.y = 30 + Math.random() * (astCanvas.height - 60);
  ship.vx = 0;
  ship.vy = 0;
  ship.invuln = 50;
  playTone(880, 0.05, 'triangle');
}

document.getElementById('ast-start-btn')?.addEventListener('click', resetAsteroidGame);
document.getElementById('ast-hyper-btn')?.addEventListener('click', hyperspaceJump);

function isArcadeFocused() {
  const winAst = document.getElementById('win-asteroids');
  if (!winAst) return false;
  const activeTag = document.activeElement ? document.activeElement.tagName : '';
  if (activeTag === 'INPUT') return false;
  return !winAst.classList.contains('hidden-cyber') && !winAst.classList.contains('inactive-cyber');
}

window.addEventListener('keydown', (e) => {
  if (!isArcadeFocused()) return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  astKeys[e.code] = true;

  if (e.code === 'Space' && astLives > 0 && bullets.length < 6) {
    bullets.push({
      x: ship.x + Math.cos(ship.angle) * 10,
      y: ship.y + Math.sin(ship.angle) * 10,
      vx: Math.cos(ship.angle) * 5.2 + ship.vx * 0.3,
      vy: Math.sin(ship.angle) * 5.2 + ship.vy * 0.3,
      life: 42
    });
    playLaserSweep();
  }
  if (e.code === 'KeyH') hyperspaceJump();
});

window.addEventListener('keyup', (e) => { astKeys[e.code] = false; });

function wrapCoord(obj, w, h) {
  if (obj.x < 0) obj.x += w;
  if (obj.x > w) obj.x -= w;
  if (obj.y < 0) obj.y += h;
  if (obj.y > h) obj.y -= h;
}

function stepAsteroids() {
  if (!aCtx || !astCanvas) return;
  const w = astCanvas.width;
  const h = astCanvas.height;
  aCtx.fillStyle = 'rgba(0, 0, 0, 0.36)';
  aCtx.fillRect(0, 0, w, h);

  const color = getPhosphorColor();
  aCtx.strokeStyle = color;
  aCtx.fillStyle = color;
  aCtx.lineWidth = 1.5;

  if (astLives > 0) {
    const turnSpeed = turboMode ? 0.09 : 0.07;
    if (astKeys['ArrowLeft'] || astKeys['KeyA']) ship.angle -= turnSpeed;
    if (astKeys['ArrowRight'] || astKeys['KeyD']) ship.angle += turnSpeed;
    if (astKeys['ArrowUp'] || astKeys['KeyW']) {
      ship.vx += Math.cos(ship.angle) * 0.11;
      ship.vy += Math.sin(ship.angle) * 0.11;
    }
    ship.vx *= 0.988;
    ship.vy *= 0.988;
    ship.x += ship.vx;
    ship.y += ship.vy;
    wrapCoord(ship, w, h);
    if (ship.invuln > 0) ship.invuln--;

    if (ship.invuln % 6 < 4) {
      aCtx.save();
      aCtx.translate(ship.x, ship.y);
      aCtx.rotate(ship.angle);
      aCtx.beginPath();
      aCtx.moveTo(11, 0);
      aCtx.lineTo(-8, -6);
      aCtx.lineTo(-4, 0);
      aCtx.lineTo(-8, 6);
      aCtx.closePath();
      aCtx.stroke();
      aCtx.restore();
    }
  } else {
    aCtx.font = '18px VT323';
    aCtx.textAlign = 'center';
    aCtx.fillText('HULL DESTROYED :: CLICK DEPLOY SHIP', w / 2, h / 2);
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx;
    b.y += b.vy;
    b.life--;
    wrapCoord(b, w, h);
    aCtx.fillRect(b.x - 1.5, b.y - 1.5, 3, 3);
    if (b.life <= 0) bullets.splice(i, 1);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.life--;
    aCtx.fillRect(pt.x, pt.y, 2, 2);
    if (pt.life <= 0) particles.splice(i, 1);
  }

  for (let i = asteroids.length - 1; i >= 0; i--) {
    const ast = asteroids[i];
    ast.x += ast.vx;
    ast.y += ast.vy;
    ast.angle += ast.spin;
    wrapCoord(ast, w, h);

    aCtx.save();
    aCtx.translate(ast.x, ast.y);
    aCtx.rotate(ast.angle);
    aCtx.beginPath();
    ast.verts.forEach((v, idx) => {
      const ang = (idx / ast.verts.length) * Math.PI * 2;
      const px = Math.cos(ang) * ast.radius * v;
      const py = Math.sin(ang) * ast.radius * v;
      if (idx === 0) aCtx.moveTo(px, py);
      else aCtx.lineTo(px, py);
    });
    aCtx.closePath();
    aCtx.stroke();
    aCtx.restore();

    if (astLives > 0 && ship.invuln === 0 && Math.hypot(ship.x - ast.x, ship.y - ast.y) < ast.radius + 6) {
      astLives--;
      ship.invuln = 90;
      ship.x = w / 2;
      ship.y = h / 2;
      ship.vx = 0;
      ship.vy = 0;
      spawnDebris(ast.x, ast.y, 12);
      updateAsteroidHud();
      playTone(110, 0.25, 'sawtooth', 0.08);
    }

    for (let j = bullets.length - 1; j >= 0; j--) {
      const b = bullets[j];
      if (Math.hypot(b.x - ast.x, b.y - ast.y) < ast.radius + 2) {
        bullets.splice(j, 1);
        asteroids.splice(i, 1);
        spawnDebris(ast.x, ast.y, 10);
        astScore += (4 - ast.tier) * 50;
        if (astScore > astHigh) astHigh = astScore;
        playTone(150, 0.12, 'sawtooth', 0.07);

        if (ast.tier > 1) {
          const nextRad = ast.tier === 3 ? 12 : 7;
          asteroids.push(makeAsteroid(ast.x, ast.y, nextRad, ast.tier - 1));
          asteroids.push(makeAsteroid(ast.x, ast.y, nextRad, ast.tier - 1));
        }
        if (asteroids.length === 0) {
          astWave++;
          spawnAsteroidWave(3 + astWave);
        }
        updateAsteroidHud();
        break;
      }
    }
  }
  requestAnimationFrame(stepAsteroids);
}
spawnAsteroidWave(4);
updateAsteroidHud();
if (astCanvas) stepAsteroids();

const seqGrid = document.getElementById('seq-grid');
const vuBars = document.querySelectorAll('.vu-bar');
const trackDefs = [
  { name: 'LEAD', freq: 523.25, wave: 'square' },
  { name: 'ARP', freq: 392.00, wave: 'triangle' },
  { name: 'BASS', freq: 130.81, wave: 'sawtooth' },
  { name: 'KICK', freq: 72.00, wave: 'square' }
];
const seqState = [
  [1, 0, 1, 0, 1, 1, 0, 1],
  [0, 1, 0, 1, 0, 1, 1, 0],
  [1, 0, 0, 1, 1, 0, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 0]
];
let seqPlaying = false;
let currentStep = 0;
let seqInterval = null;

function buildSequencer() {
  if (!seqGrid) return;
  seqGrid.innerHTML = '';
  trackDefs.forEach((tr, rIdx) => {
    const label = document.createElement('div');
    label.className = 'seq-track-name';
    label.textContent = tr.name;
    seqGrid.appendChild(label);

    for (let cIdx = 0; cIdx < 8; cIdx++) {
      const pad = document.createElement('button');
      pad.className = 'seq-pad' + (seqState[rIdx][cIdx] ? ' pad-on' : '');
      pad.dataset.row = rIdx;
      pad.dataset.col = cIdx;
      pad.addEventListener('click', () => {
        seqState[rIdx][cIdx] = seqState[rIdx][cIdx] ? 0 : 1;
        pad.classList.toggle('pad-on');
        playTone(tr.freq * (1 + cIdx * 0.08), 0.06, tr.wave);
      });
      seqGrid.appendChild(pad);
    }
  });
}
buildSequencer();

function stepSequencer() {
  if (!seqGrid) return;
  const allPads = seqGrid.querySelectorAll('.seq-pad');
  allPads.forEach((p) => {
    p.classList.toggle('pad-playhead', parseInt(p.dataset.col, 10) === currentStep);
  });
  trackDefs.forEach((tr, rIdx) => {
    if (seqState[rIdx][currentStep]) {
      const shift = rIdx === 0 ? 1 + (currentStep % 4) * 0.12 : 1;
      playTone(tr.freq * shift, 0.08, tr.wave, 0.04);
    }
  });
  vuBars.forEach((bar, idx) => {
    bar.style.height = (idx === currentStep ? 95 : Math.floor(20 + Math.random() * 65)) + '%';
  });
  currentStep = (currentStep + 1) % 8;
}

const seqPlayBtn = document.getElementById('seq-play');
function restartSeqLoop() {
  if (!seqPlaying) return;
  clearInterval(seqInterval);
  seqInterval = setInterval(stepSequencer, turboMode ? 140 : 195);
}

seqPlayBtn?.addEventListener('click', () => {
  seqPlaying = !seqPlaying;
  if (seqPlaying) {
    seqPlayBtn.textContent = 'STOP LOOP';
    seqPlayBtn.classList.add('active-chip');
    restartSeqLoop();
  } else {
    seqPlayBtn.textContent = 'START LOOP';
    seqPlayBtn.classList.remove('active-chip');
    clearInterval(seqInterval);
  }
});

document.getElementById('seq-clear')?.addEventListener('click', () => {
  for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) seqState[r][c] = 0;
  buildSequencer();
});

document.getElementById('seq-preset')?.addEventListener('click', () => {
  const preset = [
    [1, 1, 0, 1, 0, 1, 1, 0],
    [0, 1, 1, 0, 1, 0, 1, 1],
    [1, 0, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 1, 1, 0, 1, 0]
  ];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) seqState[r][c] = preset[r][c];
  buildSequencer();
  playTone(620, 0.06);
});

const spriteBoard = document.getElementById('sprite-board');
const previewCanvas = document.getElementById('sprite-preview');
const pCtx = previewCanvas ? previewCanvas.getContext('2d') : null;
const spriteCells = [];
let drawingSprite = false;
let spriteBounce = 0;

const botPattern = [14,15,16,17,18,19,20,21,25,26,33,34,37,39,40,42,43,44,46,49,50,51,52,53,54,55,56,57,58,61,63,64,65,66,67,68,70,74,75,80,81,87,88,91,92,98,101,102,105];
const shipPattern = [5,6,17,18,28,29,30,31,40,41,42,43,50,51,52,53,54,55,56,57,61,62,64,65,66,67,69,70,73,74,75,76,77,78,79,80,81,82,85,88,91,94,97,106];

if (spriteBoard) {
  for (let i = 0; i < 144; i++) {
    const cell = document.createElement('div');
    cell.className = 'sprite-cell' + (botPattern.includes(i) ? ' lit-cell' : '');
    cell.addEventListener('mousedown', () => {
      drawingSprite = true;
      cell.classList.toggle('lit-cell');
      playTone(720, 0.02);
    });
    cell.addEventListener('mouseenter', () => {
      if (drawingSprite) cell.classList.add('lit-cell');
    });
    spriteBoard.appendChild(cell);
    spriteCells.push(cell);
  }
}
window.addEventListener('mouseup', () => { drawingSprite = false; });

function animateSpritePreview() {
  if (!pCtx) return;
  pCtx.clearRect(0, 0, 84, 84);
  pCtx.fillStyle = getPhosphorColor();
  const offsetY = Math.sin(spriteBounce) * 4;
  spriteCells.forEach((cell, idx) => {
    if (cell.classList.contains('lit-cell')) {
      pCtx.fillRect(6 + (idx % 12) * 6, 6 + Math.floor(idx / 12) * 6 + offsetY, 5, 5);
    }
  });
  spriteBounce += 0.08;
  requestAnimationFrame(animateSpritePreview);
}
if (previewCanvas) animateSpritePreview();

function loadSpritePreset(indices) {
  spriteCells.forEach((c, idx) => c.classList.toggle('lit-cell', indices.includes(idx)));
  pulseDiskLed();
}

document.getElementById('sprite-invader')?.addEventListener('click', () => loadSpritePreset(botPattern));
document.getElementById('sprite-skull')?.addEventListener('click', () => loadSpritePreset(shipPattern));
document.getElementById('sprite-wipe')?.addEventListener('click', () => loadSpritePreset([]));
document.getElementById('sprite-invert')?.addEventListener('click', () => {
  spriteCells.forEach((c) => c.classList.toggle('lit-cell'));
});

const cipherInput = document.getElementById('cipher-input');
const cipherHexOut = document.getElementById('cipher-hex-out');
const cyberLog = document.getElementById('cyber-log');
const cyberCmd = document.getElementById('cyber-cmd');

cipherInput?.addEventListener('input', () => {
  if (cipherHexOut) {
    cipherHexOut.textContent = Array.from(cipherInput.value)
      .map((ch) => ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'))
      .join(' ') || '00';
  }
});

function appendLog(msg) {
  if (!cyberLog) return;
  const line = document.createElement('div');
  line.textContent = msg;
  cyberLog.appendChild(line);
  cyberLog.scrollTop = cyberLog.scrollHeight;
}

cyberCmd?.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const val = cyberCmd.value.trim();
  const upper = val.toUpperCase();
  appendLog('EXEC> ' + val);
  cyberCmd.value = '';
  playTone(520, 0.04);

  if (upper === 'HELP') {
    appendLog('COMMANDS: HELP, SAY [TEXT], ARCADE, BBS, GLOBE, MELTDOWN, CLS');
  } else if (upper.startsWith('SAY ')) {
    const phrase = val.slice(4);
    speakRetroRobot(phrase);
    appendLog('VOX.SAM SPEAKING: "' + phrase + '"');
  } else if (upper === 'ARCADE') {
    const w = document.getElementById('win-asteroids');
    if (w) { w.classList.remove('hidden-cyber'); bringToFront(w); }
  } else if (upper === 'BBS') {
    const w = document.getElementById('win-bbs');
    if (w) { w.classList.remove('hidden-cyber'); bringToFront(w); }
  } else if (upper === 'GLOBE') {
    const w = document.getElementById('win-globe');
    if (w) { w.classList.remove('hidden-cyber'); bringToFront(w); }
  } else if (upper === 'MELTDOWN') {
    triggerMeltdown();
  } else if (upper === 'CLS') {
    if (cyberLog) cyberLog.innerHTML = '';
  } else {
    appendLog('ERR 0x04F2: UNKNOWN DIRECTIVE');
  }
});

let meltdownTimerId = null;
let meltdownRemaining = 9.9;

function triggerMeltdown() {
  if (meltdownActive) return;
  meltdownActive = true;
  meltdownRemaining = 9.9;
  document.body.classList.add('core-meltdown');
  const banner = document.getElementById('meltdown-banner');
  if (banner) banner.classList.remove('hidden-layer');
  
  const temp = document.getElementById('temp-readout');
  if (temp) temp.textContent = '99C';
  
  speakRetroRobot('Warning. Vector core thermal runaway. Vent liquid nitrogen immediately.');
  
  meltdownTimerId = setInterval(() => {
    meltdownRemaining = Math.max(0, meltdownRemaining - 0.1);
    const timerEl = document.getElementById('meltdown-timer');
    if (timerEl) timerEl.textContent = 'T-MINUS 0' + meltdownRemaining.toFixed(1) + 's';
    
    if (Math.floor(meltdownRemaining * 10) % 3 === 0) {
      playTone(880, 0.07, 'sawtooth', 0.07);
    }
    if (meltdownRemaining <= 0) {
      purgeMeltdown();
      triggerDegauss();
    }
  }, 100);
}

function purgeMeltdown() {
  meltdownActive = false;
  clearInterval(meltdownTimerId);
  document.body.classList.remove('core-meltdown');
  const banner = document.getElementById('meltdown-banner');
  if (banner) banner.classList.add('hidden-layer');
  
  const temp = document.getElementById('temp-readout');
  if (temp) temp.textContent = '42C';
  speakRetroRobot('Liquid nitrogen vented. Core temperature stabilized.');
}

document.getElementById('meltdown-btn')?.addEventListener('click', triggerMeltdown);
document.getElementById('coolant-btn')?.addEventListener('click', purgeMeltdown);

function triggerDegauss() {
  const frame = document.getElementById('crt-frame');
  if (!frame) return;
  frame.classList.remove('degauss-shake');
  void frame.offsetWidth;
  frame.classList.add('degauss-shake');
  playTone(90, 0.35, 'sawtooth', 0.1);
}
document.getElementById('degauss-btn')?.addEventListener('click', triggerDegauss);

const turboBtn = document.getElementById('turbo-btn');
function toggleTurbo() {
  turboMode = !turboMode;
  if (turboBtn) turboBtn.classList.toggle('active-rocker', turboMode);
  
  const led = document.getElementById('turbo-led');
  if (led) led.classList.toggle('led-amber-on', turboMode);
  
  const mhz = document.getElementById('mhz-readout');
  if (mhz) mhz.textContent = turboMode ? '66' : '33';
  
  const temp = document.getElementById('temp-readout');
  if (temp) temp.textContent = turboMode ? '68C' : '42C';
  
  const bpm = document.getElementById('bpm-val');
  if (bpm) bpm.textContent = turboMode ? '168' : '132';
  
  restartSeqLoop();
  speakRetroRobot(turboMode ? 'Turbo clock sixty six megahertz engaged.' : 'Standard thirty three megahertz clock restored.');
}
turboBtn?.addEventListener('click', toggleTurbo);

const matrixCanvas = document.getElementById('matrix-rain');
const mCtx = matrixCanvas ? matrixCanvas.getContext('2d') : null;
const matrixBtn = document.getElementById('matrix-btn');
const drops = Array(40).fill(1);

function toggleMatrixRain() {
  matrixActive = !matrixActive;
  if (matrixCanvas) matrixCanvas.classList.toggle('hidden-layer', !matrixActive);
  if (matrixBtn) matrixBtn.classList.toggle('active-rocker', matrixActive);
  playTone(540, 0.06);
}
matrixBtn?.addEventListener('click', toggleMatrixRain);

setInterval(() => {
  if (!matrixActive || !mCtx || !matrixCanvas) return;
  matrixCanvas.width = matrixCanvas.clientWidth;
  matrixCanvas.height = matrixCanvas.clientHeight;
  mCtx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  mCtx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
  mCtx.fillStyle = getPhosphorColor();
  mCtx.font = '16px VT323';
  for (let i = 0; i < drops.length; i++) {
    const ch = String.fromCharCode(0x30A0 + Math.random() * 64);
    mCtx.fillText(ch, i * 28, drops[i] * 18);
    if (drops[i] * 18 > matrixCanvas.height && Math.random() > 0.95) drops[i] = 0;
    drops[i]++;
  }
}, 75);

document.querySelectorAll('[data-phos]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-phos]').forEach((b) => b.classList.remove('active-rocker'));
    btn.classList.add('active-rocker');
    document.body.className = btn.dataset.phos;
    playTone(640, 0.05);
  });
});

document.querySelectorAll('.floppy-cart').forEach((disk) => {
  disk.addEventListener('click', () => {
    document.querySelectorAll('.floppy-cart').forEach((d) => d.classList.remove('active-floppy'));
    disk.classList.add('active-floppy');
    
    const label = document.getElementById('mounted-disk-label');
    if (label) label.textContent = disk.dataset.disk;

    const crtBeam = document.getElementById('crt-beam');
    if (crtBeam) {
      crtBeam.style.opacity = '0.25';
      setTimeout(() => { crtBeam.style.opacity = '1'; }, 180);
    }

    pulseDiskLed();

    const mode = disk.dataset.layout;
    const allIds = ['win-vox', 'win-scope', 'win-globe', 'win-asteroids', 'win-seq', 'win-bbs', 'win-sprite', 'win-cipher'];
    
    // Hide all windows securely
    allIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden-cyber');
    });

    // Safely unhide based on mode
    if (mode === 'default') {
      ['win-vox', 'win-globe', 'win-asteroids', 'win-seq'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden-cyber');
      });
      bringToFront(document.getElementById('win-vox') || document.getElementById('win-asteroids'));
    } else if (mode === 'voice' || mode === 'audio') {
      ['win-vox', 'win-scope', 'win-seq'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden-cyber');
      });
      bringToFront(document.getElementById('win-vox') || document.getElementById('win-seq'));
      if (mode === 'voice') speakRetroRobot('Voice synthesis laboratory disk mounted.');
    } else if (mode === 'bbs') {
      ['win-bbs', 'win-globe'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden-cyber');
      });
      bringToFront(document.getElementById('win-bbs'));
    } else if (mode === 'creative' || mode === 'crypto') {
      ['win-sprite', 'win-cipher', 'win-scope'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden-cyber');
      });
      bringToFront(document.getElementById('win-sprite') || document.getElementById('win-cipher'));
    } else if (mode === 'arcade') {
      ['win-asteroids', 'win-seq'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden-cyber');
      });
      bringToFront(document.getElementById('win-asteroids'));
    } else {
      // Ultimate fallback if mode matches nothing
      const fallback = document.getElementById('win-scope');
      if (fallback) {
        fallback.classList.remove('hidden-cyber');
        bringToFront(fallback);
      }
    }
  });
});

const muteBtn = document.getElementById('mute-btn');
muteBtn?.addEventListener('click', () => {
  audioEnabled = !audioEnabled;
  muteBtn.textContent = audioEnabled ? 'SND: ON' : 'SND: OFF';
  if (!audioEnabled && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
});

const powerBtn = document.getElementById('power-btn');
powerBtn?.addEventListener('click', () => {
  crtPowered = !crtPowered;
  const beam = document.getElementById('crt-beam');
  const led = document.getElementById('pwr-led');
  
  if (beam) beam.classList.toggle('beam-off', !crtPowered);
  if (led) led.classList.toggle('led-green-on', crtPowered);
  
  if (crtPowered) {
    playTone(780, 0.12, 'sine');
  } else {
    if(audioCtx && audioEnabled) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    }
  }
});

setInterval(() => {
  const now = new Date();
  const clk = document.getElementById('sys-clock');
  if (clk) clk.textContent = now.toTimeString().split(' ')[0];
  
  const randHex = Math.floor(4096 + Math.random() * 61440).toString(16).toUpperCase();
  const ticker = document.getElementById('hex-ticker');
  if (ticker) ticker.textContent = '0x04F8:' + randHex;
}, 1000);
