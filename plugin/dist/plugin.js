// plugin/src/host.ts
var React;
var setReact = (r) => {
  React = r;
};

// plugin/src/theme.ts
var t = {
  text: "var(--text-standard, #2e3440)",
  subtle: "var(--text-subtle, #4c566a)",
  border: "var(--border-standard, #d8dee9)",
  panel: "var(--surface-panel, #ffffff)",
  inset: "var(--space-panel-inset, 16px)",
  gap: "var(--space-2, 8px)"
};
var ROLE_COLORS = {
  light: { human: "#3B6FB6", agent: "#C8602A" },
  dark: { human: "#5A8AD6", agent: "#D2723C" }
};
var currentMode = () => {
  const set = document.documentElement.getAttribute("data-color-mode");
  if (set === "dark" || set === "light") return set;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};
function useRoleColors() {
  const [mode, setMode] = React.useState(currentMode);
  React.useEffect(() => {
    const update = () => setMode(currentMode());
    const seen = new MutationObserver(update);
    seen.observe(document.documentElement, { attributes: true, attributeFilter: ["data-color-mode"] });
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    media?.addEventListener("change", update);
    return () => {
      seen.disconnect();
      media?.removeEventListener("change", update);
    };
  }, []);
  return ROLE_COLORS[mode];
}
function useWidth() {
  const ref = React.useRef(null);
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const seen = new ResizeObserver(() => setWidth(el.clientWidth));
    seen.observe(el);
    setWidth(el.clientWidth);
    return () => seen.disconnect();
  }, []);
  return [ref, width];
}
var duration = (sec) => {
  if (sec === null) return "n/a";
  if (sec < 90) return `${Math.round(sec)} s`;
  if (sec < 90 * 60) return `${Math.round(sec / 60)} min`;
  return `${(sec / 3600).toFixed(1)} h`;
};
var percent = (part, whole) => whole ? `${Math.round(100 * part / whole)}%` : "n/a";
var clock = (at) => new Date(at * 1e3).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
var day = (at) => new Date(at * 1e3).toLocaleDateString([], { month: "short", day: "numeric" });
var plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
var hexagon = (cx, cy, r) => [0, 1, 2, 3, 4, 5].map((i) => `${(cx + r * Math.cos(Math.PI / 3 * i)).toFixed(2)},${(cy + r * Math.sin(Math.PI / 3 * i)).toFixed(2)}`).join(" ");
var numeric = { fontVariantNumeric: "tabular-nums" };

// plugin/src/parts.tsx
function RoleMark({ role, color, size = 12, hollow = false }) {
  const c = size / 2;
  const paint = hollow ? { fill: "none", stroke: color, strokeWidth: 1.5 } : { fill: color };
  return /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: `0 0 ${size} ${size}`, "aria-hidden": "true", style: { display: "inline-block", flex: "none", verticalAlign: "-1px" } }, role === "agent" ? /* @__PURE__ */ React.createElement("polygon", { points: hexagon(c, c, c - 1), ...paint }) : /* @__PURE__ */ React.createElement("circle", { cx: c, cy: c, r: c - 1.25, ...paint }));
}
function Card({ title, note, children }) {
  return /* @__PURE__ */ React.createElement("section", { className: "ui-card", style: { padding: t.inset, minWidth: 0, height: "100%", boxSizing: "border-box" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: t.gap, flexWrap: "wrap", marginBottom: 12 } }, /* @__PURE__ */ React.createElement("h3", { style: { margin: 0 } }, title), note && /* @__PURE__ */ React.createElement("span", { style: { color: t.subtle, fontSize: 12 } }, note)), children);
}
function Tile({ label, value, children }) {
  return /* @__PURE__ */ React.createElement("div", { style: { flex: "1 1 150px", minWidth: 0, border: `1px solid ${t.border}`, borderRadius: 8, padding: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { color: t.subtle, fontSize: 12 } }, label), /* @__PURE__ */ React.createElement("div", { style: { ...numeric, color: t.text, fontSize: 26, fontWeight: 600, lineHeight: 1.25 } }, value), /* @__PURE__ */ React.createElement("div", { style: { color: t.subtle, fontSize: 12, minHeight: 16 } }, children));
}
function Legend({ colors }) {
  const item = (role, label) => /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 4 } }, /* @__PURE__ */ React.createElement(RoleMark, { role, color: colors[role] }), " ", label);
  return /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", gap: 12, color: t.subtle, fontSize: 12 } }, item("human", "Human"), item("agent", "Agent"));
}
var Quiet = ({ children }) => /* @__PURE__ */ React.createElement("p", { style: { margin: 0, color: t.subtle } }, children);

// plugin/src/network.tsx
var W = 420;
var H = 300;
var MAX_NODES = 12;
function Network({ people, edges: edges2, names, colors }) {
  const [focus, setFocus] = React.useState(null);
  const linked = new Set(edges2.flatMap((e) => [e.from, e.to]));
  const busiest = people.filter((p) => linked.has(p.id)).slice(0, MAX_NODES);
  const shown = [...busiest.filter((p) => p.role === "human"), ...busiest.filter((p) => p.role === "agent")];
  if (!shown.length) return /* @__PURE__ */ React.createElement(Quiet, null, "No handoffs yet. A handoff is a message that mentions someone.");
  const cx = W / 2;
  const cy = H / 2 - 6;
  const n = shown.length;
  const humans = shown.filter((p) => p.role === "human").length;
  const ring = n === 1 ? 0 : Math.min(cx - 86, cy - 44);
  const most = Math.max(...shown.map((p) => p.messages), 1);
  const start = n === 2 || humans > 0 && humans < n ? Math.PI - Math.PI * (humans - 1) / n : -Math.PI / 2;
  const at = new Map(
    shown.map((p, i) => {
      const a = start + 2 * Math.PI * i / n;
      return [p.id, { x: cx + ring * Math.cos(a), y: cy + ring * Math.sin(a), r: 9 + 9 * Math.sqrt(p.messages / most), a, p }];
    })
  );
  const drawn = edges2.filter((e) => at.has(e.from) && at.has(e.to));
  const heaviest = Math.max(...drawn.map((e) => e.handoffs), 1);
  const dim = (ids) => focus && !ids.includes(focus) ? 0.15 : 1;
  const f = (v) => v.toFixed(1);
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Who hands off to whom", style: { width: "100%", maxWidth: 560, height: "auto", display: "block", margin: "0 auto" } }, drawn.map((e) => {
    const a = at.get(e.from);
    const b = at.get(e.to);
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const [ux, uy] = [(b.x - a.x) / len, (b.y - a.y) / len];
    const bow = Math.min(40, len * 0.22);
    const [mx, my] = [(a.x + b.x) / 2 - uy * bow, (a.y + b.y) / 2 + ux * bow];
    const toward = (p) => {
      const d2 = Math.hypot(mx - p.x, my - p.y) || 1;
      return [(mx - p.x) / d2, (my - p.y) / d2];
    };
    const [ax, ay] = toward(a);
    const [bx, by] = toward(b);
    const role = a.p.role;
    const width = heaviest <= 7 ? 1.5 + 0.75 * (e.handoffs - 1) : 1.5 + 4.5 * (e.handoffs - 1) / (heaviest - 1);
    const head = 4 + width * 1.2;
    const wing = head * 0.5;
    const [sx, sy] = [a.x + ax * (a.r + 3), a.y + ay * (a.r + 3)];
    const tip = [b.x + bx * (b.r + 3), b.y + by * (b.r + 3)];
    const base = [tip[0] + bx * head, tip[1] + by * head];
    const points = [tip, [base[0] - by * wing, base[1] + bx * wing], [base[0] + by * wing, base[1] - bx * wing]].map((q) => q.map(f).join(",")).join(" ");
    const d = `M${f(sx)},${f(sy)} Q${f(mx)},${f(my)} ${f(base[0] - bx * head * 0.3)},${f(base[1] - by * head * 0.3)}`;
    const share = e.answered / e.handoffs;
    return /* @__PURE__ */ React.createElement("g", { key: `${e.from}>${e.to}`, opacity: dim([e.from, e.to]) }, /* @__PURE__ */ React.createElement("path", { d, fill: "none", stroke: colors[role], strokeWidth: width, strokeLinecap: "round", opacity: 0.28 }), share > 0 && /* @__PURE__ */ React.createElement("path", { d, fill: "none", stroke: colors[role], strokeWidth: width, strokeLinecap: share < 1 ? "butt" : "round", pathLength: 100, strokeDasharray: share < 1 ? `${f(share * 100)} 100` : void 0, opacity: 0.85 }), /* @__PURE__ */ React.createElement("polygon", { points, fill: colors[role], opacity: share === 1 ? 0.85 : 0.4 }), /* @__PURE__ */ React.createElement("title", null, `${names(e.from)} to ${names(e.to)}: ${plural(e.handoffs, "handoff")}, ${e.answered} answered`));
  }), [...at.values()].map(({ x, y, r, a, p }) => {
    const out = shown.length === 1 ? { x, y: y + r + 16, anchor: "middle" } : { x: x + Math.cos(a) * (r + 8), y: y + Math.sin(a) * (r + 8) + 4, anchor: Math.cos(a) > 0.3 ? "start" : Math.cos(a) < -0.3 ? "end" : "middle" };
    const label = names(p.id);
    return /* @__PURE__ */ React.createElement("g", { key: p.id, opacity: dim([p.id, ...drawn.filter((e) => e.from === p.id || e.to === p.id).flatMap((e) => [e.from, e.to])]), onMouseEnter: () => setFocus(p.id), onMouseLeave: () => setFocus(null), style: { cursor: "default" } }, p.role === "agent" ? /* @__PURE__ */ React.createElement("polygon", { points: hexagon(x, y, r + 1), fill: colors.agent, stroke: t.panel, strokeWidth: 2 }) : /* @__PURE__ */ React.createElement("circle", { cx: x, cy: y, r, fill: colors.human, stroke: t.panel, strokeWidth: 2 }), /* @__PURE__ */ React.createElement("circle", { cx: x, cy: y, r: r + 8, fill: "transparent" }), /* @__PURE__ */ React.createElement("text", { x: out.x, y: out.y + (Math.abs(Math.cos(a)) <= 0.3 && shown.length > 1 ? Math.sin(a) > 0 ? 10 : -4 : 0), textAnchor: out.anchor, fontSize: 12, fill: t.text }, label.length > 16 ? `${label.slice(0, 15)}\u2026` : label), /* @__PURE__ */ React.createElement("title", null, `${label} (${p.role}): ${plural(p.messages, "message")}, ${p.sent} handoffs sent, ${p.answered} of ${p.received} received answered`));
  })), /* @__PURE__ */ React.createElement("p", { style: { margin: "8px 0 0", color: t.subtle, fontSize: 12 } }, "An arrow points from the person mentioning to the person mentioned. Thicker means more handoffs; the solid part is the share answered. A mark grows with messages.", busiest.length < people.filter((p) => linked.has(p.id)).length && ` Showing the ${MAX_NODES} most active.`));
}

// plugin/src/overview.tsx
function Tiles({ summary: s, colors }) {
  const { human, agent, total } = s.messages;
  const [ref, width] = useWidth();
  const columns = width >= 620 ? 4 : width >= 300 || !width ? 2 : 1;
  const count = { display: "inline-flex", alignItems: "center", gap: 3, whiteSpace: "nowrap" };
  return /* @__PURE__ */ React.createElement("div", { ref, style: { display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: t.gap } }, /* @__PURE__ */ React.createElement(Tile, { label: "Messages", value: String(total) }, total > 0 && /* @__PURE__ */ React.createElement("span", { title: `${human} from humans, ${agent} from agents` }, /* @__PURE__ */ React.createElement("span", { style: { display: "flex", gap: 2, height: 6, margin: "4px 0 6px" } }, human > 0 && /* @__PURE__ */ React.createElement("span", { style: { flex: human, background: colors.human, borderRadius: 3 } }), agent > 0 && /* @__PURE__ */ React.createElement("span", { style: { flex: agent, background: colors.agent, borderRadius: 3 } })), /* @__PURE__ */ React.createElement("span", { style: { display: "flex", columnGap: 6, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("span", { style: count }, /* @__PURE__ */ React.createElement(RoleMark, { role: "human", color: colors.human, size: 10 }), " ", human, " human"), /* @__PURE__ */ React.createElement("span", { style: count }, /* @__PURE__ */ React.createElement(RoleMark, { role: "agent", color: colors.agent, size: 10 }), " ", agent, " agent")))), s.allHandoffs.total ? /* @__PURE__ */ React.createElement(Tile, { label: "Handoffs answered", value: percent(s.allHandoffs.answered, s.allHandoffs.total) }, s.allHandoffs.answered, " of ", plural(s.allHandoffs.total, "handoff"), s.allHandoffs.medianLatency !== null && ` \xB7 median reply ${duration(s.allHandoffs.medianLatency)}`) : /* @__PURE__ */ React.createElement(Tile, { label: "Handoffs", value: "0" }, "a handoff is a message that mentions someone"), /* @__PURE__ */ React.createElement(Tile, { label: "Agent loops", value: String(s.loops) }, s.options.loopLength, "+ messages back and forth \xB7 longest agent run ", s.longestAgentRun), /* @__PURE__ */ React.createElement(Tile, { label: "Human interventions", value: String(s.interventions) }, "a human stepping into an agent run unasked"));
}
var ROLES = ["human", "agent"];
function Pairings({ summary: s, colors }) {
  const cell = { padding: "10px 12px", borderTop: `1px solid ${t.border}`, verticalAlign: "top", textAlign: "left" };
  const head = { padding: "0 12px 8px", textAlign: "left", fontWeight: 500, color: t.subtle, fontSize: 12 };
  const role = (r, prefix) => /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" } }, prefix, " ", /* @__PURE__ */ React.createElement(RoleMark, { role: r, color: colors[r] }), " ", r === "human" ? "a human" : "an agent");
  return /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { style: { ...head, width: "26%" } }), ROLES.map((to) => /* @__PURE__ */ React.createElement("th", { key: to, style: head }, role(to, "to"))))), /* @__PURE__ */ React.createElement("tbody", null, ROLES.map((from) => /* @__PURE__ */ React.createElement("tr", { key: from }, /* @__PURE__ */ React.createElement("th", { scope: "row", style: { ...cell, fontWeight: 500, color: t.subtle, fontSize: 12 } }, role(from, "From")), ROLES.map((to) => {
    const p = s.handoffs[`${from}\u2192${to}`];
    if (!p.total) return /* @__PURE__ */ React.createElement("td", { key: to, style: { ...cell, color: t.subtle } }, "None yet");
    return /* @__PURE__ */ React.createElement("td", { key: to, style: cell }, /* @__PURE__ */ React.createElement("div", { style: { ...numeric, fontSize: 20, fontWeight: 600, color: t.text } }, p.total, " ", /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, fontWeight: 400, color: t.subtle } }, p.total === 1 ? "handoff" : "handoffs")), /* @__PURE__ */ React.createElement("div", { style: { position: "relative", height: 6, borderRadius: 3, margin: "6px 0", overflow: "hidden" }, title: `${p.answered} of ${p.total} answered` }, /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", inset: 0, background: colors[from], opacity: 0.2 } }), /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", left: 0, top: 0, bottom: 0, width: `${100 * p.answered / p.total}%`, background: colors[from], borderRadius: 3 } })), /* @__PURE__ */ React.createElement("div", { style: { ...numeric, color: t.subtle, fontSize: 12 } }, percent(p.answered, p.total), " answered", p.medianLatency !== null && ` \xB7 ${duration(p.medianLatency)} median`));
  })))));
}

// plugin/src/people.tsx
function People({ people, names, colors, handoffs: handoffs2 = true }) {
  const th = { padding: "0 10px 8px 0", textAlign: "left", fontWeight: 500, color: t.subtle, fontSize: 12, whiteSpace: "nowrap" };
  const td = { ...numeric, padding: "7px 10px 7px 0", borderTop: `1px solid ${t.border}`, color: t.text, whiteSpace: "nowrap" };
  return /* @__PURE__ */ React.createElement("div", { style: { overflowX: "auto" } }, /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse" } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { style: th }, "Person"), /* @__PURE__ */ React.createElement("th", { style: th }, "Role"), /* @__PURE__ */ React.createElement("th", { style: th }, "Messages"), handoffs2 && /* @__PURE__ */ React.createElement("th", { style: th, title: "Handoffs this person started" }, "Sent"), handoffs2 && /* @__PURE__ */ React.createElement("th", { style: th, title: "Handoffs addressed to this person" }, "Received"), handoffs2 && /* @__PURE__ */ React.createElement("th", { style: th, title: "The share of those received that this person answered in time" }, "Answered"))), /* @__PURE__ */ React.createElement("tbody", null, people.map((p) => /* @__PURE__ */ React.createElement("tr", { key: p.id }, /* @__PURE__ */ React.createElement("td", { style: td }, /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement(RoleMark, { role: p.role, color: colors[p.role] }), " ", names(p.id))), /* @__PURE__ */ React.createElement("td", { style: { ...td, color: t.subtle } }, p.role), /* @__PURE__ */ React.createElement("td", { style: td }, p.messages), handoffs2 && /* @__PURE__ */ React.createElement("td", { style: td }, p.sent), handoffs2 && /* @__PURE__ */ React.createElement("td", { style: td }, p.received), handoffs2 && /* @__PURE__ */ React.createElement("td", { style: td, title: p.received ? `${p.answered} of ${p.received} answered` : void 0 }, percent(p.answered, p.received)))))));
}

// plugin/src/timeline.tsx
var LANE = 26;
var TOP = 20;
var GUTTER = 118;
var STEP = 9;
var MAX_LANES = 8;
var OTHERS = "\0others";
function Timeline({ beats, handoffs: handoffs2, names, colors }) {
  const [ref, width] = useWidth();
  if (!beats.length) return /* @__PURE__ */ React.createElement(Quiet, null, "No messages yet.");
  const fit = Math.max(12, Math.floor((width - GUTTER - 12) / STEP));
  const shown = beats.slice(-fit);
  const step = shown.length > 1 ? Math.min(40, (Math.max(width, 320) - GUTTER - 12) / (shown.length - 1)) : 0;
  const counts = /* @__PURE__ */ new Map();
  for (const b of shown) counts.set(b.author, (counts.get(b.author) ?? 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  const roleOfLane = new Map(shown.map((b) => [b.author, b.role]));
  const kept = ranked.length > MAX_LANES ? ranked.slice(0, MAX_LANES - 1) : ranked;
  const byRole = (role) => kept.filter((id) => roleOfLane.get(id) === role);
  const lanes = [...byRole("human"), ...byRole("agent"), ...ranked.length > MAX_LANES ? [OTHERS] : []];
  const laneOf = (author) => Math.max(0, lanes.indexOf(lanes.includes(author) ? author : OTHERS));
  const x = (i) => GUTTER + i * step;
  const y = (lane) => TOP + lane * LANE + LANE / 2;
  const height = TOP + lanes.length * LANE + 22;
  const [first, last] = [shown[0], shown[shown.length - 1]];
  const when = (at) => day(first.at) === day(last.at) ? clock(at) : day(at);
  const index = new Map(shown.map((b, i) => [b.id, i]));
  const bands = [];
  shown.forEach((b, i) => {
    if (!b.inLoop) return;
    const last2 = bands[bands.length - 1];
    if (last2 && last2[1] === i - 1) last2[1] = i;
    else bands.push([i, i]);
  });
  return /* @__PURE__ */ React.createElement("div", { ref, style: { minWidth: 0 } }, width > 0 && /* @__PURE__ */ React.createElement("svg", { width: "100%", height, role: "img", "aria-label": "Messages in order, one lane per person", style: { display: "block" } }, bands.map(([a, b], n) => /* @__PURE__ */ React.createElement("g", { key: a }, /* @__PURE__ */ React.createElement("rect", { x: x(a) - 6, y: TOP - 2, width: x(b) - x(a) + 12, height: lanes.length * LANE + 4, rx: 4, fill: t.text, opacity: 0.07 }), /* @__PURE__ */ React.createElement("text", { x: x(a) - 4, y: 12, fontSize: 11, fill: t.subtle }, n + 1 < bands.length && x(bands[n + 1][0]) - x(a) < 130 ? "\u21BB loop" : `\u21BB loop, ${b - a + 1} messages`))), lanes.map((id, i) => /* @__PURE__ */ React.createElement("g", { key: id }, /* @__PURE__ */ React.createElement("line", { x1: GUTTER - 8, x2: "100%", y1: y(i), y2: y(i), stroke: t.border, strokeWidth: 1 }), /* @__PURE__ */ React.createElement("text", { x: GUTTER - 14, y: y(i) + 4, textAnchor: "end", fontSize: 12, fill: t.text }, id === OTHERS ? `${ranked.length - MAX_LANES + 1} others` : names(id).length > 15 ? `${names(id).slice(0, 14)}\u2026` : names(id)))), /* @__PURE__ */ React.createElement("text", { x: GUTTER, y: height - 4, fontSize: 11, fill: t.subtle }, when(first.at)), shown.length > 1 && when(last.at) !== when(first.at) && /* @__PURE__ */ React.createElement("text", { x: x(shown.length - 1), y: height - 4, textAnchor: "end", fontSize: 11, fill: t.subtle }, when(last.at)), handoffs2.map((h) => {
    const from = index.get(h.id);
    const to = h.answeredBy ? index.get(h.answeredBy) : void 0;
    if (from === void 0 || to === void 0) return null;
    return /* @__PURE__ */ React.createElement("line", { key: `${h.id}>${h.to}`, x1: x(from), y1: y(laneOf(h.from)), x2: x(to), y2: y(laneOf(h.to)), stroke: colors[roleOfLane.get(h.from) ?? "human"], strokeWidth: 1.25, opacity: 0.4 });
  }), shown.map((b, i) => {
    const [cx, cy] = [x(i), y(laneOf(b.author))];
    const paint = b.dropped ? { fill: t.panel, stroke: colors[b.role], strokeWidth: 1.75 } : { fill: colors[b.role], stroke: t.panel, strokeWidth: 1.5 };
    const notes = [b.inLoop && "in a loop", b.intervention && "stepped into an agent run unasked", b.dropped && "handoff not answered"].filter(Boolean);
    return /* @__PURE__ */ React.createElement("g", { key: b.id }, b.intervention && /* @__PURE__ */ React.createElement("circle", { cx, cy, r: 8.5, fill: "none", stroke: t.text, strokeWidth: 1.25 }), b.role === "agent" ? /* @__PURE__ */ React.createElement("polygon", { points: hexagon(cx, cy, 5), ...paint }) : /* @__PURE__ */ React.createElement("circle", { cx, cy, r: 4.5, ...paint }), /* @__PURE__ */ React.createElement("circle", { cx, cy, r: Math.max(6, step / 2), fill: "transparent" }, /* @__PURE__ */ React.createElement("title", null, `${names(b.author)} \xB7 ${clock(b.at)}${notes.length ? ` \xB7 ${notes.join(", ")}` : ""}`)));
  })), /* @__PURE__ */ React.createElement("p", { style: { margin: "8px 0 0", color: t.subtle, fontSize: 12 } }, shown.length < beats.length ? `The latest ${shown.length} of ${beats.length} messages` : beats.length === 1 ? "The one message so far" : `All ${beats.length} messages`, ", in order from the left, evenly spaced whatever the time between them. A line joins a mention to its answer. Shaded: two agents going back and forth. Hollow: a handoff nobody answered. Ringed: a human stepping in unasked."));
}

// plugin/src/adapter.ts
var MESSAGE_KIND = 9;
var PROFILE_KIND = 0;
function toMessage(e) {
  const mentions = [...new Set(e.tags.filter((t2) => t2[0] === "p" && t2[1] && t2[1] !== e.pubkey).map((t2) => t2[1]))];
  const root = e.tags.find((t2) => t2[0] === "e" && t2[1])?.[1];
  return { id: e.id, author: e.pubkey, at: e.created_at, mentions, ...root ? { root } : {} };
}
function newest(profiles) {
  const out = /* @__PURE__ */ new Map();
  for (const p of profiles) {
    const seen = out.get(p.pubkey);
    if (!seen || p.created_at > seen.created_at) out.set(p.pubkey, p);
  }
  return out;
}
var profileContent = (p) => {
  try {
    const v = JSON.parse(p.content);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
};
function toRoster(profiles) {
  const roster = {};
  for (const [pubkey, p] of newest(profiles)) {
    if (p.tags.some((t2) => t2[0] === "auth") || profileContent(p).bot === true) roster[pubkey] = "agent";
  }
  return roster;
}
function toNames(profiles) {
  const names = {};
  for (const [pubkey, p] of newest(profiles)) {
    const c = profileContent(p);
    const name = [c.display_name, c.name].find((v) => typeof v === "string" && v.trim());
    if (typeof name === "string") names[pubkey] = name.trim().slice(0, 40);
  }
  return names;
}

// plugin/src/read.ts
var MESSAGE_LIMIT = 500;
async function readChannel(session, channelId, signal) {
  const events = (await session.read([{ kinds: [MESSAGE_KIND], "#h": [channelId], limit: MESSAGE_LIMIT }], { signal })).filter((e) => e.kind === MESSAGE_KIND);
  const messages = events.map(toMessage);
  const people = [...new Set(messages.flatMap((m) => [m.author, ...m.mentions]))].slice(0, MESSAGE_LIMIT);
  const profiles = people.length ? await session.read([{ kinds: [PROFILE_KIND], authors: people, limit: Math.min(MESSAGE_LIMIT, people.length * 2) }], { signal }) : [];
  return { messages, roster: toRoster(profiles), names: toNames(profiles), capped: events.length >= MESSAGE_LIMIT };
}
var measurable = (channels) => channels.filter((c) => !c.hidden && (c.channelType === void 0 || c.channelType === "stream" || c.channelType === "forum")).sort((a, b) => a.name.localeCompare(b.name));

// src/core/types.ts
var PAIRS = ["human\u2192human", "human\u2192agent", "agent\u2192human", "agent\u2192agent"];
var DEFAULTS = { handoffWindow: 30 * 60, loopLength: 6 };

// src/core/metrics.ts
var roleOf = (roster, author) => roster[author] ?? "human";
var pairOf = (from, to) => `${from}\u2192${to}`;
var ordered = (messages) => [...messages].sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
function handoffs(messages, roster, opts = DEFAULTS) {
  const seq = ordered(messages);
  const out = [];
  seq.forEach((m, i) => {
    for (const to of new Set(m.mentions)) {
      if (to === m.author) continue;
      const answer = seq.slice(i + 1).find((n) => n.author === to && n.at - m.at <= opts.handoffWindow);
      out.push({
        from: m.author,
        to,
        pair: pairOf(roleOf(roster, m.author), roleOf(roster, to)),
        id: m.id,
        at: m.at,
        ...answer ? { answeredBy: answer.id, latency: answer.at - m.at } : {}
      });
    }
  });
  return out;
}
function agentRuns(messages, roster) {
  const runs = [];
  let ids = [];
  let authors = [];
  let mentioned = /* @__PURE__ */ new Set();
  const close = (ender) => {
    if (ids.length) {
      runs.push({ ids, authors, agents: new Set(authors).size, ...ender ? { endedBy: ender.id } : {}, ...ender && mentioned.has(ender.author) ? { asked: true } : {} });
    }
    ids = [];
    authors = [];
    mentioned = /* @__PURE__ */ new Set();
  };
  for (const m of ordered(messages)) {
    if (roleOf(roster, m.author) === "agent") {
      ids.push(m.id);
      authors.push(m.author);
      for (const to of m.mentions) mentioned.add(to);
    } else close(m);
  }
  close();
  return runs;
}
function loops(runs, opts = DEFAULTS) {
  const out = [];
  for (const run of runs) {
    let start = 0;
    const flush = (end) => {
      if (end - start >= opts.loopLength) out.push({ ids: run.ids.slice(start, end), agents: [run.authors[start], run.authors[start + 1]] });
    };
    for (let i = 1; i <= run.authors.length; i++) {
      const alternates = i < run.authors.length && run.authors[i] !== run.authors[i - 1] && (i - start < 2 || run.authors[i] === run.authors[i - 2]);
      if (alternates) continue;
      flush(i);
      start = i < run.authors.length && run.authors[i] !== run.authors[i - 1] ? i - 1 : i;
    }
  }
  return out;
}
var interventions = (runs) => runs.filter((r) => r.endedBy && !r.asked && r.ids.length >= 2);
var median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
function summarize(messages, roster, opts = DEFAULTS) {
  const hs = handoffs(messages, roster, opts);
  const runs = agentRuns(messages, roster);
  const human = messages.filter((m) => roleOf(roster, m.author) === "human").length;
  const byPair = Object.fromEntries(
    PAIRS.map((p) => {
      const of = hs.filter((h) => h.pair === p);
      const answered = of.filter((h) => h.latency !== void 0);
      return [p, { total: of.length, answered: answered.length, medianLatency: median(answered.map((h) => h.latency)) }];
    })
  );
  const answeredAll = hs.filter((h) => h.latency !== void 0);
  const times = messages.map((m) => m.at);
  return {
    messages: { total: messages.length, human, agent: messages.length - human },
    handoffs: byPair,
    allHandoffs: { total: hs.length, answered: answeredAll.length, medianLatency: median(answeredAll.map((h) => h.latency)) },
    span: times.length ? { from: Math.min(...times), to: Math.max(...times) } : null,
    longestAgentRun: Math.max(0, ...runs.map((r) => r.ids.length)),
    loops: loops(runs, opts).length,
    interventions: interventions(runs).length,
    options: opts
  };
}

// src/core/views.ts
function participants(messages, roster, opts = DEFAULTS) {
  const by = /* @__PURE__ */ new Map();
  const get = (id) => {
    let p = by.get(id);
    if (!p) by.set(id, p = { id, role: roleOf(roster, id), messages: 0, sent: 0, received: 0, answered: 0 });
    return p;
  };
  for (const m of messages) get(m.author).messages++;
  for (const h of handoffs(messages, roster, opts)) {
    get(h.from).sent++;
    const to = get(h.to);
    to.received++;
    if (h.latency !== void 0) to.answered++;
  }
  return [...by.values()].sort((a, b) => b.messages - a.messages || (a.id < b.id ? -1 : 1));
}
function edges(messages, roster, opts = DEFAULTS) {
  const by = /* @__PURE__ */ new Map();
  for (const h of handoffs(messages, roster, opts)) {
    const key = `${h.from}\0${h.to}`;
    const e = by.get(key) ?? { from: h.from, to: h.to, handoffs: 0, answered: 0 };
    e.handoffs++;
    if (h.latency !== void 0) e.answered++;
    by.set(key, e);
  }
  return [...by.values()];
}
function timeline(messages, roster, opts = DEFAULTS) {
  const runs = agentRuns(messages, roster);
  const looped = new Set(loops(runs, opts).flatMap((r) => r.ids));
  const ended = new Set(interventions(runs).map((r) => r.endedBy));
  const dropped = /* @__PURE__ */ new Map();
  for (const h of handoffs(messages, roster, opts)) if (h.latency === void 0) dropped.set(h.id, (dropped.get(h.id) ?? 0) + 1);
  return ordered(messages).map((m) => ({
    id: m.id,
    author: m.author,
    role: roleOf(roster, m.author),
    at: m.at,
    inLoop: looped.has(m.id),
    intervention: ended.has(m.id),
    dropped: dropped.get(m.id) ?? 0
  }));
}
var shortId = (id) => id.length > 12 ? `${id.slice(0, 6)}\u2026${id.slice(-4)}` : id;
function labels(people, named, anonymous = false) {
  const out = {};
  if (anonymous) {
    const n = { human: 0, agent: 0 };
    for (const p of people) out[p.id] = `${p.role === "human" ? "Human" : "Agent"} ${++n[p.role]}`;
    return out;
  }
  const uses = /* @__PURE__ */ new Map();
  for (const p of people) if (named[p.id]) uses.set(named[p.id], (uses.get(named[p.id]) ?? 0) + 1);
  for (const p of people) {
    const name = named[p.id];
    out[p.id] = !name ? shortId(p.id) : uses.get(name) > 1 ? `${name} \xB7${p.id.slice(-4)}` : name;
  }
  return out;
}

// plugin/src/channel-view.tsx
function useMeasures(state, anonymous = false) {
  return React.useMemo(() => {
    const d = state.data;
    if (!d) return void 0;
    const people = participants(d.messages, d.roster);
    const shown = labels(people, d.names, anonymous);
    return {
      summary: summarize(d.messages, d.roster),
      people,
      edges: edges(d.messages, d.roster),
      beats: timeline(d.messages, d.roster),
      handoffs: handoffs(d.messages, d.roster),
      names: (id) => shown[id] ?? shortId(id),
      capped: d.capped
    };
  }, [state.data, anonymous]);
}
var spanText = (s) => {
  if (!s.span) return "";
  const { from, to } = s.span;
  if (day(from) !== day(to)) return `${day(from)} to ${day(to)}`;
  return clock(from) === clock(to) ? `${day(from)}, ${clock(from)}` : `${day(from)}, ${clock(from)} to ${clock(to)}`;
};
function ChannelView({ name, state, colors, compact = false, anonymous = false }) {
  const m = useMeasures(state, anonymous);
  const column = { display: "flex", flexDirection: "column", gap: t.gap, minWidth: 0 };
  if (!m) {
    return /* @__PURE__ */ React.createElement("div", { style: column }, /* @__PURE__ */ React.createElement("h2", { style: { margin: 0 } }, "#", name), /* @__PURE__ */ React.createElement(Quiet, null, state.status === "error" ? `Could not read this channel: ${state.error}` : "Reading the channel\u2026"));
  }
  const s = m.summary;
  return /* @__PURE__ */ React.createElement("div", { style: column }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: t.gap, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("h2", { style: { margin: 0 } }, "#", name), /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", gap: 12, alignItems: "center", flexWrap: "wrap", color: t.subtle, fontSize: 12 } }, spanText(s), s.messages.total > 0 && /* @__PURE__ */ React.createElement(Legend, { colors }))), state.status === "error" && /* @__PURE__ */ React.createElement(Quiet, null, "Showing the last good read. The latest one failed: ", state.error), s.messages.total === 0 ? /* @__PURE__ */ React.createElement(Quiet, null, "No messages in this channel yet. Counts appear as people and agents talk.") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Tiles, { summary: s, colors }), s.allHandoffs.total > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: t.gap } }, /* @__PURE__ */ React.createElement("div", { style: { flex: compact ? "1 1 100%" : "1 1 380px", minWidth: 0 } }, /* @__PURE__ */ React.createElement(Card, { title: "Who hands off to whom", note: `Answered within ${duration(s.options.handoffWindow)}` }, /* @__PURE__ */ React.createElement(Pairings, { summary: s, colors }))), /* @__PURE__ */ React.createElement("div", { style: { flex: compact ? "1 1 100%" : "1 1 380px", minWidth: 0 } }, /* @__PURE__ */ React.createElement(Card, { title: "Handoff network" }, /* @__PURE__ */ React.createElement(Network, { people: m.people, edges: m.edges, names: m.names, colors })))), /* @__PURE__ */ React.createElement(Card, { title: "Timeline" }, /* @__PURE__ */ React.createElement(Timeline, { beats: m.beats, handoffs: m.handoffs, names: m.names, colors })), /* @__PURE__ */ React.createElement(Card, { title: "People" }, /* @__PURE__ */ React.createElement(People, { people: m.people, names: m.names, colors, handoffs: s.allHandoffs.total > 0 })), m.capped && /* @__PURE__ */ React.createElement(Quiet, null, "Measured over the latest ", MESSAGE_LIMIT, " messages, the most Buzz returns in one read.")));
}

// plugin/src/compare.tsx
var ROWS = [
  ["Messages", (s) => String(s.messages.total)],
  ["From agents", (s) => percent(s.messages.agent, s.messages.total)],
  ["Handoffs", (s) => String(s.allHandoffs.total)],
  ["Handoffs answered", (s) => percent(s.allHandoffs.answered, s.allHandoffs.total)],
  ["Median reply", (s) => duration(s.allHandoffs.medianLatency)],
  ["Agent to agent, answered", (s) => percent(s.handoffs["agent\u2192agent"].answered, s.handoffs["agent\u2192agent"].total)],
  ["Human to agent, answered", (s) => percent(s.handoffs["human\u2192agent"].answered, s.handoffs["human\u2192agent"].total)],
  ["Longest agent run", (s) => String(s.longestAgentRun)],
  ["Agent loops", (s) => String(s.loops)],
  ["Human interventions", (s) => String(s.interventions)]
];
function Compare({ left, right }) {
  const th = { padding: "0 12px 8px 0", textAlign: "left", fontWeight: 600, color: t.text };
  const td = { ...numeric, padding: "7px 12px 7px 0", borderTop: `1px solid ${t.border}`, color: t.text };
  const value = (s, f) => s ? f(s) : "\u2026";
  return /* @__PURE__ */ React.createElement(Card, { title: "Side by side", note: "Same measures, same definitions" }, /* @__PURE__ */ React.createElement("div", { style: { overflowX: "auto" } }, /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse" } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { style: { ...th, fontWeight: 500, color: t.subtle, fontSize: 12 } }, "Measure"), /* @__PURE__ */ React.createElement("th", { style: th }, "#", left.name), /* @__PURE__ */ React.createElement("th", { style: th }, "#", right.name))), /* @__PURE__ */ React.createElement("tbody", null, ROWS.map(([label, f]) => /* @__PURE__ */ React.createElement("tr", { key: label }, /* @__PURE__ */ React.createElement("td", { style: { ...td, color: t.subtle } }, label), /* @__PURE__ */ React.createElement("td", { style: td }, value(left.summary, f)), /* @__PURE__ */ React.createElement("td", { style: td }, value(right.summary, f))))))));
}

// plugin/src/hooks.ts
function useSession(relay) {
  const [snap, setSnap] = React.useState(() => relay.snapshot());
  React.useEffect(() => relay.subscribe(() => setSnap(relay.snapshot())), [relay]);
  return snap.status === "ready" ? snap.session : void 0;
}
function useChannels(session) {
  const [channels, setChannels] = React.useState([]);
  const supported = !session || typeof session.channels?.list === "function";
  React.useEffect(() => {
    if (!session || !supported) return setChannels([]);
    const update = () => {
      try {
        setChannels(measurable(session.channels.list().channels ?? []));
      } catch {
        setChannels([]);
      }
    };
    update();
    return session.channels.subscribeList?.(update);
  }, [session, supported]);
  return { channels, supported };
}
var SETTLE_MS = 1500;
function useChannelData(session, channelId) {
  const [state, setState] = React.useState({ status: "idle", live: false });
  const [tick, setTick] = React.useState(0);
  const refresh = React.useCallback(() => setTick((n) => n + 1), []);
  React.useEffect(() => setState({ status: "idle", live: false }), [session, channelId]);
  React.useEffect(() => {
    if (!session || !channelId) return;
    const abort = new AbortController();
    setState((s) => ({ ...s, status: s.data ? s.status : "reading" }));
    readChannel(session, channelId, abort.signal).then((data) => setState((s) => ({ ...s, status: "ready", data, error: void 0, readAt: Date.now() }))).catch((e) => !abort.signal.aborted && setState((s) => ({ ...s, status: "error", error: String(e?.message ?? e) })));
    return () => abort.abort();
  }, [session, channelId, tick]);
  React.useEffect(() => {
    if (!session?.subscribeIncoming || !channelId) return;
    let timer;
    const stop = session.subscribeIncoming((messages) => {
      if (!messages.some((m) => m.channelId === channelId)) return;
      clearTimeout(timer);
      timer = setTimeout(refresh, SETTLE_MS);
    });
    setState((s) => ({ ...s, live: true }));
    return () => {
      clearTimeout(timer);
      stop();
    };
  }, [session, channelId, refresh]);
  return { ...state, refresh };
}

// plugin/src/snapshot.ts
var TOKENS = ["--text-standard", "--text-subtle", "--border-standard", "--surface-panel", "--space-panel-inset", "--space-2"];
var COPIED = [
  "display",
  "box-sizing",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "font-variant-numeric",
  "line-height",
  "letter-spacing",
  "color",
  "background-color",
  "text-align",
  "vertical-align",
  "white-space",
  "text-transform",
  "opacity",
  "box-shadow",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-top-style",
  "border-right-style",
  "border-bottom-style",
  "border-left-style",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "flex-direction",
  "flex-wrap",
  "flex-grow",
  "flex-shrink",
  "flex-basis",
  "align-items",
  "justify-content",
  "row-gap",
  "column-gap",
  "grid-template-columns",
  "table-layout",
  "border-collapse",
  "position"
];
var escape = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
function backdrop(el) {
  for (let at = el; at; at = at.parentElement) {
    const c = getComputedStyle(at).backgroundColor;
    if (c && c !== "transparent" && !/,\s*0\)$/.test(c)) return c;
  }
  return "#ffffff";
}
function snapshot(root, title) {
  const copy = root.cloneNode(true);
  const pairs = [[root, copy]];
  for (let i = 0; i < pairs.length; i++) {
    const [from, to] = pairs[i];
    const svgPart = from instanceof SVGElement && from.tagName.toLowerCase() !== "svg";
    if (!svgPart) {
      const seen2 = getComputedStyle(from);
      const style = to.style;
      for (const name of COPIED) style.setProperty(name, seen2.getPropertyValue(name));
    }
    for (let n = 0; n < from.children.length; n++) pairs.push([from.children[n], to.children[n]]);
  }
  for (const el of [...copy.querySelectorAll("[data-controls]")]) el.remove();
  const seen = getComputedStyle(root);
  const tokens = TOKENS.map((name) => [name, seen.getPropertyValue(name).trim()]).filter(([, value]) => value);
  const [width, height] = [Math.ceil(root.getBoundingClientRect().width), Math.ceil(root.scrollHeight)];
  const mode = document.documentElement.getAttribute("data-color-mode") ?? "";
  copy.style.setProperty("margin", "0 auto");
  copy.style.setProperty("width", `${width}px`);
  copy.style.setProperty("max-width", "none");
  return [
    "<!doctype html>",
    `<html lang="en" data-coordination-still="1" data-color-mode="${escape(mode)}" data-width="${width}" data-height="${height}" data-title="${escape(title)}" data-taken="${(/* @__PURE__ */ new Date()).toISOString()}">`,
    `<head><meta charset="utf-8"><title>Coordination: ${escape(title)}</title>`,
    `<style>:root{${tokens.map(([name, value]) => `${name}:${value}`).join(";")}}html,body{margin:0;background:${backdrop(root)}}</style></head>`,
    `<body>${copy.outerHTML}</body></html>`
  ].join("\n");
}

// plugin/src/page.tsx
function Frame({ children, content }) {
  return /* @__PURE__ */ React.createElement("div", { style: { height: "100%", overflowY: "auto", boxSizing: "border-box" } }, /* @__PURE__ */ React.createElement("div", { ref: content, "data-coordination-page": "", style: { padding: t.inset, display: "flex", flexDirection: "column", gap: 16, width: "100%", maxWidth: 1180, margin: "0 auto", boxSizing: "border-box", color: t.text } }, children));
}
var chosen = {};
function CoordinationPage({ relay }) {
  const session = useSession(relay);
  const { channels, supported } = useChannels(session);
  const colors = useRoleColors();
  const [a, setA] = React.useState(chosen.a);
  const [b, setB] = React.useState(chosen.b);
  const [comparing, setComparing] = React.useState(chosen.comparing ?? false);
  const [anonymous, setAnonymous] = React.useState(chosen.anonymous ?? false);
  Object.assign(chosen, { a, b, comparing, anonymous });
  const content = React.useRef(null);
  const [copied, setCopied] = React.useState("");
  const has = (id) => !!id && channels.some((c) => c.id === id);
  const idA = has(a) ? a : channels[0]?.id;
  const idB = comparing ? has(b) && b !== idA ? b : channels.find((c) => c.id !== idA)?.id : void 0;
  const nameOf = (id) => channels.find((c) => c.id === id)?.name ?? "";
  const left = useChannelData(session, idA);
  const right = useChannelData(session, idB);
  const leftMeasures = useMeasures(left);
  const rightMeasures = useMeasures(right);
  if (!session) return /* @__PURE__ */ React.createElement(Frame, null, /* @__PURE__ */ React.createElement("h1", { style: { margin: 0 } }, "Coordination"), /* @__PURE__ */ React.createElement(Quiet, null, "Connecting to the community\u2026"));
  if (!supported) return /* @__PURE__ */ React.createElement(Frame, null, /* @__PURE__ */ React.createElement("h1", { style: { margin: 0 } }, "Coordination"), /* @__PURE__ */ React.createElement(Quiet, null, "This version of Buzz does not share its channel list with plugins. Update Buzz, then open this page again."));
  if (!channels.length) return /* @__PURE__ */ React.createElement(Frame, null, /* @__PURE__ */ React.createElement("h1", { style: { margin: 0 } }, "Coordination"), /* @__PURE__ */ React.createElement(Quiet, null, "Join a channel in this community and it will appear here to measure."));
  const picker = (value, set, label, skip) => /* @__PURE__ */ React.createElement("select", { "aria-label": label, value: value ?? "", onChange: (e) => set(e.target.value), style: { maxWidth: 240 } }, channels.filter((c) => c.id !== skip).map((c) => /* @__PURE__ */ React.createElement("option", { key: c.id, value: c.id }, "#", c.name)));
  const refresh = () => {
    left.refresh();
    right.refresh();
  };
  const copy = () => {
    if (!content.current) return;
    const still = snapshot(content.current, comparing && idB ? `${nameOf(idA)} and ${nameOf(idB)}` : nameOf(idA));
    const done = (word) => {
      setCopied(word);
      setTimeout(() => setCopied(""), 2500);
    };
    navigator.clipboard.writeText(still).then(() => done("Copied"), () => done("Could not copy"));
  };
  return /* @__PURE__ */ React.createElement(Frame, { content }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h1", { style: { margin: 0 } }, "Coordination"), /* @__PURE__ */ React.createElement("p", { style: { margin: "2px 0 0", color: t.subtle } }, "How people and agents hand work to each other in a channel.")), /* @__PURE__ */ React.createElement("div", { "data-controls": "", style: { display: "flex", alignItems: "center", gap: t.gap, flexWrap: "wrap" } }, picker(idA, setA, "Channel"), comparing && /* @__PURE__ */ React.createElement("span", { style: { color: t.subtle } }, "and"), comparing && picker(idB, setB, "Channel to compare with", idA), channels.length > 1 && /* @__PURE__ */ React.createElement("button", { type: "button", "aria-pressed": comparing, onClick: () => setComparing(!comparing) }, comparing ? "Stop comparing" : "Compare"), /* @__PURE__ */ React.createElement("button", { type: "button", "aria-pressed": anonymous, title: "Show everyone by role and number, for a screenshot that names nobody", onClick: () => setAnonymous(!anonymous) }, anonymous ? "Show names" : "Hide names"), /* @__PURE__ */ React.createElement("button", { type: "button", title: "Put a still of this whole page on the clipboard, as one HTML file", onClick: copy }, copied || "Copy as HTML"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: refresh }, "Refresh"), /* @__PURE__ */ React.createElement("span", { style: { color: t.subtle, fontSize: 12, whiteSpace: "nowrap" }, title: "New messages are picked up as they arrive" }, left.live ? "\u25CF Live" : "", left.readAt ? ` \xB7 read ${clock(left.readAt / 1e3)}` : ""))), comparing && idB ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Compare, { left: { name: nameOf(idA), summary: leftMeasures?.summary }, right: { name: nameOf(idB), summary: rightMeasures?.summary } }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: "1 1 420px", minWidth: 0 } }, /* @__PURE__ */ React.createElement(ChannelView, { name: nameOf(idA), state: left, colors, compact: true, anonymous })), /* @__PURE__ */ React.createElement("div", { style: { flex: "1 1 420px", minWidth: 0 } }, /* @__PURE__ */ React.createElement(ChannelView, { name: nameOf(idB), state: right, colors, compact: true, anonymous })))) : /* @__PURE__ */ React.createElement(ChannelView, { name: nameOf(idA), state: left, colors, anonymous }), /* @__PURE__ */ React.createElement("p", { style: { margin: 0, color: t.subtle, fontSize: 12 } }, "Counts come from message order and mentions only; nothing reads what a message says. This plugin reads the channel and never posts."));
}

// plugin/src/panel.tsx
var Sign = ({ size = 16 }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: "1.4", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M5.2 6.2 7.2 10M10.8 6.2 8.8 10M6 4.5h4", strokeLinecap: "round" }), /* @__PURE__ */ React.createElement("circle", { cx: "4", cy: "4.5", r: "2" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "4.5", r: "2" }), /* @__PURE__ */ React.createElement("path", { d: "M8 9.6l2.1 1.2v2.4L8 14.4l-2.1-1.2v-2.4z", strokeLinejoin: "round" }));
function Launcher({ context, pressed, toggle, available }) {
  return /* @__PURE__ */ React.createElement("button", { type: "button", title: "Coordination", "aria-label": "Show how this channel coordinates", "aria-pressed": pressed, onClick: () => available() && toggle(context.channelId) }, /* @__PURE__ */ React.createElement(Sign, null));
}
function ChannelPanel({ relay, channelContext }) {
  const session = useSession(relay);
  const colors = useRoleColors();
  const state = useChannelData(session, channelContext?.channelId);
  if (!channelContext) return /* @__PURE__ */ React.createElement("div", { style: { padding: t.inset } }, /* @__PURE__ */ React.createElement(Quiet, null, "Open this from a channel to measure it."));
  return /* @__PURE__ */ React.createElement("div", { style: { padding: t.inset, color: t.text, overflowY: "auto", height: "100%", boxSizing: "border-box" } }, /* @__PURE__ */ React.createElement(ChannelView, { name: channelContext.channelName, state, colors, compact: true }));
}

// plugin/src/index.tsx
var inject = ["react", "pages", "panels", "relay"];
var ICON = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#4c566a" stroke-width="1.4"><path d="M5.2 6.2 7.2 10M10.8 6.2 8.8 10M6 4.5h4" stroke-linecap="round"/><circle cx="4" cy="4.5" r="2"/><circle cx="12" cy="4.5" r="2"/><path d="M8 9.6l2.1 1.2v2.4L8 14.4l-2.1-1.2v-2.4z" stroke-linejoin="round"/></svg>'
);
function apply(ctx) {
  setReact(ctx.react);
  ctx.pages.register({
    id: "coordination",
    title: "Coordination",
    primary: true,
    placement: "topbar",
    // the app's main navigation; newer hosts call it the dock and accept this name
    icon: ICON,
    component: () => /* @__PURE__ */ React.createElement(CoordinationPage, { relay: ctx.relay })
  });
  ctx.panels.register({
    id: "channel",
    title: "Coordination",
    matches: () => false,
    // opened only from the channel header, never by a link
    channelLauncher: Launcher,
    channelPlacement: "side",
    component: (props) => /* @__PURE__ */ React.createElement(ChannelPanel, { relay: ctx.relay, channelContext: props.channelContext })
  });
}
export {
  apply,
  inject
};
