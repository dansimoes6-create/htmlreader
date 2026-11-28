'use strict';
// ===== Interface =====
const $ = s => document.querySelector(s);
const UI = {
  stack: [], auto: false,
  // ---------- diálogos ----------
  dialog({ title, text, icon, choices, cancel = false, html = null }) {
    if (this.auto) { const ok = (choices || []).filter(c => !c.dis); return Promise.resolve(ok.length ? R.pick(ok).v : null); }
    return new Promise(res => {
      const host = $('#dialogs');
      const d = document.createElement('div'); d.className = 'dlg-wrap';
      d.innerHTML = `<div class="dlg" role="dialog" aria-modal="true">${icon ? `<div class="dlg-ic">${icon}</div>` : ''}<h3>${esc(title || '')}</h3>${html ?? `<p>${esc(text || '').replace(/\n/g, '<br>')}</p>`}<div class="dlg-btns">${(choices || []).map((c, i) => `<button class="btn ${c.dis ? 'dis' : ''}" data-i="${i}" ${c.dis ? 'disabled' : ''}>${esc(c.t)}${c.sub ? `<small>${esc(c.sub)}</small>` : ''}</button>`).join('')}${cancel ? '<button class="btn ghost" data-i="x">Cancelar</button>' : ''}</div></div>`;
      d.addEventListener('click', e => {
        const b = e.target.closest('[data-i]'); if (!b) return;
        const i = b.dataset.i; d.remove();
        res(i === 'x' ? null : choices[Number(i)].v);
      });
      host.appendChild(d);
      d.querySelector('.btn')?.focus({ preventScroll: true });
    });
  },
  alert(title, text, icon) { return this.dialog({ title, text, icon, choices: [{ t: 'OK', v: true }] }).then(() => { }); },
  confirm(title, text) { return this.dialog({ title, text, icon: '❔', choices: [{ t: 'Sim', v: true }, { t: 'Não', v: false }] }).then(v => !!v); },
  choose(title, text, options, o = {}) { if (!options.length) return Promise.resolve(null); return this.dialog({ title, text, icon: o.icon, choices: options, cancel: !o.nocancel }); },
  prompt(title, fields) {
    if (this.auto) { const o = {}; fields.forEach(f => o[f.k] = f.type === 'select' ? f.options[0] : f.value); return Promise.resolve(o); }
    return new Promise(res => {
      const d = document.createElement('div'); d.className = 'dlg-wrap';
      d.innerHTML = `<div class="dlg"><h3>${esc(title)}</h3><form>${fields.map(f => `<label class="fld"><span>${esc(f.label)}</span>${f.type === 'select' ? `<select name="${f.k}">${f.options.map(o => `<option ${o === f.value ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>` : f.type === 'range' ? `<input type="range" min="0" max="100" name="${f.k}" value="${f.value}">` : `<input name="${f.k}" type="${f.type === 'number' ? 'number' : 'text'}" value="${esc(f.value ?? '')}" ${f.type === 'number' ? 'min="0" inputmode="numeric"' : 'maxlength="40"'}>`}</label>`).join('')}
        <div class="dlg-btns"><button class="btn" type="submit">OK</button><button class="btn ghost" type="button" data-x>Cancelar</button></div></form></div>`;
      const form = d.querySelector('form');
      form.onsubmit = e => { e.preventDefault(); const o = {}; new FormData(form).forEach((v, k) => o[k] = String(v).trim()); d.remove(); res(o); };
      d.querySelector('[data-x]').onclick = () => { d.remove(); res(null); };
      $('#dialogs').appendChild(d); d.querySelector('input,select')?.focus();
    });
  },
  custom(title, build) {
    if (this.auto) return Promise.resolve(null);
    return new Promise(res => {
      const d = document.createElement('div'); d.className = 'dlg-wrap';
      d.innerHTML = `<div class="dlg wide"><h3>${esc(title)}</h3><div class="mgroot"></div></div>`;
      $('#dialogs').appendChild(d);
      build(d.querySelector('.mgroot'), v => { d.remove(); res(v); this.refresh(); });
    });
  },
  toast(msg) {
    if (this.auto) return;
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; $('#toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3200);
  },
  // ---------- folhas (menus) ----------
  open(builder) { this.stack.push(builder); this.renderSheet(); },
  back() { this.stack.pop(); this.renderSheet(); },
  closeSheets() { this.stack = []; this.renderSheet(); },
  renderSheet() {
    const host = $('#sheets');
    if (!this.stack.length) { host.innerHTML = ''; host.classList.remove('on'); return; }
    let m; try { m = this.stack[this.stack.length - 1](); } catch (e) { console.error(e); this.stack.pop(); return this.renderSheet(); }
    if (!m) { this.stack.pop(); return this.renderSheet(); }
    const prevScroll = host.querySelector('.sheet-body')?.scrollTop || 0; const same = host.dataset.title === m.title;
    host.dataset.title = m.title;
    host.classList.add('on');
    const rows = (m.items || []).map((it, i) => {
      if (it.sep) return `<div class="sep">${esc(it.sep)}</div>`;
      const bar = typeof it.bar === 'number' ? `<div class="mbar sm"><i style="width:${it.bar}%;background:${barColor(it.bar)}"></i></div>` : '';
      return `<button class="row ${it.cls || ''} ${it.dis ? 'dim' : ''}" data-i="${i}" ${it.dis || !it.fn ? 'aria-disabled="true"' : ''}><span class="ric">${it.ic || '•'}</span><span class="rtx"><b>${esc(it.t)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}${bar}</span>${it.fn && !it.dis ? '<span class="chev">›</span>' : ''}</button>`;
    }).join('');
    host.innerHTML = `<div class="sheet-bg" data-close></div><div class="sheet"><div class="sheet-hd"><button class="ib" data-back aria-label="Voltar">${this.stack.length > 1 ? '‹' : '✕'}</button><h2>${esc(m.title)}</h2><button class="ib" data-close aria-label="Fechar">✕</button></div><div class="sheet-body">${m.head || ''}${rows}</div></div>`;
    if (same) host.querySelector('.sheet-body').scrollTop = prevScroll;
    host.querySelectorAll('[data-close]').forEach(b => b.onclick = () => this.closeSheets());
    host.querySelector('[data-back]').onclick = () => this.back();
    host.querySelectorAll('.row[data-i]').forEach(b => b.onclick = () => this.act(m.items[Number(b.dataset.i)]));
  },
  async act(it) {
    if (!it || it.dis || !it.fn || G.busy) return;
    G.busy = true;
    try { await it.fn(); } catch (e) { console.error(e); }
    G.busy = false;
    if (G.s && !G.s.p.alive) { this.closeSheets(); this.refresh(); save(); return this.deathScreen(); }
    Meta.check(); save();
    this.refresh();
  },
  refresh() { this.render(); if (this.stack.length) this.renderSheet(); },
  lockNav(b) { document.body.classList.toggle('busy', b); },
  // ---------- tela principal ----------
  render() {
    const s = G.s; if (!s) return; const p = s.p;
    const av = p.vamp ? '🧛' : p.age < 3 ? '👶' : p.age < 13 ? (p.g === 'F' ? '👧' : '👦') : p.age < 18 ? (p.g === 'F' ? '👱‍♀️' : '👱') : p.age >= 65 ? (p.g === 'F' ? '👵' : '👴') : (p.g === 'F' ? '👩' : '👨');
    const occ = p.prison ? '⛓️ Preso(a)' : p.royal?.monarch ? p.royal.title : p.job ? p.job.t : p.sp.athlete && !p.sp.athlete.retired ? `Atleta (${p.sp.athlete.sport})` : p.edu.stage ? `Estudante • ${stageName(p.edu.stage)}` : p.retired ? 'Aposentado(a)' : p.pt ? gt(p.pt.t, p.g) : p.age < 6 ? 'Criança' : 'Sem ocupação';
    $('#top').innerHTML = `<div class="av">${av}</div><div class="who"><b>${esc(p.first)} ${esc(p.last)}</b><small>${p.age} ${p.age === 1 ? 'ano' : 'anos'} • ${esc(occ)}</small></div><div class="cash"><b>${fmt(p.money, true)}</b><small>${C().f} ${s.year}</small></div><button class="ib menu" id="menuBtn" aria-label="Menu">☰</button>`;
    $('#menuBtn').onclick = () => this.open(() => this.mainMenu());
    // log
    const logEl = $('#log');
    const blocks = s.log.slice(-80).map(e => `<section class="yr"><h4>${e.age === 0 && e.gen === s.gen && e === s.log.find(x => x.gen === s.gen) ? 'Nascimento' : `${e.age} ${e.age === 1 ? 'ano' : 'anos'}`} <span>${e.year}</span></h4>${e.l.map(([t, c]) => `<p class="${c}">${esc(t)}</p>`).join('')}</section>`).join('');
    logEl.innerHTML = blocks;
    const wrap = $('#logwrap'); wrap.scrollTop = wrap.scrollHeight;
    // stats
    const st = [['Felicidade', p.hap, '😊'], ['Saúde', p.hea, '❤️'], ['Inteligência', p.smr, '🧠'], ['Aparência', p.loo, '✨']];
    if (p.fame >= 10) st.push(['Fama', p.fame, '🌟']);
    $('#stats').innerHTML = st.map(([n, v, ic]) => `<button class="stat" data-prof><span>${ic} ${n}</span><div class="mbar"><i style="width:${v}%;background:${barColor(v)}"></i></div><em>${v}%</em></button>`).join('');
    $('#stats').querySelectorAll('[data-prof]').forEach(b => b.onclick = () => this.open(() => this.profile()));
    $('#nav-occ span').textContent = p.prison ? 'Prisão' : p.edu.stage && !p.job ? 'Escola' : 'Ocupação';
  },
  profile() {
    const p = P(), c = C();
    const row = (a, b) => `<tr><td>${a}</td><td>${b}</td></tr>`;
    const bars = [['Felicidade', p.hap], ['Saúde', p.hea], ['Inteligência', p.smr], ['Aparência', p.loo], ['Atletismo', p.ath], ['Karma', p.karma], ['Força de vontade', p.will], ['Fama', p.fame], ['Notoriedade criminal', p.notor], ['Fertilidade', p.fert], ['Excentricidade', p.craz]];
    const tal = TALENTS.find(t => t.id === p.talent);
    const head = `<div class="npchead"><div class="big">${esc(p.first)} ${esc(p.last)}</div><div class="muted">${p.g === 'F' ? 'Feminino' : 'Masculino'} • ${p.age} anos • ${p.sign} • ${esc(p.city)}, ${c.n} ${c.f}</div>
      ${bars.map(([n, v]) => `<div class="mini"><span>${n}</span><div class="mbar"><i style="width:${v}%;background:${barColor(v)}"></i></div><em>${v}</em></div>`).join('')}</div>
      <table class="fin">${row('Geração', G.s.gen)}${row('Talento especial', tal ? `${tal.n} — ${tal.d}` : 'Nenhum')}${row('Orientação', p.out ? Love.sexName() : 'Não declarada')}${row('Religião', p.religion || 'Nenhuma')}${row('Escolaridade', p.edu.degrees.length ? p.edu.degrees.map(degName).join(', ') : 'Nenhuma')}
      ${row('Ocupação', p.job?.t || '—')}${row('Patrimônio', fmt(netWorth()))}${row('Saúde', p.ill.length ? p.ill.map(i => i.n).join(', ') : 'Sem doenças')}${row('Vícios', Object.entries(p.addict).filter(([, v]) => v).map(([k]) => k).join(', ') || 'Nenhum')}
      ${row('Licenças', Object.keys(p.lic).map(k => ({ carro: 'CNH', moto: 'Moto', barco: 'Arrais', aviao: 'Piloto' }[k])).join(', ') || 'Nenhuma')}${row('Ficha criminal', p.record.length ? p.record.map(r => `${r.c}${r.y ? ` (${r.y}a)` : ''}`).join(', ') : 'Limpa')}
      ${row('Faixa (artes marciais)', BELTS[p.belt])}${row('Viagens', p.trips)}${p.vamp ? row('Vampiro', VAMP_RANKS[p.vamp.rank]) : ''}${p.magic?.type ? row('Magia', `${p.magic.type} • ${MAGIC_RANKS[magicRank(p.magic)][0]}`) : ''}${p.royal ? row('Título', p.royal.title) : ''}
      ${G.s.chall ? row('Desafio ativo', CHALLENGES.find(x => x.id === G.s.chall)?.n) : ''}</table>`;
    const items = G.s.tree.length ? [{ sep: 'Árvore genealógica' }, ...G.s.tree.map(t => ({ ic: '🌳', t: t.name, sub: `Geração ${t.gen} • ${t.born}–${t.born + t.age} • ${t.cause}` }))] : [];
    return { title: 'Perfil', head, items };
  },
  mainMenu() {
    const items = [
      { ic: '👤', t: 'Perfil', sub: 'Todos os atributos', fn: () => this.open(() => this.profile()) },
      { ic: '🏅', t: 'Desafios e relíquias', fn: () => this.open(() => Meta.challMenu()) },
      { ic: '🏆', t: 'Conquistas', sub: `${Object.keys(G.meta.ach).length}/${ACHIEVEMENTS.length}`, fn: () => this.open(() => Meta.achMenu()) },
      { ic: '🎗️', t: 'Selos de vida', fn: () => this.open(() => Meta.ribbonMenu()) },
      { ic: '🪦', t: 'Cemitério', fn: () => this.open(() => Meta.cemMenu()) },
      { ic: '⏳', t: 'Máquina do tempo', sub: `${G.s.snaps.length} ano(s) disponível(is)`, fn: () => this.timeMachine() },
      { ic: '✨', t: `Modo Criador: ${G.meta.god ? 'ligado' : 'desligado'}`, sub: 'Edite atributos à vontade', fn: () => { G.meta.god = !G.meta.god; Meta.save(); } },
      ...(G.meta.god ? [{ ic: '🛠️', t: 'Editar meu personagem', fn: () => this.godEdit() }] : []),
      { ic: '🌗', t: 'Tema', sub: { auto: 'Automático', light: 'Claro', dark: 'Escuro' }[G.meta.theme], fn: () => { G.meta.theme = { auto: 'light', light: 'dark', dark: 'auto' }[G.meta.theme]; applyTheme(); Meta.save(); } },
      { ic: '🔄', t: 'Nova vida', sub: 'Abandona a vida atual', cls: 'danger', fn: async () => { if (await this.confirm('Nova vida', 'Começar uma nova vida? A atual será perdida (não vai para o cemitério).')) { Store.del('vv_save'); G.s = null; this.closeSheets(); this.startScreen(); } } }
    ];
    return { title: 'Menu', items };
  },
  async timeMachine() {
    const s = G.s; if (!s.snaps.length) return this.alert('Máquina do tempo', 'Ainda não há anos para voltar.');
    const r = await this.choose('Máquina do tempo', 'Voltar quantos anos?', s.snaps.map((_, i) => ({ t: `${s.snaps.length - i} ano(s)`, sub: `Para os ${P().age - (s.snaps.length - i)} anos`, v: s.snaps.length - i })).reverse());
    if (!r) return; timeTravel(r); this.closeSheets(); $('#screen').innerHTML = ''; $('#screen').classList.remove('on'); this.refresh();
  },
  async godEdit() {
    const p = P();
    const v = await this.prompt('Modo Criador', [['hap', 'Felicidade'], ['hea', 'Saúde'], ['smr', 'Inteligência'], ['loo', 'Aparência'], ['ath', 'Atletismo'], ['karma', 'Karma'], ['will', 'Força de vontade'], ['fame', 'Fama'], ['fert', 'Fertilidade']].map(([k, l]) => ({ k, label: l, type: 'range', value: p[k] })).concat([{ k: 'money', label: `Dinheiro (${C().cur})`, type: 'number', value: Math.round(p.money * C().rate) }, { k: 'talent', label: 'Talento', type: 'select', options: ['Nenhum', ...TALENTS.map(t => t.n)], value: TALENTS.find(t => t.id === p.talent)?.n || 'Nenhum' }]));
    if (!v) return;
    for (const k of ['hap', 'hea', 'smr', 'loo', 'ath', 'karma', 'will', 'fame', 'fert']) p[k] = clamp(Number(v[k]));
    p.money = Math.round(Number(v.money) / C().rate) || 0; p.talent = TALENTS.find(t => t.n === v.talent)?.id || null;
    log('✨ Modo Criador: atributos alterados.', 'magic');
  },
  // ---------- telas ----------
  startScreen() {
    const sc = $('#screen'); sc.classList.add('on');
    const has = !!Store.get('vv_save');
    sc.innerHTML = `<div class="start"><div class="logo">Vida<span>verso</span></div><p class="tag">Uma vida inteira, um ano de cada vez.</p>
      <div class="startbtns">${has ? '<button class="btn big" data-a="cont">Continuar vida</button>' : ''}
      <button class="btn big" data-a="rand">Vida aleatória</button><button class="btn" data-a="custom">Vida personalizada</button><button class="btn" data-a="scen">Cenários</button>
      <div class="row2"><button class="btn ghost" data-a="ach">🏆 Conquistas</button><button class="btn ghost" data-a="cem">🪦 Cemitério</button></div></div>
      <p class="muted small">${G.meta.lives} vida(s) vivida(s) • ${Object.keys(G.meta.ach).length} conquista(s)</p></div>`;
    sc.onclick = async e => {
      const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
      if (a === 'cont' && loadGame()) return this.begin(false);
      if (a === 'rand') { newLife(); return this.begin(true); }
      if (a === 'custom') { const v = await this.prompt('Vida personalizada', [{ k: 'first', label: 'Nome', type: 'text', value: '' }, { k: 'last', label: 'Sobrenome', type: 'text', value: '' }, { k: 'g', label: 'Gênero', type: 'select', options: ['Aleatório', 'Masculino', 'Feminino'], value: 'Aleatório' }, { k: 'country', label: 'País', type: 'select', options: ['Aleatório', ...COUNTRIES.map(c => c.n)], value: 'Brasil' }, { k: 'cls', label: 'Família', type: 'select', options: ['Aleatória', 'Pobre', 'Classe média', 'Rica', 'Milionária'], value: 'Aleatória' }]);
        if (!v) return; const c = COUNTRIES.find(x => x.n === v.country);
        newLife({ first: v.first || undefined, last: v.last || undefined, g: { Masculino: 'M', Feminino: 'F' }[v.g], country: c?.id, cls: { Pobre: 'pobre', 'Classe média': 'media', Rica: 'rica', Milionária: 'milionaria' }[v.cls] });
        if (c && v.country !== 'Aleatório') { const cc = await this.choose('Cidade', 'Onde você nasce?', c.cities.map(t => ({ t, v: t }))); if (cc) { P().city = cc; G.s.log[0].l[0][0] = `Nasci ${ga(P().g, 'um menino', 'uma menina')} em ${cc}, ${c.n} ${c.f}.`; } }
        return this.begin(true);
      }
      if (a === 'scen') { const r = await this.choose('Cenários', 'Escolha um ponto de partida:', SCENARIOS.map(x => ({ t: x.n, sub: x.d, v: x }))); if (!r) return; newLife({ ...r.o }); return this.begin(true); }
      if (a === 'ach') return this.open(() => Meta.achMenu());
      if (a === 'cem') return this.open(() => Meta.cemMenu());
    };
  },
  begin(isNew) {
    const sc = $('#screen'); sc.classList.remove('on'); sc.innerHTML = ''; sc.onclick = null;
    if (isNew) { Meta.ach('primeira'); const week = Math.floor((Date.now() / 864e5 + 3) / 7); if (!G.s.chall) G.s.chall = CHALLENGES[week % CHALLENGES.length].id; save(); }
    this.refresh();
  },
  deathScreen() {
    const s = G.s, p = s.p; const sum = s.summary || {};
    const r = RIBBONS.find(x => x[0] === sum.ribbon) || RIBBONS[RIBBONS.length - 1];
    const kids = alive('filho');
    const sc = $('#screen'); sc.classList.add('on');
    sc.innerHTML = `<div class="start death"><div class="tomb">🪦</div><h2>${esc(p.first)} ${esc(p.last)}</h2><p class="muted">${p.born} – ${s.year} • ${p.age} anos</p><p>Causa da morte: <b>${esc(p.cause)}</b></p>
      <div class="ribbon"><span>${r[2]}</span><div><b>${r[1]}</b><small>${r[3]}</small></div></div>
      <table class="fin">${[['Patrimônio', fmt(netWorth())], ['Ocupação', sum.job || '—'], ['Filhos', byRole('filho').length], ['Casamentos', s.cnt.casamentos || 0], ['Crimes', s.cnt.crimes || 0], ['Geração', s.gen]].map(([a, b]) => `<tr><td>${a}</td><td>${esc(String(b))}</td></tr>`).join('')}</table>
      <div class="startbtns">${kids.length ? '<button class="btn big" data-a="heir">Continuar como herdeiro(a)</button>' : ''}${s.snaps.length ? '<button class="btn" data-a="tm">⏳ Máquina do tempo</button>' : ''}<button class="btn" data-a="new">Nova vida</button><button class="btn ghost" data-a="log">Ver a história da vida</button></div></div>`;
    sc.onclick = async e => {
      const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
      if (a === 'heir') { const k = await this.choose('Herdeiro(a)', 'Continuar a vida de qual filho(a)?', kids.map(n => ({ t: fname(n), sub: `${n.age} anos • ${n.g === 'F' ? 'Filha' : 'Filho'}`, v: n.id }))); if (k && continueAs(k)) this.begin(false); }
      if (a === 'tm') { const r2 = await this.choose('Máquina do tempo', 'Voltar quantos anos antes da morte?', s.snaps.map((_, i) => ({ t: `${s.snaps.length - i} ano(s)`, v: s.snaps.length - i })).reverse()); if (r2) { G.meta.cem.shift(); G.meta.lives--; timeTravel(r2); this.begin(false); } }
      if (a === 'new') { Store.del('vv_save'); G.s = null; this.startScreen(); }
      if (a === 'log') { this.render(); this.alertLog(); }
    };
  },
  alertLog() { /* a tela de log já está atrás; o usuário fecha quando quiser */ const b = document.createElement('button'); b.className = 'btn floatback'; b.textContent = '↩ Voltar ao resumo'; b.onclick = () => { b.remove(); this.deathScreen(); }; document.body.appendChild(b); $('#screen').classList.remove('on'); }
};
function barColor(v) { return v >= 70 ? 'var(--good)' : v >= 40 ? 'var(--mid)' : v >= 20 ? 'var(--warn)' : 'var(--bad)'; }
function applyTheme() { const t = G.meta?.theme || 'auto'; if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t); }

// ---------- inicialização ----------
function init() {
  Meta.load(); applyTheme();
  $('#nav').onclick = e => {
    const b = e.target.closest('[data-nav]'); if (!b || !G.s || G.busy) return;
    const n = b.dataset.nav;
    if (n === 'age') { UI.closeSheets(); return ageUp(); }
    UI.stack = [];
    if (n === 'occ') UI.open(() => Career.menu());
    if (n === 'assets') UI.open(() => Assets.menu());
    if (n === 'rel') UI.open(() => Rel.menu());
    if (n === 'act') UI.open(() => Activities.menu());
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && UI.stack.length && !$('#dialogs').children.length) UI.back(); });
  if (loadGame()) { UI.begin(false); if (!G.s.p.alive) UI.deathScreen(); }
  else UI.startScreen();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
