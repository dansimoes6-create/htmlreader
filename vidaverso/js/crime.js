'use strict';
// ===== Crimes, julgamento e prisão =====
const Crime = {
  menu() {
    const p = P();
    return { title: 'Crime', head: `<p class="muted">Notoriedade: ${p.notor}% • Ficha: ${p.record.length ? p.record.length + ' condenação(ões)' : 'limpa'}</p>`, items: CRIMES.filter(c => !['agressao', 'homicidio'].includes(c.id)).map(c => ({
      ic: c.ic, t: c.n, sub: p.age < c.age ? `🔒 A partir de ${c.age} anos` : '', cls: p.age < c.age ? 'dim' : '', fn: () => this.commit(c)
    })).concat([{ ic: '👊', t: 'Agredir um estranho', sub: p.age < 10 ? '🔒 10+' : '', fn: () => this.assault(null) }, { ic: '🔪', t: 'Homicídio (estranho)', sub: p.age < 14 ? '🔒 14+' : '', fn: () => this.murder(null) }]) };
  },
  bonus() { const p = P(); let b = (p.talent === 'crime' ? .12 : 0) + (p.sp.mafia ? .05 : 0); if (G.s.flags.invis) { b += .35; G.s.flags.invis = false; } return b; },
  async commit(c) {
    const p = P();
    if (p.age < c.age) return UI.alert(c.n, `Você precisa ter ${c.age} anos.`);
    if (!lim('crime', 5)) return UI.alert('Crime', 'Você precisa ficar na moita por um tempo. Tente ano que vem.');
    if (c.id === 'casa') return this.burglary(c);
    if (c.id === 'hack') return this.hack(c);
    let loot = 0, txt = '';
    if (c.id === 'furto') { const items = [['um chocolate', 3], ['um batom', 15], ['fones de ouvido', 80], ['um videogame', 400], ['um celular', 900], ['uma bolsa de grife', 1500]]; const it = await UI.choose('Furto', 'O que você vai tentar pegar?', items.map(([t, v]) => ({ t, sub: fmt(M(v)), v: [t, v] }))); if (!it) return; loot = M(it[1]); txt = `Você furtou ${it[0]}`; c = { ...c, p: c.p - Math.log10(it[1]) * .08 }; }
    else if (c.id === 'carteira') { const v = await UI.choose('Bater carteira', 'Escolha a vítima:', [{ t: 'Idoso distraído', v: [.8, 80] }, { t: 'Turista com mochila', v: [.6, 300] }, { t: 'Executivo apressado', v: [.45, 1200] }]); if (!v) return; c = { ...c, p: v[0] }; loot = M(R.int(5, v[1])); txt = 'Você roubou uma carteira'; }
    else if (c.id === 'carro') { const t = R.pick(CAR_TYPES.slice(0, 9)); const car = Assets.mkCar(t, true); car.stolen = true; c = { ...c, p: c.p + (car.val < M(30000) ? .15 : -.1) }; if (R.ch(clamp(c.p + this.bonus(), .05, .95))) { car.cond = R.int(40, 90); p.assets.push(car); return this.success(c, 0, `Você roubou um ${car.t}! Ele está na sua garagem (procure vender rápido).`); } return this.fail(c); }
    else if (c.id === 'banco') { const plan = await UI.choose('Assalto a banco', 'Qual é o plano?', [{ t: 'Entrar armado pela frente', v: [0, 1] }, { t: 'Cavar um túnel até o cofre', v: [.1, 1.5] }, { t: 'Subornar o gerente', v: [.15, .8] }, { t: 'Desistir', v: null }]); if (!plan) return; c = { ...c, p: c.p + plan[0] }; loot = M(Math.round(R.int(20000, 2000000) * plan[1])); txt = 'O assalto foi um sucesso'; }
    else if (c.id === 'trem') { loot = M(R.int(50000, 800000)); txt = 'Você saqueou o vagão de carga'; }
    else if (c.id === 'extorsao') { const t = await UI.choose('Extorsão', 'Quem extorquir?', [{ t: 'Comerciante local', v: [.6, 5000] }, { t: 'Político corrupto', v: [.35, 100000] }, { t: 'Celebridade com segredo', v: [.4, 300000] }]); if (!t) return; c = { ...c, p: t[0] }; loot = M(R.int(500, t[1])); txt = 'A vítima pagou para você ficar calado(a)'; }
    else if (c.id === 'pacote') { loot = M(R.int(10, 600)); txt = `Você roubou encomendas com ${R.pick(['tênis', 'um liquidificador', 'livros', 'roupas', 'um secador', 'brinquedos'])}`; }
    else if (c.id === 'vandal') { loot = 0; txt = 'Você pichou um muro inteiro'; ch('hap', 3); }
    if (R.ch(clamp(c.p + this.bonus(), .03, .97))) return this.success(c, loot, txt);
    return this.fail(c);
  },
  async success(c, loot, txt) {
    const p = P(); cash(loot); cnt('crimes'); p.notor = clamp(p.notor + Math.ceil(c.yrs[1] / 2) + 1); karma(-Math.ceil(c.yrs[1] / 3) - 1);
    log(`${txt}${loot ? ` (${fmt(loot)})` : ''}. 🦹`);
    if (G.s.cnt.crimes >= 10) Meta.ach('crime10');
    return UI.alert('Sucesso', `${txt}${loot ? ` e ganhou ${fmt(loot)}` : ''}. Ninguém te pegou.`, '🦹');
  },
  async fail(c) {
    const p = P(); cnt('crimes');
    if (R.ch(.25)) { log(`Tentei ${c.n.toLowerCase()} mas desisti no meio do caminho.`); return UI.alert('Fuga', 'Você foi visto(a), mas conseguiu fugir!', '🏃'); }
    await UI.alert('Pego(a)!', 'A polícia te pegou em flagrante! 🚓', '🚨');
    if (c.yrs[1] <= 1 && (p.age < 18 || R.ch(.5))) { const fine = M(R.int(200, 2000)); cash(-fine); p.record.push({ c: c.n, y: 0 }); log(`Fui pego(a) tentando ${c.n.toLowerCase()} e levei multa de ${fmt(fine)}.`, 'bad'); for (const x of alive('mae', 'pai')) chR(x, -10); return UI.alert('Multa', `Você pagou multa de ${fmt(fine)}${p.age < 18 ? ' e seus pais ficaram furiosos' : ''}.`, '👮'); }
    return this.arrest(c.n, c.yrs);
  },
  async arrest(crimeName, yrs) {
    const p = P();
    if (p.age < 18) { const y = R.int(1, 2); log(`Fui pego(a) por ${crimeName.toLowerCase()} e mandado(a) para o reformatório.`, 'bad'); return Prison.enter(crimeName, y, true); }
    const law = await UI.choose('Julgamento', `Você está sendo julgado(a) por ${crimeName.toLowerCase()}. Escolha sua defesa:`, [
      { t: 'Defensor público', sub: 'Grátis', v: { c: 0, p: .15 } }, { t: 'Advogado mediano', sub: fmt(M(5000)), v: { c: M(5000), p: .3 } }, { t: 'Advogado de elite', sub: fmt(M(80000)), v: { c: M(80000), p: .5 } }, { t: 'Declarar-se culpado(a)', sub: 'Pena reduzida', v: { c: 0, p: 0, plea: true } }]);
    const L = law || { c: 0, p: .15 };
    if (L.c && !canPay(L.c)) { await UI.alert('Sem dinheiro', 'Você não pode pagar esse advogado. Ficou com o defensor público.'); L.c = 0; L.p = .15; }
    cash(-L.c);
    if (!L.plea && R.ch(L.p + (p.smr - 50) / 400)) { log(`Fui absolvido(a) da acusação de ${crimeName.toLowerCase()}! ⚖️`, 'good'); return UI.alert('Absolvido(a)!', 'O júri te considerou inocente!', '⚖️'); }
    let y = R.int(yrs[0], yrs[1]); if (L.plea) y = Math.max(0, Math.round(y * .6));
    const c = C();
    if (crimeName === 'Homicídio' && c.death && y >= 40 && R.ch(.35)) { log('Fui condenado(a) à pena de morte. ⚖️', 'death'); return Prison.enter(crimeName, 99, false, true); }
    if (y === 0) { p.record.push({ c: crimeName, y: 0 }); log(`Fui condenado(a) por ${crimeName.toLowerCase()} a prestar serviços comunitários.`); return UI.alert('Sentença', 'Você foi condenado(a) a serviços comunitários.', '🧹'); }
    return Prison.enter(crimeName, y);
  },
  async assault(n) {
    const p = P();
    if (p.age < 6) return;
    const victim = n || mkNPC({ age: R.int(16, 70), role: 'estranho', rel: 0 });
    const how = await UI.choose('Agressão', `Como atacar ${victim.first}?`, [{ t: 'Socar', v: 1 }, { t: 'Chutar', v: 1.2 }, { t: 'Dar uma voadora', v: 1.5 }, { t: 'Usar um objeto', v: 2 }, { t: 'Desistir', v: null }]);
    if (!how) { if (!n) delete G.s.npcs[victim.id]; return; }
    const winP = .45 + (p.ath - 50) / 150 + p.belt * .04 + (p.sp.fighter ? .15 : 0);
    karma(-3);
    if (R.ch(winP)) {
      victim.hea = clamp(victim.hea - Math.round(R.int(10, 30) * how)); chR(victim, -40);
      if (n && !['mae', 'pai', 'filho', 'irmao', 'avo', 'conjuge'].includes(n.role)) n.role = 'inimigo';
      if (p.prison) { p.prison.resp = clamp((p.prison.resp || 0) + 10); }
      log(`Ataquei ${fname(victim)} e venci a briga. 👊`);
      if (victim.hea <= 0) { npcDies(victim, 'ferimentos de uma agressão'); cnt('homicidios'); }
      if (!p.prison && R.ch(.25)) { await UI.alert('Polícia', 'Alguém chamou a polícia!', '🚓'); return this.arrest('Agressão', [1, 4]); }
      if (!n) delete G.s.npcs[victim.id];
      return UI.alert('Vitória na briga', `Você deu uma surra em ${victim.first}.`, '👊');
    }
    const d = R.int(5, 25); ch('hea', -d); chR(victim, -30);
    log(`Tentei atacar ${fname(victim)}, mas apanhei. 🤕`, 'bad');
    if (p.hea <= 0) die('ferimentos de uma briga');
    if (!n) delete G.s.npcs[victim.id];
    return UI.alert('Derrota', `${victim.first} revidou e você levou a pior (-${d} saúde).`, '🤕');
  },
  async murder(n) {
    const p = P();
    if (p.age < 14) return UI.alert('Não', 'Nem pense nisso.');
    const victim = n || mkNPC({ age: R.int(18, 80), role: 'estranho', rel: 0 });
    if (!(await UI.confirm('Homicídio', `Tem certeza que quer tentar matar ${fname(victim)}? Isso pode acabar com sua vida.`))) { if (!n) delete G.s.npcs[victim.id]; return; }
    const m = await UI.choose('Método', 'Como?', [{ t: 'Envenenar a comida', v: .5 }, { t: 'Empurrar de um lugar alto', v: .45 }, { t: 'Sabotar o carro', v: .4 }, { t: 'Contratar um matador', v: .55, c: M(50000) }, { t: 'Atacar diretamente', v: .35 }]);
    if (!m) return;
    if (m === .55 && !(await pay(M(50000), 'o matador'))) return;
    karma(-30); cnt('crimes');
    if (R.ch(m + this.bonus() + (p.vamp ? .2 : 0))) {
      npcDies(victim, 'circunstâncias misteriosas'); cnt('homicidios'); p.notor = clamp(p.notor + 15);
      log(`${fname(victim)} morreu... e ninguém suspeita de mim. 🔪`, 'bad');
      if (R.ch(.3)) { await UI.alert('Investigação', 'A polícia encontrou provas contra você!', '🚨'); return this.arrest('Homicídio', [20, 60]); }
      if (!n) delete G.s.npcs[victim.id];
      return UI.alert('Feito', `${victim.first} está morto(a). Você saiu impune... por enquanto.`, '🔪');
    }
    chR(victim, -60); if (n) n.role = ['mae', 'pai', 'filho', 'irmao'].includes(n.role) ? n.role : 'inimigo';
    await UI.alert('Fracasso', `${victim.first} sobreviveu e te denunciou!`, '🚨');
    return this.arrest('Tentativa de homicídio', [8, 25]);
  },
  async embezzle() {
    const p = P(), j = p.job; if (!j) return;
    if (!lim('desvio')) return UI.alert('Desvio', 'Melhor não abusar da sorte.');
    const amt = await UI.choose('Desviar dinheiro', 'Quanto desviar?', [{ t: 'Um pouco', sub: fmt(Math.round(j.sal * .1)), v: .1 }, { t: 'Bastante', sub: fmt(Math.round(j.sal * .5)), v: .5 }, { t: 'Tudo que der', sub: fmt(Math.round(j.sal * 2)), v: 2 }]);
    if (!amt) return;
    cnt('crimes'); karma(-8);
    if (R.ch(.75 - amt * .2 + this.bonus())) { const v = Math.round(j.sal * amt); cash(v); log(`Desviei ${fmt(v)} da empresa. 🤫`); return UI.alert('Desvio', `Você embolsou ${fmt(v)}.`, '🤫'); }
    Career.quit(false, true); await UI.alert('Auditoria', 'A auditoria descobriu tudo! Você foi demitido(a) e denunciado(a).', '📋');
    return this.arrest('Desvio de dinheiro', [1, 8]);
  },
  async burglary(c) {
    const p = P();
    const house = await UI.choose('Assalto a residência', 'Escolha o alvo:', [{ t: 'Casa simples', v: 1 }, { t: 'Sobrado de classe média', v: 3 }, { t: 'Mansão com seguranças', v: 10 }]);
    if (!house) return;
    const res = await Mini.burglary(house, this.bonus());
    if (!res) return;
    cnt('crimes');
    if (res.caught) return this.fail({ ...c, yrs: [1, 5] });
    if (res.loot > 0) return this.success(c, res.loot, `Você saiu da casa com ${res.items.join(', ')}`);
    return UI.alert('Nada', 'Você saiu de mãos vazias.');
  },
  async hack(c) {
    const p = P();
    const t = await UI.choose('Invasão hacker', 'Qual alvo?', [{ t: 'Loja online pequena', v: [3, 5000] }, { t: 'Rede de supermercados', v: [4, 80000] }, { t: 'Banco digital', v: [5, 600000] }, { t: 'Servidor do governo', v: [6, 2000000] }]);
    if (!t) return;
    const ok = await Mini.hack(t[0], p.smr + (majorOf().includes('Ciência da Computação') ? 20 : 0));
    if (ok === null) return;
    if (ok) return this.success(c, M(R.int(Math.round(t[1] / 10), t[1])), 'Você invadiu o sistema e transferiu o dinheiro');
    return R.ch(.5) ? UI.alert('Falhou', 'Você não conseguiu, mas apagou seus rastros.', '💻') : this.fail({ ...c, yrs: [2, 6 + t[0]] });
  }
};

const Prison = {
  async enter(crime, years, juvie = false, deathRow = false) {
    const p = P();
    if (p.job) Career.quit(true); p.pt = null;
    if (p.edu.stage) { p.edu.stage = null; removeRole('colegaE', 'prof'); }
    if (p.sp.athlete) p.sp.athlete = null; if (p.sp.model) p.sp.model = null; if (p.sp.pol) p.sp.pol.inOffice = false;
    p.prison = { crime, years, total: years, juvie, deathRow, resp: 0, gang: null, tunnel: 0, parole: false };
    p.record.push({ c: crime, y: years });
    for (const x of alive('mae', 'pai', 'conjuge', 'parceiro')) chR(x, -15);
    const pt = partner(); if (pt && R.ch(.3)) { log(`${fname(pt)} me largou depois da prisão.`, 'bad'); if (pt.role === 'conjuge') Family.divorce(pt, true); else pt.role = 'ex'; }
    removeRole('detento');
    for (let i = 0; i < 2; i++) mkNPC({ age: clamp(p.age + R.int(-10, 15), juvie ? 12 : 18, 80), g: p.g, role: 'detento', rel: R.int(10, 50), job: 'Detento(a)' });
    Meta.ach('preso'); cnt('prisoes');
    const where = juvie ? 'no reformatório' : deathRow ? 'no corredor da morte' : `na penitenciária por ${years} ano(s)`;
    log(`Fui preso(a) ${where} por ${crime.toLowerCase()}. ⛓️`, 'bad');
    ch('hap', -25);
    UI.closeSheets();
    return UI.alert('Prisão', `Você foi condenado(a) ${where}.`, '⛓️');
  },
  release(how = 'Cumpri minha pena') {
    const p = P(); const pr = p.prison;
    p.prisonYears += pr.total - pr.years; p.prison = null; removeRole('detento');
    log(`${how} e fui libertado(a)! 🕊️`, 'good'); ch('hap', 20);
  },
  async tick() {
    const p = P(), pr = p.prison; if (!pr) return;
    if (pr.deathRow) {
      pr.total++;
      if (R.ch(.3)) { log('Chegou o dia da minha execução.', 'death'); die('execução pela pena de morte'); }
      return;
    }
    pr.years--; p.prisonYears++;
    ch('hea', -R.int(0, 3)); ch('hap', -R.int(2, 6));
    if (R.ch(.12) && !pr.juvie) { const d = R.int(5, 25); ch('hea', -d); log(`Fui atacado(a) por outro detento no pátio (-${d} saúde).`, 'bad'); if (p.hea <= 0) { die('uma briga na prisão'); return; } }
    if (pr.years <= 0) { this.release(); return; }
    if (!pr.juvie && pr.total - pr.years >= Math.ceil(pr.total / 3) && !pr.parole) {
      pr.parole = true;
      const r = await UI.choose('Audiência de condicional', 'A comissão vai avaliar seu pedido de liberdade condicional. O que dizer?', [{ t: 'Demonstrar arrependimento', v: .5 }, { t: 'Dizer que é inocente', v: .2 }, { t: 'Ficar em silêncio', v: .3 }]);
      if (r && R.ch(r + (p.prison.resp < 20 ? .1 : -.1))) { this.release('Ganhei liberdade condicional'); return; }
      log('Meu pedido de condicional foi negado.', 'bad');
    }
  },
  menu() {
    const p = P(), pr = p.prison;
    const items = [
      { ic: '🏋️', t: 'Malhar no pátio', fn: async () => { if (!lim('pmalhar', 2)) return UI.alert('Pátio', 'Já malhou bastante.'); ch('ath', 2); ch('hea', 2); pr.resp = clamp(pr.resp + 3); return UI.alert('Pátio', 'Os outros detentos começaram a te respeitar. 💪'); } },
      { ic: '📚', t: 'Biblioteca da prisão', fn: async () => { if (!lim('pbib', 2)) return UI.alert('Biblioteca', 'Já leu tudo por hoje.'); ch('smr', 2); ch('hap', 2); return UI.alert('Biblioteca', 'Você leu um bom livro. 📖'); } },
      { ic: '🧹', t: 'Trabalho na prisão', sub: 'Ganha uns trocados', fn: async () => { if (!lim('ptrab')) return UI.alert('Trabalho', 'Você já trabalhou este ano.'); const v = M(R.int(100, 600)); cash(v); return UI.alert('Trabalho', `Você ganhou ${fmt(v)} lavando roupas.`, '🧹'); } },
      { ic: '🗡️', t: pr.gang ? `Gangue: ${pr.gang}` : 'Entrar numa gangue', fn: async () => { if (pr.gang) { pr.resp = clamp(pr.resp + 4); return UI.alert(pr.gang, 'Você ajudou a gangue a controlar o pátio.'); } const g = await UI.choose('Gangues', 'Qual gangue?', ['Irmandade de Ferro', 'Os Corvos', 'Facção do Norte', 'Sangue Novo'].map(t => ({ t, v: t }))); if (!g) return; if (R.ch(.5 + pr.resp / 200)) { pr.gang = g; pr.resp = clamp(pr.resp + 10); log(`Entrei para a gangue ${g} na prisão.`); return UI.alert(g, 'Você foi aceito(a). Agora tem proteção.', '🗡️'); } ch('hea', -10); return UI.alert(g, 'A gangue te deu uma surra como "teste" e recusou.', '🤕'); } },
      { ic: '⚖️', t: 'Apelar da sentença', sub: fmt(M(10000)), fn: async () => { if (!lim('apelar')) return UI.alert('Apelação', 'Você já apelou este ano.'); if (!(await pay(M(10000), 'o advogado'))) return; if (R.ch(pr.deathRow ? .2 : .18)) { if (pr.deathRow) { pr.deathRow = false; pr.years = R.int(20, 40); pr.total = pr.years; log('Minha pena de morte foi convertida em prisão!', 'good'); return UI.alert('Apelação', 'Sua pena de morte foi revogada!', '⚖️'); } this.release('Ganhei a apelação'); UI.closeSheets(); return UI.alert('Livre!', 'O tribunal anulou sua condenação!', '🕊️'); } return UI.alert('Negado', 'A apelação foi negada.', '⚖️'); } },
      { ic: '💵', t: 'Subornar um guarda', fn: async () => { if (!lim('suborno')) return UI.alert('Suborno', 'Os guardas estão de olho em você.'); const v = M(R.int(5000, 40000)); if (!(await pay(v, 'o suborno'))) return; if (R.ch(.3)) { this.release('Subornei um guarda'); UI.closeSheets(); return UI.alert('Livre!', 'O guarda "esqueceu" a porta aberta.', '🗝️'); } if (R.ch(.4)) { pr.years += 2; pr.total += 2; return UI.alert('Pego!', 'O guarda te denunciou. +2 anos de pena.', '🚨'); } return UI.alert('Suborno', 'O guarda pegou o dinheiro e não fez nada.', '😒'); } },
      { ic: '🏃', t: 'Tentar fugir', sub: 'Minijogo', fn: () => this.escape() },
      { ic: '⛏️', t: 'Cavar um túnel', sub: `${pr.tunnel}% pronto`, fn: async () => { if (!lim('tunel', 2)) return UI.alert('Túnel', 'Suas mãos estão em carne viva.'); pr.tunnel = clamp(pr.tunnel + R.int(8, 20)); if (R.ch(.08)) { pr.tunnel = 0; pr.years += 1; return UI.alert('Descoberto!', 'Os guardas acharam seu túnel. +1 ano.', '🚨'); } if (pr.tunnel >= 100) { cnt('fugas'); Meta.ach('fuga'); this.release('Fugi por um túnel'); p.notor = clamp(p.notor + 20); UI.closeSheets(); return UI.alert('Fuga!', 'Seu túnel chegou do outro lado do muro! 🕳️', '🕳️'); } return UI.alert('Túnel', `Você cavou mais um pouco. (${pr.tunnel}%)`, '⛏️'); } },
      { ic: '🔥', t: 'Iniciar uma rebelião', cls: 'danger', fn: () => this.riot() }
    ];
    const cell = alive('detento'); if (cell.length) { items.push({ sep: 'Colegas de cela' }); cell.forEach(n => items.push(Rel.row(n))); }
    return { title: pr.juvie ? 'Reformatório' : 'Prisão', head: `<div class="npchead"><div class="muted">Crime: ${esc(pr.crime)} • ${pr.deathRow ? '☠️ Corredor da morte' : `${pr.years} ano(s) restante(s) de ${pr.total}`}</div><div class="mini"><span>Respeito</span><div class="mbar"><i style="width:${pr.resp}%"></i></div></div></div>`, items };
  },
  async escape() {
    const p = P(), pr = p.prison;
    if (!lim('fuga')) return UI.alert('Fuga', 'Você só tem coragem para uma tentativa por ano.');
    const ok = await Mini.maze(pr.juvie ? 7 : 9, pr.deathRow ? 3 : 2);
    if (ok === null) return;
    if (ok) { cnt('fugas'); Meta.ach('fuga'); p.notor = clamp(p.notor + 20); this.release('Fugi da prisão'); G.s.flags.fugitive = true; UI.closeSheets(); return UI.alert('Liberdade!', 'Você escapou! Agora é um(a) fugitivo(a). 🏃', '🏃'); }
    pr.years += R.int(1, 3); pr.total = Math.max(pr.total, pr.years); ch('hea', -10);
    log('Tentei fugir da prisão e fui pego(a). Ganhei mais tempo de pena.', 'bad');
    return UI.alert('Pego(a)!', 'Os guardas te pegaram. Sua pena aumentou.', '🚨');
  },
  async riot() {
    const p = P(), pr = p.prison;
    if (!lim('rebeliao')) return UI.alert('Rebelião', 'Os ânimos já estão exaltados.');
    let score = pr.resp / 20 + (pr.gang ? 1 : 0);
    const steps = [['Os detentos se reúnem. Você:', [['Discursa inflamado(a)', R.int(0, 3)], ['Distribui armas improvisadas', R.int(-1, 3)], ['Fica nos bastidores', 1]]],
      ['Os guardas chegam com escudos. Você:', [['Ataca de frente', R.int(-2, 3)], ['Faz um guarda refém', R.int(-1, 4)], ['Ateia fogo nos colchões', R.int(-2, 3)]]],
      ['A tropa de choque cerca o presídio. Você:', [['Negocia exigências', R.int(0, 3)], ['Tenta fugir na confusão', R.int(-2, 4)], ['Se rende', 0]]]];
    for (const [q, opts] of steps) { const r = await UI.choose('Rebelião!', q, opts.map(([t, v]) => ({ t, v: String(v) }))); if (r === null) return; score += Number(r); }
    if (score >= 6 && R.ch(.5)) { cnt('fugas'); Meta.ach('fuga'); this.release('Escapei durante uma rebelião'); UI.closeSheets(); return UI.alert('Fuga em massa!', 'Na confusão da rebelião, você escapou!', '🔥'); }
    if (score >= 4) { pr.resp = clamp(pr.resp + 20); pr.years = Math.max(1, pr.years - 1); return UI.alert('Exigências atendidas', 'A rebelião conseguiu melhorias. Você virou uma lenda no presídio.', '🔥'); }
    const d = R.int(10, 40); ch('hea', -d); pr.years += 2; pr.total += 2; if (p.hea <= 0) { die('a repressão a uma rebelião'); return; }
    return UI.alert('Fracasso', `A rebelião foi esmagada. Você se feriu (-${d}) e ganhou +2 anos.`, '🚨');
  }
};
