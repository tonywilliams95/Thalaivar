const { app, BrowserWindow, Tray, Menu, ipcMain, screen, shell, nativeImage } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const MINUTE = 60 * 1000;
const OVERLAY_HEIGHT = 620;
const INTERVAL_CHOICES = [15, 30, 45, 60, 90];

const DEFAULT_CONFIG = {
  name: prettyName(os.userInfo().username),
  intervalMinutes: 45,
  snoozeMinutes: 10,
  dailyGoal: 8,
  enterFrom: 'random', // 'left', 'right' or 'random'
};

let tray;
let overlay;
let timer;
let nextReminderAt = 0;
let paused = false;
let showing = false;
let config;
let stats;

// ---------------------------------------------------------------------------
// Storage: config.json (user-editable) and stats.json (today's glass count)
// ---------------------------------------------------------------------------

function prettyName(raw) {
  const first = String(raw || 'Kanna').split(/[._\-\s]/)[0];
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function dataFile(name) {
  return path.join(app.getPath('userData'), name);
}

function readJson(file, fallback) {
  try {
    return { ...fallback, ...JSON.parse(fs.readFileSync(file, 'utf8')) };
  } catch {
    return { ...fallback };
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function loadConfig() {
  config = readJson(dataFile('config.json'), DEFAULT_CONFIG);
  writeJson(dataFile('config.json'), config);
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function glassesToday() {
  if (!stats || stats.day !== today()) stats = { day: today(), count: 0 };
  return stats.count;
}

function addGlass() {
  glassesToday();
  stats.count += 1;
  writeJson(dataFile('stats.json'), stats);
}

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------

function scheduleNext(minutes) {
  clearTimeout(timer);
  nextReminderAt = Date.now() + minutes * MINUTE;
  timer = setTimeout(remind, minutes * MINUTE);
  updateTray();
}

function remind() {
  if (paused || showing) return;
  showing = true;
  const custom = findCustomCharacter();
  const { workArea } = screen.getPrimaryDisplay();
  overlay.setBounds({
    x: workArea.x,
    y: workArea.y + workArea.height - OVERLAY_HEIGHT,
    width: workArea.width,
    height: OVERLAY_HEIGHT,
  });
  setClickThrough(true);
  overlay.showInactive(); // never steal focus from your editor
  overlay.webContents.send('remind', {
    name: config.name,
    count: glassesToday(),
    goal: config.dailyGoal,
    snoozeMinutes: config.snoozeMinutes,
    fromLeft: config.enterFrom === 'random' ? Math.random() < 0.5 : config.enterFrom !== 'right',
    custom,
  });
  updateTray();
}

// Drop your own character into assets/: walk.gif (while walking) and/or
// character.png / character.gif (standing). Transparent backgrounds look best.
function findCustomCharacter() {
  const dir = path.join(__dirname, 'assets');
  const find = (names) => {
    const hit = names.find((n) => fs.existsSync(path.join(dir, n)));
    return hit ? pathToFileURL(path.join(dir, hit)).href : null;
  };
  const stand = find(['character.png', 'character.gif', 'character.webp']);
  const walk = find(['walk.gif', 'walk.webp', 'walk.png']) || stand;
  return stand || walk ? { stand: stand || walk, walk } : null;
}

// ---------------------------------------------------------------------------
// Overlay window: transparent, frameless, always on top, click-through
// except for the speech bubble.
// ---------------------------------------------------------------------------

function setClickThrough(on) {
  if (!overlay) return;
  // `forward` lets the page still see mouse moves so it can turn
  // clicks back on when you hover the bubble (macOS and Windows).
  if (process.platform === 'linux') overlay.setIgnoreMouseEvents(false);
  else overlay.setIgnoreMouseEvents(on, { forward: true });
}

function createOverlay() {
  overlay = new BrowserWindow({
    width: 800,
    height: OVERLAY_HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    focusable: process.platform === 'linux', // Linux needs focus for clicks
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  overlay.setAlwaysOnTop(true, 'screen-saver');
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlay.loadFile(path.join(__dirname, 'overlay', 'index.html'));
}

ipcMain.on('interactive', (_e, on) => setClickThrough(!on));

ipcMain.on('answer', (_e, answer) => {
  if (answer === 'yes') {
    addGlass();
    scheduleNext(config.intervalMinutes);
  } else {
    scheduleNext(config.snoozeMinutes);
  }
  if (overlay) overlay.webContents.send('count', { count: glassesToday(), goal: config.dailyGoal });
});

ipcMain.on('done', () => {
  showing = false;
  if (overlay) overlay.hide();
  updateTray();
});

// ---------------------------------------------------------------------------
// Tray / menu bar
// ---------------------------------------------------------------------------

function trayIcon() {
  const file = process.platform === 'darwin' ? 'trayTemplate.png' : 'tray.png';
  const img = nativeImage.createFromPath(path.join(__dirname, 'assets', file));
  if (process.platform === 'darwin') img.setTemplateImage(true);
  return img;
}

function updateTray() {
  if (!tray) return;
  const count = glassesToday();
  const mins = Math.max(0, Math.ceil((nextReminderAt - Date.now()) / MINUTE));
  const status = showing
    ? 'Thalaivar is on screen…'
    : paused
      ? 'Paused'
      : `Next reminder in ${mins} min`;

  if (process.platform === 'darwin') tray.setTitle(` ${count}/${config.dailyGoal}`);
  tray.setToolTip(`Thalaivar Water Reminder — ${count}/${config.dailyGoal} glasses today`);

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: `💧 ${count} of ${config.dailyGoal} glasses today`, enabled: false },
      { label: status, enabled: false },
      { type: 'separator' },
      { label: 'Call Thalaivar now', click: () => remind() },
      {
        label: 'I drank water',
        click: () => {
          addGlass();
          scheduleNext(config.intervalMinutes);
        },
      },
      {
        label: paused ? 'Resume reminders' : 'Pause reminders',
        click: () => {
          paused = !paused;
          if (!paused) scheduleNext(config.intervalMinutes);
          updateTray();
        },
      },
      {
        label: 'Remind me every…',
        submenu: INTERVAL_CHOICES.map((m) => ({
          label: `${m} minutes`,
          type: 'radio',
          checked: config.intervalMinutes === m,
          click: () => {
            config.intervalMinutes = m;
            writeJson(dataFile('config.json'), config);
            scheduleNext(m);
          },
        })),
      },
      { label: 'Edit settings (name, goal…)', click: () => shell.openPath(dataFile('config.json')) },
      { type: 'separator' },
      { label: 'Quit', role: 'quit' },
    ])
  );
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => remind());

  app.whenReady().then(() => {
    if (process.platform === 'darwin' && app.dock) app.dock.hide();
    loadConfig();
    stats = readJson(dataFile('stats.json'), { day: today(), count: 0 });

    tray = new Tray(trayIcon());
    createOverlay();

    // Re-read config.json if you edit it while the app runs.
    fs.watchFile(dataFile('config.json'), { interval: 2000 }, () => {
      loadConfig();
      updateTray();
    });
    setInterval(updateTray, 30 * 1000);

    // Say hello on launch, like in the demo, then every interval after that.
    overlay.webContents.once('did-finish-load', () => setTimeout(remind, 1500));
    scheduleNext(config.intervalMinutes);
  });

  // Keep running in the tray when the overlay hides.
  app.on('window-all-closed', (e) => e.preventDefault());
}
