/* =========================================================
   Nanofinity — Gold Dot Swarm
   One fixed full-screen canvas behind the page. ~1,600 gold dots
   (1,100 on phones) spring between formations declared by
   sections via data-swarm="…":
     hero      golden pearl Fibonacci spiral (hover → NANOFINITY)
     services  four mini Fibonacci spirals behind the pillars
     bot-lab   connected bot network around a hub
     compound  Fibonacci squares + golden spiral
     story     sunflower phyllotaxis bloom
     process   four clusters, each 1.618× the area of the last
     contact   flowing infinity loop
     footer    giant shimmering dotted NANOFINITY
   ========================================================= */
(function () {
  "use strict";
  const canvas = document.getElementById("swarm");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const hero = document.querySelector(".hero");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(pointer: fine)").matches;

  const PHI = (1 + Math.sqrt(5)) / 2;
  const B = Math.log(PHI) / Math.PI;          // r × φ every half turn
  const GA = Math.PI * (3 - Math.sqrt(5));    // golden angle
  const SQ = Math.sqrt(1 + B * B);
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  function smooth(x) { x = clamp(x); return x * x * (3 - 2 * x); }

  // ---------- sprites ----------
  function sprite(size, draw) { const c = document.createElement("canvas"); c.width = c.height = size; draw(c.getContext("2d"), size); return c; }
  const sphere = sprite(128, (g, S) => {
    const h = S / 2;
    let gr = g.createRadialGradient(S * 0.37, S * 0.33, 0, h, h, h);
    [[0, "#fff8e0"], [0.1, "#fbe4a2"], [0.32, "#e6c158"], [0.58, "#c09031"], [0.82, "#7a5416"], [1, "#2a1b06"]].forEach(([o, c]) => gr.addColorStop(o, c));
    g.fillStyle = gr; g.beginPath(); g.arc(h, h, h - 1, 0, TAU); g.fill();
    g.globalCompositeOperation = "source-atop";
    gr = g.createRadialGradient(S * 0.68, S * 0.76, 0, S * 0.68, S * 0.76, S * 0.3);
    gr.addColorStop(0, "rgba(255,196,110,0.55)"); gr.addColorStop(1, "rgba(255,196,110,0)");
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    gr = g.createRadialGradient(S * 0.35, S * 0.3, 0, S * 0.35, S * 0.3, S * 0.16);
    gr.addColorStop(0, "rgba(255,255,255,0.95)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
  });
  const dot = sprite(32, (g, S) => {
    const gr = g.createRadialGradient(S * 0.42, S * 0.4, 0, S / 2, S / 2, S / 2);
    gr.addColorStop(0, "#fff3cf"); gr.addColorStop(0.45, "#e9c766"); gr.addColorStop(0.85, "rgba(190,145,50,0.9)"); gr.addColorStop(1, "rgba(160,120,40,0)");
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
  });
  const glint = sprite(128, (g, S) => {
    const gr = g.createRadialGradient(S * 0.36, S * 0.31, 0, S * 0.36, S * 0.31, S * 0.34);
    gr.addColorStop(0, "rgba(255,255,245,1)"); gr.addColorStop(0.35, "rgba(255,240,200,0.5)"); gr.addColorStop(1, "rgba(255,230,170,0)");
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
  });
  const shadow = sprite(64, (g, S) => {
    const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    gr.addColorStop(0, "rgba(0,0,0,0.75)"); gr.addColorStop(0.55, "rgba(0,0,0,0.35)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
  });
  const glow = sprite(64, (g, S) => {
    const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    gr.addColorStop(0, "rgba(255,200,110,0.9)"); gr.addColorStop(0.3, "rgba(255,170,70,0.35)"); gr.addColorStop(1, "rgba(255,150,50,0)");
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
  });

  // ---------- particles ----------
  let W = 0, H = 0, DPR = 1, N = 0;
  let px, py, vx, vy, ps, pa, tx, ty, ts, ta, tg, tsh, hx, hy;
  function alloc(n) {
    N = n;
    const F = () => new Float32Array(n);
    px = F(); py = F(); vx = F(); vy = F(); ps = F(); pa = F();
    tx = F(); ty = F(); ts = F(); ta = F(); tg = F(); tsh = F(); hx = F(); hy = F();
    for (let i = 0; i < n; i++) {
      px[i] = Math.random() * W; py[i] = Math.random() * H;
      hx[i] = Math.random(); hy[i] = Math.random(); ps[i] = 1; pa[i] = 0;
    }
    caches.clear(); orders.clear();
    buildHero();
  }
  const caches = new Map();
  const orders = new Map();
  function shuffled(key) {
    if (orders.has(key)) return orders.get(key);
    const o = new Uint16Array(N);
    for (let i = 0; i < N; i++) o[i] = i;
    for (let i = N - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = o[i]; o[i] = o[j]; o[j] = t; }
    orders.set(key, o);
    return o;
  }
  function set(i, x, y, s, a, g = 0, sh = 0) { tx[i] = x; ty[i] = y; ts[i] = s; ta[i] = a; tg[i] = g; tsh[i] = sh; }
  // unassigned particles become faint drifting dust inside a box
  function dust(order, from, x, y, w, h, t, a = 0.13) {
    for (let j = from; j < N; j++) {
      const i = order[j];
      set(i, x + hx[i] * w + Math.sin(t * 0.4 + i) * 6, y + hy[i] * h + Math.cos(t * 0.33 + i * 1.7) * 6, 0.75, a);
    }
  }

  // ---------- text sampling (wordmarks) ----------
  function sampleText(text, w, h, weight, count) {
    const key = `txt|${text}|${w | 0}|${h | 0}|${count}`;
    if (caches.has(key)) return caches.get(key);
    const c = document.createElement("canvas");
    c.width = Math.max(10, w | 0); c.height = Math.max(10, h | 0);
    const g = c.getContext("2d");
    const font = (s) => `${weight} ${s}px Montserrat, "Outfit", system-ui, sans-serif`;
    g.font = font(100);
    if ("letterSpacing" in g) g.letterSpacing = "8px";
    const m = g.measureText(text);
    const fs = Math.min((c.width * 0.98) / (m.width / 100), c.height * 0.95);
    g.font = font(fs);
    if ("letterSpacing" in g) g.letterSpacing = `${fs * 0.08}px`;
    g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#000";
    g.fillText(text, c.width / 2, c.height / 2 + fs * 0.04);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let filled = 0;
    for (let k = 3; k < d.length; k += 16) if (d[k] > 128) filled += 4;
    let step = Math.max(1.6, Math.sqrt(filled / (0.95 * count))), pts = [];
    for (let it = 0; it < 6; it++) {
      pts = [];
      for (let y = step / 2; y < c.height; y += step)
        for (let x = step / 2; x < c.width; x += step)
          if (d[4 * ((y | 0) * c.width + (x | 0)) + 3] > 128) pts.push(x - c.width / 2, y - c.height / 2);
      if (pts.length / 2 <= count) break;
      step *= 1.012 * Math.sqrt(pts.length / 2 / (0.97 * count));
    }
    const res = { pts, n: pts.length / 2, step };
    caches.set(key, res);
    return res;
  }

  // ---------- HERO: golden pearl spiral ----------
  const ROWS = [
    { k: 1.0, size: 0.082, gap: 2.1 },
    { k: 0.79, size: 0.03, gap: 2.6 },
    { k: 0.66, size: 0.02, gap: 2.9 }
  ];
  // True logarithmic (golden) spiral: r = R_MIN·e^(B·θ), r × φ every half turn.
  // Every strand is self-similar (dot size ∝ r, spacing ∝ size), so pearls stay evenly packed from
  // the big outer pearls all the way down to tiny dots at the eye — no gaps, no flared tail, no ribbon.
  // Hero growth: r × 4.2 per turn → ~2.4 turns from the tiny eye to the outer pearls, leaving the
  // open negative space of the logo instead of many tight concentric rings.
  const HB = Math.log(4.2) / (2 * Math.PI), HSQ = Math.sqrt(1 + HB * HB);
  const R_MIN = 0.028, THETA_SPAN = Math.log(1 / R_MIN) / HB, BASE_ROT = Math.PI * 0.92;
  let pearls = [];
  const HC = { ox: 0, oy: 0, fit: 1 }; // recentre + fit the silhouette so it sits balanced in its circle
  // Conveyor flow: every strand is a ring of evenly spaced slots along θ ∈ [0, SPAN). Main pearls slide
  // inward (θ decreasing), the two fine trails slide outward. Because the spiral is self-similar
  // (size ∝ r, spacing ∝ r), shifting θ keeps the pattern perfectly even, and slots that wrap around do
  // so while invisible (shrunk to nothing at the eye / faded at the rim) so the loop never pops.
  const FLOW = [-0.1, 0.15, 0.13]; // rad/s per strand: − inward (nano), + outward (infinity)
  let flowOff = [0, 0, 0], warp = 1, lastHeroT = -1;
  function buildHero() {
    const rows = ROWS.map((row, s) => {
      const count = Math.max(8, Math.round(THETA_SPAN / ((row.gap * row.size) / HSQ))), dθ = THETA_SPAN / count, list = [];
      for (let j = 0; j < count; j++) {
        const θ = j * dθ, r = row.k * R_MIN * Math.exp(HB * θ);
        list.push({ s, k: row.k, rs: row.size, θ0: θ, θ: θ - THETA_SPAN, r, size: r * row.size, alpha: 1, last: θ });
      }
      return list;
    });
    // thin the fine trails evenly only if there are more slots than dots
    const c0 = rows[0].length, rest = rows.slice(1).reduce((a, r) => a + r.length, 0);
    const f = Math.min(1, (N - c0) / rest);
    pearls = rows[0].slice();
    rows.slice(1).forEach((r) => { const keep = Math.floor(r.length * f); for (let j = 0; j < keep; j++) pearls.push(r[Math.floor((j * r.length) / keep)]); });
    // bounding box of the whole silhouette (unrotated frame) → centre it and fit it to radius 1
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    pearls.forEach((p) => {
      const x = Math.cos(p.θ) * p.r, y = Math.sin(p.θ) * p.r, e = p.size;
      x0 = Math.min(x0, x - e); x1 = Math.max(x1, x + e); y0 = Math.min(y0, y - e); y1 = Math.max(y1, y + e);
    });
    HC.ox = -(x0 + x1) / 2; HC.oy = -(y0 + y1) / 2; HC.fit = 2 / Math.max(x1 - x0, y1 - y0);
    const byR = pearls.slice().sort((a, b) => a.r - b.r);
    byR.forEach((p, i) => {
      p.u = i / (byR.length - 1);
      const rr = 0.84 * Math.sqrt((i + 0.5) / byR.length), ang = i * GA;
      p.bx = Math.cos(ang) * rr; p.by = Math.sin(ang) * rr; p.bsize = 0.0095 + 0.009 * rr;
    });
  }
  const CAM = 3.2;
  function project(x, y, z, rx, ry, out) {
    const cY = Math.cos(ry), sY = Math.sin(ry), x1 = x * cY + z * sY, z1 = -x * sY + z * cY;
    const cX = Math.cos(rx), sX = Math.sin(rx), y1 = y * cX - z1 * sX, z2 = y * sX + z1 * cX;
    const p = CAM / (CAM - z2);
    out.x = x1 * p; out.y = y1 * p; out.p = p;
    return out;
  }

  let mode = "orbit";
  const energy = { orbit: 1, ripple: 0, pulse: 0, bloom: 0 };
  let rot = 0;
  const HS = { cx: 0, cy: 0, R: 0, scale: 0, rx: 0, ry: 0, spin: 0, eb: 0, w: 0 };
  const pr = { x: 0, y: 0, p: 1 };
  function heroGeom() {
    const r = hero.getBoundingClientRect();
    if (W < 900) {
      HS.R = Math.min(W * 0.33, 200);
      HS.cx = W * 0.5; HS.cy = r.top + 76 + HS.R * 1.12;
      const sb = Math.round(76 + HS.R * 2.2) + "px";
      if (hero.style.getPropertyValue("--spiral-bottom") !== sb) hero.style.setProperty("--spiral-bottom", sb);
    } else {
      HS.R = Math.min(r.height * 0.34, W * 0.215, 330);
      HS.cx = W * 0.7; HS.cy = r.top + r.height * 0.5;
    }
  }
  function heroPoint(x, y) {
    let z = -0.04 * (1 - Math.min(1, Math.hypot(x, y)));
    if (energy.ripple > 0.001) {
      const w = Math.sin(Math.hypot(x, y) * 16 - T * 3.4) * energy.ripple;
      z += w * 0.05; x *= 1 + w * 0.02; y *= 1 + w * 0.02;
    }
    project(x, y, z, HS.rx, HS.ry, pr);
    pr.x = HS.cx + pr.x * HS.scale; pr.y = HS.cy + pr.y * HS.scale;
    return pr;
  }
  const formations = {};
  formations.hero = function (t) {
    heroGeom();
    const breathe = 1 + Math.sin(t * 0.9) * 0.022 + energy.pulse * Math.sin(t * 2.2) * 0.018;
    HS.scale = HS.R * breathe;
    HS.rx = 0.1 + mouse.ny * 0.16 - HS.eb * 0.08;
    HS.ry = -0.1 + mouse.nx * 0.2 + HS.eb * 0.08;
    HS.spin = BASE_ROT + rot + energy.orbit * 0.12 * Math.sin(t * 0.55);
    const eb = HS.eb, pulsePhase = (t * 0.32) % 1.25, M = pearls.length;
    // hover warp: the vortex speeds up while the cursor is over the spiral, then eases back to cruise
    const dtH = lastHeroT < 0 ? 0 : Math.max(0, Math.min(0.05, t - lastHeroT)); lastHeroT = t;
    const over = mouse.on && Math.hypot(mouse.x - HS.cx, mouse.y - HS.cy) < HS.R * 1.15;
    warp = lerp(warp, over ? 1.9 : 1, Math.min(1, dtH * (over ? 3 : 1.4)));
    const calm = 1 - eb; // bloom freezes the conveyor into the sunflower
    for (let s2 = 0; s2 < 3; s2++) flowOff[s2] += FLOW[s2] * warp * calm * (reduce ? 0.2 : 1) * dtH;
    const cS = Math.cos(HS.spin), sS = Math.sin(HS.spin);
    for (let i = 0; i < N; i++) {
      if (i >= M) { // spare dots rest invisibly at the eye
        const p = heroPoint(HC.ox * HC.fit * cS - HC.oy * HC.fit * sS, HC.ox * HC.fit * sS + HC.oy * HC.fit * cS);
        set(i, p.x, p.y, 0.5, 0); continue;
      }
      const P = pearls[i];
      let θ = (P.θ0 + flowOff[P.s]) % THETA_SPAN; if (θ < 0) θ += THETA_SPAN;
      const wrapped = Math.abs(θ - P.last) > THETA_SPAN * 0.5; P.last = θ;
      const r = P.k * R_MIN * Math.exp(HB * θ), toRim = THETA_SPAN - θ;
      let size, a;
      if (P.s === 0) { // big pearls: materialise (scale + fade) at the rim, shrink to nothing at the eye
        const e = smooth(toRim / 1.5);
        size = r * P.rs * (0.2 + 0.8 * e); a = e * smooth(θ / 3);
      } else {         // fine trails: born at the eye, grow outward, fade out before the rim
        const e = smooth(toRim / 2.6);
        size = r * P.rs * (0.9 + 0.25 * (θ / THETA_SPAN)); a = 0.92 * e * smooth(θ / 3);
      }
      P.u = θ / THETA_SPAN;
      const θa = θ - THETA_SPAN, ang = θa + HS.spin;
      const ux = (Math.cos(θa) * r + HC.ox) * HC.fit, uy = (Math.sin(θa) * r + HC.oy) * HC.fit;
      let x = ux * cS - uy * sS, y = ux * sS + uy * cS;
      size *= HC.fit;
      if (eb > 0.001) {
        const ca = Math.cos(rot * 0.6), sa = Math.sin(rot * 0.6);
        const bx = P.bx * ca - P.by * sa, by = P.bx * sa + P.by * ca, sw = Math.sin(eb * Math.PI) * 0.6;
        const mx = lerp(x, bx, eb), my = lerp(y, by, eb), cs = Math.cos(sw), sn = Math.sin(sw);
        x = mx * cs - my * sn; y = mx * sn + my * cs; size = lerp(size, P.bsize, eb); a = lerp(a, 0.95, eb);
      }
      const p = heroPoint(x, y);
      let g = 0;
      if (energy.pulse > 0.001) {
        const d = (1 - P.u) - pulsePhase, d2 = (1 - P.u) - (pulsePhase - 0.5);
        g = (Math.exp(-(d * d) / 0.004) + 0.6 * Math.exp(-(d2 * d2) / 0.004)) * energy.pulse;
      }
      const sh = Math.pow(Math.max(0, Math.sin(ang - t * 1.3 + P.s * 0.4)), 10) * (0.9 - eb * 0.3);
      let qx = p.x, qy = p.y, lens = 0;
      if (mouse.on && !reduce) {
        // smooth, order-preserving lens: dots part gently around the cursor and catch the light — never fold
        const dx = qx - mouse.x, dy = qy - mouse.y, d2 = dx * dx + dy * dy, sg = 105;
        if (d2 < 9 * sg * sg) {
          const d = Math.sqrt(d2) || 1, hold = smooth((Math.hypot(ux, uy) - 0.12) / 0.4); // the eye stays calm
          lens = Math.exp(-d2 / (sg * sg)) * (0.4 + 0.6 * hold); // light catch near the cursor (push is physical, below)
        }
      }
      const pxs = size * HS.scale * p.p * (1 + g * 0.35 + lens * 0.12);
      // tiniest dots at the eye: fade smoothly instead of piling up into a blob
      set(i, qx, qy, Math.max(0.35, pxs), a * smooth((pxs - 0.3) / 0.5), g, Math.min(1, sh + lens * 0.55));
      if (wrapped) { px[i] = qx; py[i] = qy; vx[i] = 0; vy[i] = 0; pa[i] = 0; ps[i] = 0.35; }
    }
  };

  // ---------- SERVICES: four mini Fibonacci spirals ----------
  function miniSpiral(n) {
    const key = "mini|" + n;
    if (caches.has(key)) return caches.get(key);
    const strands = [{ k: 1, w: 0.46, a: 0.95 }, { k: 0.82, w: 0.3, a: 0.75 }, { k: 0.68, w: 0.24, a: 0.6 }];
    const r0 = 0.1, span = Math.log(1 / r0) / B, out = [];
    strands.forEach((st) => {
      const c = Math.max(8, Math.round(n * st.w)), dθ = span / c;
      for (let j = 0; j < c && out.length < n; j++) {
        const θ = j * dθ, r = st.k * r0 * Math.exp(B * θ);
        out.push({ θ: θ - span, r, sz: 0.42 * r * dθ * SQ, a: st.a * smooth(θ / 2) * (0.55 + 0.45 * smooth((span - θ) / 3)) });
      }
    });
    caches.set(key, out);
    return out;
  }
  formations.services = function (t) {
    const cards = document.querySelectorAll(".service"), o = shuffled("services"), per = Math.floor(N / Math.max(1, cards.length));
    let j = 0;
    cards.forEach((card, k) => {
      const r = card.getBoundingClientRect(), narrow = r.width > 0 && W < 700;
      // phones: tuck a smaller spiral into the card's top-right corner, clear of the copy
      // spiral sits in the card's top-right corner (behind the number/icon row), clear of the copy
      const R = narrow ? Math.min(r.width * 0.26, 96) : Math.min(r.width * 0.36, 104);
      const cx = r.right - R * (narrow ? 1.05 : 0.95);
      const cy = r.top + R * (narrow ? 1.05 : 0.88);
      const pts = miniSpiral(per), dir = k % 2 ? -1 : 1, spin = BASE_ROT + k * 1.3 + dir * t * 0.12;
      for (const q of pts) {
        const a = q.θ * dir + spin, br = 1 + Math.sin(t * 0.9 + k) * 0.02;
        const sh = Math.pow(Math.max(0, Math.sin(a - t * 1.1)), 12);
        set(o[j++], cx + Math.cos(a) * q.r * R * br, cy + Math.sin(a) * q.r * R * br, Math.max(0.8, q.sz * R), q.a, 0, sh * 0.8);
      }
    });
    const first = cards[0] && cards[0].getBoundingClientRect();
    dust(o, j, 0, first ? first.top - 80 : 0, W, first ? first.height + 160 : H, t, 0.08);
  };

  // ---------- BOT LAB: connected network around a hub ----------
  let scenario = 0;
  function network(w, h, sc) {
    const key = `net|${w | 0}|${h | 0}|${sc}|${N}`;
    if (caches.has(key)) return caches.get(key);
    let seed = 7 + sc * 31; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const K = [6, 7, 5, 8][sc % 4], hubR = Math.min(w, h) * 0.11, sats = [], pts = [];
    for (let k = 0; k < K; k++) {
      const ang = sc * 0.7 + (k / K) * TAU + (rnd() - 0.5) * 0.35, rr = 0.78 + rnd() * 0.22;
      sats.push({ x: Math.cos(ang) * w * 0.44 * rr, y: Math.sin(ang) * h * 0.4 * rr, r: 6 + rnd() * 5 });
    }
    const edges = sats.map((s, k) => ({ a: { x: 0, y: 0 }, b: s, k }));
    if (sc % 2 === 0) sats.forEach((s, k) => edges.push({ a: s, b: sats[(k + 1) % K], k: K + k, ring: true }));
    const nHub = Math.floor(N * 0.16), nRing = Math.floor(N * 0.08), nSat = Math.floor(N * 0.2), nEdge = N - nHub - nRing - nSat;
    for (let m = 0; m < nHub; m++) { const r = hubR * Math.sqrt((m + 0.5) / nHub), a = m * GA; pts.push({ t: 0, x: Math.cos(a) * r, y: Math.sin(a) * r, s: 0.9 + (1 - r / hubR) * 1.1, a: 0.95 }); }
    for (let m = 0; m < nRing; m++) pts.push({ t: 1, ang: (m / nRing) * TAU, r: hubR * 1.75, s: 0.9, a: 0.6 });
    const perSat = Math.floor(nSat / K);
    sats.forEach((s, k) => { for (let m = 0; m < perSat; m++) { const r = s.r * Math.sqrt((m + 0.5) / perSat), a = m * GA; pts.push({ t: 2, k, x: s.x + Math.cos(a) * r, y: s.y + Math.sin(a) * r, s: 1.1, a: 0.9 }); } });
    const lens = edges.map((e) => Math.hypot(e.b.x - e.a.x, e.b.y - e.a.y) * (e.ring ? 0.6 : 1)), L = lens.reduce((a, b) => a + b, 0);
    edges.forEach((e, k) => {
      const c = Math.round((nEdge * lens[k]) / L);
      for (let m = 0; m < c; m++) {
        const u = (m + 0.5) / c;
        const ax = e.a === e.b ? 0 : e.a.x, ay = e.a.y;
        if (!e.ring && Math.hypot(lerp(ax, e.b.x, u), lerp(ay, e.b.y, u)) < hubR * 1.9) continue;
        pts.push({ t: 3, k, u, x: lerp(ax, e.b.x, u), y: lerp(ay, e.b.y, u), s: e.ring ? 0.7 : 0.85, a: e.ring ? 0.4 : 0.65 });
      }
    });
    const res = { pts, sats, hubR };
    caches.set(key, res);
    return res;
  }
  let labRegion = null;
  function botRegion() {
    const sec = document.getElementById("bot-lab");
    if (!sec) return null;
    const head = sec.querySelector(".section__head"), cont = sec.querySelector(".container");
    const hr = head.getBoundingClientRect(), cr = cont.getBoundingClientRect();
    const x0 = hr.left + Math.min(hr.width, 760) + 40;
    if (cr.right - x0 > 260) return { x: x0, y: hr.top - 30, w: cr.right - x0, h: hr.height + 60, a: 1 };
    return { x: hr.left, y: hr.top - 20, w: hr.width, h: hr.height + 40, a: 0.32 }; // narrow: dim behind copy
  }
  formations["bot-lab"] = function (t) {
    const R = (labRegion = botRegion());
    if (!R) return;
    const net = network(R.w, R.h, scenario), o = shuffled("net"), cx = R.x + R.w / 2, cy = R.y + R.h / 2;
    const pts = net.pts;
    for (let j = 0; j < pts.length && j < N; j++) {
      const q = pts[j], i = o[j];
      let x, y, g = 0;
      if (q.t === 1) { const a = q.ang + t * 0.25; x = Math.cos(a) * q.r; y = Math.sin(a) * q.r * 0.92; }
      else if (q.t === 2) { x = q.x; y = q.y + Math.sin(t * 1.3 + q.k) * 3; }
      else { x = q.x; y = q.y; }
      if (q.t === 3) {
        const ph = (t * 0.45 + q.k * 0.17) % 1, d = q.u - ph;
        g = Math.exp(-(d * d) / 0.003);
        y += q.k !== undefined && net.sats[q.k] ? Math.sin(t * 1.3 + q.k) * 3 * q.u : 0;
      }
      if (q.t === 0) g = 0.25 + 0.25 * Math.sin(t * 2.4);
      set(i, cx + x, cy + y, q.s * (1 + g * 0.6), q.a * R.a * (1 + g * 0.5), g * R.a, 0);
    }
    dust(o, Math.min(pts.length, N), R.x, R.y, R.w, R.h, t, 0.06 * R.a);
  };

  // ---------- COMPOUND: Fibonacci squares + golden spiral ----------
  const FIB = (function () {
    const F = [1, 1, 2, 3, 5, 8, 13, 21], sq = [{ x: 0, y: 0, s: 1, cx: 1, cy: 0 }];
    let box = { x: 0, y: 0, w: 1, h: 1 };
    const dirs = ["right", "up", "left", "down"];
    for (let i = 1; i < F.length; i++) {
      const s = F[i], d = dirs[(i - 1) % 4]; let q;
      if (d === "right") q = { x: box.x + box.w, y: box.y, s, cx: box.x + box.w, cy: box.y };
      if (d === "up") q = { x: box.x, y: box.y - s, s, cx: box.x, cy: box.y };
      if (d === "left") q = { x: box.x - s, y: box.y, s, cx: box.x, cy: box.y + s };
      if (d === "down") q = { x: box.x, y: box.y + box.h, s, cx: box.x + s, cy: box.y + box.h };
      sq.push(q);
      const x0 = Math.min(box.x, q.x), y0 = Math.min(box.y, q.y);
      box = { x: x0, y: y0, w: Math.max(box.x + box.w, q.x + s) - x0, h: Math.max(box.y + box.h, q.y + s) - y0 };
    }
    // arcs: start at (0,0); each arc turns −90° about its square's centre corner
    const arcs = []; let sx = 0, sy = 0;
    sq.forEach((q) => { const a0 = Math.atan2(sy - q.cy, sx - q.cx); arcs.push({ cx: q.cx, cy: q.cy, r: q.s, a0 }); sx = q.cx + q.s * Math.cos(a0 - Math.PI / 2); sy = q.cy + q.s * Math.sin(a0 - Math.PI / 2); });
    const len = arcs.map((a) => (a.r * Math.PI) / 2), total = len.reduce((a, b) => a + b, 0);
    return { sq, arcs, len, total };
  })();
  function fibPoints() {
    const key = "fib|" + N;
    if (caches.has(key)) return caches.get(key);
    const pts = [], nSpiral = Math.floor(N * 0.58), per = FIB.sq.reduce((a, q) => a + q.s * 4, 0), nSq = N - nSpiral;
    for (let m = 0; m < nSpiral; m++) {
      let d = ((m + 0.5) / nSpiral) * FIB.total, k = 0;
      while (d > FIB.len[k] && k < FIB.arcs.length - 1) d -= FIB.len[k++];
      const A = FIB.arcs[k], ang = A.a0 - (d / FIB.len[k]) * (Math.PI / 2);
      pts.push({ x: A.cx + A.r * Math.cos(ang), y: A.cy + A.r * Math.sin(ang), f: (m + 0.5) / nSpiral, sp: 1 });
    }
    FIB.sq.forEach((q) => {
      const c = Math.round((nSq * q.s * 4) / per);
      for (let m = 0; m < c; m++) {
        const u = (m / c) * 4, side = Math.floor(u), f = u - side;
        const corners = [[q.x, q.y], [q.x + q.s, q.y], [q.x + q.s, q.y + q.s], [q.x, q.y + q.s], [q.x, q.y]];
        pts.push({ x: lerp(corners[side][0], corners[side + 1][0], f), y: lerp(corners[side][1], corners[side + 1][1], f), sp: 0 });
      }
    });
    caches.set(key, pts);
    return pts;
  }
  formations.compound = function (t) {
    const svg = document.getElementById("fibSvg");
    if (!svg) return;
    const r = svg.getBoundingClientRect(), s = Math.min(r.width / 36, r.height / 23);
    const ox = r.left + (r.width - 36 * s) / 2 + 25 * s, oy = r.top + (r.height - 23 * s) / 2 + 16 * s;
    const pts = fibPoints(), o = shuffled("fib"), ph = (t * 0.12) % 1.3;
    for (let j = 0; j < pts.length && j < N; j++) {
      const q = pts[j];
      if (q.sp) {
        const d = q.f - ph, g = Math.exp(-(d * d) / 0.002);
        set(o[j], ox + q.x * s, oy + q.y * s, (1.1 + q.f * 1.3) * (1 + g * 0.6), 0.95, g, g * 0.6);
      } else {
        const tw = 0.3 + 0.15 * Math.sin(t * 2 + j);
        set(o[j], ox + q.x * s, oy + q.y * s, 0.8, tw);
      }
    }
    dust(o, Math.min(pts.length, N), r.left, r.top, r.width, r.height, t, 0.05);
  };

  // ---------- STORY: sunflower phyllotaxis ----------
  // Golden-angle playground: the divergence angle comes from the slider in the Studio section.
  let storyAngle = 137.50776 * Math.PI / 180, storyGlow = 0, storyLastT = -1;
  formations.story = function (t) {
    const st = document.getElementById("phiStage");
    if (!st) return;
    const r = st.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const Rs = Math.min(r.width, r.height) * 0.47, o = shuffled("story"), sp = Rs * Math.sqrt(Math.PI / N);
    const dtS = storyLastT < 0 ? 0 : Math.max(0, Math.min(0.05, t - storyLastT)); storyLastT = t;
    storyGlow = Math.max(0, storyGlow - dtS * 0.6);
    const spin = t * 0.04, base = Math.min(2.6, sp * 0.4);
    for (let j = 0; j < N; j++) {
      const rr = Math.sqrt((j + 0.5) / N), a = j * storyAngle + spin, br = 1 + 0.02 * Math.sin(t * 1.1 - rr * 7);
      const sh = Math.pow(Math.max(0, Math.sin(rr * 9 - t * 1.4)), 8);
      // celebratory gold ripple travelling outward after a good "Lock In"
      const ring = storyGlow > 0 ? Math.exp(-Math.pow((rr - (1 - storyGlow) * 1.3) / 0.08, 2)) * storyGlow : 0;
      set(o[j], cx + Math.cos(a) * rr * Rs * br, cy + Math.sin(a) * rr * Rs * br, base * (0.72 + rr * 0.5) * (1 + ring * 0.8), 0.55 + 0.4 * rr + ring * 0.3, sh * 0.3 + ring, sh * 0.5 + ring);
    }
  };

  // ---------- PROCESS: four clusters, area × φ each ----------
  formations.process = function (t) {
    const orbs = document.querySelectorAll(".step__orb"), o = shuffled("process");
    if (!orbs.length) return;
    const wts = [1, PHI, PHI * PHI, PHI * PHI * PHI], sum = wts.reduce((a, b) => a + b, 0), base = W < 640 ? 34 : 38;
    let j = 0;
    orbs.forEach((orb, k) => {
      const r = orb.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const R = base * Math.pow(PHI, k / 2), n = k === orbs.length - 1 ? N - j : Math.floor((N * wts[k]) / sum), rin = 0.6;
      const sp = R * Math.sqrt((Math.PI * (1 - rin * rin)) / n), dir = k % 2 ? -1 : 1;
      for (let m = 0; m < n; m++) {
        const rr = R * Math.sqrt(rin * rin + (1 - rin * rin) * ((m + 0.5) / n)), a = m * GA + dir * t * 0.18;
        const br = 1 + 0.03 * Math.sin(t * 1.6 - k * 0.8);
        set(o[j++], cx + Math.cos(a) * rr * br, cy + Math.sin(a) * rr * br, Math.min(1.8, sp * 0.32), 0.55 + 0.4 * (rr / R), 0, 0);
      }
    });
  };

  // ---------- CONTACT: flowing infinity loop ----------
  formations.contact = function (t) {
    const st = document.querySelector(".contact__stage");
    if (!st) return;
    const r = st.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const a = Math.min(r.width * 0.42, r.height / 0.8), o = shuffled("contact"), S = 7, per = Math.floor(N / S);
    const lem = (u) => { const th = u * TAU, s = Math.sin(th), c = Math.cos(th), d = 1 + s * s; return [a * c / d, a * s * c / d]; };
    let j = 0;
    for (let k = 0; k < S; k++) {
      const off = (k - (S - 1) / 2) * Math.max(3, a * 0.014), sp = 0.02 + k * 0.0015;
      for (let m = 0; m < per; m++) {
        const u = (m / per + t * sp) % 1, [x, y] = lem(u), [x2, y2] = lem(u + 0.001);
        let nx = -(y2 - y), ny = x2 - x; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
        const wave = Math.sin(u * TAU * 3 - t * 1.5) * 2;
        const sh = Math.pow(Math.max(0, Math.sin(u * TAU * 2 - t * 2)), 14);
        const edge = 1 - Math.abs(k - (S - 1) / 2) / ((S + 1) / 2);
        set(o[j++], cx + x + nx * (off + wave), cy + y + ny * (off + wave), 0.8 + edge * 1.1, 0.35 + edge * 0.6, sh * 0.5, sh);
      }
    }
    dust(o, j, r.left, r.top, r.width, r.height, t, 0.08);
  };

  // ---------- FOOTER: giant dotted NANOFINITY ----------
  formations.footer = function (t) {
    const el = document.querySelector(".footer__giant");
    if (!el) return;
    const r = el.getBoundingClientRect(), s = sampleText("NANOFINITY", r.width, r.height, 700, N), o = shuffled("footer");
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (let j = 0; j < s.n; j++) {
      const x = s.pts[j * 2], y = s.pts[j * 2 + 1], i = o[j];
      const sh = Math.pow(Math.max(0, Math.sin((x / r.width) * 4 - t * 1.2)), 6);
      const tw = 0.08 * Math.sin(t * 3 + i * 1.7);
      set(i, cx + x, cy + y, s.step * 0.42 * (1 + sh * 0.25), 0.68 + sh * 0.32 + tw, sh * 0.3, sh * 0.8);
    }
    dust(o, s.n, r.left, r.top, r.width, r.height, t, 0.06);
  };

  // ---------- formation selection ----------
  let current = "hero";
  function pick() {
    const mid = H * 0.5, foot = document.querySelector("footer");
    if (foot && foot.getBoundingClientRect().top < H * 0.72) return setForm("footer");
    let best = null, bh = Infinity;
    document.querySelectorAll("[data-swarm]").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid && r.height < bh) { best = el; bh = r.height; }
    });
    if (best) setForm(best.dataset.swarm);
  }
  function setForm(k) {
    if (k === current || !formations[k]) return;
    current = k;
  }

  // ---------- input ----------
  const mouse = { x: -9999, y: -9999, px: -9999, py: -9999, v: 0, nx: 0, ny: 0, tx: 0, ty: 0, on: false };
  const rings = [];
  addEventListener("pointermove", (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = e.pointerType === "mouse";
    mouse.tx = (e.clientX / W) * 2 - 1; mouse.ty = (e.clientY / H) * 2 - 1;
  }, { passive: true });
  document.addEventListener("pointerleave", () => { mouse.on = false; mouse.x = mouse.y = -9999; mouse.tx = mouse.ty = 0; });
  addEventListener("pointerdown", (e) => {
    if (e.target.closest("a,button,input,select,textarea,label")) return;
    rings.push({ x: e.clientX, y: e.clientY, r: 0 });
  });
  document.querySelectorAll(".hero__modes .mode").forEach((b, _, all) => b.addEventListener("click", () => {
    mode = b.dataset.mode;
    all.forEach((o) => { const on = o === b; o.classList.toggle("is-active", on); o.setAttribute("aria-pressed", String(on)); });
    if (mode === "ripple") rings.push({ x: HS.cx, y: HS.cy, r: 0 });
  }));

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const n = W < 700 ? 1100 : 1600;
    if (n !== N) alloc(n); else caches.clear();
    heroGeom();
    pick();
  }
  let rz;
  addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(resize, 120); });
  addEventListener("scroll", pick, { passive: true });
  setInterval(pick, 600);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => caches.clear());

  // ---------- render ----------
  let T = 0, last = performance.now(), lastSY = scrollY, running = true;
  const ANCHORS = { hero: "#top", services: "#services", "bot-lab": "#bot-lab", compound: "#fibSvg", story: "#phiStage", process: "#process", contact: ".contact__stage", footer: ".footer__giant" };
  const anchorCache = {};
  const anchorEl = (k) => anchorCache[k] || (anchorCache[k] = document.querySelector(ANCHORS[k] || "body"));
  let anchorKey = null, anchorTop = null;


  function frame(now) {
    if (!running) return;
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    T += reduce ? dt * 0.15 : dt;
    const f = Math.min(3, dt * 60);

    // Move the swarm rigidly with whatever it is drawn on (no smear). We follow the formation's anchor
    // element rather than raw scrollY, so while #compound is pinned (position: sticky) the dots stay put
    // instead of being knocked up by every scroll tick and springing back (the old jitter).
    const sy = scrollY, dy = sy - lastSY;
    lastSY = sy;
    const an = anchorEl(current), aTop = an ? an.getBoundingClientRect().top : null;
    let shift = -dy;
    if (aTop !== null && anchorKey === current && anchorTop !== null) shift = aTop - anchorTop;
    anchorKey = current; anchorTop = aTop;
    if (shift) for (let i = 0; i < N; i++) py[i] += shift;

    for (const k in energy) energy[k] = lerp(energy[k], mode === k ? 1 : 0, Math.min(1, dt * 2.5));
    HS.eb = smooth(energy.bloom);
    HS.w = lerp(HS.w, current === "hero" ? 1 : 0, Math.min(1, dt * 4));
    rot += dt * (0.07 + energy.orbit * 0.16) * (reduce ? 0.3 : 1);
    mouse.nx = lerp(mouse.nx, mouse.tx, Math.min(1, dt * 3));
    mouse.ny = lerp(mouse.ny, mouse.ty, Math.min(1, dt * 3));

    formations[current](T);

    // physics: spring to target + damping (pull-and-settle)
    const heroOn = current === "hero";
    // hero: stiffer, under-damped springs so pushed pearls visibly overshoot and bounce back into place
    const k = reduce ? 0.22 : heroOn ? 0.085 : 0.045, damp = Math.pow(reduce ? 0.6 : heroOn ? 0.8 : 0.84, f);
    const MR = heroOn ? 150 : 120;
    const msp = Math.hypot(mouse.x - mouse.px, mouse.y - mouse.py) / Math.max(f, 0.001); mouse.px = mouse.x; mouse.py = mouse.y;
    mouse.v = lerp(mouse.v || 0, Math.min(60, mouse.on ? msp : 0), 0.35);
    const MF = heroOn ? 4.6 + mouse.v * 0.24 : 1.5;
    for (let r = rings.length - 1; r >= 0; r--) if ((rings[r].r += 16 * f) > Math.max(W, H) * 1.2) rings.splice(r, 1);
    for (let i = 0; i < N; i++) {
      let ax = (tx[i] - px[i]) * k, ay = (ty[i] - py[i]) * k;
      if (mouse.on && !reduce) {
        const dx = px[i] - mouse.x, dy2 = py[i] - mouse.y, d2 = dx * dx + dy2 * dy2;
        if (d2 < MR * MR) { const d = Math.sqrt(d2) || 1, u = (MR - d) / MR, s = (heroOn ? u * u : u) * MF; ax += (dx / d) * s; ay += (dy2 / d) * s; }
      }
      for (const rg of rings) {
        const dx = px[i] - rg.x, dy2 = py[i] - rg.y, d = Math.hypot(dx, dy2) || 1;
        if (Math.abs(d - rg.r) < 26) { const F = current === "hero" ? 2.6 : 6; ax += (dx / d) * F; ay += (dy2 / d) * F; }
      }
      vx[i] = (vx[i] + ax * f) * damp; vy[i] = (vy[i] + ay * f) * damp;
      px[i] += vx[i] * f; py[i] += vy[i] * f;
      ps[i] += (ts[i] - ps[i]) * Math.min(1, 0.14 * f);
      pa[i] += (ta[i] - pa[i]) * Math.min(1, 0.1 * f);
    }

    // draw
    ctx.clearRect(0, 0, W, H);
    // hero backlight halo
    if (HS.w > 0.01 || current === "hero") {
      const hw = current === "hero" ? 1 : HS.w, R = HS.scale * 1.45;
      if (HS.cy + R > 0 && HS.cy - R < H) {
        const halo = (0.55 + Math.sin(T * 0.9) * 0.08 + energy.pulse * 0.12) * hw;
        const hg = ctx.createRadialGradient(HS.cx, HS.cy, 0, HS.cx, HS.cy, R);
        hg.addColorStop(0, `rgba(255,170,70,${0.18 * halo})`); hg.addColorStop(0.45, `rgba(255,150,60,${0.08 * halo})`); hg.addColorStop(1, "rgba(255,140,50,0)");
        ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 1; ctx.fillStyle = hg;
        ctx.fillRect(HS.cx - R, HS.cy - R, R * 2, R * 2);
        ctx.globalCompositeOperation = "source-over";
      }
    }
    // pass 1: shadows for big pearls
    for (let i = 0; i < N; i++) {
      const s = ps[i];
      if (s < 2.2 || pa[i] < 0.02 || py[i] < -60 || py[i] > H + 60) continue;
      const z = s * 2.7; ctx.globalAlpha = 0.5 * pa[i];
      ctx.drawImage(shadow, px[i] - z / 2 + s * 0.35, py[i] - z / 2 + s * 0.55, z, z);
    }
    // pass 2: centre curl (hero spiral only)
    // pass 3: warm glow
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < N; i++) {
      if (pa[i] < 0.02 || py[i] < -60 || py[i] > H + 60) continue;
      const sp = Math.min(1, Math.hypot(vx[i], vy[i]) / 7), s = ps[i];
      if (s < 1.4 && tg[i] < 0.05 && sp < 0.25) continue;
      const z = (s + sp * 1.5) * (3.2 + tg[i] * 3);
      ctx.globalAlpha = Math.min(1, 0.12 + tg[i] * 0.55 + sp * 0.35) * pa[i];
      ctx.drawImage(glow, px[i] - z / 2, py[i] - z / 2, z, z);
    }
    ctx.globalCompositeOperation = "source-over";
    // pass 4: dots / pearls (+ glints)
    for (let i = 0; i < N; i++) {
      if (pa[i] < 0.02 || py[i] < -40 || py[i] > H + 40 || px[i] < -40 || px[i] > W + 40) continue;
      const sp = Math.min(1, Math.hypot(vx[i], vy[i]) / 7);
      const s = ps[i] + sp * 1.2, z = s * 2;
      ctx.globalAlpha = Math.min(1, pa[i] + sp * 0.35);
      ctx.drawImage(s < 1.7 ? dot : sphere, px[i] - z / 2, py[i] - z / 2, z, z);
      const sh = tsh[i] + tg[i] * 0.6;
      if (sh > 0.03 && s > 1.2) {
        ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.min(1, sh) * pa[i];
        ctx.drawImage(glint, px[i] - z / 2, py[i] - z / 2, z, z);
        ctx.globalCompositeOperation = "source-over";
      }
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) running = false;
    else if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
  });

  resize();
  requestAnimationFrame(frame);

  window.NanoSwarm = {
    setMode: (m) => { mode = m; },
    setScenario(k) {
      scenario = k;
      if (labRegion) rings.push({ x: labRegion.x + labRegion.w / 2, y: labRegion.y + labRegion.h / 2, r: 0 });
    },
    shock(x, y) { rings.push({ x, y, r: 0 }); },
    setStoryAngle(deg) { storyAngle = deg * Math.PI / 180; },
    celebrate() { storyGlow = 1; const st = document.getElementById("phiStage"); if (st) { const r = st.getBoundingClientRect(); rings.push({ x: r.left + r.width / 2, y: r.top + r.height / 2, r: 0 }); } },
    get formation() { return current; },
    // QA helper: fastest visible dot (px/frame) and current hover-warp factor
    stats() { let m = 0; for (let i = 0; i < N; i++) if (pa[i] > 0.08) m = Math.max(m, Math.hypot(vx[i], vy[i])); return { maxVisibleSpeed: m, warp }; }
  };
})();
