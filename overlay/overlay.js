const LINES = [
  'En vazhi thani vazhi... but water is for everyone, {name}! 😎💧',
  'Naan oru thadava sonna, nooru thadava sonna maadhiri. Drink water, {name}! 💧',
  '{name}, code can wait. Water can\'t wait. Mind it! 🕶️',
  'Style-u, swag-u, hydration-u! Oru glass kudi, {name} 💧',
  'Kanna {name}, Thalaivar never skips water. Neeyum skip pannadhe! 😎',
  'Kabali da! Bottle-ai thirandhu kudi da, {name}! 💧',
  'Bug fix later, {name}. Water first! 😎💧',
];

const THANKS = [
  'Magizhchi, {name}! 😎 {count}/{goal} glasses today',
  'Super, kanna! 💧 {count}/{goal} done',
  'Ithu eppadi irukku! 🔥 {count}/{goal} glasses',
];

const $ = (id) => document.getElementById(id);
const character = $('character');
const bubble = $('bubble');
const line = $('line');
const buttons = $('buttons');
const custom = $('custom');
const cartoon = $('cartoon');

const WALK_SPEED = 260; // px per second
const WIDTH = 200;

let state = null;
let busy = false;

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const fill = (text, extra = {}) =>
  text.replace(/\{(\w+)\}/g, (_, k) => (k in extra ? extra[k] : state[k] ?? ''));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function useImage(kind) {
  if (!state.custom) return;
  custom.src = kind === 'walk' ? state.custom.walk : state.custom.stand;
}

function place(x, animate) {
  const from = character._x ?? x;
  const ms = animate ? (Math.abs(x - from) / WALK_SPEED) * 1000 : 0;
  character.style.setProperty('--walk-ms', `${ms}ms`);
  character.style.transform = `translateX(${x}px)`;
  character._x = x;
  return wait(ms);
}

async function walkTo(x) {
  character.classList.add('walking');
  useImage('walk');
  await place(x, true);
  character.classList.remove('walking');
  useImage('stand');
}

async function enter(data) {
  if (busy) return;
  busy = true;
  state = data;

  custom.hidden = !state.custom;
  cartoon.style.display = state.custom ? 'none' : '';

  bubble.classList.add('hidden');
  buttons.classList.remove('hidden');
  place(-WIDTH - 80, false);
  await wait(50);

  const centre = Math.round(window.innerWidth / 2 - WIDTH / 2);
  await walkTo(centre);
  await wait(250);

  line.textContent = fill(pick(LINES));
  bubble.classList.remove('hidden');
}

async function leave(text, toRight) {
  buttons.classList.add('hidden');
  line.textContent = text;
  // Re-trigger the pop animation for the new text.
  bubble.style.animation = 'none';
  void bubble.offsetWidth;
  bubble.style.animation = '';
  window.thalaivar.interactive(false);

  await wait(1800);
  bubble.classList.add('hidden');
  await walkTo(toRight ? window.innerWidth + 80 : -WIDTH - 80);
  character.classList.remove('happy');
  busy = false;
  window.thalaivar.done();
}

$('yes').addEventListener('click', () => {
  window.thalaivar.answer('yes');
  character.classList.add('happy');
});

$('later').addEventListener('click', () => {
  window.thalaivar.answer('later');
  leave(fill('Sari sari... {snoozeMinutes} nimisham. I\'ll be back, {name}! 🕶️'), false);
});

// Count comes back from the main process after YES, so the thanks line is accurate.
window.thalaivar.onCount(({ count, goal }) => {
  if (!character.classList.contains('happy')) return;
  const text =
    count >= goal
      ? fill('Goal done! {count}/{goal} 🏆 En vazhi, hydrated vazhi, {name}!', { count, goal })
      : fill(pick(THANKS), { count, goal });
  leave(text, true);
});

// The window ignores mouse clicks except while you're over the bubble.
bubble.addEventListener('mouseenter', () => window.thalaivar.interactive(true));
bubble.addEventListener('mouseleave', () => window.thalaivar.interactive(false));

window.thalaivar.onRemind(enter);
