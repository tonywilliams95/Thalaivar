const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const PUNCH_DIALOGUES = [
  'Naan oru thadava sonna, nooru thadava sonna maadhiri. Drink water!',
  'En vazhi, thani vazhi... but every vazhi needs water.',
  'Kanna, dehydration kootama varum. Water single-aa dhaan varum!',
  'Style-u, swag-u, hydration-u. Mind it!',
  'Thalaivar never skips water. Neeyum skip pannadhe, kanna.',
  'Bug fix later. Water first. Mind it!',
  'Aandavan solran, Thalaivar mudikkiran: one glass, now!',
  'Kabali da! Bottle-ai thirandhu kudi da!',
  'Code compile aagum, nee dry aagakoodathu.',
  'Ithu eppadi irukku? One glass of water, that\'s how it should be!',
];

const CHEERS = [
  'Super, kanna! 💧',
  'Magizhchi! 😎',
  'Style-aa kudichitte! 🕶️',
  'Thalaivar approves! 🔥',
];

/** @type {Reminder | undefined} */
let reminder;

function activate(context) {
  reminder = new Reminder(context);
  context.subscriptions.push(
    reminder,
    vscode.commands.registerCommand('thalaivar.start', () => reminder.start(true)),
    vscode.commands.registerCommand('thalaivar.stop', () => reminder.stop()),
    vscode.commands.registerCommand('thalaivar.drink', () => reminder.drink()),
    vscode.commands.registerCommand('thalaivar.showAlarm', () => reminder.fire()),
    vscode.commands.registerCommand('thalaivar.resetToday', () => reminder.resetToday()),
    vscode.commands.registerCommand('thalaivar.statusMenu', () => reminder.statusMenu()),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('thalaivar')) reminder.render();
    })
  );

  if (config().get('enabledOnStartup', true)) reminder.start(false);
  else reminder.render();
}

function deactivate() {}

function config() {
  return vscode.workspace.getConfiguration('thalaivar');
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

class Reminder {
  constructor(context) {
    this.context = context;
    this.running = false;
    this.nextDueAt = 0;
    this.firing = false;
    /** @type {vscode.WebviewPanel | undefined} */
    this.panel = undefined;

    this.statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusItem.command = 'thalaivar.statusMenu';
    this.statusItem.show();

    this.ticker = setInterval(() => this.tick(), 15 * 1000);
  }

  // ---- state -------------------------------------------------------------

  get count() {
    const saved = this.context.globalState.get('thalaivar.today');
    return saved && saved.day === todayKey() ? saved.count : 0;
  }

  set count(value) {
    this.context.globalState.update('thalaivar.today', { day: todayKey(), count: value });
  }

  get goal() {
    return Math.max(1, config().get('dailyGoal', 8));
  }

  schedule(minutes) {
    this.nextDueAt = Date.now() + minutes * 60 * 1000;
    this.render();
  }

  // ---- commands ----------------------------------------------------------

  start(announce) {
    this.running = true;
    this.schedule(config().get('intervalMinutes', 45));
    if (announce) {
      vscode.window.showInformationMessage(
        `🕶️ Thalaivar is watching. Next water alarm in ${config().get('intervalMinutes', 45)} min.`
      );
    }
  }

  stop() {
    this.running = false;
    this.firing = false;
    this.closePanel();
    this.render();
    vscode.window.showInformationMessage('Thalaivar reminders paused. Come back soon, kanna.');
  }

  drink() {
    this.count = this.count + 1;
    this.firing = false;
    this.closePanel();
    if (this.running) this.schedule(config().get('intervalMinutes', 45));
    else this.render();

    const msg = this.count >= this.goal
      ? `🏆 ${this.count}/${this.goal} glasses — goal done! En vazhi, hydrated vazhi!`
      : `${pick(CHEERS)} ${this.count}/${this.goal} glasses today.`;
    vscode.window.setStatusBarMessage(msg, 5000);
  }

  snooze() {
    this.firing = false;
    this.closePanel();
    const minutes = config().get('snoozeMinutes', 9);
    this.running = true;
    this.schedule(minutes);
    vscode.window.setStatusBarMessage(`😴 Snoozed ${minutes} min. Thalaivar will be back.`, 4000);
  }

  resetToday() {
    this.count = 0;
    this.render();
    if (this.panel) this.panel.webview.postMessage({ type: 'count', count: 0, goal: this.goal });
  }

  async statusMenu() {
    const items = [
      { label: '$(check) I drank water', action: 'drink' },
      { label: '$(bell) Show alarm now', action: 'fire' },
      this.running
        ? { label: '$(debug-pause) Pause reminders', action: 'stop' }
        : { label: '$(play) Start reminders', action: 'start' },
      { label: '$(gear) Settings', action: 'settings' },
    ];
    const choice = await vscode.window.showQuickPick(items, {
      placeHolder: `💧 ${this.count}/${this.goal} glasses today`,
    });
    if (!choice) return;
    if (choice.action === 'drink') this.drink();
    else if (choice.action === 'fire') this.fire();
    else if (choice.action === 'stop') this.stop();
    else if (choice.action === 'start') this.start(true);
    else if (choice.action === 'settings') {
      vscode.commands.executeCommand('workbench.action.openSettings', 'thalaivar');
    }
  }

  // ---- timing ------------------------------------------------------------

  tick() {
    if (this.running && !this.firing && Date.now() >= this.nextDueAt) this.fire();
    else this.render();
  }

  fire() {
    this.firing = true;
    this.render();
    const line = pick(PUNCH_DIALOGUES);
    if (config().get('style', 'alarm') === 'notification') this.notify(line);
    else this.showPanel(line);
  }

  async notify(line) {
    const choice = await vscode.window.showWarningMessage(
      `🕶️ Thalaivar: ${line}`,
      'Drank 💧',
      'Snooze'
    );
    if (choice === 'Drank 💧') this.drink();
    else if (choice === 'Snooze') this.snooze();
    else {
      // Dismissed without answering: ask again after a snooze.
      this.snooze();
    }
  }

  // ---- UI ----------------------------------------------------------------

  render() {
    const glasses = `${this.count}/${this.goal}`;
    if (this.firing) {
      this.statusItem.text = `$(bell) 💧 Drink water! ${glasses}`;
    } else if (!this.running) {
      this.statusItem.text = `$(debug-pause) 💧 ${glasses}`;
    } else {
      const mins = Math.max(0, Math.ceil((this.nextDueAt - Date.now()) / 60000));
      this.statusItem.text = `🕶️ 💧 ${glasses} · ${mins}m`;
    }
    this.statusItem.tooltip = this.running
      ? `Thalaivar Water Reminder — ${glasses} glasses today. Click for options.`
      : 'Thalaivar Water Reminder (paused). Click for options.';
  }

  showPanel(line) {
    const payload = {
      type: 'alarm',
      line,
      count: this.count,
      goal: this.goal,
      snooze: config().get('snoozeMinutes', 9),
      sound: config().get('playSound', true),
    };

    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Active, false);
      this.panel.webview.postMessage(payload);
      return;
    }

    const mediaRoot = vscode.Uri.joinPath(this.context.extensionUri, 'media');
    this.panel = vscode.window.createWebviewPanel(
      'thalaivarAlarm',
      '💧 Thalaivar',
      { viewColumn: vscode.ViewColumn.Active, preserveFocus: false },
      { enableScripts: true, localResourceRoots: [mediaRoot] }
    );

    const webview = this.panel.webview;
    const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const html = fs
      .readFileSync(path.join(this.context.extensionPath, 'media', 'alarm.html'), 'utf8')
      .replace(/\{\{nonce\}\}/g, nonce)
      .replace(/\{\{cspSource\}\}/g, webview.cspSource)
      .replace('{{payload}}', JSON.stringify(payload).replace(/</g, '\\u003c'));
    webview.html = html;

    webview.onDidReceiveMessage((msg) => {
      if (msg.type === 'drank') this.drink();
      else if (msg.type === 'snooze') this.snooze();
    });

    this.panel.onDidDispose(() => {
      this.panel = undefined;
      // Closing the tab without choosing counts as a snooze, so the alarm comes back.
      if (this.firing) this.snooze();
    });
  }

  closePanel() {
    if (this.panel) {
      const p = this.panel;
      this.panel = undefined;
      p.dispose();
    }
  }

  dispose() {
    clearInterval(this.ticker);
    this.statusItem.dispose();
    this.closePanel();
  }
}

module.exports = { activate, deactivate };
