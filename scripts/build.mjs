#!/usr/bin/env node
/**
 * Gera todos os SVGs do perfil (tema claro + escuro) e reescreve o README com os nomes novos.
 *   node scripts/build.mjs
 * Saída: assets/graph-{light,dark}.svg, assets/{work-<slug>,stack}-<hash>-{light,dark}.svg
 * O hash no nome do arquivo fura o cache de imagens do GitHub.
 * Arquivos estáticos: sem API, sem token, sem Actions.
 */
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = path.join(ROOT, "assets");

// ───────────────────────── conteúdo ─────────────────────────

const WORD = "GABSSDESU";
const CAPTION = "full-stack · ia aplicada · brasil";

const PROJECTS = [
  {
    slug: "merenda", n: "01", name: "Merenda Aberta", status: "live",
    desc: ["Trilha de auditoria pública do dinheiro da merenda:", "escola e conselho assinam, qualquer um recomputa a cadeia."],
    stack: ["Next.js", "TypeScript", "PostgreSQL", "Solana"],
  },
  {
    slug: "spooky", n: "02", name: "Spooky Masks", status: "jam",
    desc: ["Aventura 2D top-down numa mansão assombrada,", "feita em 48 horas na Global Game Jam 2026."],
    stack: ["React", "PixiJS", "Vite"],
  },
];

const STACK = [
  ["linguagens", ["TypeScript", "JavaScript", "Python", "C++"]],
  ["frontend", ["React", "Next.js", "Vite", "Tailwind", "TanStack", "Figma"]],
  ["backend & dados", ["Node.js", "Express", "FastAPI", "PostgreSQL", "Supabase", "Metabase"]],
  ["ia & automação", ["Claude", "Gemini", "OpenAI", "Chatwoot", "WhatsApp"]],
  ["infra", ["Docker", "Portainer", "Traefik", "Linux", "Git", "GitHub Actions", "Vercel"]],
];

// ───────────────────────── visual ─────────────────────────

const THEMES = {
  light: {
    bg: "#ffffff", border: "#d1d9e0", text: "#1f2328", muted: "#59636e", chip: "#f6f8fa", green: "#1a7f37", purple: "#8250df",
    levels: ["#eff2f5", "#aceebb", "#4ac26b", "#2da44e", "#116329"],
  },
  dark: {
    bg: "#0d1117", border: "#3d444d", text: "#f0f6fc", muted: "#9198a1", chip: "#151b23", green: "#3fb950", purple: "#ab7df8",
    levels: ["#151b23", "#033a16", "#196c2e", "#2ea043", "#56d364"],
  },
};
const SANS = `-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif`;
const MONO = `ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ───────────────────────── gráfico de contribuições ─────────────────────────

// fonte 5×7: 7 linhas, a altura exata do gráfico do GitHub
const FONT = {
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
};

const mask = Array.from({ length: 7 }, () => []);
[...WORD].forEach((ch, i) => {
  for (let r = 0; r < 7; r++) {
    for (const bit of FONT[ch][r]) mask[r].push(bit === "1");
    if (i < WORD.length - 1) mask[r].push(false);
  }
});
const COLS = mask[0].length; // 9 letras × 6 − 1 = 53, um ano inteiro

const SEED = 20261110;
let seed = SEED;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
// ruído determinístico com cara de um ano real: menos no fim de semana, com sazonalidade
const noiseLevel = (row, col) => {
  const weekend = row === 0 || row === 6;
  const season = 0.55 + 0.45 * Math.sin(col / 6 + 1);
  const p = rnd() * (weekend ? 0.5 : 1) * season;
  return p < 0.3 ? 0 : p < 0.5 ? 1 : p < 0.68 ? 2 : p < 0.82 ? 3 : 4;
};

function graph(T) {
  const CELL = 10, GAP = 3, PITCH = CELL + GAP, LEFT = 32, TOP = 22, DUR = 9;
  const W = LEFT + COLS * PITCH, H = TOP + 7 * PITCH + 34;
  const cells = [], used = new Set();
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < 7; r++) {
      const from = noiseLevel(r, c);
      const to = mask[r][c] ? 4 : rnd() < 0.06 ? 1 : 0; // alguns pontinhos para não parecer carimbo
      used.add(`${from}${to}`);
      const delay = (c * 0.028 + r * 0.012).toFixed(3);
      cells.push(`<rect x="${LEFT + c * PITCH}" y="${TOP + r * PITCH}" width="${CELL}" height="${CELL}" rx="2" fill="${T.levels[to]}" class="k${from}${to}" style="animation-delay:${delay}s"/>`);
    }
  }
  // um keyframe por par (ruído → final): gráfico real → nome → gráfico real
  const kf = [...used].map((k) => {
    const a = T.levels[+k[0]], b = T.levels[+k[1]];
    return `.k${k}{animation:a${k} ${DUR}s cubic-bezier(.65,0,.35,1) infinite}@keyframes a${k}{0%,28%{fill:${a}}40%,88%{fill:${b}}100%{fill:${a}}}`;
  }).join("");

  const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const months = [];
  const start = new Date();
  start.setDate(start.getDate() - (COLS - 1) * 7 - start.getDay());
  let last = -1;
  for (let c = 0; c < COLS; c++) {
    const d = new Date(start.getTime() + c * 7 * 864e5);
    if (d.getMonth() !== last && c < COLS - 2) {
      if (last !== -1 || d.getDate() <= 7) months.push(`<text x="${LEFT + c * PITCH}" y="12">${MESES[d.getMonth()]}</text>`);
      last = d.getMonth();
    }
  }
  const days = [[1, "seg"], [3, "qua"], [5, "sex"]].map(([r, s]) => `<text x="0" y="${TOP + r * PITCH + 9}">${s}</text>`).join("");
  const ly = TOP + 7 * PITCH + 16;
  const legend = T.levels.map((col, i) => `<rect x="${W - 30 - (5 - i) * PITCH}" y="${ly}" width="${CELL}" height="${CELL}" rx="2" fill="${col}"/>`).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${WORD} escrito num gráfico de contribuições do GitHub">
<title>${WORD}</title>
<style>
text{font:12px ${SANS};fill:${T.muted}}
${kf}
@media (prefers-reduced-motion:reduce){rect{animation:none!important}}
</style>
${months.join("")}
${days}
${cells.join("\n")}
<text x="${LEFT}" y="${ly + 9}">${esc(CAPTION)}</text>
<text x="${W - 30 - 5 * PITCH - 6}" y="${ly + 9}" text-anchor="end">menos</text>
${legend}
<text x="${W}" y="${ly + 9}" text-anchor="end">mais</text>
</svg>`;
}

// ───────────────────────── cards de projeto ─────────────────────────

function card(p, T) {
  const W = 460, H = 200;
  let x = 24;
  const chips = p.stack.map((s) => {
    const w = Math.ceil(s.length * 7.2 + 18);
    if (x + w > W - 24) return ""; // nunca deixa um chip vazar da borda
    const out = `<rect x="${x + 0.5}" y="152.5" width="${w - 1}" height="21" rx="10.5" fill="${T.chip}" stroke="${T.border}"/><text x="${x + w / 2}" y="166.5" class="m" text-anchor="middle">${esc(s)}</text>`;
    x += w + 6;
    return out;
  }).join("");
  const badges = {
    live: `<circle cx="${W - 82}" cy="31" r="3.5" fill="${T.green}" class="pulse"/><text x="${W - 24}" y="35" class="m" text-anchor="end" style="fill:${T.green}">no ar ↗</text>`,
    jam: `<circle cx="${W - 98}" cy="31" r="3.5" fill="${T.purple}"/><text x="${W - 24}" y="35" class="m" text-anchor="end" style="fill:${T.purple}">game jam ↗</text>`,
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(p.name)}">
<style>
text{font-family:${SANS};fill:${T.text}}
.m{font-family:${MONO};font-size:11.5px;fill:${T.muted}}
.d{font-size:14px;fill:${T.muted}}
.pulse{animation:p 2.4s ease-in-out infinite}@keyframes p{50%{opacity:.25}}
@media (prefers-reduced-motion:reduce){.pulse{animation:none}}
</style>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12" fill="${T.bg}" stroke="${T.border}"/>
<text x="24" y="35" class="m">${p.n}</text>
${badges[p.status]}
<text x="24" y="76" font-size="22" font-weight="600" letter-spacing="-.4">${esc(p.name)}</text>
<text x="24" y="104" class="d">${esc(p.desc[0])}</text>
<text x="24" y="124" class="d">${esc(p.desc[1])}</text>
${chips}
</svg>`;
}

// ───────────────────────── stack com logos ─────────────────────────

// Caminhos dos ícones vendorizados em icons.json: Simple Icons (CC0) e Devicon (MIT).
const ICONS = JSON.parse(await fs.readFile(path.join(ROOT, "scripts", "icons.json"), "utf8"));

const lum = (hex) => {
  const [r, g, b] = hex.replace("#", "").padEnd(6, hex.slice(-1)).match(/../g).map((c) => {
    const v = parseInt(c, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
// cor de marca que some no chip (logo preto no escuro, neon no claro) cai para a cor do texto
const ink = (fill, T) => (fill === "text" || (fill !== "#fff" && contrast(fill, T.chip) < 2) ? T.text : fill);

function logo(name, x, y, T) {
  const icon = ICONS[name];
  if (!icon) throw new Error(`sem ícone para ${name}`);
  return `<svg x="${x}" y="${y}" width="14" height="14" viewBox="${icon.viewBox}">${icon.paths.map((p) => `<path d="${p.d}" fill="${ink(p.fill, T)}"${p.rule ? ` fill-rule="${p.rule}"` : ""}/>`).join("")}</svg>`;
}

function stack(T) {
  const W = 940, PAD = 24, COL = 160, CH = 28, GAP = 6, LINE = CH + GAP, SECTION = 18;
  let y = PAD;
  const rows = STACK.map(([label, items], r) => {
    const rule = r ? `<line x1="${PAD}" x2="${W - PAD}" y1="${y - SECTION / 2 - 0.5}" y2="${y - SECTION / 2 - 0.5}" stroke="${T.border}" stroke-dasharray="2 4"/>` : "";
    const head = `<text x="${PAD}" y="${y + 18}" class="m">${esc(label)}</text>`;
    let x = COL;
    const chips = items.map((name) => {
      const w = Math.ceil(name.length * 7.2 + 40);
      if (x + w > W - PAD) { x = COL; y += LINE; }
      const out = `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${CH - 1}" rx="${CH / 2}" fill="${T.chip}" stroke="${T.border}"/>${logo(name, x + 10, y + 7, T)}<text x="${x + 30}" y="${y + 18}" class="m" style="fill:${T.text}">${esc(name)}</text>`;
      x += w + GAP;
      return out;
    }).join("");
    y += CH + SECTION;
    return rule + head + chips;
  }).join("\n");
  const H = y - SECTION + PAD;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Stack: ${esc(STACK.flatMap(([, i]) => i).join(", "))}">
<style>
text{font-family:${SANS};fill:${T.text}}
.m{font-family:${MONO};font-size:11.5px;fill:${T.muted}}
</style>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12" fill="${T.bg}" stroke="${T.border}"/>
${rows}
</svg>`;
}

// ───────────────────────── escrita ─────────────────────────

await fs.mkdir(ASSETS, { recursive: true });
for (const [name, T] of Object.entries(THEMES)) {
  seed = SEED; // mesmo desenho nos dois temas
  await fs.writeFile(path.join(ASSETS, `graph-${name}.svg`), graph(T));
}

for (const f of await fs.readdir(ASSETS)) if (/^(work|stack)-/.test(f)) await fs.rm(path.join(ASSETS, f));
let readme = await fs.readFile(path.join(ROOT, "README.md"), "utf8");
const outputs = [...PROJECTS.map((p) => [`work-${p.slug}`, (T) => card(p, T)]), ["stack", stack]];
for (const [base, render] of outputs) {
  const svgs = Object.entries(THEMES).map(([name, T]) => [name, render(T)]);
  const hash = crypto.createHash("sha1").update(svgs.map(([, s]) => s).join("")).digest("hex").slice(0, 7);
  for (const [name, svg] of svgs) await fs.writeFile(path.join(ASSETS, `${base}-${hash}-${name}.svg`), svg);
  readme = readme.replace(new RegExp(`assets/${base}-(?:[0-9a-f]{7}-)?(light|dark)\\.svg`, "g"), `assets/${base}-${hash}-$1.svg`);
}
await fs.writeFile(path.join(ROOT, "README.md"), readme);
console.log(`✓ gráfico (${COLS} colunas) + ${PROJECTS.length} cards + stack`);
