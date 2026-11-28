'use strict';
// ===== Núcleo =====
const G = { s: null, meta: null, busy: false };
const P = () => G.s.p;
const C = id => COUNTRIES.find(c => c.id === (id || G.s.p.country)) || COUNTRIES[0];
const M = base => Math.round(base * C().pl);           // valor base (USD) -> interno
function fmt(v, short = false) {
  const c = C(); const x = Math.round((v || 0) * c.rate); const a = Math.abs(x); const sg = x < 0 ? '-' : '';
  if (short || a >= 1e7) {
    if (a >= 1e12) return `${sg}${c.cur} ${(a / 1e12).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} tri`;
    if (a >= 1e9) return `${sg}${c.cur} ${(a / 1e9).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} bi`;
    if (a >= 1e6) return `${sg}${c.cur} ${(a / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
    if (short && a >= 1e4) return `${sg}${c.cur} ${(a / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  }
  return `${sg}${c.cur} ${a.toLocaleString('pt-BR')}`;
}
function randFirst(lang, g) { const L = NAMES[lang] || NAMES.pt; return R.pick(g === 'F' ? L.f : L.m); }
function randLast(lang) { return R.pick((NAMES[lang] || NAMES.pt).l); }
const fname = n => n ? `${n.first} ${n.last}` : '';

// ---------- estatísticas ----------
function ch(k, d) { const p = P(); if (p[k] === undefined) p[k] = 50; p[k] = clamp(Math.round(p[k] + d)); }
function chR(n, d) { if (n) n.rel = clamp(Math.round((n.rel ?? 50) + d)); }
function karma(d) { ch('karma', d); }

// ---------- log ----------
function ensureYear() {
  const s = G.s; let e = s.log[s.log.length - 1];
  if (!e || e.age !== s.p.age || e.gen !== s.gen) { e = { age: s.p.age, year: s.year, gen: s.gen, l: [] }; s.log.push(e); if (s.log.length > 200) s.log.shift(); }
  return e;
}
function log(t, cls = '') { ensureYear().l.push([t, cls]); }

// ---------- dinheiro ----------
function cash(n) { P().money = Math.round(P().money + n); }
function canPay(n) { return P().money >= n; }
async function pay(n, what = '') {
  if (n <= 0) return true;
  if (!canPay(n)) { await UI.alert('Dinheiro insuficiente', `Você precisa de ${fmt(n)}${what ? ' para ' + what : ''}, mas tem ${fmt(P().money)}.`, '💸'); return false; }
  cash(-n); return true;
}
function netWorth() {
  const p = P(); let v = p.money - (p.debtStudent || 0);
  for (const a of p.assets) v += (a.val || 0) - (a.loan || 0);
  for (const b of (p.sp.biz || [])) v += (b.val || 0) * (b.own ?? 1);
  return v;
}

// ---------- limites por ano / contadores ----------
function lim(k, n = 1) { const y = G.s.yr; y[k] = (y[k] || 0) + 1; return y[k] <= n; }
function used(k) { return G.s.yr[k] || 0; }
function cnt(k, n = 1) { const s = G.s; s.cnt[k] = (s.cnt[k] || 0) + n; if (G.meta) { G.meta.tot[k] = (G.meta.tot[k] || 0) + n; } }

// ---------- NPCs ----------
function mkNPC(o = {}) {
  const c = C(o.country || G.s.p?.country);
  const g = o.g || R.pick(['M', 'F']);
  const n = {
    id: uid(), first: o.first || randFirst(c.lang, g), last: o.last ?? randLast(c.lang), g, age: o.age ?? 0, alive: true,
    hea: o.hea ?? R.int(55, 100), loo: o.loo ?? R.int(10, 100), smr: o.smr ?? R.int(10, 100), craz: o.craz ?? R.int(0, 100),
    rel: o.rel ?? R.int(40, 90), role: o.role || 'amigo', job: o.job ?? null, money: o.money ?? 0, country: c.id,
    sex: o.sex || R.wpick([{ k: 'het', w: 88 }, { k: 'gay', w: 8 }, { k: 'bi', w: 4 }]).k
  };
  Object.assign(n, o.extra || {});
  G.s.npcs[n.id] = n; return n;
}
const N = id => G.s.npcs[id];
const byRole = (...roles) => Object.values(G.s.npcs).filter(n => roles.includes(n.role));
const alive = (...roles) => byRole(...roles).filter(n => n.alive);
function partner() { return alive('parceiro', 'noivo', 'conjuge')[0] || null; }
function spouse() { return alive('conjuge')[0] || null; }
const ROLE_N = {
  mae: ['Mãe', 'Mãe'], pai: ['Pai', 'Pai'], irmao: ['Irmão', 'Irmã'], meioirmao: ['Meio-irmão', 'Meia-irmã'], avo: ['Avô', 'Avó'],
  filho: ['Filho', 'Filha'], neto: ['Neto', 'Neta'], parceiro: ['Namorado', 'Namorada'], noivo: ['Noivo', 'Noiva'], conjuge: ['Marido', 'Esposa'],
  ex: ['Ex', 'Ex'], amigo: ['Amigo', 'Amiga'], inimigo: ['Inimigo', 'Inimiga'], colegaE: ['Colega de classe', 'Colega de classe'],
  colegaT: ['Colega de trabalho', 'Colega de trabalho'], chefe: ['Chefe', 'Chefe'], prof: ['Professor', 'Professora'],
  padrasto: ['Padrasto', 'Madrasta'], enteado: ['Enteado', 'Enteada'], amante: ['Amante', 'Amante'], tio: ['Tio', 'Tia'], primo: ['Primo', 'Prima'],
  detento: ['Colega de cela', 'Colega de cela'], vampfilho: ['Cria vampírica', 'Cria vampírica'], fa: ['Fã', 'Fã'], rival: ['Rival', 'Rival'], treinador: ['Treinador', 'Treinadora']
};
const roleName = n => (ROLE_N[n.role] || [n.role, n.role])[n.g === 'F' ? 1 : 0];
function removeRole(...roles) { for (const n of byRole(...roles)) delete G.s.npcs[n.id]; }

// mortalidade
function deathRisk(age, hea) {
  let r;
  if (age < 1) r = .003; else if (age < 15) r = .0008; else if (age < 40) r = .0015; else if (age < 60) r = .005;
  else r = .012 + Math.pow((age - 60) / 40, 3) * .55;
  r *= (1.6 - hea / 100);
  return Math.min(.95, r);
}
const NPC_CAUSES = ['causas naturais', 'um ataque cardíaco', 'um AVC', 'câncer', 'pneumonia', 'um acidente de carro', 'complicações da idade', 'insuficiência renal'];

// ---------- vida nova ----------
function newLife(o = {}) {
  const c = COUNTRIES.find(x => x.id === o.country) || R.pick(COUNTRIES);
  const g = o.g || R.pick(['M', 'F']);
  const year = o.year || new Date().getFullYear();
  G.s = { v: 1, id: uid(), year, npcs: {}, log: [], snaps: [], cnt: {}, flags: { bornCountry: c.id }, yr: {}, gen: o.gen || 1, tree: o.tree || [], listings: {}, preg: [], chall: o.chall || null };
  let cls = o.cls || R.wpick([{ k: 'pobre', w: 30 }, { k: 'media', w: 50 }, { k: 'rica', w: 17 }, { k: 'milionaria', w: 3 }]).k;
  const royal = (o.royal || (c.mon && R.ch(.012))) && !!c.mon;
  if (royal) cls = 'milionaria';
  const lang = c.lang;
  const last = o.last || randLast(lang);
  const p = {
    id: uid(), first: o.first || randFirst(lang, g), last, g, age: 0, alive: true, born: year, country: c.id, city: o.city || R.pick(c.cities), cls,
    hap: R.int(60, 100), hea: o.hea ?? R.int(70, 100), smr: o.smr ?? R.int(5, 100), loo: o.loo ?? R.int(5, 100),
    ath: o.ath ?? R.int(5, 60), karma: R.int(40, 70), craz: R.int(0, 60), will: R.int(20, 90), fert: R.int(30, 100), fame: 0, notor: 0,
    sex: o.sex || R.wpick([{ k: 'het', w: 85 }, { k: 'gay', w: 9 }, { k: 'bi', w: 6 }]).k, out: false,
    bday: { d: R.int(1, 28), m: R.int(1, 12) }, religion: null, talent: o.talent || (R.ch(.35) ? R.pick(TALENTS).id : null),
    money: 0, debtStudent: 0,
    edu: { stage: null, year: 0, perf: 60, pop: 50, degrees: [], major: null, clubs: [], sport: null, clique: null, pay: null, grad: null, rep: 0 },
    job: null, jobs: [], retired: false, pension: 0, yearsWorked: 0, sp: {}, assets: [], pets: [], ill: [], addict: {}, lic: {}, record: [],
    prison: null, social: {}, vamp: null, magic: null, royal: null, willPlan: null, belt: 0, beltProg: 0, instr: {}, books: [], diet: null, prisonYears: 0, donated: 0, trips: 0, inherited: 0
  };
  p.sign = zodiac(p.bday.d, p.bday.m);
  G.s.p = p;
  if (o.witch) p.magic = mkMagic(true);
  // família
  const pm = { pobre: [1000, 15000], media: [20000, 150000], rica: [300000, 3000000], milionaria: [5000000, 60000000] }[cls];
  const momAge = R.int(18, 42), dadAge = clamp(momAge + R.int(-4, 8), 18, 60);
  const jobsByCls = { pobre: ['Faxineira', 'Pedreiro', 'Garçom', 'Desempregado(a)', 'Caixa', 'Motorista'], media: ['Professor(a)', 'Enfermeiro(a)', 'Contador(a)', 'Policial', 'Vendedor(a)', 'Engenheiro(a)'], rica: ['Advogado(a)', 'Médico(a)', 'Executivo(a)', 'Dentista', 'Empresário(a)'], milionaria: ['Empresário(a)', 'Investidor(a)', 'CEO', 'Herdeiro(a)'] }[cls];
  let mom = null, dad = null;
  if (!o.orphan) {
    mom = mkNPC({ g: 'F', age: momAge, last, role: 'mae', rel: R.int(55, 100), money: M(R.int(...pm)), job: R.pick(jobsByCls), extra: { married: true } });
    if (!R.ch(.08)) dad = mkNPC({ g: 'M', age: dadAge, last, role: 'pai', rel: R.int(50, 100), money: M(R.int(...pm)), job: R.pick(jobsByCls), extra: { married: true } });
    else mom.married = false;
    if (royal) {
      const monarch = R.ch(.5) || !dad ? mom : dad; monarch.monarch = true; monarch.job = gt(c.mon.emp ? 'Imperador|Imperatriz' : 'Rei|Rainha', monarch.g);
      const other = monarch === mom ? dad : mom; if (other) other.job = gt(c.mon.emp ? 'Imperador consorte|Imperatriz consorte' : 'Rei consorte|Rainha consorte', other.g);
    }
  }
  const nSib = o.sibs ?? R.wpick([{ k: 0, w: 35 }, { k: 1, w: 35 }, { k: 2, w: 20 }, { k: 3, w: 10 }]).k;
  const sibAges = [];
  for (let i = 0; i < nSib; i++) { const a = R.int(1, Math.min(14, Math.max(1, momAge - 17))); sibAges.push(a); mkNPC({ age: a, last, role: 'irmao', rel: R.int(30, 90), money: 0 }); }
  // avós
  const gp = (pAge, lastN) => { for (const gg of ['M', 'F']) { const a = pAge + R.int(18, 35); if (a < 92 && R.ch(.8)) mkNPC({ g: gg, age: a, last: lastN, role: 'avo', rel: R.int(40, 95), money: M(R.int(pm[0], pm[1] * 1.5)), job: a > 65 ? 'Aposentado(a)' : R.pick(jobsByCls), hea: R.int(30, 85) }); } };
  if (!o.orphan) { gp(momAge, randLast(lang)); if (dad) gp(dadAge, last); }
  if (royal) {
    const ttl = c.mon.emp ? 'Príncipe|Princesa' : 'Príncipe|Princesa';
    p.royal = { title: gt(ttl, g), respect: 60, monarch: false, line: nSib + 1 };
  }
  if (o.smr) p.smr = o.smr; if (o.loo) p.loo = o.loo;
  // log nascimento
  const born = ga(g, 'um menino', 'uma menina');
  log(`Nasci ${born} em ${p.city}, ${c.n} ${c.f}.`, 'big');
  log(`Meu nome é ${p.first} ${p.last}. Signo: ${p.sign}.`);
  if (mom) log(`Minha mãe é ${fname(mom)} (${mom.job}, ${mom.age} anos).`);
  if (dad) log(`Meu pai é ${fname(dad)} (${dad.job}, ${dad.age} anos).`); else if (mom) log('Não conheço meu pai.');
  if (o.orphan) log('Fui deixado(a) num orfanato logo ao nascer.', 'bad');
  if (p.royal) log(`Sou ${p.royal.title} da família real de ${c.n}! 👑`, 'good');
  if (p.talent) log(`Parece que tenho um talento especial para ${TALENTS.find(t => t.id === p.talent).n.toLowerCase()}.`);
  if (p.magic) log('Uma faísca estranha saiu dos meus dedos quando chorei... ✨', 'good');
  if (!G.s.tree.length) G.s.tree = [];
  return p;
}

// ---------- snapshot / time machine ----------
function snap() { const s = G.s; const copy = JSON.stringify({ ...s, snaps: [] }); s.snaps.push(copy); if (s.snaps.length > 6) s.snaps.shift(); }
function timeTravel(nYears) {
  const s = G.s; const idx = s.snaps.length - nYears; if (idx < 0) return false;
  const keep = s.snaps.slice(0, idx);
  const restored = JSON.parse(s.snaps[idx]); restored.snaps = keep; G.s = restored;
  log(`⏳ Voltei no tempo ${nYears} ano(s)!`, 'magic'); save(); return true;
}

// ---------- salvar ----------
function save() { if (G.s) Store.set('vv_save', G.s); Meta.save(); }
function loadGame() { const s = Store.get('vv_save'); if (s && s.p) { G.s = s; return true; } return false; }

// ---------- envelhecer ----------
async function ageUp() {
  if (G.busy || !G.s || !G.s.p.alive) return;
  G.busy = true; UI.lockNav(true);
  const s = G.s, p = s.p;
  try {
    snap();
    s.year++; p.age++; s.yr = {};
    ensureYear();
    const steps = [tickNPCs, tickHealth, () => p.prison ? Prison.tick() : null, () => !p.prison ? Edu.tick() : null, () => !p.prison ? Career.tick() : null,
      () => !p.prison ? Special.tick() : null, () => Assets.tick(), tickPets, tickMoney, tickPreg, () => Social.tick(), tickRel, () => Super.tick(), tickAging];
    for (const f of steps) { if (!p.alive) break; try { await f(); } catch (e) { console.error(e); } }
    if (p.alive) await Events.run();
    if (p.alive) checkDeath();
    Meta.check();
    save();
  } catch (e) { console.error(e); }
  G.busy = false; UI.lockNav(false); UI.refresh();
  if (!G.s.p.alive) UI.deathScreen();
}

function tickAging() {
  const p = P();
  if (p.vamp) { p.hea = clamp(p.hea + 2); return; }
  if (p.age > 30 && p.talent !== 'beleza' && R.ch(.5)) ch('loo', p.age > 60 ? -R.int(1, 3) : -R.int(0, 1));
  if (p.age > 55) ch('hea', -R.int(0, p.age > 78 ? 3 : 2));
  if (p.age > 40) ch('ath', -R.int(0, 2));
  if (p.age < 22 && R.ch(.4)) ch('smr', R.int(0, p.talent === 'intelecto' ? 3 : 2));
  if (p.age === 13) { p.loo = clamp(p.loo + R.int(-15, 15)); log('A puberdade chegou com tudo.'); }
  // felicidade tende ao centro, influenciada por fatores
  let target = 55;
  if (partner()) target += 8; if (p.job) target += 4; if (p.ill.length) target -= 8 * p.ill.length; if (p.prison) target -= 20;
  if (alive('amigo').length >= 3) target += 5; if (p.money < 0) target -= 10;
  ch('hap', Math.round((target - p.hap) * .15) + R.int(-4, 4));
  if (p.hap < 15 && !p.ill.some(i => i.n === 'Depressão') && R.ch(.3)) Health.add('Depressão');
  // consequências de dieta
  if (p.diet) { ch('hea', 1); }
  // aniversário
  if (p.age === 18) log('Cheguei à maioridade! 🎉');
}

function tickNPCs() {
  const s = G.s, p = s.p;
  for (const n of Object.values(s.npcs)) {
    if (!n.alive) continue;
    n.age++;
    if (n.age > 45) n.hea = clamp(n.hea - R.int(0, 3));
    if (n.age > 30 && R.ch(.3)) n.loo = clamp(n.loo - 1);
    if (n.sapo) { n.sapo--; }
    if (n.vamp) continue;
    // relação esfria levemente
    if (['amigo', 'parceiro', 'conjuge', 'noivo'].includes(n.role) && R.ch(.6)) chR(n, -R.int(1, 5));
    if (n.ill && R.ch(.4)) { n.hea = clamp(n.hea - 15); }
    if (R.ch(deathRisk(n.age, n.hea))) npcDies(n, n.ill ? n.ill : R.pick(NPC_CAUSES));
    else if (n.role === 'filho' && n.age === 18) log(`${n.first} completou 18 anos.`);
    // filhos adultos têm empregos e netos
    if (n.alive && n.role === 'filho') {
      if (n.age >= 22 && !n.job) n.job = gt(R.pick(JOBS)[1], n.g);
      if (n.age >= 22 && n.age <= 42 && R.ch(.07)) {
        const k = mkNPC({ age: 0, last: n.last, role: 'neto', rel: R.int(50, 90), extra: { parentId: n.id } });
        log(`${n.first} teve ${ga(k.g, 'um filho', 'uma filha')}: ${k.first}. Sou ${ga(p.g, 'avô', 'avó')}! 👶`, 'good');
      }
      if (n.age >= 22 && !n.money) n.money = M(R.int(2000, 60000));
    }
    if (n.alive && n.age >= 18 && ['mae', 'pai', 'avo', 'filho', 'irmao'].includes(n.role)) n.money = Math.max(0, Math.round(n.money * (1 + R.int(-5, 8) / 100)));
  }
  // pais podem divorciar / casar de novo
  const mom = alive('mae')[0], dad = alive('pai')[0];
  if (mom && dad && mom.married && p.age < 18 && R.ch(.025)) {
    mom.married = dad.married = false; log('Meus pais se divorciaram. 💔', 'bad'); ch('hap', -15);
  }
  if (p.age < 25 && byRole('padrasto').length === 0 && R.ch(.05)) {
    const single = [mom, dad].filter(x => x && x.alive && !x.married);
    if (single.length) {
      const par = R.pick(single); const sp = mkNPC({ g: par.g === 'F' ? 'M' : 'F', age: par.age + R.int(-5, 6), role: 'padrasto', rel: R.int(20, 70), job: gt(R.pick(JOBS)[1], 'M') });
      par.married = true;
      log(`${par.role === 'mae' ? 'Minha mãe' : 'Meu pai'} se casou de novo com ${fname(sp)}. Agora tenho ${ga(sp.g, 'um padrasto', 'uma madrasta')}.`);
      if (R.ch(.4)) { const st = mkNPC({ age: clamp(p.age + R.int(-5, 5), 0, 40), last: sp.last, role: 'meioirmao', rel: R.int(20, 70) }); log(`${ga(sp.g, 'Ele', 'Ela')} trouxe ${ga(st.g, 'um filho', 'uma filha')}, ${st.first}.`); }
    }
  }
  // novo irmão
  if (mom && mom.age < 44 && p.age < 16 && (mom.married || R.ch(.3)) && R.ch(.08)) {
    const b = mkNPC({ age: 0, last: dad ? dad.last : p.last, role: 'irmao', rel: R.int(50, 90) });
    log(`Minha mãe teve ${ga(b.g, 'um bebê menino', 'uma bebê menina')}: ${b.first}! Ganhei ${ga(b.g, 'um irmão', 'uma irmã')}.`, 'good');
  }
}

function npcDies(n, cause) {
  const p = P();
  n.alive = false; n.died = { age: n.age, cause, year: G.s.year };
  const rn = roleName(n);
  if (['mae', 'pai', 'avo', 'irmao', 'filho', 'neto', 'conjuge', 'parceiro', 'noivo', 'amigo', 'padrasto', 'meioirmao'].includes(n.role)) {
    log(`${n.g === 'F' ? 'Minha' : 'Meu'} ${rn.toLowerCase()} ${fname(n)} morreu de ${cause} aos ${n.age} anos. 🕯️`, 'bad');
    ch('hap', -(n.rel > 60 ? R.int(10, 25) : R.int(2, 8)));
    // herança
    if (['mae', 'pai', 'avo', 'conjuge'].includes(n.role) && n.money > 0) {
      const heirs = n.role === 'avo' ? 4 : (n.role === 'conjuge' ? 1 : 1 + alive('irmao').length);
      let share = n.role === 'avo' ? (R.ch(.35) ? Math.round(n.money * R.int(2, 10) / 100) : 0) : Math.round(n.money / heirs * (n.role === 'conjuge' ? 1 : R.int(50, 100) / 100));
      if (n.role !== 'conjuge' && n.rel < 25 && R.ch(.6)) { log(`${n.first} me deixou fora do testamento.`, 'bad'); share = 0; }
      if (share > 0) { cash(share); p.inherited += share; log(`Herdei ${fmt(share)} de ${n.first}.`, 'good'); }
      if (n.role === 'avo' && R.ch(.35)) { const h = R.pick(HEIRLOOMS); Assets.addHeirloom(h, `herança de ${n.first}`); log(`Também herdei uma relíquia de família: ${h}.`, 'good'); }
    }
    if (n.monarch && p.royal && !p.royal.monarch) Super.royalSucceed();
    if (n.role === 'conjuge') { n.role = 'conjuge'; G.s.flags.widow = true; }
  }
  if (n.role === 'pai' || n.role === 'mae') {
    // se for criança e órfã, nada muda além do log
  }
}

function tickHealth() { return Health.tick(); }

function tickPets() {
  const p = P();
  for (const pet of p.pets.slice()) {
    pet.age++;
    if (pet.age >= pet.life || R.ch(.02)) { p.pets = p.pets.filter(x => x !== pet); log(`Meu pet ${pet.name} (${pet.t.toLowerCase()}) morreu aos ${pet.age} anos. 🐾`, 'bad'); ch('hap', -R.int(5, 15)); continue; }
    if (pet.exotic && R.ch(pet.d / 3)) {
      const dmg = R.int(10, 50); ch('hea', -dmg); log(`Meu pet ${pet.name} (${pet.t.toLowerCase()}) me atacou! (-${dmg} saúde)`, 'bad');
      if (P().hea <= 0) die(`ataque do próprio animal de estimação (${pet.t.toLowerCase()})`);
    }
    pet.rel = clamp(pet.rel - R.int(0, 6));
    if (pet.rel < 10 && R.ch(.3)) { p.pets = p.pets.filter(x => x !== pet); log(`${pet.name} fugiu de casa por falta de atenção.`, 'bad'); }
  }
}

function tickMoney() {
  const p = P();
  // empréstimo estudantil
  if (p.debtStudent > 0 && p.age >= 22 && !p.edu.stage) {
    const pmt = Math.min(p.debtStudent, Math.max(M(1500), Math.round((p.job?.sal || 0) * .1)));
    cash(-pmt); p.debtStudent -= pmt;
    if (p.debtStudent <= 0) { p.debtStudent = 0; log('Quitei meu empréstimo estudantil! 🎓', 'good'); }
  }
  // pensão alimentícia
  if (G.s.flags.alimony > 0) { cash(-G.s.flags.alimony); G.s.flags.alimonyYears--; if (G.s.flags.alimonyYears <= 0) G.s.flags.alimony = 0; }
  // aposentadoria
  if (p.retired && p.pension) cash(p.pension);
  // pets custam
  if (p.pets.length) cash(-M(300) * p.pets.length);
  // royalties de livros
  for (const b of p.books) if (b.yrs > 0) { cash(b.roy); b.yrs--; }
  // mesada realeza
  if (p.royal && p.age >= 18) cash(M(p.royal.monarch ? 3000000 : 400000));
  // juros negativos
  if (p.money < 0) { cash(Math.round(p.money * .08)); if (p.money < -M(50000) && R.ch(.3)) log('Os cobradores não param de ligar. 📞', 'bad'); }
}

function tickPreg() {
  const s = G.s, p = s.p;
  for (const pr of s.preg.slice()) {
    pr.left--;
    if (pr.left > 0) continue;
    s.preg = s.preg.filter(x => x !== pr);
    const other = N(pr.other);
    const n = pr.twins ? 2 : 1;
    for (let i = 0; i < n; i++) Family.birth(other, pr.how);
  }
}

function tickRel() {
  const p = P();
  // namorados podem terminar
  const pt = partner();
  if (pt && pt.rel < 15 && R.ch(.4)) {
    log(`${fname(pt)} terminou comigo. 💔`, 'bad'); ch('hap', -12);
    if (pt.role === 'conjuge') Family.divorce(pt, true); else pt.role = 'ex';
  }
  // amigos somem
  for (const f of alive('amigo')) if (f.rel < 8 && R.ch(.5)) { f.role = 'ex_amigo'; log(`Perdi contato com ${fname(f)}.`); }
  // colegas de classe saem ao trocar de escola: feito em Edu
}

function checkDeath() {
  const p = P();
  if (p.vamp) { if (p.hea <= 0) die('perda total de sangue'); return; }
  const phys = p.ill.filter(i => !i.mental);
  if (p.hea <= 0) { const big = phys.filter(i => i.sev >= 2).sort((a, b) => b.sev - a.sev); die(big.length ? big[0].n.toLowerCase() : p.age > 70 ? 'velhice' : 'saúde debilitada'); return; }
  if (R.ch(deathRisk(p.age, p.hea))) {
    const cause = p.age > 70 ? R.pick(['velhice', 'causas naturais', 'um ataque cardíaco', 'um AVC', ...(phys.filter(i => i.sev >= 3).map(i => i.n.toLowerCase()))]) : (phys.some(i => i.sev >= 3) && R.ch(.6) ? phys.find(i => i.sev >= 3).n.toLowerCase() : R.pick(['um acidente de carro', 'um acidente doméstico', 'um ataque cardíaco', 'um aneurisma', 'uma queda', 'afogamento']));
    die(cause);
  }
  if (p.age >= 122 && !p.vamp) die('velhice extrema');
}

function die(cause) {
  const p = P(); if (!p.alive) return;
  p.alive = false; p.cause = cause;
  log(`Morri de ${cause} aos ${p.age} anos. ⚰️`, 'death');
  Meta.onDeath();
  save();
}

// ---------- gerações ----------
function continueAs(childId) {
  const s = G.s, old = s.p, kid = N(childId);
  if (!kid || !kid.alive) return false;
  // herança pelo testamento
  const plan = old.willPlan || Family.defaultWill();
  const estate = Math.max(0, old.money) + old.assets.reduce((v, a) => v + (a.k === 'casa' ? 0 : 0), 0);
  let kidShare = 0;
  for (const [id, pct] of Object.entries(plan)) { const amt = Math.round(estate * pct / 100); if (id === childId) kidShare += amt; else if (N(id)) N(id).money += amt; }
  const tree = s.tree.concat([{ name: `${old.first} ${old.last}`, born: old.born, age: old.age, cause: old.cause, nw: netWorth(), gen: s.gen }]);
  const oldNPC = { id: old.id, first: old.first, last: old.last, g: old.g, age: old.age, alive: false, hea: 0, loo: old.loo, smr: old.smr, rel: kid.rel, role: old.g === 'F' ? 'mae' : 'pai', money: 0, died: { age: old.age, cause: old.cause, year: s.year } };
  const otherParent = kid.otherParent ? N(kid.otherParent) : null;
  const siblings = Object.values(s.npcs).filter(n => n.role === 'filho' && n.id !== childId);
  const grandkids = Object.values(s.npcs).filter(n => n.role === 'neto' && n.parentId === childId);
  const grandparents = Object.values(s.npcs).filter(n => (n.role === 'mae' || n.role === 'pai') && n.alive);
  const keepAssets = old.assets; const keepPets = old.pets; const books = [];
  // novo estado
  const np = {
    id: kid.id, first: kid.first, last: kid.last, g: kid.g, age: kid.age, alive: true, born: s.year - kid.age, country: old.country, city: old.city, cls: old.cls,
    hap: clamp(kid.rel), hea: kid.hea, smr: kid.smr, loo: kid.loo, ath: R.int(10, 70), karma: 50, craz: kid.craz, will: R.int(20, 90), fert: R.int(30, 100), fame: Math.round(old.fame / 3), notor: 0,
    sex: kid.sex || 'het', out: false, bday: { d: R.int(1, 28), m: R.int(1, 12) }, religion: old.religion, talent: R.ch(.3) ? R.pick(TALENTS).id : null,
    money: kidShare + (kid.money || 0), debtStudent: 0,
    edu: { stage: null, year: 0, perf: 60, pop: 50, degrees: kid.age >= 18 ? ['medio'] : [], major: null, clubs: [], sport: null, clique: null, pay: null, grad: null, rep: 0 },
    job: null, jobs: [], retired: false, pension: 0, yearsWorked: 0, sp: {}, assets: keepAssets, pets: keepPets, ill: [], addict: {}, lic: {}, record: [],
    prison: null, social: {}, vamp: kid.vamp ? { rank: 0, ess: 0, fed: true, powers: [] } : null, magic: old.magic ? mkMagic(false, old.magic) : null, royal: null, willPlan: null, belt: 0, beltProg: 0, instr: {}, books, diet: null, prisonYears: 0, donated: 0, trips: 0, inherited: kidShare
  };
  np.sign = zodiac(np.bday.d, np.bday.m);
  if (old.royal) np.royal = { title: old.royal.monarch ? gt('Rei|Rainha', kid.g) : gt('Príncipe|Princesa', kid.g), respect: 55, monarch: old.royal.monarch, line: 1 };
  if (np.royal && np.royal.monarch) np.royal.title = gt(C(old.country).mon?.emp ? 'Imperador|Imperatriz' : 'Rei|Rainha', kid.g);
  const npcs = {};
  const put = (n, role) => { if (!n) return; n.role = role; npcs[n.id] = n; };
  put(oldNPC, old.g === 'F' ? 'mae' : 'pai');
  if (otherParent) put(otherParent, otherParent.g === 'F' ? 'mae' : 'pai');
  siblings.forEach(n => put(n, 'irmao'));
  grandkids.forEach(n => { delete n.parentId; put(n, 'filho'); n.otherParent = null; });
  grandparents.forEach(n => put(n, 'avo'));
  s.npcs = npcs; s.p = np; s.gen++; s.tree = tree; s.preg = []; s.flags = { bornCountry: old.country }; s.cnt = {}; s.snaps = []; s.yr = {}; s.listings = {};
  s.log.push({ age: np.age, year: s.year, gen: s.gen, l: [[`— Geração ${s.gen}: agora vivo como ${np.first} ${np.last}, ${np.age} anos. —`, 'big'], [kidShare ? `Herdei ${fmt(kidShare)} de ${oldNPC.first}.` : `${oldNPC.first} não me deixou dinheiro.`, kidShare ? 'good' : '']] });
  if (np.age >= 6 && np.age < 18) Edu.placeForAge();
  if (s.gen >= 5) Meta.ach('geracao5');
  save();
  return true;
}
