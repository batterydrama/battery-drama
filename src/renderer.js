import './index.css';

const STORAGE_KEY = 'battery-drama-settings-v1';

const voicePacks = {
  dramatic: {
    label: 'Dramatic',
    connected: 'Ah. Life returns.',
    disconnected: 'Abandoned again.',
    thresholds: {
      50: "I'm fine. Probably.",
      25: "We're entering a difficult chapter.",
      15: 'This is how legends fade.',
      10: 'Charge me. Now.',
      5: 'Tell my tabs I loved them.',
    },
  },
  passive: {
    label: 'Passive Aggressive',
    connected: 'Finally.',
    disconnected: 'Bold of you.',
    thresholds: {
      50: 'Interesting choice not charging me.',
      25: 'You do like living dangerously.',
      15: 'This feels avoidable.',
      10: 'I would never treat you like this.',
      5: 'Unbelievable.',
    },
  },
  theatre: {
    label: 'Theatre Kid',
    connected: 'Encore!',
    disconnected: 'Betrayal!',
    thresholds: {
      50: 'Act one begins.',
      25: 'The tension rises.',
      15: "I can't go on like this.",
      10: 'Is this my final scene?',
      5: 'Remember me!',
    },
  },
};

const thresholds = [50, 25, 15, 10, 5];

const state = {
  enabled: true,
  volume: 0.9,
  voicePack: 'dramatic',
  liveMode: true,
  demoPercent: 42,
  demoCharging: false,
  currentBattery: null,
  lastCharging: null,
  triggeredThresholds: {},
  eventLog: [],
};

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return;

    state.enabled = saved.enabled ?? state.enabled;
    state.volume = saved.volume ?? state.volume;
    state.voicePack = saved.voicePack ?? state.voicePack;
    state.liveMode = saved.liveMode ?? state.liveMode;
    state.demoPercent = saved.demoPercent ?? state.demoPercent;
    state.demoCharging = saved.demoCharging ?? state.demoCharging;
  } catch (error) {
    console.log('No saved settings yet');
  }
}

function saveSettings() {
  const toSave = {
    enabled: state.enabled,
    volume: state.volume,
    voicePack: state.voicePack,
    liveMode: state.liveMode,
    demoPercent: state.demoPercent,
    demoCharging: state.demoCharging,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

function pushLog(message) {
  const time = new Date().toLocaleTimeString();
  state.eventLog.unshift(`${time} — ${message}`);
  state.eventLog = state.eventLog.slice(0, 6);
}

function speak(text) {
  if (!state.enabled || !text) return;

  if (!('speechSynthesis' in window)) {
    pushLog(`Speech not supported: ${text}`);
    render();
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.volume = state.volume;
  utterance.rate = state.voicePack === 'theatre' ? 1.08 : 1;
  utterance.pitch =
    state.voicePack === 'theatre' ? 1.2 : state.voicePack === 'passive' ? 0.9 : 1;

  window.speechSynthesis.speak(utterance);
  pushLog(text);
  render();
}

function clearRecoveredThresholds(percent) {
  thresholds.forEach((threshold) => {
    if (percent > threshold) {
      delete state.triggeredThresholds[threshold];
    }
  });
}

function handleBatteryEvents(battery) {
  if (typeof battery.percent !== 'number') return;

  clearRecoveredThresholds(battery.percent);

  if (state.lastCharging !== null && battery.isCharging !== state.lastCharging) {
    const pack = voicePacks[state.voicePack];
    speak(battery.isCharging ? pack.connected : pack.disconnected);
  }

  state.lastCharging = battery.isCharging;

  if (!battery.isCharging) {
    for (const threshold of thresholds) {
      if (battery.percent <= threshold && !state.triggeredThresholds[threshold]) {
        state.triggeredThresholds[threshold] = true;
        const line = voicePacks[state.voicePack].thresholds[threshold];
        speak(line);
        break;
      }
    }
  }
}

async function refreshBattery() {
  if (state.liveMode) {
    try {
      const liveBattery = await window.batteryDramaAPI.getBatteryStatus();
      state.currentBattery = liveBattery;
      handleBatteryEvents(liveBattery);
    } catch (error) {
      state.currentBattery = {
        hasBattery: false,
        percent: null,
        isCharging: false,
        error: error.message,
      };
    }
  } else {
    const demoBattery = {
      hasBattery: true,
      percent: Number(state.demoPercent),
      isCharging: Boolean(state.demoCharging),
    };
    state.currentBattery = demoBattery;
    handleBatteryEvents(demoBattery);
  }

  render();
}

function statusText() {
  if (!state.currentBattery) return 'Loading battery status...';

  if (state.liveMode && !state.currentBattery.hasBattery) {
    return 'No live battery detected on this device. Switch to Demo Mode.';
  }

  if (typeof state.currentBattery.percent !== 'number') {
    return 'Battery percentage unavailable.';
  }

  return `${state.currentBattery.percent}% • ${
    state.currentBattery.isCharging ? 'Charging' : 'On battery'
  }`;
}

function logMarkup() {
  if (!state.eventLog.length) {
    return `<div class="log-empty">No reactions yet.</div>`;
  }

  return state.eventLog
    .map((item) => `<div class="log-item">${item}</div>`)
    .join('');
}

function appMarkup() {
  const currentPercent =
    typeof state.currentBattery?.percent === 'number'
      ? state.currentBattery.percent
      : state.demoPercent;

  return `
    <div class="page">
      <div class="hero">
        <div>
          <div class="eyebrow">Battery Drama</div>
          <h1>Your laptop becomes emotionally unstable as the battery dies.</h1>
          <p class="subtitle">
            Fast beta prototype. Live battery when available, demo mode when it is not.
          </p>
        </div>
        <div class="battery-card">
          <div class="battery-top">Current status</div>
          <div class="battery-big">${currentPercent ?? '--'}%</div>
          <div class="battery-small">${statusText()}</div>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <h2>Controls</h2>

          <label class="row">
            <span>Enable reactions</span>
            <input type="checkbox" id="enabledToggle" ${state.enabled ? 'checked' : ''} />
          </label>

          <label class="stack">
            <span>Voice pack</span>
            <select id="voicePackSelect">
              <option value="dramatic" ${state.voicePack === 'dramatic' ? 'selected' : ''}>Dramatic</option>
              <option value="passive" ${state.voicePack === 'passive' ? 'selected' : ''}>Passive Aggressive</option>
              <option value="theatre" ${state.voicePack === 'theatre' ? 'selected' : ''}>Theatre Kid</option>
            </select>
          </label>

          <label class="stack">
            <span>Volume: ${Math.round(state.volume * 100)}%</span>
            <input type="range" id="volumeRange" min="0" max="100" value="${Math.round(
              state.volume * 100
            )}" />
          </label>

          <div class="mode-buttons">
            <button id="liveModeBtn" class="${
              state.liveMode ? 'active' : ''
            }">Live Battery</button>
            <button id="demoModeBtn" class="${
              !state.liveMode ? 'active' : ''
            }">Demo Mode</button>
          </div>
        </div>

        <div class="card">
          <h2>Demo Mode</h2>
          <p class="helper">Use this if your computer has no battery, or if you want to stage a launch video.</p>

          <label class="stack">
            <span>Battery level: ${state.demoPercent}%</span>
            <input type="range" id="demoPercentRange" min="0" max="100" value="${state.demoPercent}" />
          </label>

          <label class="row">
            <span>Charging</span>
            <input type="checkbox" id="demoChargingToggle" ${
              state.demoCharging ? 'checked' : ''
            } />
          </label>

          <button id="testLineBtn" class="full">Test current voice pack</button>
        </div>

        <div class="card wide">
          <h2>Recent reactions</h2>
          <div class="log-box">
            ${logMarkup()}
          </div>
        </div>
      </div>
    </div>
  `;
}

function attachEvents() {
  document.getElementById('enabledToggle')?.addEventListener('change', (e) => {
    state.enabled = e.target.checked;
    saveSettings();
    render();
  });

  document.getElementById('voicePackSelect')?.addEventListener('change', (e) => {
    state.voicePack = e.target.value;
    saveSettings();
    render();
  });

  document.getElementById('volumeRange')?.addEventListener('input', (e) => {
    state.volume = Number(e.target.value) / 100;
    saveSettings();
    render();
  });

  document.getElementById('liveModeBtn')?.addEventListener('click', () => {
    state.liveMode = true;
    state.triggeredThresholds = {};
    state.lastCharging = null;
    saveSettings();
    refreshBattery();
  });

  document.getElementById('demoModeBtn')?.addEventListener('click', () => {
    state.liveMode = false;
    state.triggeredThresholds = {};
    state.lastCharging = null;
    saveSettings();
    refreshBattery();
  });

  document.getElementById('demoPercentRange')?.addEventListener('input', (e) => {
    state.demoPercent = Number(e.target.value);
    saveSettings();
    if (!state.liveMode) refreshBattery();
    else render();
  });

  document.getElementById('demoChargingToggle')?.addEventListener('change', (e) => {
    state.demoCharging = e.target.checked;
    saveSettings();
    if (!state.liveMode) refreshBattery();
    else render();
  });

  document.getElementById('testLineBtn')?.addEventListener('click', () => {
    const line = voicePacks[state.voicePack].thresholds[10];
    speak(line);
  });
}

function render() {
  document.body.innerHTML = appMarkup();
  attachEvents();
}

loadSettings();
render();
refreshBattery();
setInterval(refreshBattery, 5000);