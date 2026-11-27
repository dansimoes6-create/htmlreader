/* Clipador — painel */
"use strict";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const view = $("#view");
const state = { tab: "painel", settings: null, clipFilter: "ready,approved", clipSort: "new", clipChannel: "", timer: null, openSources: new Set() };

const PL = { youtube: "YT", twitch: "TW", kick: "K", link: "🔗", upload: "⬆", other: "•" };
const LAYOUTS = { blur: "Fundo desfocado", crop: "Cortar no centro", split: "Facecam em cima + jogo", fit: "Inteiro (barras)" };
const CLIP_STATUS = { rendering: ["Editando", ""], ready: ["Pronto", ""], approved: ["Aprovado", "warn"], posted: ["Postado", "good"], rejected: ["Rejeitado", "bad"], error: ["Erro", "bad"] };
const SRC_STATUS = { queued: "Na fila", downloading: "Baixando", splitting: "Dividindo em blocos", ready: "Processando", recording: "Gravando ao vivo", done: "Concluído", error: "Erro", cancelled: "Cancelado", uploading: "Enviando" };

function esc(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function fmtTime(sec) { sec = Math.max(0, Math.round(sec || 0)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`; }
function ago(ts) { if (!ts) return "nunca"; const d = Date.now() / 1000 - ts; if (d < 60) return "agora"; if (d < 3600) return `há ${Math.floor(d / 60)} min`; if (d < 86400) return `há ${Math.floor(d / 3600)} h`; return `há ${Math.floor(d / 86400)} d`; }
function clock(ts) { return new Date(ts * 1000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }
function scoreClass(s) { const min = state.settings?.min_score ?? 7.5; return s == null ? "lo" : s >= min ? "hi" : s >= 5 ? "mid" : "lo"; }
function scoreBadge(s) { return `<span class="score ${scoreClass(s)}">${s == null ? "–" : Number(s).toFixed(1)}<small>/10</small></span>`; }

function toast(msg, bad = false) {
  const t = $("#toast"); t.textContent = msg; t.className = "toast" + (bad ? " bad" : "");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.add("hidden"), 3800);
}

async function api(path, opts = {}) {
  const o = { credentials: "same-origin", ...opts, headers: { ...(opts.headers || {}) } };
  if (o.body && !(o.body instanceof FormData) && typeof o.body !== "string") { o.body = JSON.stringify(o.body); o.headers["Content-Type"] = "application/json"; }
  const r = await fetch(path, o);
  if (r.status === 401) { showAuth(); throw new Error("não autenticado"); }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof data.detail === "string" ? data.detail : "erro " + r.status);
  return data;
}
const post = (p, body) => api(p, { method: "POST", body: body || {} });

/* ------------------------------------------------------------------ auth */
async function boot() {
  let st;
  try { st = await (await fetch("/api/auth/state")).json(); } catch { st = { has_account: true }; }
  if (!st.user) return showAuth(st.has_account);
  showApp();
}
function showAuth(hasAccount = true) {
  $("#shell").classList.add("hidden"); $("#auth").classList.remove("hidden");
  const creating = !hasAccount;
  $("#authBtn").textContent = creating ? "Criar minha conta" : "Entrar";
  $("#authHint").textContent = creating ? "Cria sua conta e já começa a usar." : "Cortes automáticos das suas lives.";
  $("#authForm").dataset.mode = creating ? "register" : "login";
  $("#authForm [name=password]").autocomplete = creating ? "new-password" : "current-password";
}
$("#authForm").addEventListener("submit", async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  $("#authErr").textContent = "";
  try {
    const r = await fetch(`/api/auth/${e.target.dataset.mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: f.get("username"), password: f.get("password") }) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.detail || "erro");
    showApp();
  } catch (err) { $("#authErr").textContent = err.message; }
});
$("#logoutBtn").addEventListener("click", async () => { await post("/api/auth/logout"); location.reload(); });

async function showApp() {
  $("#auth").classList.add("hidden"); $("#shell").classList.remove("hidden");
  try { state.settings = await api("/api/settings"); } catch { }
  route();
}

/* ------------------------------------------------------------------ router */
window.addEventListener("hashchange", route);
function route() {
  const tab = (location.hash || "#painel").slice(1).split("/")[0] || "painel";
  state.tab = tab;
  $$("[data-tab]").forEach(a => a.classList.toggle("active", a.dataset.tab === tab));
  clearInterval(state.timer);
  const pages = { painel: pagePainel, canais: pageCanais, cortes: pageCortes, fila: pageFila, config: pageConfig };
  (pages[tab] || pagePainel)();
  window.scrollTo(0, 0);
}
function every(ms, fn) { clearInterval(state.timer); state.timer = setInterval(() => { if (!document.hidden && $("#modal").classList.contains("hidden")) fn(); }, ms); }

/* ------------------------------------------------------------------ painel */
async function pagePainel() {
  view.innerHTML = `
  <div class="card hero">
    <h1>Cola o link. O resto é com a gente.</h1>
    <p class="muted">Canal do YouTube, Twitch ou Kick vira monitor automático. Link de um vídeo ou VOD é cortado uma vez.</p>
    <form class="paste" id="pasteForm">
      <input id="pasteInput" placeholder="twitch.tv/streamer · youtube.com/@canal · link do vídeo" autocomplete="off" inputmode="url">
      <button class="btn primary">Monitorar</button>
      <label class="btn" style="flex-direction:row;color:var(--text)">⬆ Enviar vídeo<input type="file" id="uploadInput" accept="video/*" hidden></label>
    </form>
    <div class="chips">
      <span class="chip"><i style="background:#ff0033"></i>YouTube: vídeo novo conferido a cada ${state.settings?.youtube_poll_minutes ?? 15} min</span>
      <span class="chip"><i style="background:#9146ff"></i>Twitch e Kick: live gravada em blocos de ${state.settings?.block_minutes ?? 10} min</span>
    </div>
  </div>
  <div class="pipeline" id="pipeline"></div>
  <div class="stats" id="stats"></div>
  <div class="two-col">
    <div class="card"><div class="row" style="justify-content:space-between;margin-bottom:12px"><h2>Cortes recentes</h2><a class="btn small ghost" href="#cortes">Ver todos</a></div><div class="clips" id="recent"></div></div>
    <div class="card"><h2 style="margin-bottom:10px">Atividade</h2><div class="logs" id="logs"></div></div>
  </div>`;
  $("#pasteForm").addEventListener("submit", async e => {
    e.preventDefault();
    const url = $("#pasteInput").value.trim(); if (!url) return;
    try {
      const r = await post("/api/sources", { url });
      $("#pasteInput").value = "";
      toast(r.channel ? `Monitorando ${r.channel.name}. Assim que tiver lance, o corte aparece aqui.` : "Link na fila — vou baixar, dividir em blocos e cortar.");
      loadPainel();
    } catch (err) { toast(err.message, true); }
  });
  $("#uploadInput").addEventListener("change", e => uploadFile(e.target.files[0]));
  await loadPainel();
  every(5000, loadPainel);
}

async function uploadFile(file) {
  if (!file) return;
  const fd = new FormData(); fd.append("file", file);
  toast(`Enviando ${file.name}…`);
  try { await api("/api/upload", { method: "POST", body: fd }); toast("Vídeo enviado — entrou na fila."); }
  catch (err) { toast(err.message, true); }
}

async function loadPainel() {
  const [s, clips, logs] = await Promise.all([api("/api/stats"), api("/api/clips?limit=8"), api("/api/logs?limit=60")]);
  if (!$("#stats")) return;
  const ms = state.settings?.min_score ?? 7.5;
  $("#pipeline").innerHTML = [
    ["Monitor", s.live_now ? `${s.live_now} ao vivo` : `${s.channels} canal(is)`, "Confere os canais e grava a live em blocos"],
    ["Detector", `${s.blocks_pending} na fila`, "Cruza volume, movimento e fala; pula trecho parado"],
    ["Corte", `${s.clips_24h} em 24h`, "Em pé (9:16), com legenda palavra a palavra"],
    ["Nota", s.avg_score ? `média ${s.avg_score}` : "–", "Cada corte recebe nota de 0 a 10"],
    ["Post", `${s.posted_24h} em 24h`, `Passou de ${ms}, posta sozinho`],
  ].map(([t, b, p]) => `<div class="step"><span class="tag">${t}</span><b>${esc(b)}</b><p>${p}</p></div>`).join("");
  $("#stats").innerHTML = [
    ["Ao vivo agora", s.live_now, s.live_now ? "live" : ""],
    ["Cortes prontos p/ revisar", s.clips_ready],
    ["Horas assistidas", s.hours_watched.toFixed(1)],
    ["Horas paradas puladas", s.dead_skipped_hours.toFixed(1)],
  ].map(([l, v, c]) => `<div class="stat ${c || ""}"><b>${v}</b><span>${l}</span></div>`).join("");
  $("#recent").innerHTML = clips.length ? clips.map(clipCard).join("") : `<div class="empty" style="grid-column:1/-1"><b>Nenhum corte ainda</b>Cole um canal ou link aí em cima.</div>`;
  bindClipCards($("#recent"));
  $("#logs").innerHTML = logs.map(l => `<div class="log ${l.level}"><time>${clock(l.ts)}</time><span>${esc(l.msg)}</span></div>`).join("") || `<p class="muted">Sem atividade.</p>`;
}

/* ------------------------------------------------------------------ canais */
async function pageCanais() {
  view.innerHTML = `
  <div class="page-head"><div><h1>Canais</h1><p class="muted">De onde vêm os vídeos. Cada canal é conferido sozinho e o que sai de novo vira corte, sem você colar link.</p></div></div>
  <div class="card">
    <h2>Adicionar canal</h2>
    <div class="platforms">
      <div class="platform-line"><span class="pl youtube">YT</span>YouTube: vídeo novo é conferido a cada ${state.settings?.youtube_poll_minutes ?? 15} min${state.settings?.youtube_lives ? " (e lives são gravadas também)" : ""}.</div>
      <div class="platform-line"><span class="pl twitch">TW</span><span class="pl kick">K</span>Twitch e Kick: a live é gravada e cortada em blocos de ${state.settings?.block_minutes ?? 10} min, com ela no ar.</div>
    </div>
    <form class="paste" id="chForm" style="margin-top:4px">
      <input id="chUrl" placeholder="twitch.tv/streamer" autocomplete="off" inputmode="url">
      <button class="btn primary">Monitorar</button>
    </form>
  </div>
  <div class="ch-list" id="chList"></div>`;
  $("#chForm").addEventListener("submit", async e => {
    e.preventDefault();
    const url = $("#chUrl").value.trim(); if (!url) return;
    try { const c = await post("/api/channels", { url }); $("#chUrl").value = ""; toast(`Monitorando ${c.name}.`); loadCanais(); }
    catch (err) { toast(err.message, true); }
  });
  await loadCanais();
  every(6000, loadCanais);
}

async function loadCanais() {
  const list = await api("/api/channels");
  const box = $("#chList"); if (!box) return;
  const open = new Set($$(".ch.open", box).map(e => e.dataset.id));
  if (!list.length) { box.innerHTML = `<div class="empty"><b>Nenhum canal ainda</b>Adicione um canal aí em cima — ele é conferido sozinho, toda hora.</div>`; return; }
  box.innerHTML = list.map(c => {
    const status = c.recording ? `<span class="badge live">Ao vivo · gravando</span>` : c.last_error ? `<span class="badge bad" title="${esc(c.last_error)}">Erro</span>` : c.enabled ? `<span class="badge good">Monitorando</span>` : `<span class="badge">Pausado</span>`;
    const over = [c.min_score != null ? `nota mín. ${c.min_score}` : "", c.layout ? LAYOUTS[c.layout] : "", c.auto_post != null ? (c.auto_post ? "posta sozinho" : "só aprova") : ""].filter(Boolean).join(" · ");
    return `<div class="card ch ${open.has(String(c.id)) ? "open" : ""}" data-id="${c.id}">
      <span class="pl ${c.platform}">${PL[c.platform] || "•"}</span>
      <div><div class="name">${esc(c.name)} ${status}</div>
        <div class="meta">${esc(c.url)} · conferido ${ago(c.last_check)} · ${c.clips} corte(s), ${c.posted} postado(s)${over ? " · " + esc(over) : ""}</div>
        ${c.last_error ? `<div class="meta" style="color:var(--bad)">${esc(c.last_error)}</div>` : ""}</div>
      <div class="row actions">
        ${c.recording ? `<button class="btn small danger" data-act="stop">Parar e pausar</button>` : `<button class="btn small" data-act="check">Conferir agora</button>`}
        <button class="btn small ghost" data-act="toggle">Ajustes</button>
      </div>
      <div class="ch-settings grid3">
        <label>Nota mínima p/ postar<input type="number" step="0.5" min="0" max="10" data-f="min_score" value="${c.min_score ?? ""}" placeholder="padrão (${state.settings?.min_score})"></label>
        <label>Formato do corte<select data-f="layout"><option value="">padrão (${LAYOUTS[state.settings?.layout] || ""})</option>${Object.entries(LAYOUTS).map(([k, v]) => `<option value="${k}" ${c.layout === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label>Postagem<select data-f="auto_post"><option value="">padrão</option><option value="1" ${c.auto_post === 1 ? "selected" : ""}>Posta sozinho</option><option value="0" ${c.auto_post === 0 ? "selected" : ""}>Só aprova (eu posto)</option></select></label>
        <label class="check"><span class="switch"><input type="checkbox" data-f="enabled" ${c.enabled ? "checked" : ""}><span></span></span>Monitor ligado</label>
        <div></div>
        <div class="row" style="justify-content:flex-end"><button class="btn small danger" data-act="del">Remover canal</button><button class="btn small primary" data-act="save">Salvar</button></div>
      </div>
    </div>`;
  }).join("");
  $$(".ch", box).forEach(el => {
    const id = el.dataset.id;
    el.addEventListener("click", async e => {
      const act = e.target.closest("[data-act]")?.dataset.act; if (!act) return;
      try {
        if (act === "toggle") el.classList.toggle("open");
        if (act === "check") { await post(`/api/channels/${id}/check`); toast("Conferindo o canal…"); setTimeout(loadCanais, 4000); }
        if (act === "stop") { await post(`/api/channels/${id}/stop`); toast("Gravação parada e monitor pausado — o último bloco ainda vira corte."); setTimeout(loadCanais, 3000); }
        if (act === "del" && confirm("Remover este canal? Os cortes já feitos continuam.")) { await api(`/api/channels/${id}`, { method: "DELETE" }); loadCanais(); }
        if (act === "save") {
          const v = f => $(`[data-f=${f}]`, el);
          const body = { enabled: v("enabled").checked };
          if (v("min_score").value === "") body.clear_min_score = true; else body.min_score = Number(v("min_score").value);
          if (v("layout").value === "") body.clear_layout = true; else body.layout = v("layout").value;
          if (v("auto_post").value === "") body.clear_auto_post = true; else body.auto_post = v("auto_post").value === "1";
          await api(`/api/channels/${id}`, { method: "PATCH", body }); el.classList.remove("open"); toast("Canal salvo."); loadCanais();
        }
      } catch (err) { toast(err.message, true); }
    });
  });
}

/* ------------------------------------------------------------------ cortes */
function clipCard(c) {
  const [label, cls] = CLIP_STATUS[c.status] || [c.status, ""];
  const thumb = c.thumb_url ? `style="background-image:url('${c.thumb_url}')"` : "";
  return `<div class="clip" data-id="${c.id}">
    <div class="thumb" ${thumb}>
      ${c.status === "rendering" ? `<div class="rendering">Editando…</div>` : ""}
      <span class="score-wrap">${scoreBadge(c.score)}</span>
      <span class="st badge ${cls}">${label}</span>
      <span class="dur">${fmtTime(c.duration)}</span>
    </div>
    <div class="info"><div class="title">${esc(c.title || "Sem título")}</div><div class="sub">${ago(c.created_at)}</div></div>
  </div>`;
}
function bindClipCards(root) { $$(".clip", root).forEach(el => el.addEventListener("click", () => openClip(el.dataset.id))); }

async function pageCortes() {
  const channels = await api("/api/channels").catch(() => []);
  const filters = [["ready,approved", "Para revisar"], ["posted", "Postados"], ["", "Todos"], ["rejected", "Rejeitados"], ["error", "Com erro"]];
  view.innerHTML = `
  <div class="page-head"><div><h1>Cortes</h1><p class="muted">Cada corte já sai em pé, com legenda e nota. Passou da sua nota, posta sozinho.</p></div></div>
  <div class="filters">
    <div class="seg" id="segStatus">${filters.map(([k, v]) => `<button data-k="${k}" class="${state.clipFilter === k ? "on" : ""}">${v}</button>`).join("")}</div>
    <div class="seg" id="segSort"><button data-k="new" class="${state.clipSort === "new" ? "on" : ""}">Mais novos</button><button data-k="score" class="${state.clipSort === "score" ? "on" : ""}">Maior nota</button></div>
    <select id="chFilter"><option value="">Todos os canais</option>${channels.map(c => `<option value="${c.id}" ${String(state.clipChannel) === String(c.id) ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>
  </div>
  <div class="clips" id="clipGrid"></div>`;
  $("#segStatus").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.clipFilter = b.dataset.k; $$("#segStatus button").forEach(x => x.classList.toggle("on", x === b)); loadCortes(); });
  $("#segSort").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.clipSort = b.dataset.k; $$("#segSort button").forEach(x => x.classList.toggle("on", x === b)); loadCortes(); });
  $("#chFilter").addEventListener("change", e => { state.clipChannel = e.target.value; loadCortes(); });
  await loadCortes();
  every(8000, loadCortes);
  const m = location.hash.match(/^#cortes\/(\d+)/); if (m) openClip(m[1]);
}

async function loadCortes() {
  const p = new URLSearchParams({ sort: state.clipSort, limit: 120 });
  if (state.clipFilter) p.set("status", state.clipFilter + (state.clipFilter === "ready,approved" ? ",rendering" : ""));
  if (state.clipChannel) p.set("channel_id", state.clipChannel);
  const clips = await api("/api/clips?" + p);
  const g = $("#clipGrid"); if (!g) return;
  g.innerHTML = clips.length ? clips.map(clipCard).join("") : `<div class="empty" style="grid-column:1/-1"><b>Nada por aqui</b>Os cortes aparecem assim que o detector achar um lance.</div>`;
  bindClipCards(g);
}

async function openClip(id) {
  let c;
  try { c = await api(`/api/clips/${id}`); } catch (err) { return toast(err.message, true); }
  const nets = [["tiktok", "TikTok"], ["instagram", "Instagram Reels"], ["youtube", "YouTube Shorts"]];
  const posted = Object.fromEntries((c.posts || []).filter(p => p.status === "done").map(p => [p.platform, p]));
  const [label, cls] = CLIP_STATUS[c.status] || [c.status, ""];
  openModal(`
    <button class="btn small ghost modal-close" data-close>✕</button>
    <div class="clip-detail">
      <div>${c.video_url ? `<video src="${c.video_url}" controls playsinline preload="metadata" poster="${c.thumb_url || ""}"></video>` : `<div class="empty" style="aspect-ratio:9/16;display:grid;place-items:center">${c.status === "rendering" ? "Editando…" : "Sem vídeo"}</div>`}</div>
      <div class="stack">
        <div class="row" style="justify-content:space-between"><div class="row">${scoreBadge(c.score)}<span class="badge ${cls}">${label}</span></div>
          <span class="muted small">${esc(c.source?.title || "")} · ${fmtTime((c.block_offset || 0) + c.start)}–${fmtTime((c.block_offset || 0) + c.end)}</span></div>
        <div class="kv">
          <div><b>${c.heuristic_score ?? "–"}</b><span>Nota do detector</span></div>
          <div><b>${c.ai_score ?? "–"}</b><span>Nota da IA</span></div>
          <div><b>${fmtTime(c.duration)}</b><span>Duração</span></div>
        </div>
        ${c.reasons.length ? `<div class="reasons">${c.reasons.map(r => `<span class="chip">${esc(r)}</span>`).join("")}</div>` : ""}
        ${c.error ? `<p class="err">${esc(c.error)}</p>` : ""}
        <label>Título<input id="cTitle" value="${esc(c.title || "")}"></label>
        <label>Legenda do post<textarea id="cCaption">${esc(c.caption || "")}</textarea></label>
        <label>Hashtags<input id="cTags" value="${esc(c.hashtags || "")}" placeholder="#cortes #live"></label>
        <div class="row"><button class="btn small" id="cSave">Salvar texto</button>${c.video_url ? `<a class="btn small" href="${c.video_url}" download="corte_${c.id}.mp4">⬇ Baixar</a>` : ""}</div>
        <div class="card" style="padding:14px">
          <h3>Postar</h3>
          <div class="row" style="margin:10px 0">${nets.map(([k, v]) => posted[k] ? `<span class="chip" style="color:var(--good)">✓ ${v}${posted[k].url ? ` · <a href="${esc(posted[k].url)}" target="_blank" rel="noopener">abrir</a>` : ""}</span>` : `<label class="check"><input type="checkbox" class="netpick" value="${k}" ${state.settings?.["post_" + k] ? "checked" : ""}>${v}</label>`).join("")}</div>
          ${(c.posts || []).filter(p => p.status === "error").map(p => `<p class="err small">${esc(p.platform)}: ${esc(p.error)}</p>`).join("")}
          <div class="row"><button class="btn primary small" id="cPost">Postar agora</button>
          ${c.status === "rejected" ? `<button class="btn small" id="cRestore">Restaurar</button>` : `<button class="btn small danger" id="cReject">Rejeitar</button>`}
          <button class="btn small ghost danger" id="cDelete">Excluir</button></div>
        </div>
        <div class="card" style="padding:14px">
          <h3>Ajustar corte</h3>
          ${c.can_rerender ? `<p class="muted small" style="margin:6px 0 10px">Mexa no começo/fim (segundos dentro do bloco de ${fmtTime(c.block_duration)}) ou troque o formato e refaça.</p>
          <div class="trim">
            <label>Início (s)<input type="number" step="0.5" id="tStart" value="${c.start}"></label>
            <label>Fim (s)<input type="number" step="0.5" id="tEnd" value="${c.end}"></label>
            <label>Formato<select id="tLayout">${Object.entries(LAYOUTS).map(([k, v]) => `<option value="${k}" ${c.layout === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
            <button class="btn small" id="tGo">Refazer</button>
          </div>` : `<p class="muted small">O bloco original já foi apagado pela limpeza automática, então não dá para refazer.</p>`}
        </div>
        <div><h3 style="margin-bottom:6px">Transcrição</h3><div class="transcript">${esc(c.transcript || "(sem fala)")}</div></div>
      </div>
    </div>`);
  const close = () => { closeModal(); if (state.tab === "cortes") loadCortes(); else if (state.tab === "painel") loadPainel(); };
  $("#cSave").onclick = async () => { await api(`/api/clips/${id}`, { method: "PATCH", body: { title: $("#cTitle").value, caption: $("#cCaption").value, hashtags: $("#cTags").value } }); toast("Texto salvo."); };
  $("#cPost").onclick = async () => {
    const platforms = $$(".netpick:checked").map(x => x.value);
    if (!platforms.length) return toast("Marque pelo menos uma rede.", true);
    try { await api(`/api/clips/${id}`, { method: "PATCH", body: { title: $("#cTitle").value, caption: $("#cCaption").value, hashtags: $("#cTags").value } }); await post(`/api/clips/${id}/post`, { platforms }); toast("Postando… acompanhe em Atividade."); close(); }
    catch (err) { toast(err.message, true); }
  };
  if ($("#cReject")) $("#cReject").onclick = async () => { await post(`/api/clips/${id}/reject`); toast("Corte rejeitado."); close(); };
  if ($("#cRestore")) $("#cRestore").onclick = async () => { await post(`/api/clips/${id}/restore`); toast("Corte restaurado."); close(); };
  $("#cDelete").onclick = async () => { if (!confirm("Excluir este corte?")) return; await api(`/api/clips/${id}`, { method: "DELETE" }); toast("Corte excluído."); close(); };
  if ($("#tGo")) $("#tGo").onclick = async () => {
    const body = { start: Number($("#tStart").value), end: Number($("#tEnd").value), layout: $("#tLayout").value, title: $("#cTitle").value };
    if (!(body.end - body.start >= 3)) return toast("O corte precisa ter pelo menos 3 segundos.", true);
    await post(`/api/clips/${id}/rerender`, body); toast("Refazendo o corte… ele volta em instantes."); close();
  };
}

function openModal(html) { $("#modalCard").innerHTML = html; $("#modal").classList.remove("hidden"); document.body.style.overflow = "hidden"; }
function closeModal() { $("#modal").classList.add("hidden"); $("#modalCard").innerHTML = ""; document.body.style.overflow = ""; }
$("#modal").addEventListener("click", e => { if (e.target.id === "modal" || e.target.closest("[data-close]")) closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#modal").classList.contains("hidden")) closeModal(); });

/* ------------------------------------------------------------------ fila */
async function pageFila() {
  view.innerHTML = `
  <div class="page-head"><div><h1>Fila</h1><p class="muted">Lives gravando, vídeos baixando e blocos de ${state.settings?.block_minutes ?? 10} min passando pelo detector.</p></div>
    <div class="legend"><span><i style="background:#ff6b2c"></i>Empolgação</span><span><i style="background:#6aa8ff"></i>Volume</span><span><i style="background:#b38cff"></i>Movimento</span><span><i style="background:#3ccf8e"></i>Fala</span><span><i style="background:#3a3846;height:8px"></i>Parado</span></div></div>
  <div id="srcList" style="display:grid;gap:12px"></div>`;
  await loadFila();
  every(6000, loadFila);
}

async function loadFila() {
  const list = await api("/api/sources?limit=40");
  const box = $("#srcList"); if (!box) return;
  if (!list.length) { box.innerHTML = `<div class="empty"><b>Fila vazia</b>Quando um canal entrar ao vivo ou um vídeo novo sair, ele aparece aqui.</div>`; return; }
  box.innerHTML = list.map(s => {
    const b = s.blocks || {}; const total = Object.values(b).reduce((a, n) => a + n, 0);
    const done = (b.done || 0) + (b.skipped || 0) + (b.error || 0);
    const pct = total ? Math.round(done / total * 100) : (s.status === "done" ? 100 : 0);
    const live = s.status === "recording";
    const st = live ? `<span class="badge live">Gravando</span>` : `<span class="badge ${s.status === "error" ? "bad" : s.status === "done" || (s.status === "ready" && pct === 100) ? "good" : ""}">${s.status === "ready" && pct === 100 ? "Concluído" : SRC_STATUS[s.status] || s.status}</span>`;
    const icon = s.kind === "live" || s.kind === "video" ? (s.url.includes("youtu") ? "youtube" : s.url.includes("kick") ? "kick" : "twitch") : s.kind;
    return `<div class="card src" data-id="${s.id}">
      <div class="src-head"><span class="pl ${icon}">${PL[icon] || "•"}</span>
        <div><div style="font-weight:700;overflow-wrap:anywhere">${esc(s.title || s.url)}</div>
        <div class="muted small">${s.channel_name ? esc(s.channel_name) + " · " : ""}${total} bloco(s)${b.processing ? " · 1 no detector" : ""}${b.pending ? ` · ${b.pending} esperando` : ""} · ${s.clips} corte(s) · ${s.duration ? fmtTime(s.duration) : ""} · ${ago(s.created_at)}</div>
        ${s.error ? `<div class="err small">${esc(s.error)}</div>` : ""}</div>
        <div class="row">${st}${s.status === "error" ? `<button class="btn small" data-act="retry">Tentar de novo</button>` : ""}${["queued", "recording", "downloading"].includes(s.status) ? `<button class="btn small danger" data-act="cancel">${live ? "Parar" : "Cancelar"}</button>` : ""}${total ? `<button class="btn small ghost" data-act="blocks">${state.openSources.has(String(s.id)) ? "Esconder" : "Blocos"}</button>` : ""}</div>
      </div>
      ${total ? `<div class="progress"><i style="width:${pct}%"></i></div>` : ""}
      <div class="blocks" id="blocks-${s.id}"></div>
    </div>`;
  }).join("");
  $$(".src", box).forEach(el => {
    const id = el.dataset.id;
    if (state.openSources.has(id)) loadBlocks(id);
    el.addEventListener("click", async e => {
      const act = e.target.closest("[data-act]")?.dataset.act; if (!act) return;
      if (act === "blocks") { state.openSources.has(id) ? state.openSources.delete(id) : state.openSources.add(id); loadFila(); }
      if (act === "retry") { await post(`/api/sources/${id}/retry`); loadFila(); }
      if (act === "cancel") { await api(`/api/sources/${id}`, { method: "DELETE" }); toast("Cancelado."); loadFila(); }
    });
  });
}

const BLOCK_ST = { pending: "esperando", processing: "no detector…", done: "pronto", error: "erro", skipped: "pulado" };
async function loadBlocks(sid) {
  const blocks = await api(`/api/blocks?source_id=${sid}`);
  const box = $(`#blocks-${sid}`); if (!box) return;
  box.innerHTML = blocks.map(b => `<div class="blk" data-id="${b.id}">
    <div><b>Bloco ${b.idx + 1}</b><div class="muted">${fmtTime(b.start_offset)}</div></div>
    <div>${b.has_analysis ? `<canvas data-b="${b.id}"></canvas>` : `<span class="muted">${BLOCK_ST[b.status] || b.status}${b.error ? " — " + esc(b.error) : ""}</span>`}</div>
    <div class="muted small">${b.status === "done" ? `${Math.round((b.dead_ratio || 0) * 100)}% parado · ${b.clips} corte(s)` : BLOCK_ST[b.status] || b.status}${b.status === "error" ? ` <button class="btn small" data-retry="${b.id}">Refazer</button>` : ""}</div>
  </div>`).join("");
  $$("[data-retry]", box).forEach(btn => btn.onclick = async () => { await post(`/api/blocks/${btn.dataset.retry}/retry`); loadBlocks(sid); });
  $$("canvas[data-b]", box).forEach(async cv => {
    const a = await api(`/api/blocks/${cv.dataset.b}/analysis`).catch(() => null);
    if (a) drawChart(cv, a);
    cv.style.cursor = "pointer";
    cv.onclick = e => {
      if (!a) return;
      const x = (e.offsetX / cv.clientWidth) * a.empolgacao.length;
      const hit = (a.clips || []).find(c => x >= c.start - 2 && x <= c.end + 2);
      if (hit) openClip(hit.id);
    };
  });
}

function drawChart(cv, a) {
  const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
  cv.width = w * dpr; cv.height = h * dpr;
  const g = cv.getContext("2d"); g.scale(dpr, dpr);
  const n = a.empolgacao.length; if (!n) return;
  const X = i => i / Math.max(1, n - 1) * w, Y = v => h - 3 - Math.min(1, v) * (h - 6);
  g.fillStyle = "#24222d";
  a.parado.forEach((d, i) => { if (d) g.fillRect(X(i), 0, w / n + 1, h); });
  (a.clips || []).forEach(c => { g.fillStyle = "rgba(255,107,44,.22)"; g.fillRect(X(c.start), 0, X(c.end) - X(c.start), h); g.fillStyle = "#ff6b2c"; g.fillRect(X(c.start), 0, 2, h); });
  const line = (arr, color, lw = 1) => { g.beginPath(); arr.forEach((v, i) => i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v))); g.strokeStyle = color; g.lineWidth = lw; g.stroke(); };
  g.globalAlpha = .55; line(a.volume, "#6aa8ff"); line(a.movimento, "#b38cff"); line(a.fala, "#3ccf8e");
  g.globalAlpha = 1; line(a.empolgacao, "#ff6b2c", 2);
}

/* ------------------------------------------------------------------ configurações */
const F = {
  num: (k, label, hint = "", step = "1") => `<label>${label}<input type="number" step="${step}" name="${k}">${hint ? `<span class="hint">${hint}</span>` : ""}</label>`,
  text: (k, label, hint = "", type = "text") => `<label>${label}<input type="${type}" name="${k}" autocomplete="off">${hint ? `<span class="hint">${hint}</span>` : ""}</label>`,
  secret: (k, label, hint = "") => `<label>${label}<input type="password" name="${k}" autocomplete="new-password" placeholder="não configurado">${hint ? `<span class="hint">${hint}</span>` : ""}</label>`,
  sw: (k, label) => `<label class="check"><span class="switch"><input type="checkbox" name="${k}"><span></span></span>${label}</label>`,
  sel: (k, label, opts) => `<label>${label}<select name="${k}">${Object.entries(opts).map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}</select></label>`,
};

async function pageConfig() {
  const [s, health] = await Promise.all([api("/api/settings"), api("/api/health")]);
  state.settings = s;
  const tools = Object.entries(health.tools).map(([k, ok]) => `<span class="chip" style="color:${ok ? "var(--good)" : "var(--bad)"}">${ok ? "✓" : "✕"} ${k}</span>`).join("");
  view.innerHTML = `
  <div class="page-head"><div><h1>Configurações</h1><p class="muted">Tudo que o monitor, o detector, o editor e o postador usam.</p></div><div class="chips" style="margin:0">${tools}</div></div>
  <form class="settings" id="setForm">
    <nav class="settings-nav"><a href="#s-monitor">Monitor</a><a href="#s-detector">Detector</a><a href="#s-editor">Corte e legenda</a><a href="#s-nota">Nota e IA</a><a href="#s-post">Postagem</a><a href="#s-avisos">Avisos</a></nav>
    <div>
      <section class="card" id="s-monitor"><h2>Monitor</h2><p class="muted">Como os canais são vigiados e gravados.</p>
        <div class="grid3">${F.num("block_minutes", "Tamanho do bloco (min)", "A live é cortada nesses blocos com ela no ar.")}${F.num("youtube_poll_minutes", "Conferir YouTube a cada (min)")}${F.num("live_check_minutes", "Conferir se entrou ao vivo a cada (min)")}</div>
        <div class="grid3" style="margin-top:14px">${F.sel("record_quality", "Qualidade da gravação", { best: "Melhor disponível", "1080p": "1080p", "720p": "720p", "480p": "480p" })}${F.num("keep_raw_hours", "Apagar blocos brutos após (h)", "0 = nunca apagar. Os cortes ficam.")}${F.num("workers", "Blocos processados em paralelo", "Precisa reiniciar.")}</div>
        <div style="margin-top:14px">${F.sw("youtube_lives", "Gravar também lives do YouTube")}</div>
        <div class="row" style="margin-top:14px"><span class="small muted" style="flex:1;min-width:220px">Se o YouTube pedir “confirme que não é um robô”, envie um <code>cookies.txt</code> exportado do seu navegador logado.</span>
          <span class="badge ${s._has_cookies ? "good" : ""}">${s._has_cookies ? "cookies ativos" : "sem cookies"}</span>
          <label class="btn small" style="flex-direction:row;color:var(--text)">Enviar cookies.txt<input type="file" id="ckFile" accept=".txt" hidden></label>
          ${s._has_cookies ? `<button type="button" class="btn small danger" id="ckDel">Remover</button>` : ""}</div>
      </section>
      <section class="card" id="s-detector"><h2>Detector</h2><p class="muted">Cruza volume, movimento e fala para achar o lance e pular trecho parado.</p>
        <div class="grid3">${F.num("weight_volume", "Peso do volume", "", "0.1")}${F.num("weight_movement", "Peso do movimento", "", "0.1")}${F.num("weight_speech", "Peso da fala", "", "0.1")}</div>
        <div class="grid3" style="margin-top:14px">${F.num("clip_min_seconds", "Corte mínimo (s)")}${F.num("clip_max_seconds", "Corte máximo (s)")}${F.num("max_clips_per_block", "Máx. de cortes por bloco")}</div>
        <div class="grid2" style="margin-top:14px">${F.num("min_candidate_score", "Nota mínima para virar corte", "Abaixo disso o trecho nem é editado.", "0.5")}${F.sel("whisper_model", "Modelo de transcrição", { tiny: "tiny (rápido)", base: "base", small: "small (recomendado)", medium: "medium (preciso, lento)", "large-v3": "large-v3 (GPU)" })}</div>
        <label style="margin-top:14px">Palavras de empolgação<textarea name="hype_keywords"></textarea><span class="hint">Separadas por vírgula. Quando aparecem na fala, o trecho ganha pontos.</span></label>
      </section>
      <section class="card" id="s-editor"><h2>Corte e legenda</h2><p class="muted">Todo corte sai em pé (1080×1920), pronto para TikTok, Reels e Shorts.</p>
        <div class="grid3">${F.sel("layout", "Formato padrão", LAYOUTS)}${F.text("subtitle_color", "Cor da palavra em destaque", "", "color")}${F.num("subtitle_words", "Palavras por legenda")}</div>
        <div class="grid3" style="margin-top:14px">${F.num("subtitle_position", "Altura da legenda (0 topo, 1 base)", "", "0.01")}${F.text("language", "Idioma da fala", "pt, en, es…")}${F.num("video_crf", "Qualidade do vídeo (CRF)", "Menor = melhor e mais pesado.")}</div>
        <div class="row" style="margin-top:14px;gap:22px">${F.sw("subtitles", "Legenda automática")}${F.sw("title_overlay", "Título no topo nos primeiros segundos")}</div>
        <h3 style="margin:18px 0 8px">Facecam (formato “Facecam em cima + jogo”)</h3>
        <p class="muted small" style="margin:0 0 10px">Posição da câmera do streamer no vídeo original, em fração da tela (0 a 1). <button type="button" class="btn small" id="fcPick">Marcar na tela</button></p>
        <div class="grid2" style="grid-template-columns:repeat(4,minmax(0,1fr))">
          <label>Esquerda (x)<input type="number" step="0.01" min="0" max="1" data-fc="x"></label><label>Topo (y)<input type="number" step="0.01" min="0" max="1" data-fc="y"></label>
          <label>Largura<input type="number" step="0.01" min="0" max="1" data-fc="w"></label><label>Altura<input type="number" step="0.01" min="0" max="1" data-fc="h"></label></div>
      </section>
      <section class="card" id="s-nota"><h2>Nota e IA</h2><p class="muted">O detector dá uma nota. Com uma chave da Anthropic, o Claude também assiste à transcrição, dá a nota dele e escreve título, legenda e hashtags.</p>
        <div class="row" style="margin-bottom:14px">${F.sw("ai_scoring", "Usar IA para nota, título e legenda")}<span class="badge ${health.ai ? "good" : ""}">${health.ai ? "IA ativa" : "IA desligada"}</span></div>
        <div class="grid3">${F.secret("anthropic_api_key", "Chave da API Anthropic", s._env_anthropic ? "Já definida no servidor (ANTHROPIC_API_KEY)." : "console.anthropic.com")}${F.text("ai_model", "Modelo")}${F.num("ai_weight", "Peso da IA na nota final (0–1)", "", "0.05")}</div>
      </section>
      <section class="card" id="s-post"><h2>Postagem</h2><p class="muted">Passou da sua nota, posta sozinho nas redes ligadas.</p>
        <div class="grid3">${F.num("min_score", "Nota mínima para postar", "", "0.5")}${F.num("max_posts_per_day", "Máx. de posts por rede por dia")}${F.text("default_hashtags", "Hashtags fixas")}</div>
        <div style="margin:14px 0">${F.sw("auto_post", "Postar sozinho (desligado = só aprova e você posta)")}</div>
        <div class="net"><div class="net-head"><h3>TikTok</h3>${F.sw("post_tiktok", "Ligado")}</div>
          <div class="grid2">${F.text("tiktok_client_key", "Client key")}${F.secret("tiktok_client_secret", "Client secret")}${F.secret("tiktok_refresh_token", "Refresh token", "Renova o acesso sozinho.")}${F.sel("tiktok_privacy", "Visibilidade", { SELF_ONLY: "Só eu (apps não auditados)", MUTUAL_FOLLOW_FRIENDS: "Amigos", FOLLOWER_OF_CREATOR: "Seguidores", PUBLIC_TO_EVERYONE: "Público" })}</div></div>
        <div class="net"><div class="net-head"><h3>Instagram Reels</h3>${F.sw("post_instagram", "Ligado")}</div>
          <div class="grid2">${F.text("instagram_user_id", "ID da conta profissional (IG user id)")}${F.secret("instagram_access_token", "Access token (Graph API)")}</div></div>
        <div class="net"><div class="net-head"><h3>YouTube Shorts</h3>${F.sw("post_youtube", "Ligado")}</div>
          <div class="grid2">${F.text("youtube_client_id", "OAuth client id")}${F.secret("youtube_client_secret", "OAuth client secret")}${F.secret("youtube_refresh_token", "Refresh token")}${F.sel("youtube_privacy", "Visibilidade", { public: "Público", unlisted: "Não listado", private: "Privado" })}</div></div>
        <p class="muted small" style="margin-top:12px">Como pegar cada credencial está no README do projeto.</p>
      </section>
      <section class="card" id="s-avisos"><h2>Avisos</h2><p class="muted">Receba no Discord quando um corte ficar pronto ou for postado.</p>
        <div class="row" style="align-items:end"><div style="flex:1">${F.secret("discord_webhook", "Webhook do Discord")}</div><button type="button" class="btn" id="testNotify">Testar</button></div>
      </section>
      <div class="savebar"><button class="btn primary">Salvar configurações</button></div>
    </div>
  </form>`;
  const form = $("#setForm");
  $$("[name]", form).forEach(el => {
    const v = s[el.name];
    if (el.type === "checkbox") el.checked = !!v; else el.value = v ?? "";
  });
  $$("[data-fc]", form).forEach(el => el.value = s.facecam?.[el.dataset.fc] ?? "");
  $$(".settings-nav a", form).forEach(a => a.addEventListener("click", e => { e.preventDefault(); $(a.getAttribute("href")).scrollIntoView({ behavior: "smooth" }); }));
  $("#fcPick").onclick = () => pickFacecam(form);
  $("#ckFile").onchange = async e => {
    const fd = new FormData(); fd.append("file", e.target.files[0]);
    try { await api("/api/cookies", { method: "POST", body: fd }); toast("Cookies salvos."); pageConfig(); } catch (err) { toast(err.message, true); }
  };
  if ($("#ckDel")) $("#ckDel").onclick = async () => { await api("/api/cookies", { method: "DELETE" }); toast("Cookies removidos."); pageConfig(); };
  $("#testNotify").onclick = async () => { await saveSettings(form, true); await post("/api/test-notify"); toast("Mensagem de teste enviada."); };
  form.addEventListener("submit", async e => { e.preventDefault(); await saveSettings(form); });
}

function pickFacecam(form) {
  openModal(`<button class="btn small ghost modal-close" data-close>✕</button>
    <h2>Marque a facecam</h2><p class="muted small">Arraste um retângulo em volta da câmera do streamer. Vale para o formato “Facecam em cima + jogo”.</p>
    <div id="fcBox" style="position:relative;user-select:none;touch-action:none;margin-top:10px;border-radius:10px;overflow:hidden;background:#000">
      <img id="fcImg" src="/api/frame?t=${Date.now()}" style="width:100%;display:block" draggable="false" alt="Quadro recente da live">
      <div id="fcRect" style="position:absolute;border:2px solid var(--accent);background:rgba(255,107,44,.18);display:none"></div>
    </div>
    <p class="err" id="fcErr"></p>
    <div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn primary" id="fcOk" disabled>Usar esta área</button></div>`);
  const box = $("#fcBox"), rect = $("#fcRect"); let a = null, sel = null;
  $("#fcImg").onerror = () => { $("#fcErr").textContent = "Ainda não há vídeo gravado para tirar um quadro. Monitore um canal ou corte um link primeiro."; };
  const pt = e => { const r = box.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]; };
  const draw = () => { if (!sel) return; Object.assign(rect.style, { display: "block", left: sel.x * 100 + "%", top: sel.y * 100 + "%", width: sel.w * 100 + "%", height: sel.h * 100 + "%" }); };
  const cur = Object.fromEntries($$("[data-fc]", form).map(el => [el.dataset.fc, Number(el.value || 0)]));
  if (cur.w > 0 && cur.h > 0) { sel = cur; draw(); $("#fcOk").disabled = false; }
  box.addEventListener("pointerdown", e => { a = pt(e); box.setPointerCapture(e.pointerId); });
  box.addEventListener("pointermove", e => { if (!a) return; const b = pt(e); sel = { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(b[0] - a[0]), h: Math.abs(b[1] - a[1]) }; draw(); $("#fcOk").disabled = sel.w < .03 || sel.h < .03; });
  box.addEventListener("pointerup", () => { a = null; });
  $("#fcOk").onclick = async () => {
    $$("[data-fc]", form).forEach(el => el.value = sel[el.dataset.fc].toFixed(3));
    const lay = $("[name=layout]", form);
    closeModal(); await saveSettings(form, true);
    toast("Facecam marcada e salva." + (lay.value !== "split" ? " Escolha o formato “Facecam em cima + jogo” para usar." : ""));
  };
}

async function saveSettings(form, quiet = false) {
  const body = {};
  $$("[name]", form).forEach(el => {
    if (el.type === "checkbox") body[el.name] = el.checked;
    else if (el.type === "password" && el.value === "") return;
    else body[el.name] = el.value;
  });
  body.facecam = Object.fromEntries($$("[data-fc]", form).map(el => [el.dataset.fc, Number(el.value || 0)]));
  try { state.settings = await api("/api/settings", { method: "PUT", body }); if (!quiet) toast("Configurações salvas."); }
  catch (err) { toast(err.message, true); }
}

boot();
