# 🕶️ Thalaivar Water Reminder

Thalaivar walks onto your screen, right over VS Code, and tells you to drink water.

> *"En vazhi thani vazhi... but water is for everyone! 😎💧"*
>
> **[ YES ]**  Remind me later

![Thalaivar reminder](assets/preview.png)

- 🚶 Walks in from the left or right (taking real steps), stops in the middle, then carries on across and off the other side
- 💬 Speech bubble with a random punch dialogue and your name
- ✅ **YES** logs a glass and he walks off happy; **Remind me later** snoozes for 10 minutes
- 💧 Today's glass count in the menu bar / system tray
- 🪟 See-through, always-on-top overlay that never steals focus, so you can keep typing

## Run it

Needs [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm start
```

He shows up a moment after launch, then every 45 minutes. Use the 💧 tray / menu-bar icon to:

- call him now
- log a glass
- pause reminders
- change the interval
- edit your settings

## Settings

**Edit settings** in the tray menu opens `config.json`. Changes apply as soon as you save it.

```json
{
  "name": "Akash",
  "intervalMinutes": 45,
  "snoozeMinutes": 10,
  "dailyGoal": 8,
  "enterFrom": "random"
}
```

`enterFrom` can be `"left"`, `"right"` or `"random"`.

## Use your own Thalaivar image

The built-in character is a cartoon. To use your own picture or animation, drop files into `assets/`. A transparent background looks best.

| File | Used when |
| --- | --- |
| `assets/character.png` (or `.gif` / `.webp`) | Standing and talking |
| `assets/walk.gif` (or `.webp` / `.png`) | Walking in and out |

If only one is present, it's used for both. The included `walk.webp` is a 4-frame walk cycle built from `character.png`: the legs alternate, he bobs, and his weight shifts from side to side.

## Notes

- **macOS / Windows:** clicks pass through the overlay to your editor, except on the speech bubble.
- **Linux:** the overlay catches clicks while he's on screen, for a few seconds per reminder.

A fan-made tribute; not affiliated with Rajinikanth.
