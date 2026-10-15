# 🕶️ Thalaivar Water Reminder

A Superstar-style hydration alarm for VS Code. Every so often Thalaivar takes over your editor with an iPhone-style alarm screen, a punch dialogue, and one simple order: **drink water. Mind it!**

## Features

- **Alarm screen** — big clock, orange **Snooze** button and **slide to drink 💧** slider, just like a phone alarm.
- **Punch dialogues** — a random Thalaivar-style line with every reminder.
- **Daily glass tracker** — 💧💧○○○○○○ progress towards your daily goal; resets each day.
- **Status bar countdown** — `🕶️ 💧 3/8 · 27m`. Click it for quick actions.
- **Chime** — a short alarm tone (can be turned off).
- **Quiet mode** — use a plain notification instead of the full alarm screen.

## Commands

Open the Command Palette (`Ctrl/Cmd+Shift+P`) and type **Thalaivar**:

| Command | What it does |
| --- | --- |
| Thalaivar: Start Reminders | Start (or restart) the countdown |
| Thalaivar: Pause Reminders | Pause reminders |
| Thalaivar: I Drank Water 💧 | Log a glass and restart the countdown |
| Thalaivar: Show Alarm Now | Trigger the alarm right away |
| Thalaivar: Reset Today's Count | Set today's glasses back to 0 |

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `thalaivar.intervalMinutes` | `45` | Minutes between reminders |
| `thalaivar.snoozeMinutes` | `9` | Snooze length |
| `thalaivar.dailyGoal` | `8` | Glasses per day |
| `thalaivar.style` | `alarm` | `alarm` (full screen) or `notification` |
| `thalaivar.playSound` | `true` | Play the chime |
| `thalaivar.enabledOnStartup` | `true` | Start automatically when VS Code opens |

Closing the alarm tab without choosing counts as a snooze, so Thalaivar will be back.

## Run it locally

1. Open this folder in VS Code.
2. Press `F5` to launch an Extension Development Host.
3. Run **Thalaivar: Show Alarm Now** to see it straight away.

## Install as a .vsix

```bash
npx @vscode/vsce package
code --install-extension thalaivar-water-reminder-0.1.0.vsix
```

A fan-made tribute; not affiliated with Rajinikanth.
