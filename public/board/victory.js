// The victory screen, shown right after a result for as long as the call screen: the winner's mascot shoves the loser's
// out of the way, jumps up a staircase (three steps at once, then two), lands on top with the winner's name and confetti,
// and keeps bouncing there; the loser lies dizzy on the floor, gets up later, sad. Then the call screen comes.
// Light for a TV browser, like the call screen: transforms and opacity only, few layers.
import { fightStyle, mascotFor, mascotInner, burstHTML, burstLines } from '/board/call.js';

const S = 240; // mascot size, px (font-size of the body)
const FLOOR = 968; // the floor line, stage px
const STEPS = 5;
const SW = 180; // step width
const SH = 100; // step height
const RIGHT = 1770; // the staircase's right edge
const X0 = RIGHT - STEPS * SW; // its left edge, the foot
const SINK = 14; // the emoji picture has a margin under the feet: stand a little lower

const CSS = `
.vic .scene { position: absolute; left: 60px; top: 60px; width: 1920px; height: 1080px; overflow: hidden; }
.vic .bg { position: absolute; inset: 0; }
.vic.w1 .bg { background: radial-gradient(circle at 92% 30%, #ff5a6e 0, #c8102e 22%, #5a0010 62%, #1a0306 100%); }
.vic.w2 .bg { background: radial-gradient(circle at 92% 30%, #5f8cff 0, #1d4fbf 22%, #0a1f5c 62%, #050b1f 100%); }
.vic .sun { position: absolute; inset: 0; opacity: .16; background: repeating-conic-gradient(from 0deg at 92% 30%, #ffd23f 0 7deg, transparent 7deg 20deg); }
.vic .floor { position: absolute; left: 0; right: 0; top: ${FLOOR}px; bottom: 0; background: linear-gradient(#262b40, #10131f); border-top: 6px solid #0b0d14; }
.vic .step { position: absolute; bottom: 0; width: ${SW}px; background: linear-gradient(90deg, #39426a, #262d4b);
  border: 6px solid #0b0d14; border-bottom: 0; box-shadow: inset 0 16px 0 #ffd23f, inset 0 22px 0 #b8860b; will-change: transform; }
.vic .vm { position: absolute; left: 0; top: 0; width: ${S}px; height: ${S}px; z-index: 3; will-change: transform; }
.vic .vb { position: absolute; inset: 0; transform-origin: 50% 100%; }
.vic .vr { position: absolute; inset: 0; transform-origin: 50% 55%; }
.vic .mascot { position: absolute; left: 0; top: 0; font-size: ${S}px; }
.vic .loser { z-index: 2; }
.vic .dizzy { position: absolute; z-index: 4; left: 0; top: 0; width: 160px; height: 60px; font-size: 64px; line-height: 1; opacity: 0; }
.vic .dizzy span { position: absolute; top: 0; }
.vic .title { position: absolute; z-index: 5; left: 60px; top: 240px; width: 1540px; text-align: center; opacity: 0; }
.vic .crown { display: inline-flex; align-items: center; gap: .2em; font-size: 120px; line-height: 1; font-weight: 900; font-style: italic;
  letter-spacing: 6px; text-transform: uppercase; color: #4a2a00; }
.vic .crown .t { position: relative; -webkit-text-stroke: 16px #4a2a00; text-shadow: 0 10px 0 rgba(0,0,0,.45); }
.vic .crown .t::after { content: attr(data-text); position: absolute; left: 0; top: 0; color: #ffd23f; -webkit-text-stroke: 0; text-shadow: none; }
.vic .crown svg { width: .8em; height: .8em; overflow: visible; }
.vic .vname { height: 300px; margin-top: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.vic .vname .nm { display: block; max-width: 100%; font-size: 150px; line-height: 1; font-weight: 900; font-style: italic; text-transform: uppercase;
  color: #fff; text-shadow: 0 8px 0 rgba(0,0,0,.5), 0 0 40px rgba(0,0,0,.35); }
.vic .vname .nick { font-size: 36px; line-height: 1.1; letter-spacing: 3px; font-weight: 900; font-style: italic; text-transform: uppercase; color: #ffd400; margin-top: 8px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; text-shadow: 0 4px 0 rgba(0,0,0,.45); }
.vic .info { font-size: 40px; font-weight: 800; font-style: italic; text-transform: uppercase; letter-spacing: 5px; color: #fff; opacity: .85; margin-top: 6px; }
.vic .confetti { position: absolute; inset: 0; z-index: 6; pointer-events: none; }
.vic .confetti i { position: absolute; top: -40px; width: 16px; height: 26px; opacity: 0; will-change: transform; }
`;

const STAR = 'M0-10 2.94-4.05 9.51-3.09 4.76 1.55 5.88 8.09 0 5 -5.88 8.09 -4.76 1.55 -9.51-3.09 -2.94-4.05Z';
const STAR_SVG = `<svg viewBox="-12 -12 24 24" aria-hidden="true"><path d="${STAR}" transform="translate(0 1.8)" fill="#000" fill-opacity=".45" stroke="#000" stroke-opacity=".45" stroke-width="4.4" stroke-linejoin="round"/><path d="${STAR}" fill="#4a2a00" stroke="#4a2a00" stroke-width="4.4" stroke-linejoin="round"/><path d="${STAR}" fill="#ffd23f" stroke="#ffd23f" stroke-width=".6" stroke-linejoin="round"/></svg>`;
const COLORS = ['#ffd23f', '#ff4d6d', '#4dd2ff', '#7cff6b', '#ffffff', '#ff9f1c', '#c77dff'];

/** Where a mascot stands: on the floor (step 0) at x, or on step i of the staircase (top left of its box). */
const onStep = (i) => [X0 + SW * (i - 1) + SW / 2 - S / 2, FLOOR - SH * i - S + SINK];
const GROUND = FLOOR - S + SINK;

export function createVictory(root) {
  fightStyle();
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  const steps = Array.from({ length: STEPS }, (_, k) => `<div class="step" style="left:${X0 + SW * k}px;height:${1080 - FLOOR + SH * (k + 1)}px"></div>`).join('');
  const confetti = Array.from({ length: 34 }, () => '<i></i>').join('');
  root.innerHTML = `<div class="fight vic">
    <div class="ring"><div class="scene">
      <div class="bg"></div><div class="sun"></div><div class="floor"></div>${steps}
      <div class="vm loser"><div class="vb"><div class="vr"><div class="mascot"></div></div></div></div>
      <div class="vm winner"><div class="vb"><div class="vr"><div class="mascot"></div></div></div></div>
      <div class="dizzy"><span>💫</span><span style="left:80px">💫</span></div>
      <div class="title"><div class="crown"></div><div class="vname"><span class="nm"></span><div class="nick"></div></div><div class="info"></div></div>
      <div class="confetti">${confetti}</div>
    </div></div>
    <div class="flash"></div><div class="bar"></div></div>`;
  const q = (sel) => root.querySelector(sel);
  const vic = q('.vic');
  const ring = q('.ring');
  const scene = q('.scene');
  let running = [];
  let timers = [];
  const anim = (el, frames, opts) => {
    const a = el.animate(frames, opts);
    if (running.length > 400) running = running.filter((x) => x.playState !== 'finished');
    running.push(a);
    return a;
  };
  const after = (ms, fn) => timers.push(setTimeout(fn, ms));
  // `fn` at `ms` on the animations' own clock: they start with the next frame drawn, a setTimeout starts at once, so a
  // timer ran ahead of them (the dust puffed up before the mascot landed; more on a slow screen). Cancelled with them.
  const cue = (ms, fn) => { anim(scene, [{}, {}], { duration: Math.max(0, ms) }).onfinish = fn; };
  const rand = (a, b) => a + Math.random() * (b - a);
  const T = (x, y) => `translate(${Math.round(x)}px, ${Math.round(y)}px)`;

  // the dizzy stars are emoji pictures too (the TV's own font is not used for emoji)
  q('.dizzy').querySelectorAll('span').forEach((s) => { s.innerHTML = `<img class="emo" src="/assets/emoji/1f4ab.svg" alt="">`; });
  q('.crown').innerHTML = `${STAR_SVG}<span class="t" data-text="Winner">Winner</span>${STAR_SVG}`;

  function impact(at, power) {
    anim(ring, [
      { transform: 'none' },
      { transform: `translate(${-power}px, ${power * 0.6}px) rotate(-.4deg)`, offset: 0.15 },
      { transform: `translate(${power * 0.7}px, ${-power * 0.5}px) rotate(.3deg)`, offset: 0.35 },
      { transform: `translate(${-power * 0.35}px, ${power * 0.25}px)`, offset: 0.6 },
      { transform: 'none' },
    ], { duration: 380, delay: at, easing: 'ease-out' });
    anim(q('.flash'), [{ opacity: Math.min(0.6, power / 60) }, { opacity: 0 }], { duration: 260, delay: at, easing: 'ease-out' });
  }

  /** A cartoon dust cloud at (x, y) of the scene: a few puffs that swell, drift up and fade. */
  function dust(x, y, k = 1) {
    const d = document.createElement('div');
    d.className = 'dust';
    d.style.left = `${x}px`;
    d.style.top = `${y}px`;
    const n = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const r = rand(60, 105) * k;
      const a = (i / n) * Math.PI + rand(-0.3, 0.3);
      d.insertAdjacentHTML('beforeend', `<i style="width:${r}px;height:${r}px;left:${Math.cos(a) * 110 * k - r / 2}px;top:${-Math.sin(a) * 40 * k - r / 2}px"></i>`);
    }
    scene.append(d);
    const ms = rand(800, 1100);
    d.animate([{ transform: 'scale(.3)', opacity: 1 }, { transform: 'translateY(-20px) scale(1)', opacity: 1, offset: 0.4 },
      { transform: `translate(${rand(-20, 20)}px, -60px) scale(1.35)`, opacity: 0 }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
    after(ms + 50, () => d.remove());
  }

  function pow(x, y, word) {
    const b = document.createElement('div');
    b.className = 'pow';
    b.innerHTML = burstHTML(word);
    b.style.left = `${x}px`;
    b.style.top = `${y}px`;
    b.style.zIndex = '5';
    scene.append(b);
    burstLines(b);
    b.animate([{ transform: 'translate(-50%, -50%) scale(.2) rotate(-20deg)', opacity: 1 }, { transform: 'translate(-50%, -50%) scale(1.2) rotate(6deg)', opacity: 1, offset: 0.2 },
      { transform: 'translate(-50%, -50%) scale(1.1) rotate(0)', opacity: 1, offset: 0.7 }, { transform: 'translate(-50%, -50%) scale(1) rotate(-2deg)', opacity: 0 }], { duration: 800, easing: 'ease-out', fill: 'forwards' });
    after(850, () => b.remove());
  }

  /** The winner's name: as big as fits, at most 2 lines, room left for the nickname. */
  function setName(name, nick) {
    const nm = q('.vname .nm');
    const box = q('.vname');
    box.style.height = '';
    nm.textContent = name;
    q('.vname .nick').textContent = nick;
    let size = 150;
    nm.style.fontSize = `${size}px`;
    const room = () => box.clientHeight - q('.vname .nick').offsetHeight - 8;
    while (size > 40 && (nm.scrollWidth > box.clientWidth + 1 || Math.round(nm.offsetHeight / size) > 2 || nm.offsetHeight > room())) nm.style.fontSize = `${(size -= 4)}px`;
    box.style.height = `${nm.offsetHeight + q('.vname .nick').offsetHeight + 10}px`; // no empty band under a short name
  }

  function setMascot(el, m, mirrored, look) {
    const k = m[4] ?? 1;
    const box = el.querySelector('.mascot');
    box.style.fontSize = k === 1 ? '' : `${S * k}px`;
    box.innerHTML = mascotInner(m, mirrored, look);
  }

  return {
    /** r: the finished match (matchView with winner); ms: how long the screen stays; players: all, in join order. */
    show(r, ms, players = []) {
      this.hide();
      scene.querySelectorAll('.pow, .dust').forEach((x) => x.remove());
      const win = r.winner === 1 ? r.p1 : r.p2;
      const lose = r.winner === 1 ? r.p2 : r.p1;
      vic.classList.toggle('w1', r.winner === 1);
      vic.classList.toggle('w2', r.winner !== 1);
      const mw = mascotFor(win, players);
      const ml = mascotFor(lose, players);
      const W = q('.winner');
      const L = q('.loser');
      setMascot(W, mw, false, 1); // looks right, at the stairs
      setMascot(L, ml, true, -1); // looks left, at the winner
      q('.title').style.visibility = 'hidden'; // measured visible, shown later
      q('.title').style.opacity = '1';
      setName(win?.name ?? '', mw[3]);
      q('.title').style.opacity = '';
      q('.title').style.visibility = '';
      q('.info').textContent = [r.label, r.balls > 0 ? `+${r.balls} ball${r.balls === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ');

      const wb = W.querySelector('.vb');
      const wr = W.querySelector('.vr');
      const lb = L.querySelector('.vb');
      const lr = L.querySelector('.vr');
      const pos = { w: [-S - 40, GROUND], l: [X0 - S + 10, GROUND] };
      // forwards only: a delayed animation must not hold its first frame before it starts (it would override the ones before it)
      const opts = (duration, delay = 0, easing = 'linear') => ({ duration, delay, easing, fill: 'forwards' });
      // reset what the last show left
      [W, L, wb, wr, lb, lr].forEach((e) => { e.style.transform = ''; });
      W.style.transform = T(...pos.w);
      L.style.transform = T(pos.l[0], -S - 60); // above the screen till it drops in

      // 0: the staircase rises out of the floor, one step after another
      q('.vic').querySelectorAll('.step').forEach((s, k) => anim(s, [{ transform: 'translateY(110%)' }, { transform: 'translateY(-14px)', offset: 0.8 }, { transform: 'none' }],
        { ...opts(520, 80 + k * 90, 'ease-out'), fill: 'both' }));
      // the loser drops in at the foot of the stairs, the winner slides in from the left
      anim(L, [{ transform: T(pos.l[0], -S - 60) }, { transform: T(...pos.l) }], opts(450, 450, 'cubic-bezier(.5,0,1,.6)'));
      cue(900, () => dust(pos.l[0] + S / 2, FLOOR, 0.8));
      impact(900, 8);
      anim(lb, [{ transform: 'none' }, { transform: 'scale(1.15, .8)', offset: 0.3 }, { transform: 'none' }], opts(300, 900, 'ease-out'));
      const wx = 300;
      anim(W, [{ transform: T(...pos.w) }, { transform: T(wx + 30, GROUND) }, { transform: T(wx, GROUND) }], opts(600, 700, 'ease-out'));
      pos.w = [wx, GROUND];
      // they size each other up: a little bob
      anim(wr, [{ transform: 'none' }, { transform: 'translateY(-12px) rotate(4deg)' }, { transform: 'none' }], { duration: 700, delay: 1300, iterations: 2, easing: 'ease-in-out' });
      anim(lr, [{ transform: 'none' }, { transform: 'translateY(-10px) rotate(-4deg)' }, { transform: 'none' }], { duration: 760, delay: 1000, iterations: 2, easing: 'ease-in-out' });

      // 2.6 s: wind-up, a dash, the shove
      const TW = 2700;
      anim(wr, [{ transform: 'none' }, { transform: 'translateX(-30px) rotate(-12deg)' }], opts(320, TW, 'ease-out'));
      const TD = TW + 340;
      const hitX = pos.l[0] - S + 50;
      anim(W, [{ transform: T(...pos.w) }, { transform: T(hitX, GROUND) }], opts(200, TD, 'cubic-bezier(.6,0,1,.7)'));
      anim(wr, [{ transform: 'translateX(-30px) rotate(-12deg)' }, { transform: 'translateX(20px) rotate(14deg)' }, { transform: 'none' }], opts(500, TD, 'ease-out'));
      const TH = TD + 200; // contact
      pos.w = [hitX - 30, GROUND];
      anim(W, [{ transform: T(hitX, GROUND) }, { transform: T(...pos.w) }], opts(300, TH, 'ease-out'));
      cue(TH - 60, () => pow(pos.l[0] + 40, GROUND + 80, ['SHOVE!', 'BYE!', 'OOF!', 'WHAM!'][Math.floor(Math.random() * 4)]));
      impact(TH, 22);
      // the loser flies back over the winner's head, spinning, and crashes on the floor at the left, lying on its side, head to the left
      const FLY = 1300;
      const land = [70, GROUND];
      const mid = [(pos.l[0] + land[0]) / 2, GROUND - 560];
      anim(L, [{ transform: T(...pos.l), easing: 'cubic-bezier(.2,.6,.5,1)' }, { transform: T(...mid), offset: 0.45, easing: 'cubic-bezier(.5,0,.8,.4)' },
        { transform: T(...land), offset: 0.85, easing: 'ease-out' }, { transform: T(land[0] - 20, land[1] - 40), offset: 0.93, easing: 'ease-in' }, { transform: T(land[0] - 30, land[1]) }],
      opts(FLY, TH));
      anim(lr, [{ transform: 'rotate(0)' }, { transform: 'rotate(-390deg)', offset: 0.85 }, { transform: 'rotate(-435deg)', offset: 0.93 }, { transform: 'rotate(-450deg)' }], opts(FLY, TH, 'ease-out'));
      const TL = TH + FLY * 0.85;
      cue(TL, () => dust(land[0] + S / 2, FLOOR, 1.1));
      impact(TL, 14);
      const dz = q('.dizzy');
      const dzAt = [land[0] - 30 + S / 2 - 80, GROUND + S * 0.35 - 70]; // over its head: it lies with the head to the left
      anim(dz, [{ transform: `${T(...dzAt)} rotate(0)`, opacity: 1 }, { transform: `${T(dzAt[0], dzAt[1] - 14)} rotate(-12deg)`, opacity: 1 }, { transform: `${T(...dzAt)} rotate(0)`, opacity: 1 }],
        { duration: 900, delay: TH + FLY, iterations: Infinity, easing: 'ease-in-out' });

      // the winner jumps up the stairs: three steps at once, then two
      const jump = (to, at, ms, peak, power) => {
        const from = pos.w;
        pos.w = to;
        anim(wb, [{ transform: 'none' }, { transform: 'scale(1.12, .8)' }], opts(200, at, 'ease-out')); // crouch
        anim(wb, [{ transform: 'scale(1.12, .8)' }, { transform: 'scale(.9, 1.12)', offset: 0.15 }, { transform: 'none', offset: 0.4 }, { transform: 'none', offset: 0.88 },
          { transform: 'scale(1.15, .82)', offset: 0.95 }, { transform: 'scale(1.15, .82)' }], opts(ms, at + 200));
        anim(wb, [{ transform: 'scale(1.15, .82)' }, { transform: 'none' }], opts(260, at + 200 + ms, 'ease-out'));
        anim(W, [{ transform: T(...from), easing: 'cubic-bezier(.3,.7,.6,1)' }, { transform: T((from[0] + to[0]) / 2, Math.min(from[1], to[1]) - peak), offset: 0.5, easing: 'cubic-bezier(.4,0,.7,.3)' },
          { transform: T(...to) }], opts(ms, at + 200));
        anim(wr, [{ transform: 'rotate(0)' }, { transform: 'rotate(-10deg)', offset: 0.3 }, { transform: 'rotate(6deg)', offset: 0.8 }, { transform: 'rotate(0)' }], opts(ms, at + 200));
        const t = at + 200 + ms * 0.95;
        cue(t, () => dust(to[0] + S / 2, to[1] + S - SINK, power > 20 ? 1 : 0.75));
        impact(t, power);
        return t;
      };
      const TJ1 = TL + 500;
      const l1 = jump(onStep(3), TJ1, 820, 230, 12);
      const top = jump(onStep(5), l1 + 450, 700, 200, 30);
      // on top it turns round to face the middle of the screen: the same picture mirrored, squashed through 0, no 3D.
      // (Not re-rendered: new emoji <img> made the TV show nothing for a second while it decoded them.)
      anim(W.querySelector('.mascot'), [{ transform: 'scaleX(1)', easing: 'ease-in' }, { transform: 'scaleX(0)', offset: 0.5, easing: 'ease-out' }, { transform: 'scaleX(-1)' }],
        opts(240, top + 350));

      // on top: the title slams in, confetti, and the winner bounces till the end
      const title = q('.title');
      anim(title, [{ transform: 'scale(3) rotate(-6deg)', opacity: 0, easing: 'cubic-bezier(.6,0,.9,.5)' }, { transform: 'scale(.92) rotate(2deg)', opacity: 1, offset: 0.7 },
        { transform: 'none', opacity: 1 }], opts(380, top - 200));
      impact(top + 120, 20);
      anim(q('.crown'), [{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 1400, delay: top + 400, iterations: Infinity, easing: 'ease-in-out' });
      anim(q('.sun'), [{ opacity: 0.16 }, { opacity: 0.34 }], opts(400, top));
      q('.confetti').querySelectorAll('i').forEach((c) => {
        c.style.left = `${rand(0, 1900)}px`;
        c.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];
        const dx = rand(-160, 160);
        const spin = rand(360, 1080) * (Math.random() < 0.5 ? -1 : 1);
        anim(c, [{ transform: 'translate(0, 0) rotate(0)', opacity: 1 }, { transform: `translate(${dx}px, 1140px) rotate(${spin}deg)`, opacity: 1 }],
          { duration: rand(2600, 4400), delay: top + rand(0, 2600), iterations: Infinity, easing: 'linear', fill: 'backwards' });
      });
      const bounce = (at, n) => {
        if (at > ms - 900) return;
        const flip = n % 3 === 2;
        const up = flip ? 230 : 140;
        const BMS = flip ? 800 : 560;
        anim(wb, [{ transform: 'none' }, { transform: 'scale(1.1, .85)', offset: 0.12 }, { transform: 'scale(.92, 1.1)', offset: 0.25 }, { transform: 'none', offset: 0.45 },
          { transform: 'none', offset: 0.85 }, { transform: 'scale(1.12, .86)', offset: 0.93 }, { transform: 'none' }], opts(BMS + 160, at));
        // eased leg by leg, the whole on a linear clock: it touches down at 0.92 of the time, with its squash and the dust
        // (an easing over the whole animation brought the landing forward and the dust came late)
        anim(W, [{ transform: T(...pos.w), offset: 0.12, easing: 'cubic-bezier(.3,.7,.6,1)' }, { transform: T(pos.w[0], pos.w[1] - up), offset: 0.52, easing: 'cubic-bezier(.4,0,.7,.4)' },
          { transform: T(...pos.w), offset: 0.92 }, { transform: T(...pos.w) }], { duration: BMS + 160, delay: at, easing: 'linear', fill: 'forwards' });
        if (flip) anim(wr, [{ transform: 'rotate(0)', offset: 0.2 }, { transform: 'rotate(-360deg)', offset: 0.85 }, { transform: 'rotate(-360deg)' }], opts(BMS + 160, at, 'ease-in-out'));
        else anim(wr, [{ transform: 'rotate(0)' }, { transform: `rotate(${n % 2 ? 8 : -8}deg)`, offset: 0.5 }, { transform: 'rotate(0)' }], opts(BMS + 160, at, 'ease-in-out'));
        // a touch before it lands, like on the stairs: the puff takes a moment to swell (at the landing itself it looked late)
        cue(at + (BMS + 160) * 0.92 - 60, () => dust(pos.w[0] + S / 2, pos.w[1] + S - SINK, flip ? 0.8 : 0.6));
        bounce(at + BMS + 160 + rand(250, 500), n + 1);
      };
      bounce(top + 900, 0);

      // later the loser comes round: gets up on its feet, wobbles, and stands there sad
      const TU = Math.max(top + 4000, ms * 0.6);
      if (TU < ms - 2500) {
        anim(lr, [{ transform: 'rotate(-450deg)' }, { transform: 'rotate(-380deg)', offset: 0.4 }, { transform: 'rotate(-352deg)', offset: 0.7 }, { transform: 'rotate(-360deg)' }], opts(900, TU, 'ease-in-out'));
        anim(lb, [{ transform: 'none' }, { transform: 'scale(1, .9) rotate(-4deg)' }], opts(600, TU + 900, 'ease-in-out'));
        anim(lb, [{ transform: 'scale(1, .9) rotate(-4deg)' }, { transform: 'scale(1, .88) rotate(4deg)' }, { transform: 'scale(1, .9) rotate(-4deg)' }],
          { duration: 1800, delay: TU + 1500, iterations: Infinity, easing: 'ease-in-out' });
        anim(dz, [{ transform: T(...dzAt), opacity: 1 }, { transform: T(land[0] - 30 + S / 2 - 80, GROUND - 70), opacity: 1 }], opts(700, TU + 100, 'ease-in-out'))
          .finished.then(() => anim(dz, [{ transform: `${T(land[0] - 30 + S / 2 - 80, GROUND - 70)} rotate(0)`, opacity: 1 }, { transform: `${T(land[0] - 30 + S / 2 - 80, GROUND - 84)} rotate(-12deg)`, opacity: 1 },
            { transform: `${T(land[0] - 30 + S / 2 - 80, GROUND - 70)} rotate(0)`, opacity: 1 }], { duration: 900, iterations: Infinity, easing: 'ease-in-out' }), () => {});
      }
      anim(q('.bar'), [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: ms, easing: 'linear', fill: 'forwards' });
    },
    hide() {
      running.forEach((a) => a.cancel());
      running = [];
      timers.forEach(clearTimeout);
      timers = [];
    },
  };
}
