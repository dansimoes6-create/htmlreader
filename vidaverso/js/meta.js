'use strict';
// ===== Conquistas, selos, desafios, cemitério =====
const Meta = {
  load() {
    G.meta = Object.assign({ ach: {}, cem: [], ribbons: {}, chall: {}, hunt: [], tot: {}, god: false, theme: 'auto', lives: 0 }, Store.get('vv_meta', {}));
  },
  save() { if (G.meta) Store.set('vv_meta', G.meta); },
  ach(id) {
    if (!G.meta || G.meta.ach[id]) return;
    const a = ACHIEVEMENTS.find(x => x[0] === id); if (!a) return;
    G.meta.ach[id] = new Date().toISOString().slice(0, 10);
    UI.toast(`🏆 Conquista: ${a[1]}`); this.save();
  },
  check() {
    const s = G.s, p = s.p; if (!p) return;
    const nw = netWorth();
    if (nw >= 1e6) this.ach('milionario'); if (nw >= 1e9) this.ach('bilionario');
    if (p.age >= 100) this.ach('centenario');
    if (s.chall) {
      const c = CHALLENGES.find(x => x.id === s.chall);
      if (c && !s.flags['chall_done_' + c.id]) {
        s.challProg = s.challProg || {};
        c.steps.forEach(([n, f], i) => { try { if (!s.challProg[i] && f(s)) { s.challProg[i] = true; UI.toast(`✔️ ${c.n}: ${n}`); } } catch (e) { } });
        if (c.steps.every((_, i) => s.challProg[i])) { s.flags['chall_done_' + c.id] = true; G.meta.chall[c.id] = new Date().toISOString().slice(0, 10); this.ach('desafio'); log(`🏅 Desafio concluído: ${c.n}!`, 'magic'); UI.toast(`🏅 Desafio concluído: ${c.n}!`); }
      }
    }
  },
  ribbonFor() {
    const s = G.s, p = s.p, c = s.cnt; const nw = netWorth();
    const sp = spouse(); const married = sp ? s.year - (sp.married || s.year) : 0;
    const kidsAlive = alive('filho').length, friends = alive('amigo').length;
    const rules = {
      bilionario: nw >= 1e9, rico: nw >= 1e7, celebridade: p.fame >= 90, monarca: !!c.reinou || !!p.royal?.monarch, presidente: !!c.eleito5, chefao: !!c.chefao,
      imortal: !!p.vamp && p.age >= 150, mago: !!p.magic && p.magic.xp >= 150, campeao: (c.titulos || 0) >= 1, assassino: (c.homicidios || 0) >= 3,
      presidiario: p.prisonYears >= 15, criminoso: (c.crimes || 0) >= 10, academico: p.edu.degrees.filter(d => d !== 'medio').length >= 3, familia: byRole('filho').length >= 5,
      romantico: (c.parceiros || 0) >= 10, fiel: married >= 40, centenario: p.age >= 100, viajante: p.trips >= 10, petlover: (c.pets || 0) >= 6, generoso: p.donated >= 1e5,
      workaholic: p.yearsWorked >= 40, viciado: !!s.flags.everAddicted, jovem: p.age < 18, solitario: !friends && !kidsAlive && !partner() && p.age > 30,
      preguicoso: p.yearsWorked === 0 && p.age >= 30 && !Object.keys(p.sp).some(k => p.sp[k]), comum: true
    };
    const r = RIBBONS.find(([id]) => rules[id]);
    return r;
  },
  onDeath() {
    const s = G.s, p = s.p;
    const r = this.ribbonFor();
    G.meta.ribbons[r[0]] = (G.meta.ribbons[r[0]] || 0) + 1;
    G.meta.lives++;
    const entry = { id: s.id + '_' + s.gen, name: `${p.first} ${p.last}`, g: p.g, born: p.born, died: s.year, age: p.age, cause: p.cause, ribbon: r[0], nw: netWorth(), rate: C().rate, cur: C().cur, country: C().n, flag: C().f, gen: s.gen, job: p.job?.t || (p.retired ? 'Aposentado(a)' : p.jobs.length ? p.jobs[p.jobs.length - 1].t : '—') };
    G.meta.cem.unshift(entry); if (G.meta.cem.length > 150) G.meta.cem.pop();
    s.summary = entry;
    this.save();
  },
  achMenu() {
    const got = Object.keys(G.meta.ach).length;
    return { title: 'Conquistas', head: `<p class="muted">${got}/${ACHIEVEMENTS.length} desbloqueadas</p>`, items: ACHIEVEMENTS.map(([id, n, d]) => ({ ic: G.meta.ach[id] ? '🏆' : '🔒', t: n, sub: d + (G.meta.ach[id] ? ` • ${G.meta.ach[id]}` : ''), cls: G.meta.ach[id] ? '' : 'dim' })) };
  },
  ribbonMenu() {
    return { title: 'Selos de vida', head: '<p class="muted">Cada vida termina com um selo que resume como ela foi.</p>', items: RIBBONS.map(([id, n, ic, d]) => ({ ic: G.meta.ribbons[id] ? ic : '▫️', t: n, sub: `${d}${G.meta.ribbons[id] ? ` • ×${G.meta.ribbons[id]}` : ''}`, cls: G.meta.ribbons[id] ? '' : 'dim' })) };
  },
  cemMenu() {
    const list = G.meta.cem;
    return { title: 'Cemitério', head: `<p class="muted">${G.meta.lives} vida(s) vivida(s)</p>`, items: list.length ? list.map(e => { const r = RIBBONS.find(x => x[0] === e.ribbon) || RIBBONS[RIBBONS.length - 1]; return { ic: '🪦', t: `${e.name} (${e.born}–${e.died})`, sub: `${r[2]} ${r[1]} • ${e.age} anos • ${e.cause} • ${e.flag} • ger. ${e.gen}`, fn: () => UI.alert(e.name, `${e.flag} ${e.country}\n${e.born} – ${e.died} (${e.age} anos)\nCausa: ${e.cause}\nÚltima ocupação: ${e.job}\nPatrimônio: ${e.cur} ${Math.round(e.nw * e.rate).toLocaleString('pt-BR')}\nSelo: ${r[2]} ${r[1]}\nGeração ${e.gen}`, '🪦') }; }) : [{ t: 'Ninguém enterrado ainda.', dis: true }] };
  },
  challMenu() {
    const s = G.s;
    const week = Math.floor((Date.now() / 864e5 + 3) / 7); const featured = CHALLENGES[week % CHALLENGES.length];
    const items = [{ sep: 'Desafio da semana' }];
    const row = c => { const active = s && s.chall === c.id; const done = !!G.meta.chall[c.id]; return { ic: c.ic, t: c.n + (done ? ' ✅' : ''), sub: active ? 'Ativo nesta vida • toque para ver' : (done ? 'Concluído • toque para refazer' : 'Toque para ativar nesta vida'), fn: () => this.challDetail(c) }; };
    items.push(row(featured));
    items.push({ sep: 'Cofre de desafios' });
    CHALLENGES.filter(c => c !== featured).forEach(c => items.push(row(c)));
    const h = G.meta.hunt;
    items.push({ sep: `Caça às relíquias (${h.length}/${HUNT.length})` });
    HUNT.forEach(x => items.push({ ic: h.includes(x.id) ? '✨' : '❔', t: h.includes(x.id) ? x.n : '???', sub: h.includes(x.id) ? 'Encontrada!' : `Pista: ${x.hint}`, cls: h.includes(x.id) ? '' : 'dim' }));
    return { title: 'Desafios', items };
  },
  async challDetail(c) {
    const s = G.s; if (!s) return UI.alert(c.n, 'Comece uma vida para participar.');
    const active = s.chall === c.id;
    const prog = active ? (s.challProg || {}) : {};
    const txt = c.steps.map(([n], i) => `${prog[i] ? '✅' : '⬜'} ${n}`).join('\n');
    if (active) return UI.alert(c.n, txt, c.ic);
    if (await UI.confirm(c.n, `${txt}\n\nAtivar este desafio para a vida atual? (substitui o desafio ativo)`)) { s.chall = c.id; s.challProg = {}; delete s.flags['chall_done_' + c.id]; this.check(); UI.toast(`Desafio ativado: ${c.n}`); }
  }
};
