'use strict';
// ===== Educação e Carreira =====
function hasDeg(code) { const d = P().edu.degrees; if (code === 'uni') return d.some(x => x.startsWith('uni:')); if (code === 'tec') return d.includes('tec') || d.some(x => x.startsWith('uni:')); return d.includes(code); }
function majorOf() { const u = P().edu.degrees.filter(x => x.startsWith('uni:')); return u.map(x => x.slice(4)); }
const STAGE_N = { fund1: 'Ensino Fundamental I', fund2: 'Ensino Fundamental II', medio: 'Ensino Médio', tec: 'Faculdade técnica', uni: 'Universidade' };
const stageName = st => STAGE_N[st] || GRAD[st]?.n || st;
const stageArt = st => (['tec', 'uni', 'direito', 'medicina', 'farmacia', 'enfermagem', 'odonto', 'vet', 'mba'].includes(st) ? 'a ' : 'o ') + stageName(st);
const degName = d => d === 'medio' ? 'Ensino Médio' : d === 'tec' ? 'Curso técnico' : d.startsWith('uni:') ? `Bacharelado em ${d.slice(4)}` : (GRAD[d]?.n || d);
const grade = v => v >= 92 ? 'A+' : v >= 80 ? 'A' : v >= 65 ? 'B' : v >= 50 ? 'C' : v >= 35 ? 'D' : 'F';

const Edu = {
  newSchool(stage) {
    const p = P(); removeRole('colegaE', 'prof');
    const ageC = p.age;
    for (let i = 0; i < R.int(3, 5); i++) mkNPC({ age: clamp(ageC + R.int(-1, 1), 5, 40), role: 'colegaE', rel: R.int(20, 60) });
    mkNPC({ age: R.int(25, 64), role: 'prof', rel: R.int(30, 70), job: 'Professor(a)' });
    p.edu.clubs = []; p.edu.sport = null;
  },
  start(stage, extra = {}) {
    const p = P(); p.edu.stage = stage; p.edu.year = 0; p.edu.perf = clamp(50 + Math.round((p.smr - 50) / 3)); Object.assign(p.edu, extra);
    this.newSchool(stage);
    log(`Comecei ${stage === 'uni' ? `a universidade (${p.edu.major})` : stageArt(stage)}. 🎒`);
  },
  placeForAge() {
    const a = P().age;
    if (a >= 6 && a <= 10) this.start('fund1'); else if (a <= 14) this.start('fund2'); else if (a <= 17) this.start('medio');
  },
  async tick() {
    const p = P(), e = p.edu;
    if (!e.stage && p.age === 6 && !e.degrees.length && !e.dropped) { this.start('fund1'); return; }
    if (!e.stage) return;
    e.year++;
    // desempenho
    const study = used('estudar'), skip = used('faltar');
    e.perf = clamp(e.perf + Math.round((p.smr - 50) / 8) + study * 6 - skip * 8 + R.int(-6, 6) + (p.talent === 'intelecto' ? 3 : 0) + Math.round((55 - e.perf) / 6));
    e.pop = clamp(e.pop + R.int(-6, 6) + Math.round((p.loo - 50) / 25) + (e.sport ? 2 : 0) + e.clubs.length);
    if (['fund1', 'fund2', 'medio'].includes(e.stage)) {
      if (p.age === 11 && e.stage === 'fund1') { log(`Terminei o Fundamental I. Nota final: ${grade(e.perf)}.`); this.start('fund2'); return; }
      if (p.age === 15 && e.stage === 'fund2') { log(`Terminei o Fundamental II. Nota final: ${grade(e.perf)}.`); this.start('medio'); return; }
      if (e.stage === 'medio' && p.age >= 18) {
        if (e.perf < 20 && !e.repeated) { e.repeated = true; log('Fui reprovado(a) no último ano do ensino médio. Vou repetir. 😩', 'bad'); ch('hap', -10); return; }
        e.stage = null; e.degrees.push('medio'); removeRole('colegaE', 'prof');
        log(`Me formei no ensino médio! Nota final: ${grade(e.perf)} 🎓`, 'good'); Meta.ach('formado'); ch('hap', 10);
        e.rep = e.perf;
        await this.afterHighSchool();
        return;
      }
      log(`Boletim do ano: ${grade(e.perf)} (${e.perf}%) • Popularidade ${e.pop}%`, e.perf < 45 ? 'bad' : '');
      if (e.perf < 10 && R.ch(.2) && p.age >= 15) { log('Fui expulso(a) da escola por mau desempenho!', 'bad'); e.stage = null; e.dropped = true; removeRole('colegaE', 'prof'); }
      return;
    }
    // ensino superior
    const dur = e.stage === 'tec' ? 2 : e.stage === 'uni' ? 4 : GRAD[e.stage].y;
    await this.payTuition();
    if (e.perf < 15 && R.ch(.3)) { log(`Fui jubilado(a) do curso por desempenho ruim.`, 'bad'); e.stage = null; removeRole('colegaE', 'prof'); return; }
    if (e.year >= dur) {
      const code = e.stage === 'uni' ? 'uni:' + e.major : e.stage;
      e.degrees.push(code); log(`Me formei: ${degName(code)}! 🎓 (nota ${grade(e.perf)})`, 'good'); ch('hap', 12); ch('smr', 3);
      e.rep = e.perf; e.stage = null; removeRole('colegaE', 'prof');
      if (code.startsWith('uni:')) Meta.ach('diploma');
    } else log(`${stageName(e.stage)}: ano ${e.year} de ${dur}. Nota ${grade(e.perf)}.`);
  },
  tuition(stage) { const c = C(); if (stage === 'phd') return 0; const base = stage === 'tec' ? 8000 : stage === 'uni' ? 25000 : GRAD[stage].cost; return (c.uni && ['uni', 'tec'].includes(stage)) ? M(base * .1) : M(base); },
  async payTuition() {
    const p = P(), e = p.edu; const cost = this.tuition(e.stage); if (!cost) return;
    if (e.pay === 'bolsa') return; if (e.pay === 'pais') { const par = alive('mae', 'pai').find(x => x.money >= cost); if (par) { par.money -= cost; return; } e.pay = 'emprestimo'; log('Meus pais não puderam mais pagar a faculdade. Peguei um empréstimo.'); }
    if (e.pay === 'dinheiro' && p.money >= cost) { cash(-cost); return; }
    p.debtStudent += cost;
  },
  async choosePay(stage) {
    const p = P(); const cost = this.tuition(stage);
    if (!cost) return 'bolsa';
    const opts = [];
    const par = alive('mae', 'pai').filter(x => x.money > cost * 4);
    if (par.length && p.age < 30) opts.push({ t: 'Pedir aos pais', sub: 'Eles podem dizer não', v: 'pais' });
    opts.push({ t: 'Empréstimo estudantil', sub: `${fmt(cost)}/ano na dívida`, v: 'emprestimo' });
    opts.push({ t: 'Pagar do meu bolso', sub: `${fmt(cost)}/ano`, v: 'dinheiro' });
    if (p.edu.rep >= 80 || p.smr >= 85 || (p.edu.sport && p.ath >= 75)) opts.push({ t: 'Tentar bolsa de estudos', sub: p.edu.sport && p.ath >= 75 ? 'Bolsa atlética' : 'Bolsa por mérito', v: 'bolsa' });
    const r = await UI.choose('Como pagar?', `A mensalidade é ${fmt(cost)} por ano.`, opts);
    if (!r) return null;
    if (r === 'pais') { if (R.ch(.35 + par[0].rel / 200)) return 'pais'; await UI.alert('Pais', 'Seus pais se recusaram a pagar. Você terá de usar empréstimo.'); return 'emprestimo'; }
    if (r === 'bolsa') { if (R.ch(.6)) { await UI.alert('Bolsa!', 'Você ganhou uma bolsa integral! 🎉', '🎓'); return 'bolsa'; } await UI.alert('Bolsa', 'Seu pedido de bolsa foi negado. Usando empréstimo.'); return 'emprestimo'; }
    if (r === 'dinheiro' && p.money < cost) { await UI.alert('Dinheiro', 'Você não tem dinheiro suficiente. Usando empréstimo.'); return 'emprestimo'; }
    return r;
  },
  async afterHighSchool() {
    const p = P();
    const r = await UI.choose('Formatura!', 'Você se formou no ensino médio. E agora?', [
      { t: 'Ir para a universidade', v: 'uni' }, { t: 'Faculdade técnica (2 anos)', v: 'tec' }, { t: 'Alistar-se no exército', v: 'mil' }, { t: 'Procurar emprego', v: 'job' }, { t: 'Tirar um ano sabático', v: 'gap' }]);
    if (r === 'uni') return this.enrollUni();
    if (r === 'tec') return this.enroll('tec');
    if (r === 'mil') return Career.enlist();
    if (r === 'gap') { ch('hap', 10); log('Tirei um ano sabático para descobrir o que quero da vida.'); }
  },
  async enrollUni() {
    const p = P();
    if (!hasDeg('medio')) return UI.alert('Universidade', 'Você precisa concluir o ensino médio (ou supletivo).');
    const ok = p.smr >= 30 || p.edu.rep >= 50 || R.ch(.6);
    if (!ok) { await UI.alert('Vestibular', 'Você não passou no vestibular este ano. Estude e tente de novo.', '📝'); return; }
    const maj = await UI.choose('Escolha o curso', 'Qual será sua graduação?', MAJORS.filter(m => !p.edu.degrees.includes('uni:' + m)).map(m => ({ t: m, v: m })));
    if (!maj) return;
    const pay = await this.choosePay('uni'); if (!pay) return;
    this.start('uni', { major: maj, pay });
    if (p.job && !p.job.pt) { await UI.alert('Emprego', 'Você deixou seu emprego em tempo integral para estudar.'); Career.quit(true); }
  },
  async enroll(stage) {
    const p = P();
    if (stage === 'tec' && !hasDeg('medio')) return UI.alert('Faculdade técnica', 'Você precisa do ensino médio.');
    if (GRAD[stage]) {
      const g = GRAD[stage];
      if (!hasDeg('uni')) return UI.alert(g.n, 'Você precisa de um diploma universitário.');
      if (g.maj && !majorOf().some(m => g.maj.includes(m))) return UI.alert(g.n, `É preciso graduação em: ${g.maj.join(', ')}.`);
      if (p.smr < g.smr && !(p.edu.rep >= 85 && p.smr >= g.smr - 10)) return UI.alert(g.n, `Você não foi aceito(a). Precisa de mais inteligência (${g.smr}%+).`, '📝');
    }
    const pay = await this.choosePay(stage); if (!pay) return;
    this.start(stage, { pay });
    if (p.job && !p.job.pt) Career.quit(true);
  },
  enrollMenu() {
    const p = P(); const items = [];
    if (!hasDeg('medio')) items.push({ ic: '📘', t: 'Supletivo (ensino médio)', sub: 'Concluir em 1 ano', fn: async () => { if (!(await pay(M(500)))) return; if (R.ch(.5 + p.smr / 200)) { p.edu.degrees.push('medio'); log('Concluí o supletivo! 🎓', 'good'); Meta.ach('formado'); return UI.alert('Supletivo', 'Aprovado(a)! Agora você tem o ensino médio.', '🎓'); } return UI.alert('Supletivo', 'Reprovado(a) na prova. Tente de novo ano que vem.'); } });
    items.push({ ic: '🏛️', t: 'Universidade', sub: '4 anos • graduação', fn: () => this.enrollUni() });
    items.push({ ic: '🔧', t: 'Faculdade técnica', sub: '2 anos', fn: () => this.enroll('tec') });
    for (const [k, g] of Object.entries(GRAD)) items.push({ ic: '🎓', t: g.n, sub: `${g.y} anos • ${g.maj ? 'Requer ' + g.maj.join('/') : 'Qualquer graduação'}`, fn: () => this.enroll(k) });
    return { title: 'Educação', head: `<p class="muted">Diplomas: ${p.edu.degrees.length ? p.edu.degrees.map(degName).join(', ') : 'nenhum'}</p>`, items };
  },
  schoolMenu() {
    const p = P(), e = p.edu; const basic = ['fund1', 'fund2', 'medio'].includes(e.stage);
    const items = [
      { ic: '📚', t: 'Estudar mais', sub: 'Melhora o desempenho', fn: async () => { if (!lim('estudar', 3)) return UI.alert('Estudar', 'Você já estudou muito este ano. Descanse!'); ch('smr', R.ch(.5) ? 1 : 0); e.perf = clamp(e.perf + R.int(2, 6)); return UI.alert('Estudos', 'Você passou horas estudando. 📖', '📚'); } },
      { ic: '🙈', t: 'Matar aula', sub: 'Diversão com risco', fn: async () => { lim('faltar', 9); ch('hap', 3); if (R.ch(.35)) { e.perf = clamp(e.perf - 6); for (const x of alive('mae', 'pai')) chR(x, -5); return UI.alert('Pego!', 'A escola ligou para seus pais. Encrenca!', '😬'); } return UI.alert('Matar aula', 'Você passou o dia fora e ninguém percebeu. 😎'); } }
    ];
    const prof = alive('prof')[0]; if (prof) items.push({ ic: '🧑‍🏫', t: `Professor(a): ${fname(prof)}`, sub: 'Interagir', fn: () => UI.open(() => Rel.personMenu(prof)) });
    const mates = alive('colegaE'); if (mates.length) { items.push({ sep: 'Colegas' }); mates.forEach(n => items.push(Rel.row(n))); }
    if (p.age >= 8) {
      items.push({ sep: 'Atividades extracurriculares' });
      items.push({ ic: '♟️', t: 'Clubes', sub: e.clubs.length ? e.clubs.join(', ') : 'Nenhum', fn: () => UI.open(() => this.clubsMenu()) });
      items.push({ ic: '⚽', t: 'Times esportivos', sub: e.sport || 'Nenhum', fn: () => UI.open(() => this.sportsMenu()) });
      if (basic && p.age >= 11) items.push({ ic: '👥', t: 'Panelinha', sub: e.clique || 'Nenhuma', fn: () => UI.open(() => ({ title: 'Panelinhas', items: CLIQUES.map(c => ({ ic: '👥', t: c, sub: e.clique === c ? 'Sua turma' : '', fn: async () => { if (R.ch(.6 + e.pop / 300)) { e.clique = c; e.pop = clamp(e.pop + 5); log(`Entrei para a turma dos ${c}.`); return UI.alert('Panelinha', `Você agora anda com os ${c}!`, '👥'); } return UI.alert('Panelinha', `Os ${c} não te aceitaram.`, '🙅'); } })) })) });
      items.push({ ic: '⭐', t: 'Popularidade', sub: `${e.pop}%`, fn: async () => { if (!lim('pop', 2)) return UI.alert('Popularidade', 'Já tentou bastante este ano.'); const d = R.int(-3, 10); e.pop = clamp(e.pop + d); return UI.alert('Popularidade', d > 0 ? 'Você fez novos amigos no recreio!' : 'Ninguém te deu muita bola hoje.', '⭐'); } });
    }
    if (basic && e.stage === 'medio' && p.age === 17) items.push({ ic: '🕺', t: 'Baile de formatura', fn: () => this.prom() });
    items.push({ ic: '🏫', t: 'Falar com o diretor', sub: 'Reclamar ou pedir ajuda', fn: async () => { const r = await UI.choose('Diretoria', 'O que dizer?', [{ t: 'Reclamar de bullying', v: 1 }, { t: 'Pedir para mudar de turma', v: 2 }, { t: 'Reclamar da comida', v: 3 }]); if (r === 2) { this.newSchool(e.stage); return UI.alert('Diretoria', 'Você mudou de turma. Novos colegas!'); } if (r) return UI.alert('Diretoria', 'O diretor prometeu que vai ver isso.', '🏫'); } });
    if (p.age >= 16 || !basic) items.push({ ic: '🚪', t: 'Abandonar os estudos', cls: 'danger', fn: async () => { if (!(await UI.confirm('Abandonar', 'Tem certeza?'))) return; log(`Abandonei ${stageArt(e.stage)}.`, 'bad'); e.stage = null; e.dropped = true; removeRole('colegaE', 'prof'); UI.back(); } });
    return { title: stageName(e.stage), head: `<div class="npchead"><div class="muted">Ano ${e.year + 1} ${e.major ? '• ' + esc(e.major) : ''}</div><div class="mini"><span>Desempenho (${grade(e.perf)})</span><div class="mbar"><i style="width:${e.perf}%"></i></div></div>${['fund1', 'fund2', 'medio'].includes(e.stage) ? `<div class="mini"><span>Popularidade</span><div class="mbar"><i style="width:${e.pop}%"></i></div></div>` : ''}</div>`, items };
  },
  clubsMenu() {
    const p = P(), e = p.edu;
    return { title: 'Clubes', items: CLUBS.map(c => ({ ic: e.clubs.includes(c) ? '✅' : '➕', t: c, sub: e.clubs.includes(c) ? 'Toque para sair' : '', fn: async () => {
      if (e.clubs.includes(c)) { e.clubs = e.clubs.filter(x => x !== c); return; }
      if (e.clubs.length >= 2) return UI.alert('Clubes', 'Você só pode participar de 2 clubes.');
      if (c === 'Clube de Investimentos' && !['uni', 'mba'].includes(e.stage)) return UI.alert('Clubes', 'Esse clube só existe no ensino superior.');
      e.clubs.push(c); ch('smr', 1); ch('hap', 2); e.pop = clamp(e.pop + 2); log(`Entrei no ${c}.`);
    } })) };
  },
  sportsMenu() {
    const p = P(), e = p.edu;
    return { title: 'Times esportivos', items: SPORTS.map(s => ({ ic: '🏅', t: s, sub: e.sport === s ? 'Seu time • toque para treinar' : '', fn: async () => {
      if (e.sport === s) { if (!lim('treino', 2)) return UI.alert('Treino', 'Treinos esgotados este ano.'); ch('ath', R.int(1, 4) + (p.talent === 'esporte' ? 2 : 0)); ch('hea', 1); return UI.alert('Treino', `Treino de ${s} pesado! 💪`); }
      if (p.ath < 30 && R.ch(.6)) return UI.alert('Peneira', `Você não passou na peneira de ${s}. Melhore o atletismo.`, '😓');
      e.sport = s; e.pop = clamp(e.pop + 5); cnt('timeEscola'); log(`Entrei no time de ${s} da escola. 🏅`);
      return UI.alert('Bem-vindo ao time!', `Você agora joga ${s}!`, '🏅');
    } })) };
  },
  async prom() {
    if (!lim('baile')) return UI.alert('Baile', 'O baile já aconteceu!');
    const mates = alive('colegaE', 'parceiro').filter(n => n.age >= 13 && n.age < 20);
    const r = await UI.choose('Baile de formatura', 'Com quem você vai?', mates.map(n => ({ t: fname(n), v: n.id })).concat([{ t: 'Sozinho(a)', v: 'solo' }, { t: 'Não vou', v: null }]));
    if (!r) return;
    if (r !== 'solo') { const n = N(r); if (R.ch(.6 + n.rel / 250)) { chR(n, 10); ch('hap', 12); const king = R.ch(P().edu.pop / 250); log(`Fui ao baile com ${n.first}.${king ? ' Fui eleito(a) rei/rainha do baile! 👑' : ''}`, 'good'); return UI.alert('Baile', `Você e ${n.first} dançaram a noite toda!${king ? '\nVocê foi coroad' + ga(P().g, 'o rei', 'a rainha') + ' do baile! 👑' : ''}`, '🕺'); } ch('hap', -8); return UI.alert('Baile', `${n.first} recusou o convite. 😢`); }
    ch('hap', 4); return UI.alert('Baile', 'Você foi sozinho(a) e até que se divertiu.');
  }
};

// ---------- Carreira ----------
const MIL_RANKS = ['Recruta', 'Soldado|Soldada', 'Cabo', 'Sargento', 'Tenente', 'Capitão|Capitã', 'Major', 'Coronel', 'General'];
const MIL_BRANCH = ['Exército', 'Marinha', 'Aeronáutica', 'Fuzileiros Navais'];
const Career = {
  qualifies(j) {
    const p = P(), r = j[3];
    if (r.age && p.age < r.age) return `Idade mínima ${r.age}`;
    if (r.e === 'medio' && !hasDeg('medio')) return 'Requer ensino médio';
    if (r.e === 'tec' && !hasDeg('tec')) return 'Requer curso técnico';
    if (r.e === 'uni' && !hasDeg('uni')) return 'Requer graduação';
    if (r.m && !majorOf().some(m => r.m.includes(m))) return `Requer: ${r.m.slice(0, 3).join('/')}${r.m.length > 3 ? '…' : ''}`;
    if (r.g && !hasDeg(r.g)) return `Requer ${GRAD[r.g].n}`;
    if (r.smr && p.smr < r.smr) return `Inteligência ${r.smr}%+`;
    if (r.loo && p.loo < r.loo) return `Aparência ${r.loo}%+`;
    if (r.ath && p.ath < r.ath) return `Atletismo ${r.ath}%+`;
    if (r.lic === 'carro' && !p.lic.carro) return 'Requer CNH';
    if (r.lic === 'aviao' && !p.lic.aviao) return 'Requer licença de piloto';
    if (r.rel && !p.religion) return 'Requer uma religião';
    if (p.record.length && ['policial', 'agente', 'juiz', 'promotor', 'carcereiro', 'professor', 'diplomata'].includes(j[0])) return 'Ficha criminal suja';
    return null;
  },
  listings() {
    const s = G.s;
    if (s.listings.y !== s.year || !s.listings.jobs) { s.listings = { ...s.listings, y: s.year, jobs: R.sample(JOBS.map(j => j[0]), 20) }; }
    return s.listings.jobs.map(id => JOBS.find(j => j[0] === id)).filter(Boolean);
  },
  salaryFor(j, rank = 0) { return Math.round(M(j[2]) * Math.pow(1.3, rank) * R.int(90, 115) / 100); },
  async interview(title) {
    const p = P();
    const Q = [
      ['Por que você quer trabalhar aqui?', [['Sou apaixonado(a) por essa área', 2], ['Preciso pagar as contas', 0], ['Minha mãe mandou', -2]]],
      ['Qual é o seu maior defeito?', [['Sou perfeccionista demais', 1], ['Às vezes me atraso', -1], ['Não tenho defeitos', -1]]],
      ['Onde você se vê em 5 anos?', [['Crescendo aqui dentro', 2], ['No seu lugar', 1], ['Não faço ideia', -1]]],
      ['Como você lida com pressão?', [['Mantenho a calma e organizo', 2], ['Choro no banheiro', -1], ['Trabalho melhor sob pressão', 1]]],
      ['Você trabalha bem em equipe?', [['Sim, adoro colaborar', 2], ['Prefiro trabalhar sozinho(a)', 0], ['Só se eu for o líder', -1]]],
      ['Por que saiu do último emprego?', [['Busco novos desafios', 2], ['Meu chefe era um idiota', -2], ['Fui demitido(a)', -1]]],
      ['Conte uma conquista sua.', [['Liderei um projeto difícil', 2], ['Zerei um videogame', -1], ['Sobrevivi até aqui', 0]]]
    ];
    let score = 0;
    for (const [q, ans] of R.sample(Q, 2)) {
      const r = await UI.choose(`Entrevista: ${title}`, q, R.shuffle(ans).map(([t, v]) => ({ t, v: String(v) })));
      if (r === null) return null;
      score += Number(r);
    }
    const chance = .35 + score * .08 + (p.smr - 50) / 250 + (p.loo - 50) / 400 + (p.edu.rep - 50) / 400 - (p.record.length ? .15 : 0);
    return R.ch(clamp(chance * 100, 5, 95) / 100);
  },
  async apply(j) {
    const p = P();
    const why = this.qualifies(j);
    if (why) return UI.alert('Requisitos', `Você não está qualificado(a): ${why}.`, '📋');
    if (p.edu.stage && ['uni', 'tec'].concat(Object.keys(GRAD)).includes(p.edu.stage)) { if (!(await UI.confirm('Estudos', 'Aceitar um emprego integral vai trancar seus estudos. Continuar?'))) return; p.edu.stage = null; removeRole('colegaE', 'prof'); }
    else if (p.edu.stage) return UI.alert('Escola', 'Termine a escola primeiro (ou procure meio período).');
    if (!lim('candidatura', 6)) return UI.alert('Candidaturas', 'Você já se candidatou a muitas vagas este ano.');
    const ok = await this.interview(gt(j[1], p.g));
    if (ok === null) return;
    if (!ok) return UI.alert('Não foi desta vez', `A empresa escolheu outro(a) candidato(a) para ${gt(j[1], p.g)}.`, '📭');
    if (p.job) this.quit(true);
    this.hire(j);
    return UI.alert('Contratado(a)!', `Você agora é ${p.job.t}! Salário: ${fmt(p.job.sal)}/ano.`, '🎉');
  },
  hire(j, rank = 0) {
    const p = P();
    const ranks = j[4] || [j[1]];
    p.job = { id: j[0], ranks, rank, t: gt(ranks[rank], p.g), sal: this.salaryFor(j, rank), perf: 55, years: 0, rankYears: 0 };
    removeRole('colegaT', 'chefe');
    mkNPC({ age: clamp(p.age + R.int(3, 20), 25, 70), role: 'chefe', rel: R.int(30, 70), job: 'Gerente' });
    for (let i = 0; i < R.int(2, 4); i++) mkNPC({ age: clamp(p.age + R.int(-8, 12), 18, 70), role: 'colegaT', rel: R.int(25, 65), job: p.job.t });
    log(`Fui contratado(a) como ${p.job.t}. 💼`, 'good');
    if (j[0] === 'medico') Meta.ach('medico'); if (j[0] === 'advogado') Meta.ach('advogado');
    p.retired = false;
  },
  quit(quiet = false, fired = false) {
    const p = P(); if (!p.job) return;
    p.jobs.push({ t: p.job.t, years: p.job.years, fired });
    if (!quiet) log(fired ? `Fui demitido(a) do cargo de ${p.job.t}. 📦` : `Pedi demissão do cargo de ${p.job.t}.`, fired ? 'bad' : '');
    p.job = null; removeRole('colegaT', 'chefe');
  },
  async tick() {
    const p = P();
    if (p.pt) { cash(Math.round(p.pt.sal * (1 - C().tax / 2))); p.pt.years++; if (R.ch(.04)) { log(`Fui dispensado(a) do meu trabalho de ${p.pt.t}.`, 'bad'); p.pt = null; } }
    const j = p.job; if (!j) return;
    if (j.id === 'militar') return this.milTick();
    const net = Math.round(j.sal * (1 - C().tax));
    cash(net); j.years++; j.rankYears++; p.yearsWorked++;
    const worked = used('trabalhar');
    j.perf = clamp(j.perf + worked * 6 + Math.round((p.smr - 55) / 12) + R.int(-10, 7) - (p.addict.alcool || 0) * 2);
    if (j.perf < 15 && R.ch(.45)) { this.quit(false, true); ch('hap', -12); return; }
    if (j.rank < j.ranks.length - 1 && j.perf > 70 && j.rankYears >= 2 && R.ch(.45)) {
      j.rank++; j.rankYears = 0; j.sal = Math.round(j.sal * R.int(122, 140) / 100); j.t = gt(j.ranks[j.rank], p.g);
      log(`Fui promovido(a) a ${j.t}! Novo salário: ${fmt(j.sal)}. 📈`, 'good'); ch('hap', 10); cnt('promocoes');
      if (j.id === 'astronauta' && j.rank >= 1) { Meta.ach('astronauta'); cnt('espaco'); }
    } else if (R.ch(.35)) { j.sal = Math.round(j.sal * (1 + R.int(1, 4) / 100)); }
    if (R.ch(.025)) { log('A empresa fez cortes e eu fui demitido(a). 😞', 'bad'); this.quit(true, true); ch('hap', -10); }
    if (p.age >= 65 && R.ch(.25)) {
      const r = await UI.choose('Aposentadoria', 'Você já tem idade para se aposentar. Quer?', [{ t: 'Aposentar agora', v: 1 }, { t: 'Continuar trabalhando', v: 0 }]);
      if (r) this.retire();
    }
  },
  retire() {
    const p = P(); if (!p.job) return;
    const pct = p.yearsWorked >= 30 ? .6 : p.yearsWorked >= 20 ? .45 : p.yearsWorked >= 10 ? .3 : p.yearsWorked >= 5 ? .15 : 0;
    p.pension = Math.round(p.job.sal * pct); const t = p.job.t; this.quit(true); p.retired = true;
    log(`Me aposentei como ${t}. Aposentadoria: ${fmt(p.pension)}/ano. 🏖️`, 'good'); ch('hap', 10);
  },
  menu() {
    const p = P();
    if (p.prison) return Prison.menu();
    const items = [];
    if (p.job) items.push({ ic: p.job.id === 'militar' ? '🎖️' : '💼', t: p.job.t, sub: `${fmt(p.job.sal)}/ano • ${p.job.years} ano(s)`, fn: () => UI.open(() => p.job.id === 'militar' ? this.milMenu() : this.jobMenu()) });
    if (p.pt) items.push({ ic: '⏰', t: gt(p.pt.t, p.g) + ' (meio período)', sub: `${fmt(p.pt.sal)}/ano`, fn: async () => { const r = await UI.choose(gt(p.pt.t, p.g), 'Trabalho de meio período', [{ t: 'Trabalhar mais', v: 1 }, { t: 'Pedir demissão', v: 2 }]); if (r === 1) { ch('hap', -1); if (R.ch(.2)) { p.pt.sal = Math.round(p.pt.sal * 1.1); return UI.alert('Aumento', 'Seu chefe gostou e te deu aumento!'); } } if (r === 2) { log(`Saí do meu emprego de ${gt(p.pt.t, p.g)}.`); p.pt = null; } } });
    if (p.edu.stage) items.push({ ic: '🎒', t: stageName(p.edu.stage), sub: `Nota ${grade(p.edu.perf)}`, fn: () => UI.open(() => Edu.schoolMenu()) });
    if (p.retired) items.push({ ic: '🏖️', t: 'Aposentado(a)', sub: `${fmt(p.pension)}/ano`, dis: true });
    if (p.age >= 18 || (p.age >= 16 && p.edu.dropped)) {
      items.push({ sep: 'Oportunidades' });
      items.push({ ic: '📰', t: 'Vagas de emprego', sub: 'Tempo integral', fn: () => UI.open(() => this.jobsMenu()) });
    }
    if (p.age >= 14 && !p.pt) items.push({ ic: '⏰', t: 'Meio período', sub: 'Ideal para estudantes', fn: () => UI.open(() => this.ptMenu()) });
    if (p.age >= 6) items.push({ ic: '🪙', t: 'Bicos', sub: 'Trabalhos rápidos', fn: () => UI.open(() => this.gigsMenu()) });
    if (p.age >= 12) items.push({ ic: '⭐', t: 'Carreiras especiais', sub: 'Fama, poder, esporte, crime...', fn: () => UI.open(() => Special.menu()) });
    if (p.age >= 18 && p.age <= 35 && p.job?.id !== 'militar') items.push({ ic: '🎖️', t: 'Forças Armadas', sub: 'Alistar-se', fn: () => this.enlist() });
    if (p.age >= 18 && !p.edu.stage) items.push({ ic: '🎓', t: 'Educação', sub: 'Universidade, pós, supletivo', fn: () => UI.open(() => Edu.enrollMenu()) });
    if (p.job && p.age >= 50) items.push({ ic: '🏖️', t: 'Aposentar-se', fn: async () => { if (await UI.confirm('Aposentadoria', 'Aposentar-se agora?')) this.retire(); } });
    if (p.jobs.length) items.push({ ic: '🗂️', t: 'Histórico profissional', sub: `${p.jobs.length} emprego(s)`, fn: () => UI.alert('Histórico', p.jobs.map(j => `• ${j.t} — ${j.years} ano(s)${j.fired ? ' (demitido)' : ''}`).join('\n'), '🗂️') });
    if (p.age < 6) items.push({ ic: '🍼', t: 'Você é muito novo(a) para trabalhar', dis: true });
    return { title: 'Ocupação', items };
  },
  jobsMenu() {
    const p = P();
    const list = this.listings().map(j => { const why = this.qualifies(j); return { ic: why ? '🔒' : '📄', t: gt(j[1], p.g), sub: `${fmt(M(j[2]))}/ano${why ? ' • ' + why : ''}`, cls: why ? 'dim' : '', fn: () => this.apply(j) }; });
    return { title: 'Vagas de emprego', head: '<p class="muted">Novas vagas aparecem a cada ano.</p>', items: list };
  },
  ptMenu() {
    const p = P();
    return { title: 'Meio período', items: R.sample(PARTTIME, 8).map(([t, s]) => ({ ic: '⏰', t: gt(t, p.g), sub: `${fmt(M(s))}/ano`, fn: async () => {
      if (!lim('candidaturaPT', 4)) return UI.alert('Meio período', 'Chega de candidaturas este ano.');
      if (R.ch(.65 + (p.loo - 50) / 300)) { p.pt = { t, sal: M(s), years: 0 }; log(`Consegui um trabalho de meio período como ${gt(t, p.g)}.`, 'good'); await UI.alert('Contratado(a)!', `Você começou como ${gt(t, p.g)}.`, '⏰'); UI.back(); }
      else return UI.alert('Recusado', 'Não te chamaram desta vez.');
    } })) };
  },
  gigsMenu() {
    const p = P();
    return { title: 'Bicos', items: GIGS.filter(g => p.age >= g.age).map(g => ({ ic: g.ic, t: g.n, sub: g.smr ? `Inteligência ${g.smr}%+` : '', fn: async () => {
      if (!lim('bico', 4)) return UI.alert('Bicos', 'Você já fez bicos demais este ano.');
      if (g.smr && p.smr < g.smr) return UI.alert(g.n, 'Ninguém quis contratar você para isso.');
      const v = M(R.int(...g.p)); cash(v); ch('hap', R.int(-2, 2));
      if (g.n === 'Tocar na rua' && Object.keys(p.instr).length) cash(v);
      return UI.alert(g.n, v > 0 ? `Você ganhou ${fmt(v)}.` : 'Ninguém te pagou nada hoje.', '🪙');
    } })) };
  },
  jobMenu() {
    const p = P(), j = p.job; if (!j) return { title: 'Emprego', items: [] };
    const items = [
      { ic: '💪', t: 'Trabalhar mais', sub: 'Melhora a performance', fn: async () => { if (!lim('trabalhar', 3)) return UI.alert('Trabalho', 'Você já se esforçou muito este ano.'); ch('hap', -1); j.perf = clamp(j.perf + R.int(2, 6)); return UI.alert('Dedicação', 'Você trabalhou até tarde. O chefe notou.', '💪'); } },
      { ic: '📈', t: 'Pedir aumento', fn: async () => { if (!lim('aumento')) return UI.alert('Aumento', 'Você já pediu este ano.'); if (R.ch(j.perf / 140)) { const inc = R.int(5, 15); j.sal = Math.round(j.sal * (1 + inc / 100)); log(`Ganhei um aumento de ${inc}%.`, 'good'); return UI.alert('Aumento!', `Aumento de ${inc}%! Novo salário: ${fmt(j.sal)}.`, '📈'); } j.perf = clamp(j.perf - 3); if (R.ch(.08)) { this.quit(false, true); UI.back(); return UI.alert('Demitido(a)', 'O chefe ficou irritado com o pedido e te demitiu!', '📦'); } return UI.alert('Negado', 'Seu chefe negou o aumento.', '🙅'); } },
      { ic: '⏱️', t: 'Fazer hora extra', sub: 'Mais dinheiro, menos felicidade', fn: async () => { if (!lim('extra', 2)) return UI.alert('Hora extra', 'Seu corpo não aguenta mais.'); const v = Math.round(j.sal * .04); cash(v); ch('hap', -3); ch('hea', -1); return UI.alert('Hora extra', `Você ganhou ${fmt(v)} extras.`, '⏱️'); } },
      { ic: '🤒', t: 'Tirar licença', fn: async () => { if (!lim('licenca')) return UI.alert('Licença', 'Você já tirou licença este ano.'); ch('hap', 5); ch('hea', 2); j.perf = clamp(j.perf - 4); return UI.alert('Licença', 'Uns dias de descanso fizeram bem.', '🛌'); } }
    ];
    const boss = alive('chefe')[0]; if (boss) items.push({ ic: '👔', t: `Chefe: ${fname(boss)}`, fn: () => UI.open(() => Rel.personMenu(boss)) });
    const co = alive('colegaT'); if (co.length) { items.push({ sep: 'Colegas de trabalho' }); co.forEach(n => items.push(Rel.row(n))); }
    items.push({ sep: 'Outros' });
    items.push({ ic: '🤫', t: 'Desviar dinheiro', sub: 'Crime de colarinho branco', cls: 'danger', fn: () => Crime.embezzle() });
    items.push({ ic: '🚪', t: 'Pedir demissão', cls: 'danger', fn: async () => { if (!(await UI.confirm('Demissão', `Pedir demissão de ${j.t}?`))) return; this.quit(); UI.back(); } });
    return { title: j.t, head: `<div class="npchead"><div class="muted">Salário ${fmt(j.sal)}/ano • ${j.years} ano(s) • Nível ${j.rank + 1}/${j.ranks.length}</div><div class="mini"><span>Performance</span><div class="mbar"><i style="width:${j.perf}%"></i></div></div></div>`, items };
  },
  // ----- Militar -----
  async enlist() {
    const p = P();
    if (p.age < 18 || p.age > 35) return UI.alert('Forças Armadas', 'Alistamento entre 18 e 35 anos.');
    if (p.record.some(r => r.y >= 5)) return UI.alert('Forças Armadas', 'Sua ficha criminal impede o alistamento.');
    const br = await UI.choose('Alistamento', 'Escolha a força:', MIL_BRANCH.map(b => ({ t: b, v: b }))); if (!br) return;
    if (p.ath < 25 && R.ch(.5)) return UI.alert('Reprovado', 'Você foi reprovado(a) no teste físico.', '🏃');
    if (p.job) this.quit(true);
    if (p.edu.stage) { p.edu.stage = null; removeRole('colegaE', 'prof'); }
    const officer = hasDeg('uni') ? 4 : 0;
    p.job = { id: 'militar', branch: br, rank: officer, ranks: MIL_RANKS, t: `${gt(MIL_RANKS[officer], p.g)} (${br})`, sal: M(28000 * Math.pow(1.25, officer)), perf: 55, years: 0, rankYears: 0, medals: 0, deploys: 0 };
    removeRole('colegaT', 'chefe');
    for (let i = 0; i < 3; i++) mkNPC({ age: clamp(p.age + R.int(-3, 8), 18, 60), role: 'colegaT', rel: R.int(30, 70), job: 'Militar' });
    mkNPC({ age: p.age + R.int(8, 25), role: 'chefe', rel: R.int(30, 60), job: 'Comandante' });
    log(`Me alistei no(a) ${br} como ${gt(MIL_RANKS[officer], p.g)}. 🎖️`, 'good');
    return UI.alert('Alistado(a)!', `Bem-vindo(a) ao/à ${br}!`, '🎖️');
  },
  milTick() {
    const p = P(), j = p.job;
    cash(Math.round(j.sal * (1 - C().tax / 2))); j.years++; j.rankYears++; p.yearsWorked++;
    j.perf = clamp(j.perf + used('treinoMil') * 6 + R.int(-6, 6) + Math.round((p.ath - 50) / 15));
    if (j.rank < MIL_RANKS.length - 1 && j.perf > 65 && j.rankYears >= 2 && R.ch(.5)) {
      j.rank++; j.rankYears = 0; j.sal = Math.round(j.sal * 1.22); j.t = `${gt(MIL_RANKS[j.rank], p.g)} (${j.branch})`; log(`Fui promovido(a) a ${gt(MIL_RANKS[j.rank], p.g)}! 🎖️`, 'good');
      if (j.rank === MIL_RANKS.length - 1) Meta.ach('militar');
    }
  },
  milMenu() {
    const p = P(), j = p.job;
    return { title: j.t, head: `<div class="npchead"><div class="muted">${j.years} ano(s) de serviço • ${j.medals} medalha(s) • ${j.deploys} missões</div><div class="mini"><span>Desempenho</span><div class="mbar"><i style="width:${j.perf}%"></i></div></div></div>`, items: [
      { ic: '🏋️', t: 'Treinar pesado', fn: async () => { if (!lim('treinoMil', 3)) return UI.alert('Treino', 'Você já treinou ao máximo.'); ch('ath', 2); ch('hea', 1); j.perf = clamp(j.perf + 4); return UI.alert('Treino', 'Treinamento concluído! 💪'); } },
      { ic: '🪖', t: 'Ser enviado(a) em missão', sub: 'Arriscado', fn: async () => {
        if (!lim('missao')) return UI.alert('Missão', 'Apenas uma missão por ano.');
        const ev = R.pick(['uma missão de paz', 'um resgate humanitário', 'um conflito armado', 'uma patrulha na fronteira', 'uma operação noturna']);
        j.deploys++;
        if (R.ch(.06)) { die(`em combate durante ${ev}`); return; }
        if (R.ch(.2)) { const d = R.int(10, 35); ch('hea', -d); log(`Fui ferido(a) durante ${ev}.`, 'bad'); return UI.alert('Ferido(a)', `Você foi ferido(a) em ${ev}. (-${d} saúde)`, '🩹'); }
        if (R.ch(.35)) { j.medals++; j.perf = clamp(j.perf + 15); log(`Recebi uma medalha de honra por ${ev}! 🏅`, 'good'); return UI.alert('Medalha!', `Bravura em ${ev}. Você ganhou uma medalha! 🏅`); }
        j.perf = clamp(j.perf + 5); return UI.alert('Missão cumprida', `Você voltou de ${ev} em segurança.`, '🪖');
      } },
      { ic: '🏃', t: 'Desertar', cls: 'danger', fn: async () => { if (!(await UI.confirm('Desertar', 'Desertar é crime. Tem certeza?'))) return; this.quit(true); log('Desertei das Forças Armadas.', 'bad'); if (R.ch(.5)) await Crime.arrest('Deserção', [1, 4]); else UI.back(); } },
      { ic: '📜', t: 'Dar baixa (sair)', fn: async () => { if (!(await UI.confirm('Baixa', 'Sair das Forças Armadas?'))) return; if (j.years >= 20) p.pension = Math.round(j.sal * .5); this.quit(); UI.back(); } }
    ] };
  }
};
