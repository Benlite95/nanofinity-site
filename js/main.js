/* =========================================================
   Nanofinity — site interactions
   ========================================================= */

/* ---------------------------------------------------------
   CONFIG — edit these to go live (see README.md)
   contactEmail:       shown on the page + used for mailto fallback
   formEndpoint:       e.g. "https://formspree.io/f/XXXXXXX" or your own API.
                       Leave "" to fall back to opening the visitor's email app.
   newsletterEndpoint: e.g. a Formspree form, Buttondown, ConvertKit or your API.
--------------------------------------------------------- */
const NANO_CONFIG = Object.assign(
  {
    contactEmail: "hello@nanofinity.io", // PLACEHOLDER — replace with your real address
    formEndpoint: "",
    newsletterEndpoint: ""
  },
  window.NANO_CONFIG || {}
);

(function () {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SVGNS = "http://www.w3.org/2000/svg";
  const svgEl = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

  /* ---------- Contact email from config ---------- */
  $$("[data-email]").forEach((el) => (el.textContent = NANO_CONFIG.contactEmail));
  $$('a[href^="mailto:"]').forEach((a) => (a.href = "mailto:" + NANO_CONFIG.contactEmail));

  /* ---------- Nav ---------- */
  const nav = $("#nav");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 24);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const toggle = $("#navToggle"), links = $("#navLinks");
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    links.classList.toggle("is-open", open);
  });
  $$("a", links).forEach((a) => a.addEventListener("click", () => {
    toggle.setAttribute("aria-expanded", "false");
    links.classList.remove("is-open");
  }));

  // current-section highlight
  const navMap = new Map($$(".nav__links a[href^='#']:not(.btn)").map((a) => [a.getAttribute("href").slice(1), a]));
  if ("IntersectionObserver" in window) {
    const so = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          navMap.forEach((a) => a.classList.remove("is-current"));
          const a = navMap.get(en.target.id);
          if (a) a.classList.add("is-current");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    navMap.forEach((_, id) => { const s = document.getElementById(id); if (s) so.observe(s); });
  }

  /* ---------- Reveal on scroll ---------- */
  const revealEls = $$(".reveal, .divider");
  // dividers are thin, so reveal them as soon as any part enters the viewport
  if ("IntersectionObserver" in window && !reduceMotion) {
    const ro = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); ro.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    const dro = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-visible"); dro.unobserve(en.target); } });
    }, { threshold: 0, rootMargin: "0px 0px -15% 0px" });
    revealEls.forEach((el) => (el.classList.contains("divider") ? dro : ro).observe(el));
  } else revealEls.forEach((el) => el.classList.add("is-visible"));

  /* ---------- Fibonacci / golden spiral geometry ---------- */
  // Squares 1,1,2,3,5,8,13,21 placed right, up, left, down… with quarter-arcs.
  function fibonacci(n) {
    const F = [1, 1];
    while (F.length < n) F.push(F[F.length - 1] + F[F.length - 2]);
    const squares = [{ x: 0, y: 0, s: 1, cx: 1, cy: 0 }];
    let box = { x: 0, y: 0, w: 1, h: 1 };
    const dirs = ["right", "up", "left", "down"];
    for (let i = 1; i < n; i++) {
      const s = F[i], d = dirs[(i - 1) % 4];
      let sq;
      if (d === "right") sq = { x: box.x + box.w, y: box.y, s };
      if (d === "up") sq = { x: box.x, y: box.y - s, s };
      if (d === "left") sq = { x: box.x - s, y: box.y, s };
      if (d === "down") sq = { x: box.x, y: box.y + box.h, s };
      // arc centre per direction (derived so the arcs join continuously)
      if (d === "right") { sq.cx = sq.x; sq.cy = sq.y; }
      if (d === "up") { sq.cx = sq.x; sq.cy = sq.y + s; }
      if (d === "left") { sq.cx = sq.x + s; sq.cy = sq.y + s; }
      if (d === "down") { sq.cx = sq.x + s; sq.cy = sq.y; }
      squares.push(sq);
      const x0 = Math.min(box.x, sq.x), y0 = Math.min(box.y, sq.y);
      const x1 = Math.max(box.x + box.w, sq.x + s), y1 = Math.max(box.y + box.h, sq.y + s);
      box = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }
    // path: start at (0,0), each arc ends at the point the next arc starts
    const pts = [[0, 0], [1, 1]];
    for (let i = 1; i < n; i++) {
      const q = squares[i], [px, py] = pts[pts.length - 1];
      // the end point is the corner of q opposite the start, at distance s from the centre
      const sx = px - q.cx, sy = py - q.cy; // start vector (axis-aligned, length s)
      // rotate start vector by -90° (counter-clockwise on screen)
      pts.push([q.cx + sy, q.cy - sx]);
    }
    let d = "M0 0";
    pts.slice(1).forEach(([x, y], i) => { d += ` A${squares[i].s} ${squares[i].s} 0 0 0 ${x} ${y}`; });
    return { squares, d, box, F };
  }
  const FIB = fibonacci(8);

  // fit spiral path into a viewBox
  function fitPath(vbW, vbH, pad = 4, flip = false) {
    const { box } = FIB;
    const sc = Math.min((vbW - pad * 2) / box.w, (vbH - pad * 2) / box.h);
    const ox = (vbW - box.w * sc) / 2 - box.x * sc, oy = (vbH - box.h * sc) / 2 - box.y * sc;
    return FIB.d.replace(/([MA])([^MA]+)/g, (m, cmd, args) => {
      const n = args.trim().split(/\s+/).map(Number);
      if (cmd === "M") return `M${n[0] * sc + ox} ${n[1] * sc + oy}`;
      return ` A${n[0] * sc} ${n[1] * sc} 0 0 0 ${n[5] * sc + ox} ${n[6] * sc + oy}`;
    });
  }
  $$(".service__spiral .spiral-path").forEach((p) => {
    p.setAttribute("d", fitPath(100, 62, 2));
    p.style.setProperty("--len", p.getTotalLength());
  });
  $$(".divider__path").forEach((p) => {
    p.setAttribute("d", fitPath(340, 210, 6));
    p.style.setProperty("--len", p.getTotalLength());
  });

  /* ---------- Service card hover light ---------- */
  $$(".service").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });

  /* ---------- How Systems Compound ---------- */
  (function compound() {
    const svg = $("#fibSvg");
    if (!svg) return;
    const defs = svgEl("defs", {}, svg);
    const lg = svgEl("linearGradient", { id: "fibGrad", x1: "0", y1: "0", x2: "1", y2: "1" }, defs);
    [["0", "#f7e2a6"], ["0.5", "#d4af37"], ["1", "#a67c2e"]].forEach(([o, c]) => svgEl("stop", { offset: o, "stop-color": c }, lg));
    svg.insertBefore(defs, svg.firstChild);

    const gSq = $("#fibSquares");
    const sqEls = FIB.squares.map((q, i) => {
      const r = svgEl("rect", { x: q.x, y: q.y, width: q.s, height: q.s, class: "fib__sq" }, gSq);
      if (q.s >= 3) {
        const t = svgEl("text", { x: q.x + 0.35, y: q.y + 1.05, class: "fib__num" }, gSq);
        t.textContent = q.s;
      }
      return r;
    });
    const path = $("#fibPath"), glow = $("#fibGlow"), spark = $("#fibSpark");
    path.setAttribute("d", FIB.d); glow.setAttribute("d", FIB.d);
    const L = path.getTotalLength();
    [path, glow].forEach((p) => { p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });

    // cumulative arc lengths to place nodes on specific Fibonacci arcs
    const arcLen = FIB.squares.map((q) => (Math.PI / 2) * q.s);
    const cum = arcLen.reduce((a, l, i) => (a.push((a[i - 1] || 0) + l), a), []);
    const total = cum[cum.length - 1];
    const at = (arc, f) => ((cum[arc] - arcLen[arc]) + arcLen[arc] * f) / total;
    const nodes = [
      { label: "Strategy", f: at(3, 0.5), dx: 1.0, dy: 0.25, anchor: "start" },
      { label: "Custom Bots", f: at(5, 0.45), dx: 0, dy: 1.45, anchor: "middle" },
      { label: "AI Automation", f: at(6, 0.5), dx: 0, dy: -1.1, anchor: "middle" },
      { label: "Unified Systems", f: at(7, 0.62), dx: 1.0, dy: 0.3, anchor: "start" }
    ];
    const gN = $("#fibNodes");
    nodes.forEach((n) => {
      const pt = path.getPointAtLength(n.f * L);
      const g = svgEl("g", { class: "fib__node" }, gN);
      svgEl("circle", { cx: pt.x, cy: pt.y, r: 0.62, class: "dotc" }, g);
      svgEl("circle", { cx: pt.x, cy: pt.y, r: 0.3, class: "core" }, g);
      const t = svgEl("text", { x: pt.x + n.dx, y: pt.y + n.dy, "text-anchor": n.anchor }, g);
      t.textContent = n.label;
      n.el = g;
    });

    const stages = $$("#stages .stage");
    const bars = stages.map((s) => s.querySelector(".stage__bar b"));
    const words = $("#compoundLede");
    let wordSpans = [];
    if (words) {
      words.innerHTML = words.textContent.trim().split(/\s+/).map((w) => `<span class="wd">${w}</span>`).join(" ");
      wordSpans = $$(".wd", words);
    }
    const track = $("#compoundTrack"), pin = $(".compound__pin");

    // Layout is measured only on load/resize (no getBoundingClientRect / getComputedStyle per scroll tick).
    let isPinned = false, trackTop = 0, trackSpan = 1, pinTop = 0, pinH = 1, vh = window.innerHeight;
    const docTop = (el) => { let y = 0; for (let e = el; e; e = e.offsetParent) y += e.offsetTop; return y; };
    function layout() {
      vh = window.innerHeight;
      isPinned = getComputedStyle(pin).position === "sticky";
      trackTop = docTop(track); trackSpan = Math.max(1, track.offsetHeight - vh);
      pinTop = docTop(pin); pinH = Math.max(1, pin.offsetHeight);
    }
    // target progress straight from scrollY (cheap); the displayed value eases toward it every frame
    const targetProgress = () => isPinned
      ? clamp((window.scrollY - trackTop) / trackSpan)
      : clamp((window.scrollY + vh * 0.85 - pinTop) / (pinH * 0.8));
    layout();
    window.addEventListener("resize", layout);
    window.addEventListener("load", layout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    if ("ResizeObserver" in window) new ResizeObserver(layout).observe(document.body);

    let shown = targetProgress(), last = performance.now(), t0 = last;
    const state = { sq: [], node: [], lit: [], cur: [] }, wordOp = [];
    const setCls = (arr, k, el, cls, on) => { if (arr[k] !== on) { arr[k] = on; el.classList.toggle(cls, on); } };
    function tick(now) {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      const target = targetProgress();
      // frame-rate independent lerp, ≈0.14 per 60fps frame — wheel/trackpad steps become one silky glide
      shown = reduceMotion ? target : shown + (target - shown) * (1 - Math.pow(1 - 0.14, dt * 60));
      if (Math.abs(target - shown) < 0.0004) shown = target;
      const d = shown;
      // spiral draws over the first 90% of the pin, stages advance in step with it
      const draw = clamp(d / 0.9);
      const off = L * (1 - draw);
      path.style.strokeDashoffset = off; glow.style.strokeDashoffset = off;
      sqEls.forEach((r, i) => setCls(state.sq, i, r, "is-lit", draw * total >= cum[i] - arcLen[i] * 0.5));
      nodes.forEach((n, i) => setCls(state.node, i, n.el, "is-lit", draw >= n.f - 0.01));
      const sp = clamp((d - 0.1) / 0.85);
      stages.forEach((s, i) => {
        const f = clamp(sp * 4 - i);
        if (bars[i]) bars[i].style.transform = `scaleX(${f.toFixed(4)})`;
        setCls(state.lit, i, s, "is-lit", f > 0);
        setCls(state.cur, i, s, "is-current", (f > 0 && f < 1) || (i === 3 && f >= 1));
      });
      // words fade in continuously (opacity only) rather than snapping on/off
      const wp = clamp(d / 0.28) * wordSpans.length;
      wordSpans.forEach((w, i) => {
        const o = Math.round((0.16 + 0.84 * clamp(wp - i)) * 100) / 100;
        if (wordOp[i] !== o) { wordOp[i] = o; w.style.opacity = o; }
      });
      // spark travels outward along the drawn spiral, looping
      const tt = ((now - t0) / 4200) % 1;
      const pt = path.getPointAtLength(Math.max(0.001, tt * tt * draw * L));
      spark.setAttribute("cx", pt.x); spark.setAttribute("cy", pt.y);
      spark.setAttribute("opacity", draw > 0.02 ? String(Math.sin(tt * Math.PI) * 0.9 + 0.1) : "0");
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  })();

  /* ---------- Leverage estimator ---------- */
  (function calc() {
    const team = $("#calcTeam"), hours = $("#calcHours");
    if (!team) return;
    const out = $("#calcResult"), to = $("#calcTeamOut"), ho = $("#calcHoursOut");
    let cur = 0, target = 0, raf;
    const fill = (el) => el.style.setProperty("--p", ((el.value - el.min) / (el.max - el.min)) * 100 + "%");
    function update() {
      to.textContent = team.value; ho.textContent = hours.value;
      fill(team); fill(hours);
      target = Math.round(team.value * hours.value * 46 * 0.6);
      cancelAnimationFrame(raf);
      const step = () => {
        cur += (target - cur) * 0.18;
        if (Math.abs(target - cur) < 1) cur = target;
        out.textContent = Math.round(cur).toLocaleString();
        if (cur !== target) raf = requestAnimationFrame(step);
      };
      step();
    }
    team.addEventListener("input", update); hours.addEventListener("input", update);
    update();
  })();

  /* ---------- Bot Blueprint Explorer ---------- */
  (function lab() {
    const svg = $("#labSvg");
    if (!svg) return;
    const S = {
      support: {
        file: "blueprint://support-inbox",
        title: "Support & Inbox Copilot",
        desc: "A bot that sits inside your helpdesk and shared inbox, reads every incoming message, pulls the customer’s context from your other systems and drafts the right answer for a human to approve.",
        steps: ["Classifies intent, urgency & sentiment on arrival", "Looks up orders, accounts & past tickets automatically", "Drafts on-brand replies; agents approve in one click", "Escalates edge cases with a full summary attached"],
        inputs: [["Shared inbox", "gmail · outlook"], ["Helpdesk tickets", "zendesk · freshdesk"], ["Live chat", "intercom · web"]],
        actions: [["Classify & prioritize", "intent · urgency"], ["Fetch customer context", "shopify · stripe"], ["Draft reply for approval", "human-in-the-loop"]],
        outcome: ["Resolved & logged", "crm + analytics"],
        metrics: [["~60%", "faster first response"], ["24/7", "triage coverage"], ["3 → 1", "tools per ticket"]],
        log: [
          "<b>inbox</b> new message from <b>dana@client.co</b> · “Where is order #4821?”",
          "<b>bot</b> intent=<i>order_status</i> urgency=normal confidence=0.97",
          "<b>shopify</b> order #4821 → shipped · tracking 1Z…88",
          "<b>bot</b> drafted reply with tracking link → queued for agent approval",
          "<i>✓ approved & sent · ticket closed · logged to CRM</i>"
        ]
      },
      ops: {
        file: "blueprint://operations-erp",
        title: "Operations & ERP Bot",
        desc: "A back-office bot that reads supplier documents, reconciles them against your ERP and only bothers your team when something genuinely doesn’t match.",
        steps: ["Extracts line items from PDFs, emails & scans", "Three-way matches PO ↔ receipt ↔ invoice", "Posts clean entries straight into the ERP", "Routes exceptions to the right owner with context"],
        inputs: [["Supplier invoices", "pdf · email · scan"], ["ERP records", "netsuite · odoo · sap"], ["Warehouse logs", "sheets · wms"]],
        actions: [["Extract line items", "ocr + llm parsing"], ["3-way match", "po ↔ receipt ↔ inv"], ["Flag exceptions", "slack · teams"]],
        outcome: ["Posted to ERP", "full audit trail"],
        metrics: [["~80%", "invoices touch-free"], ["Hours → min", "month-end close tasks"], ["100%", "actions audit-logged"]],
        log: [
          "<b>mail</b> invoice INV-20931.pdf received from <b>Northwind Supply</b>",
          "<b>bot</b> extracted 14 line items · total $18,402.10",
          "<b>erp</b> matched PO-7731 + receipt GR-5520 · 13/14 lines OK",
          "<b>bot</b> 1 qty mismatch → flagged to ops lead in Teams",
          "<i>✓ 13 lines posted to ERP · exception tracked · audit log written</i>"
        ]
      },
      sales: {
        file: "blueprint://sales-crm",
        title: "Sales & CRM Bot",
        desc: "A revenue bot embedded in your CRM that enriches every lead, routes it to the right rep in seconds and keeps the pipeline updated without anyone typing notes.",
        steps: ["Enriches & scores inbound leads instantly", "Routes by territory, fit & rep capacity", "Drafts personalised follow-ups and books meetings", "Logs calls, emails & next steps automatically"],
        inputs: [["Web forms & inbound", "site · ads · chat"], ["CRM", "hubspot · salesforce"], ["Email & calendar", "google · m365"]],
        actions: [["Enrich & score lead", "firmographics"], ["Route to best rep", "rules + capacity"], ["Draft follow-up", "logs activity"]],
        outcome: ["Pipeline updated", "real-time, zero typing"],
        metrics: [["< 2 min", "lead response time"], ["+ hours", "selling time / rep / wk"], ["0", "manual CRM notes"]],
        log: [
          "<b>form</b> demo request · <b>Priya S.</b> · VP Ops @ Helix Logistics",
          "<b>bot</b> enriched: 240 employees · logistics · fit score <i>A</i>",
          "<b>crm</b> routed to <b>Marcus (East)</b> · capacity OK",
          "<b>bot</b> personalised follow-up drafted · 3 slots proposed",
          "<i>✓ meeting booked · deal created · activity logged</i>"
        ]
      },
      portal: {
        file: "blueprint://internal-portal",
        title: "Internal Portal Assistant",
        desc: "A private assistant inside your intranet or internal tools that answers from your own documents and data — and can safely take approved actions on your behalf.",
        steps: ["Answers from SOPs, policies & wikis with citations", "Queries internal databases within user permissions", "Runs approved actions (requests, updates, reports)", "Escalates to a human with the full context"],
        inputs: [["Docs & SOPs", "drive · notion · wiki"], ["Internal databases", "postgres · apis"], ["Team chat", "slack · teams"]],
        actions: [["Answer with citations", "rag · permissions"], ["Run approved actions", "scoped tools"], ["Escalate with context", "to the right owner"]],
        outcome: ["One trusted assistant", "inside your portal"],
        metrics: [["Seconds", "to find any policy"], ["−40%", "repeat internal questions"], ["RBAC", "role-based access"]],
        log: [
          "<b>portal</b> “How many PTO days do I have left, and can I book Dec 22?”",
          "<b>bot</b> checked HR policy v3.2 (cited) + user’s balance: <b>9 days</b>",
          "<b>hris</b> Dec 22 available · no team conflicts",
          "<b>bot</b> drafted PTO request → awaiting user confirmation",
          "<i>✓ request submitted · manager notified · answer cited 2 sources</i>"
        ]
      }
    };

    const fileEl = $("#labFile"), titleEl = $("#labTitle"), descEl = $("#labDesc"), stepsEl = $("#labSteps"), metricsEl = $("#labMetrics"), consoleEl = $("#labConsole"), runBtn = $("#labRun");
    const tabs = $$(".lab__tab");
    let current = "support", links = [], nodeEls = {}, pulses = [], runId = 0, compact = false;

    function layout(sc) {
      compact = svg.clientWidth < 620;
      const L = { nodes: [], links: [] };
      if (!compact) {
        L.vb = "0 0 880 400";
        const nw = 190, nh = 56;
        sc.inputs.forEach((n, i) => L.nodes.push({ id: "in" + i, x: 20, y: 62 + i * 108, w: nw, h: nh, t: n[0], s: n[1] }));
        L.hub = { x: 318, y: 200 };
        sc.actions.forEach((n, i) => L.nodes.push({ id: "ac" + i, x: 428, y: 62 + i * 108, w: 208, h: nh, t: n[0], s: n[1] }));
        L.nodes.push({ id: "out", x: 676, y: 164, w: 186, h: 72, t: sc.outcome[0], s: sc.outcome[1], out: true });
        const c = (x1, y1, x2, y2) => `M${x1} ${y1} C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} ${x2} ${y2}`;
        sc.inputs.forEach((_, i) => L.links.push({ from: "in" + i, to: "hub", d: c(210, 90 + i * 108, 270, 200) }));
        sc.actions.forEach((_, i) => L.links.push({ from: "hub", to: "ac" + i, d: c(366, 200, 428, 90 + i * 108) }));
        sc.actions.forEach((_, i) => L.links.push({ from: "ac" + i, to: "out", d: c(636, 90 + i * 108, 676, 200) }));
        L.labels = [[115, 36, "INPUTS"], [318, 112, "NANO BOT"], [532, 36, "ACTIONS"], [769, 140, "OUTCOME"]];
      } else {
        L.vb = "0 0 360 640";
        const x = 44, w = 272, h = 48;
        sc.inputs.forEach((n, i) => L.nodes.push({ id: "in" + i, x, y: 34 + i * 60, w, h, t: n[0], s: n[1] }));
        L.hub = { x: 180, y: 268 };
        sc.actions.forEach((n, i) => L.nodes.push({ id: "ac" + i, x, y: 352 + i * 60, w, h, t: n[0], s: n[1] }));
        L.nodes.push({ id: "out", x, y: 548, w, h: 58, t: sc.outcome[0], s: sc.outcome[1], out: true });
        const r = 8;
        sc.inputs.forEach((_, i) => { const y = 58 + i * 60; L.links.push({ from: "in" + i, to: "hub", d: `M${x} ${y} H${22 + r} Q22 ${y} 22 ${y + r} V${268 - r} Q22 268 ${22 + r} 268 H138` }); });
        sc.actions.forEach((_, i) => { const y = 376 + i * 60; L.links.push({ from: "hub", to: "ac" + i, d: `M222 268 H${338 - r} Q338 268 338 ${268 + r} V${y - r} Q338 ${y} ${338 - r} ${y} H316` }); });
        sc.actions.forEach((_, i) => { const y = 376 + i * 60; L.links.push({ from: "ac" + i, to: "out", d: `M${x} ${y} H${22 + r} Q22 ${y} 22 ${y + r} V${577 - r} Q22 577 ${22 + r} 577 H${x}` }); });
        L.labels = [[180, 22, "INPUTS"], [180, 340, "ACTIONS"], [180, 540, "OUTCOME"]];
      }
      return L;
    }

    function render(key, animateIn = true) {
      const sc = S[key];
      const L = layout(sc);
      svg.setAttribute("viewBox", L.vb);
      svg.innerHTML = "";
      const defs = svgEl("defs", {}, svg);
      const f = svgEl("filter", { id: "bpGlow", x: "-50%", y: "-50%", width: "200%", height: "200%" }, defs);
      svgEl("feGaussianBlur", { stdDeviation: "3", result: "b" }, f);
      const m = svgEl("feMerge", {}, f); svgEl("feMergeNode", { in: "b" }, m); svgEl("feMergeNode", { in: "SourceGraphic" }, m);
      const rg = svgEl("radialGradient", { id: "hubGrad", cx: "0.38", cy: "0.32", r: "0.75" }, defs);
      [["0", "#fff4d2"], ["0.25", "#f0cf75"], ["0.6", "#d4af37"], ["1", "#7a5416"]].forEach(([o, c]) => svgEl("stop", { offset: o, "stop-color": c }, rg));

      L.labels.forEach(([x, y, t]) => { const e = svgEl("text", { x, y, "text-anchor": "middle", class: "bp-label" }, svg); e.textContent = t; });
      const gl = svgEl("g", {}, svg);
      links = L.links.map((l) => { const p = svgEl("path", { d: l.d, class: "bp-link" }, gl); return { ...l, el: p, len: p.getTotalLength() }; });

      nodeEls = {};
      L.nodes.forEach((n, i) => {
        const g = svgEl("g", { class: "bp-node", style: `animation-delay:${animateIn ? i * 60 : 0}ms` }, svg);
        svgEl("rect", { x: n.x, y: n.y, width: n.w, height: n.h, rx: 12 }, g);
        svgEl("circle", { cx: n.x + 18, cy: n.y + n.h / 2, r: n.out ? 5 : 4, class: "ic" }, g);
        const t = svgEl("text", { x: n.x + 34, y: n.y + n.h / 2 - (compact ? 2 : 3) }, g); t.textContent = n.t;
        const s = svgEl("text", { x: n.x + 34, y: n.y + n.h / 2 + (compact ? 13 : 14), class: "sub" }, g); s.textContent = n.s;
        nodeEls[n.id] = g;
      });
      const hub = svgEl("g", { class: "bp-hub bp-node", style: `animation-delay:${animateIn ? 180 : 0}ms` }, svg);
      svgEl("circle", { cx: L.hub.x, cy: L.hub.y, r: 64, class: "halo2" }, hub);
      svgEl("circle", { cx: L.hub.x, cy: L.hub.y, r: 56, class: "halo" }, hub);
      svgEl("circle", { cx: L.hub.x, cy: L.hub.y, r: 42, class: "core" }, hub);
      const ht = svgEl("text", { x: L.hub.x, y: L.hub.y + 4, "text-anchor": "middle" }, hub); ht.textContent = "NANO";
      nodeEls.hub = hub;
      pulses.forEach((p) => p.el.remove()); pulses = [];

      // side panel
      fileEl.textContent = sc.file;
      titleEl.textContent = sc.title;
      descEl.textContent = sc.desc;
      stepsEl.innerHTML = sc.steps.map((s) => `<li>${s}</li>`).join("");
      metricsEl.innerHTML = sc.metrics.map(([a, b]) => `<div class="metric"><strong>${a}</strong><span>${b}</span></div>`).join("");
      $$(".metric strong", metricsEl).forEach((el) => {
        const m = el.textContent.match(/^([^\d]*)(\d+)(%?)$/);
        if (m) countUp(el, +m[2], 0, m[1], m[3], 1100);
      });
    }

    function pulse(link, dur = 900, big = false) {
      return new Promise((res) => {
        const el = svgEl("circle", { r: big ? 5 : 3, class: "bp-pulse", opacity: big ? 1 : 0.55 }, svg);
        pulses.push({ el, link, t0: performance.now(), dur, res });
      });
    }
    function animatePulses(now) {
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        const k = clamp((now - p.t0) / p.dur);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        const pt = p.link.el.getPointAtLength(e * p.link.len);
        p.el.setAttribute("cx", pt.x); p.el.setAttribute("cy", pt.y);
        if (k >= 1) { p.el.remove(); pulses.splice(i, 1); p.res(); }
      }
      requestAnimationFrame(animatePulses);
    }
    requestAnimationFrame(animatePulses);

    // idle ambient pulses
    let idleI = 0;
    setInterval(() => {
      if (!links.length || document.hidden || running) return;
      pulse(links[idleI % links.length], 1400);
      idleI += 4;
    }, 650);

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const light = (id, on = true) => nodeEls[id] && nodeEls[id].classList.toggle("is-lit", on);
    let running = false;
    function stamp() { const d = new Date(); return d.toTimeString().slice(0, 8); }
    function log(html) {
      const ln = document.createElement("span");
      ln.className = "ln";
      ln.innerHTML = `<span class="t">${stamp()}</span>${html}`;
      consoleEl.appendChild(ln);
      while (consoleEl.children.length > 5) consoleEl.removeChild(consoleEl.firstChild);
    }

    async function run() {
      const id = ++runId, sc = S[current];
      running = true; runBtn.classList.add("is-running");
      consoleEl.innerHTML = "";
      Object.keys(nodeEls).forEach((k) => light(k, false));
      const live = () => id === runId;
      const src = Math.floor(Math.random() * 3);
      light("in" + src); log(sc.log[0]);
      await pulse(links[src], 850, true); if (!live()) return;
      light("hub"); log(sc.log[1]);
      await sleep(350); if (!live()) return;
      for (let i = 0; i < 3; i++) {
        await pulse(links[3 + i], 650, true); if (!live()) return;
        light("ac" + i);
        if (i === 1) log(sc.log[2]);
        if (i === 2) log(sc.log[3]);
      }
      await Promise.all([0, 1, 2].map((i) => pulse(links[6 + i], 800, true))); if (!live()) return;
      light("out"); log(sc.log[4]);
      await sleep(2600); if (!live()) return;
      Object.keys(nodeEls).forEach((k) => light(k, false));
      running = false; runBtn.classList.remove("is-running");
    }
    function stopRun() { runId++; running = false; runBtn.classList.remove("is-running"); }

    function select(key, autoRun = true) {
      current = key;
      if (window.NanoSwarm && autoRun) window.NanoSwarm.setScenario(Object.keys(S).indexOf(key));
      tabs.forEach((t) => { const on = t.dataset.scenario === key; t.classList.toggle("is-active", on); t.setAttribute("aria-selected", String(on)); });
      stopRun();
      render(key);
      consoleEl.innerHTML = "";
      log(`<b>ready</b> ${S[key].file} loaded · press <b>Run simulation</b> or watch it live`);
      if (autoRun) setTimeout(run, 700);
    }
    tabs.forEach((t) => t.addEventListener("click", () => select(t.dataset.scenario)));
    // keyboard arrows on tablist
    $(".lab__tabs").addEventListener("keydown", (e) => {
      if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
      const i = tabs.findIndex((t) => t.classList.contains("is-active"));
      const n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      n.focus(); n.click();
    });
    runBtn.addEventListener("click", () => { stopRun(); run(); });

    select("support", false);
    // auto-run first time the lab scrolls into view
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { run(); io.disconnect(); } }, { threshold: 0.35 });
      io.observe(svg);
    }
    let lastCompact = compact;
    window.addEventListener("resize", () => {
      const c = svg.clientWidth < 620;
      if (c !== lastCompact) { lastCompact = c; stopRun(); render(current, false); }
    });
  })();

  /* ---------- Contact form ---------- */
  (function contact() {
    const form = $("#contactForm");
    if (!form) return;
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const rules = {
      name: (v) => (v.trim().length >= 2 ? "" : "Please enter your name."),
      email: (v) => (!v.trim() ? "We need an email to reply to." : emailRe.test(v.trim()) ? "" : "That email doesn’t look quite right."),
      focus: (v) => (v ? "" : "Pick the closest focus area."),
      message: (v) => (v.trim().length >= 20 ? "" : `A little more detail helps (${Math.max(0, 20 - v.trim().length)} more characters).`)
    };
    const touched = new Set();
    function validate(field, show = true) {
      const rule = rules[field.name];
      if (!rule) return true;
      const err = rule(field.value);
      const wrap = field.closest(".field"), msg = $(".field__msg", wrap);
      if (show) {
        wrap.classList.toggle("is-invalid", !!err);
        wrap.classList.toggle("is-valid", !err);
        msg.textContent = err;
        field.setAttribute("aria-invalid", err ? "true" : "false");
      }
      return !err;
    }
    $$("input, select, textarea", form).forEach((f) => {
      f.addEventListener("blur", () => { if (f.value) touched.add(f.name); if (touched.has(f.name)) validate(f); });
      f.addEventListener("input", () => { if (touched.has(f.name)) validate(f); });
      f.addEventListener("change", () => { touched.add(f.name); validate(f); });
    });

    const btn = $("#formSubmit"), success = $("#formSuccess"), fields = $("#formFields"), successText = $("#formSuccessText");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const els = $$("[name]", form).filter((f) => rules[f.name]);
      els.forEach((f) => touched.add(f.name));
      const ok = els.map((f) => validate(f)).every(Boolean);
      if (!ok) { const bad = $(".is-invalid input, .is-invalid select, .is-invalid textarea", form); bad && bad.focus(); return; }
      const data = Object.fromEntries(new FormData(form).entries());
      if (data._gotcha) return; // bot
      delete data._gotcha;
      btn.classList.add("is-loading");
      try {
        if (NANO_CONFIG.formEndpoint) {
          const res = await fetch(NANO_CONFIG.formEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ ...data, _subject: `New Nanofinity enquiry — ${data.focus}` })
          });
          if (!res.ok) throw new Error("Request failed");
          successText.textContent = `Thanks ${data.name.split(" ")[0]} — we’ll reply to ${data.email} within one business day.`;
        } else {
          const subject = encodeURIComponent(`Project enquiry — ${data.focus}${data.company ? " · " + data.company : ""}`);
          const body = encodeURIComponent(`Name: ${data.name}\nEmail: ${data.email}\nCompany: ${data.company || "—"}\nFocus: ${data.focus}\n\n${data.message}`);
          window.location.href = `mailto:${NANO_CONFIG.contactEmail}?subject=${subject}&body=${body}`;
          successText.innerHTML = `Your email app should open with the message ready to send. If it didn’t, write to <a href="mailto:${NANO_CONFIG.contactEmail}" class="gold-text">${NANO_CONFIG.contactEmail}</a>.`;
        }
        fields.hidden = true; success.hidden = false;
      } catch (err) {
        const msg = $(".field__msg", $("#fMessage").closest(".field"));
        msg.textContent = `Something went wrong sending that. Please email ${NANO_CONFIG.contactEmail} directly.`;
      } finally {
        btn.classList.remove("is-loading");
      }
    });
    $("#formReset").addEventListener("click", () => {
      form.reset(); touched.clear();
      $$(".field", form).forEach((f) => f.classList.remove("is-valid", "is-invalid"));
      $$(".field__msg", form).forEach((m) => (m.textContent = ""));
      success.hidden = true; fields.hidden = false;
    });
  })();

  /* ---------- Newsletter ---------- */
  (function newsletter() {
    const form = $("#newsletter");
    if (!form) return;
    const input = $("#nlEmail"), msg = $("#nlMsg");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const v = input.value.trim();
      msg.classList.remove("is-ok");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { msg.textContent = "Please enter a valid email address."; input.focus(); return; }
      try {
        if (NANO_CONFIG.newsletterEndpoint) {
          const r = await fetch(NANO_CONFIG.newsletterEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ email: v }) });
          if (!r.ok) throw new Error();
        } else {
          // No endpoint configured yet: keep it locally so nothing is lost during development.
          const list = JSON.parse(localStorage.getItem("nano_subscribers") || "[]");
          if (!list.includes(v)) list.push(v);
          localStorage.setItem("nano_subscribers", JSON.stringify(list));
        }
        msg.textContent = "You’re in. Watch for the next Compound Letter ✦";
        msg.classList.add("is-ok");
        form.reset();
      } catch {
        msg.textContent = "Couldn’t subscribe right now — please try again shortly.";
      }
    });
  })();

  /* =========================================================
     v3 page motion (si.gov-inspired)
     ========================================================= */

  /* ---------- count-up (easeOutQuart) ---------- */
  function countUp(el, to, decimals = 0, prefix = "", suffix = "", dur = 1400) {
    if (reduceMotion) { el.textContent = prefix + to.toFixed(decimals) + suffix; return; }
    const t0 = performance.now();
    const step = (now) => {
      const t = clamp((now - t0) / dur), e = 1 - Math.pow(1 - t, 4);
      el.textContent = prefix + (to * e).toFixed(decimals) + suffix;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  (function counters() {
    const els = $$("[data-count]");
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((en) => en.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target; io.unobserve(el);
      countUp(el, parseFloat(el.dataset.count), parseInt(el.dataset.decimals || "0", 10));
    }), { threshold: 0.6 });
    els.forEach((el) => io.observe(el));
  })();

  /* ---------- masked line-by-line headline reveals ---------- */
  (function lineReveals() {
    const heads = $$("[data-lines]");
    if (!heads.length) return;
    heads.forEach((h) => { h.dataset.src = h.innerHTML; });
    // split a heading into visual lines while preserving inline markup (e.g. .gold-text spans)
    function split(h) {
      h.innerHTML = h.dataset.src;
      const words = [];
      const walk = (node, wrap) => {
        Array.from(node.childNodes).forEach((c) => {
          if (c.nodeType === 3) {
            c.textContent.split(/(\s+)/).forEach((part) => {
              if (!part) return;
              if (/^\s+$/.test(part)) { words.push({ space: true }); return; }
              words.push({ text: part, wrap });
            });
          } else if (c.nodeName === "BR") {
            words.push({ br: true });
          } else if (c.nodeType === 1) {
            walk(c, c.cloneNode(false));
          }
        });
      };
      walk(h, null);
      // measure word positions
      h.innerHTML = "";
      const spans = [];
      words.forEach((w) => {
        if (w.br) { const b = document.createElement("br"); h.appendChild(b); spans.push({ br: true }); return; }
        if (w.space) { h.appendChild(document.createTextNode(" ")); spans.push({ space: true }); return; }
        const sp = document.createElement("span");
        sp.style.display = "inline-block";
        if (w.wrap) { const k = w.wrap.cloneNode(false); k.textContent = w.text; sp.appendChild(k); }
        else sp.textContent = w.text;
        h.appendChild(sp); spans.push({ el: sp, w });
      });
      const lines = []; let cur = null, lastTop = null;
      spans.forEach((s) => {
        if (s.br) { cur = null; lastTop = null; return; }
        if (s.space) { if (cur) cur.push(" "); return; }
        const top = s.el.offsetTop;
        if (cur === null || Math.abs(top - lastTop) > 4) { cur = []; lines.push(cur); lastTop = top; }
        cur.push(s.el);
      });
      h.innerHTML = "";
      lines.forEach((ln, i) => {
        const o = document.createElement("span"); o.className = "lr";
        const inn = document.createElement("span"); inn.className = "lr__in";
        inn.style.transitionDelay = (i * 0.09).toFixed(2) + "s";
        while (ln.length && ln[ln.length - 1] === " ") ln.pop();
        ln.forEach((x) => {
          if (x === " ") inn.appendChild(document.createTextNode(" "));
          else { x.style.display = ""; const c = x.firstChild && x.firstChild.nodeType === 1 ? x.firstChild : document.createTextNode(x.textContent); inn.appendChild(c); }
        });
        o.appendChild(inn); h.appendChild(o);
      });
      h.classList.add("lines-ready");
    }
    const io = "IntersectionObserver" in window ? new IntersectionObserver((en) => en.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }), { threshold: 0.2, rootMargin: "0px 0px -6% 0px" }) : null;
    const go = () => {
      heads.forEach((h) => { split(h); if (io) io.observe(h); else h.classList.add("is-in"); });
    };
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(go);
    let rw = window.innerWidth, rt;
    window.addEventListener("resize", () => {
      if (window.innerWidth === rw) return; rw = window.innerWidth;
      clearTimeout(rt);
      rt = setTimeout(() => heads.forEach((h) => {
        const was = h.classList.contains("is-in");
        h.classList.add("lines-now"); split(h);
        if (was) h.classList.add("is-in");
        requestAnimationFrame(() => h.classList.remove("lines-now"));
      }), 200);
    });
  })();

  /* ---------- right-side dot navigation ---------- */
  (function dotnav() {
    const nav = $("#dotnav");
    const secs = $$("[data-dot]");
    if (!nav || !secs.length) return;
    const links = secs.map((s) => {
      const a = document.createElement("a");
      a.href = "#" + s.id; a.setAttribute("aria-label", s.dataset.dot);
      a.innerHTML = `<span>${s.dataset.dot}</span><i></i>`;
      nav.appendChild(a); return a;
    });
    const upd = () => {
      const mid = window.innerHeight * 0.5; let k = 0;
      secs.forEach((s, i) => { if (s.getBoundingClientRect().top < mid) k = i; });
      links.forEach((a, i) => a.classList.toggle("on", i === k));
    };
    window.addEventListener("scroll", upd, { passive: true }); upd();
  })();

  /* ---------- trailing ring cursor (fine pointers only) ---------- */
  (function cursor() {
    const c = $("#cursor");
    if (!c || reduceMotion || !window.matchMedia("(pointer: fine)").matches) return;
    let mx = -100, my = -100, x = -100, y = -100;
    window.addEventListener("pointermove", (e) => {
      mx = e.clientX; my = e.clientY; c.classList.add("on");
      c.classList.toggle("big", !!e.target.closest("a,button,.mode,.lab__tab,input,select,textarea,label"));
    }, { passive: true });
    document.addEventListener("pointerleave", () => c.classList.remove("on"));
    const loop = () => {
      x += (mx - x) * 0.2; y += (my - y) * 0.2;
      c.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  })();

  /* ---------- gold radial iris transition for in-page jumps ---------- */
  (function flash() {
    const f = $("#flash");
    if (!f) return;
    let busy = false;
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href^='#']");
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const id = a.getAttribute("href");
      if (id === "#" || id === "#main") return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      const nt = $("#navToggle"), nl = $("#navLinks");
      if (nt) { nt.setAttribute("aria-expanded", "false"); nl.classList.remove("is-open"); }
      const jump = () => {
        const top = target.getBoundingClientRect().top + window.scrollY - (id === "#top" ? 0 : 64);
        const html = document.documentElement, prev = html.style.scrollBehavior;
        html.style.scrollBehavior = "auto"; window.scrollTo(0, top); html.style.scrollBehavior = prev;
        history.replaceState(null, "", id);
      };
      if (reduceMotion || busy) { jump(); return; }
      busy = true;
      f.style.setProperty("--x", e.clientX + "px");
      f.style.setProperty("--y", e.clientY + "px");
      f.classList.remove("out"); void f.offsetWidth; f.classList.add("on");
      setTimeout(() => {
        jump();
        f.classList.add("out"); f.classList.remove("on");
        if (window.NanoSwarm) window.NanoSwarm.shock(window.innerWidth / 2, window.innerHeight / 2);
        setTimeout(() => { f.classList.remove("out"); busy = false; }, 600);
      }, 480);
    });
  })();

  /* ---------- Fibonacci 2048 (Gold Merge) ---------- */
  (function fib2048() {
    const root = $("#fib2048");
    if (!root) return;
    const board = $("#fgBoard"), tilesEl = $("#fgTiles"), cellsEl = $(".fib2048__cells", root);
    const scoreEl = $("#fgScore"), bestEl = $("#fgBest"), maxEl = $("#fgMax"), live = $("#fgLive");
    const overlay = $("#fgOverlay"), ovTitle = $("#fgOvTitle"), ovSub = $("#fgOvSub"), keepBtn = $("#fgKeep");
    const SIZE = 4, WIN = 2584, BEST_KEY = "nano_fib2048_best";
    const FIB = [1, 2]; while (FIB[FIB.length - 1] < 1e7) FIB.push(FIB[FIB.length - 1] + FIB[FIB.length - 2]);
    const idx = (v) => FIB.indexOf(v);
    // 1+1 → 2, otherwise two consecutive Fibonacci numbers merge into the next one
    const canMerge = (a, b) => (a === 1 && b === 1) || (idx(a) >= 0 && idx(b) >= 0 && Math.abs(idx(a) - idx(b)) === 1);
    const level = (v) => v <= 2 ? 1 : v <= 5 ? 2 : v <= 13 ? 3 : v <= 34 ? 4 : v <= 89 ? 5 : v <= 377 ? 6 : 7;
    for (let k = 0; k < SIZE * SIZE; k++) cellsEl.appendChild(document.createElement("i"));

    let grid, tiles, nextId = 1, score = 0, best = +(localStorage.getItem(BEST_KEY) || 0), maxTile = 1, won = false, keepPlaying = false, busy = false;
    bestEl.textContent = best;

    function tileEl(t) {
      const el = document.createElement("div");
      el.innerHTML = '<div class="fg-tile__in"></div>';
      tilesEl.appendChild(el); t.el = el; paint(t); return el;
    }
    function paint(t, extra = "") {
      const d = String(t.v).length;
      t.el.className = `fg-tile l${level(t.v)}${d >= 4 ? " d4" : d === 3 ? " d3" : ""}${extra}`;
      t.el.style.setProperty("--r", t.r); t.el.style.setProperty("--c", t.c);
      t.el.firstChild.textContent = t.v;
    }
    function empties() { const out = []; for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!grid[r][c]) out.push([r, c]); return out; }
    function spawn() {
      const e = empties(); if (!e.length) return;
      const [r, c] = e[Math.floor(Math.random() * e.length)];
      const t = { id: nextId++, v: Math.random() < 0.85 ? 1 : 2, r, c };
      grid[r][c] = t; tiles.push(t); tileEl(t); paint(t, " is-new");
    }
    function updateStats() {
      scoreEl.textContent = score; maxEl.textContent = maxTile;
      if (score > best) { best = score; bestEl.textContent = best; try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {} }
    }
    function reset() {
      tilesEl.innerHTML = ""; grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null)); tiles = [];
      score = 0; maxTile = 1; won = false; keepPlaying = false; busy = false; overlay.hidden = true;
      spawn(); spawn(); maxTile = Math.max(...tiles.map((t) => t.v)); updateStats();
    }
    function movesLeft() {
      if (empties().length) return true;
      for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
        const v = grid[r][c].v;
        if (c + 1 < SIZE && canMerge(v, grid[r][c + 1].v)) return true;
        if (r + 1 < SIZE && canMerge(v, grid[r + 1][c].v)) return true;
      }
      return false;
    }
    function showOverlay(title, sub, keep) {
      ovTitle.textContent = title; ovSub.textContent = sub; keepBtn.hidden = !keep; overlay.hidden = false;
    }
    const VEC = { left: [0, -1], right: [0, 1], up: [-1, 0], down: [1, 0] };
    function move(dir) {
      if (busy || !overlay.hidden || !VEC[dir]) return false;
      const [dr, dc] = VEC[dir];
      let moved = false, gained = 0, bigMerge = false;
      const prevMax = maxTile, gone = [], merged = [];
      const fresh = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
      for (let line = 0; line < SIZE; line++) {
        // collect the line's tiles in the order they travel (front first)
        const cells = [];
        for (let k = 0; k < SIZE; k++) {
          const p = dc ? (dc > 0 ? SIZE - 1 - k : k) : (dr > 0 ? SIZE - 1 - k : k);
          cells.push(dc ? [line, p] : [p, line]);
        }
        const out = []; // { t, mergedThisTurn }
        cells.forEach(([r, c]) => {
          const t = grid[r][c]; if (!t) return;
          const last = out[out.length - 1];
          if (last && !last.m && canMerge(last.t.v, t.v)) {
            last.t.v += t.v; last.m = true; gained += last.t.v; merged.push(last.t);
            gone.push({ t, to: last }); if (last.t.v >= 13) bigMerge = true;
            maxTile = Math.max(maxTile, last.t.v); moved = true;
          } else out.push({ t, m: false });
        });
        out.forEach((o, k) => {
          const [r, c] = cells[k];
          if (o.t.r !== r || o.t.c !== c) moved = true;
          o.t.r = r; o.t.c = c; fresh[r][c] = o.t;
        });
        gone.forEach((g) => { if (!g.done) { g.done = true; } });
      }
      if (!moved) return false;
      busy = true; grid = fresh; score += gained;
      // slide survivors, slide the absorbed tiles into their partner, then pop the merged ones
      tiles.forEach((t) => { if (!merged.includes(t)) paint(t); else { t.el.style.setProperty("--r", t.r); t.el.style.setProperty("--c", t.c); } });
      gone.forEach((g) => { g.t.el.classList.add("is-gone"); g.t.el.style.setProperty("--r", g.to.t.r); g.t.el.style.setProperty("--c", g.to.t.c); });
      const goneSet = new Set(gone.map((g) => g.t));
      tiles = tiles.filter((t) => !goneSet.has(t));
      setTimeout(() => {
        goneSet.forEach((t) => t.el.remove());
        merged.forEach((t) => { paint(t); void t.el.offsetWidth; paint(t, " is-merged"); });
        spawn(); updateStats(); busy = false;
        if (gained) live.textContent = `Merged into ${Math.max(...merged.map((t) => t.v))}. Score ${score}.`;
        if ((bigMerge || maxTile > prevMax && maxTile >= 8) && window.NanoSwarm && NanoSwarm.celebrate) NanoSwarm.celebrate();
        if (!won && maxTile >= WIN) { won = true; showOverlay("Golden! 2584", `You reached F(18). Score ${score}.`, true); }
        else if (!movesLeft()) showOverlay("Game over", `Score ${score} · max tile ${maxTile}`, false);
      }, 125);
      return true;
    }

    // ----- input: keys only while the player is engaged with the board -----
    let hover = false, engagedAt = 0;
    const engaged = () => document.activeElement === board || hover;
    board.addEventListener("pointerenter", () => { hover = true; board.classList.add("is-active"); });
    board.addEventListener("pointerleave", () => { hover = false; if (document.activeElement !== board) board.classList.remove("is-active"); });
    board.addEventListener("focus", () => board.classList.add("is-active"));
    board.addEventListener("blur", () => { if (!hover) board.classList.remove("is-active"); });
    const KEYS = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", a: "left", d: "right", w: "up", s: "down", A: "left", D: "right", W: "up", S: "down" };
    document.addEventListener("keydown", (e) => {
      const dir = KEYS[e.key];
      if (!dir || !engaged() || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.closest && e.target.closest("input, textarea, select")) return;
      e.preventDefault(); move(dir);
    });
    // swipe (touch) and click-drag (mouse)
    let sx = 0, sy = 0, down = false;
    board.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) return;
      down = true; sx = e.clientX; sy = e.clientY;
      board.focus({ preventScroll: true });
    });
    board.addEventListener("pointerup", (e) => {
      if (!down) return; down = false;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    });
    board.addEventListener("pointercancel", () => { down = false; });
    $$(".fib2048__pad button", root).forEach((b) => b.addEventListener("click", () => move(b.dataset.dir)));
    $("#fgNew").addEventListener("click", reset);
    $("#fgRetry").addEventListener("click", reset);
    keepBtn.addEventListener("click", () => { keepPlaying = true; overlay.hidden = true; board.focus({ preventScroll: true }); });

    // small hook for QA / tinkering: NanoFib.load([[1,1,0,0],...]) then NanoFib.move("left")
    window.NanoFib = {
      move: (d) => move(d),
      load(rows) {
        tilesEl.innerHTML = ""; tiles = []; overlay.hidden = true; busy = false;
        grid = rows.map((row, r) => row.map((v, c) => { if (!v) return null; const t = { id: nextId++, v, r, c }; tiles.push(t); tileEl(t); return t; }));
        maxTile = Math.max(1, ...tiles.map((t) => t.v)); updateStats();
      },
      state: () => ({ grid: grid.map((row) => row.map((t) => (t ? t.v : 0))), score, best, maxTile }),
      canMerge
    };
    reset();
  })();
})();
