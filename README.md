# Nanofinity — Website

Static marketing site for **Nanofinity · Infinite Potential.**
Plain HTML + CSS + vanilla JS. No build step, no dependencies. Open `index.html` or deploy the folder as-is.

```
nanofinity-site/
├── index.html            # all page content / sections
├── css/styles.css        # design system (colors, type, layout, responsive)
├── js/spiral.js          # hero canvas: golden pearl Fibonacci spiral (Orbit / Ripple / Pulse / Bloom)
├── js/main.js            # nav, reveals, Bot Blueprint Explorer, compound spiral, estimator, forms
├── assets/               # processed logos + favicons (assets/raw = original uploads)
├── site.webmanifest, robots.txt, .nojekyll
└── preview-*.png         # QA screenshots (safe to delete before deploying)
```

## Run locally

```bash
cd nanofinity-site
python3 -m http.server 8080   # then open http://localhost:8080
```

## 1. Set your real contact email

`hello@nanofinity.io` is a **placeholder**. Change it in one place, at the top of `js/main.js`:

```js
const NANO_CONFIG = {
  contactEmail: "you@yourdomain.com",
  formEndpoint: "",
  newsletterEndpoint: ""
};
```

Every `[data-email]` label and every `mailto:` link on the page updates from this value automatically.
(Optional: also replace the address in `index.html` so it shows correctly for visitors without JavaScript.)

## 2. Wire up the contact form

The form validates in the browser (name, email, focus area, message ≥ 20 characters) and has a hidden honeypot field to catch spam bots.

| `formEndpoint` | What happens on submit |
| --- | --- |
| `""` (default) | Opens the visitor's email app with a pre-filled message to `contactEmail`. |
| Formspree URL | Sends JSON to Formspree and shows the thank-you state. |
| Your own API | Same `POST` with a JSON body: `{ name, email, company, focus, message, _subject }`. Return any 2xx status for success. |

**Formspree (about 2 minutes, free tier):**
1. Create a form at https://formspree.io and copy its endpoint, e.g. `https://formspree.io/f/abcdwxyz`.
2. Set `formEndpoint: "https://formspree.io/f/abcdwxyz"`.
3. Submit once from the live site and confirm the address in the Formspree email.

Other options that accept the same JSON POST: Getform, Basin, a Vercel or Netlify function, Cloudflare Worker, or Zapier/Make webhook.

## 3. Newsletter ("The Compound Letter")

Set `newsletterEndpoint` to any endpoint that accepts `POST { email }`, such as a second Formspree form, Buttondown, ConvertKit or your own API.
Until you set one, sign-ups are only saved in the visitor's browser (`localStorage`) so the UI still works while you build.

## 4. Deploy

**Vercel**
```bash
npm i -g vercel
cd nanofinity-site && vercel        # framework preset: "Other", no build command, output dir: .
vercel --prod
```
Or drag the folder into https://vercel.com/new. Add your domain under *Project → Settings → Domains*.

**Netlify**
Drag and drop the `nanofinity-site` folder onto https://app.netlify.com/drop, or run:
```bash
npm i -g netlify-cli
cd nanofinity-site && netlify deploy --prod --dir .
```

**GitHub Pages**
```bash
cd nanofinity-site
git init && git add . && git commit -m "Nanofinity site"
git branch -M main
git remote add origin https://github.com/<you>/nanofinity.git
git push -u origin main
```
Then go to *Settings → Pages → Deploy from branch → main / (root)*. `.nojekyll` is already included.

**Cloudflare Pages**: create a project, choose *Direct upload*, and upload the folder. Leave the build command empty.

## Customising

- **Colors & fonts**: CSS variables at the top of `css/styles.css` (`--gold`, `--bg0` and the rest). The fonts are Montserrat (display), Inter (body) and JetBrains Mono, all from Google Fonts.
- **Hero spiral**: `js/spiral.js`. `ROWS` controls pearl rows, sizes and spacing. `B` is the golden growth rate. The mode buttons call `NanoSpiral.setMode('orbit' | 'ripple' | 'pulse' | 'bloom')`. Visitors who set "prefers-reduced-motion" get a slowed, calmer version.
- **Bot Lab scenarios**: the `S` object in `js/main.js` sets the inputs, actions, outcome, console log and metrics for each tab. All metrics are labelled *illustrative* on the page. Swap them for real case-study numbers when you have them.
- **Leverage estimator**: the formula in `js/main.js` is team × hours/week × 46 weeks × 60% automated.

## v3 — Gold dot swarm & page motion

- `js/spiral.js` is the swarm engine: one fixed full-screen `<canvas id="swarm">` (~1,600 dots desktop / ~1,100 mobile) that morphs between formations as you scroll. Each section opts in with `data-swarm="hero|services|bot-lab|compound|story|process|contact|footer"`. Public hooks: `NanoSwarm.setMode('orbit'|'ripple'|'pulse'|'bloom')`, `NanoSwarm.setScenario(i)`, `NanoSwarm.shock(x, y)`.
- The hero is a true logarithmic golden spiral (r × φ every ¾ turn) built only from dots that shrink smoothly into the eye — no solid centre. It stays a spiral on hover: dots part gently around the cursor with a subtle tilt and glint, and a click sends a soft shockwave. The footer keeps the giant dotted NANOFINITY wordmark.
- `js/main.js` adds: masked line reveals (`data-lines` on any heading), the word-lit paragraph (`.words`), the pinned 4-stage Compound section (desktop ≥901px wide and ≥640px tall), velocity-reactive ticker, count-ups (`data-count`, `data-decimals`), dot navigation (sections with `data-dot`, shown ≥1360px), ring cursor (fine pointers) and the gold iris flash on in-page links.
- `prefers-reduced-motion` gets calm, slow dots, no flash or cursor, and text shown immediately.
