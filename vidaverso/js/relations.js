'use strict';
// ===== Família, romance e relacionamentos =====
const Family = {
  birth(other, how = 'natural') {
    const p = P();
    const base = other ? (p.smr + other.smr) / 2 : p.smr;
    const k = mkNPC({ age: 0, last: p.last, role: 'filho', rel: R.int(70, 100), smr: clamp(Math.round(base + R.int(-25, 25))), loo: clamp(Math.round(((other?.loo ?? p.loo) + p.loo) / 2 + R.int(-25, 25))), extra: { otherParent: other?.id || null, how } });
    if (p.vamp && R.ch(.3)) k.vamp = true;
    const txt = how === 'adocao' ? `Adotei ${ga(k.g, 'um menino', 'uma menina')}: ${k.first}!` : `Nasceu ${ga(k.g, 'meu filho', 'minha filha')}, ${k.first}! ${other ? `(com ${fname(other)})` : ''}`;
    log(txt + ' 👶', 'good'); ch('hap', 15); cnt('filhos'); Meta.ach('pai');
    if (byRole('filho').length >= 5) Meta.ach('familia');
    return k;
  },
  addPreg(otherId, how = 'natural') {
    const twins = R.ch(how === 'fiv' ? .25 : .03);
    G.s.preg.push({ other: otherId, left: 1, twins, how });
  },
  isPregnant() { return G.s.preg.length > 0; },
  fertileCouple(n) {
    const p = P(); if (p.g === n.g) return false;
    const fem = p.g === 'F' ? p : n; const femAge = fem.age;
    return femAge >= 14 && femAge <= 48 && p.age >= 14 && n.age >= 14;
  },
  async tryBaby(n) {
    const p = P();
    if (this.isPregnant()) return UI.alert('Bebê', 'Já há um bebê a caminho!');
    if (!this.fertileCouple(n)) return UI.alert('Bebê', 'Vocês não conseguem engravidar naturalmente. Tente FIV, barriga de aluguel ou adoção em Atividades › Amor.', '🍼');
    if (n.rel < 40 && R.ch(.6)) { chR(n, -5); return UI.alert(fname(n), `${n.first} não quer ter um filho com você agora.`, '🙅'); }
    const fert = (p.fert + 60) / 200 * (p.g === 'F' ? (p.age > 38 ? .5 : 1) : (n.age > 38 ? .5 : 1));
    if (!lim('bebe', 3)) return UI.alert('Bebê', 'Vocês já tentaram bastante este ano.');
    if (R.ch(fert)) { this.addPreg(n.id); log(`${p.g === 'F' ? 'Estou grávida' : `${n.first} está grávida`}! 🤰`, 'good'); chR(n, 5); return UI.alert('Positivo!', `${p.g === 'F' ? 'Você está grávida' : `${n.first} está grávida`}! O bebê nasce no ano que vem.`, '🤰'); }
    chR(n, 2); return UI.alert('Ainda não', 'Vocês tentaram, mas não deu certo desta vez.', '🍼');
  },
  async marry(n) {
    const p = P();
    const opt = await UI.choose('Casamento', `Como vai ser o casamento com ${n.first}?`, [
      { t: 'Cartório', sub: fmt(M(300)), v: { c: 300, h: 3 } }, { t: 'Cerimônia pequena', sub: fmt(M(8000)), v: { c: 8000, h: 8 } },
      { t: 'Festança', sub: fmt(M(40000)), v: { c: 40000, h: 14 } }, { t: 'Casamento na praia (destino)', sub: fmt(M(70000)), v: { c: 70000, h: 18 } },
      { t: 'Fugir para casar em segredo', sub: fmt(M(1000)), v: { c: 1000, h: 6, elope: true } }]);
    if (!opt) return;
    const prenup = netWorth() > M(100000) ? await UI.confirm('Pacto antenupcial', 'Quer pedir um pacto antenupcial (protege seu patrimônio no divórcio)?') : false;
    if (prenup && n.rel < 70 && R.ch(.4)) { chR(n, -20); return UI.alert(n.first, `${n.first} ficou ofendid${ga(n.g, 'o', 'a')} com o pacto e adiou o casamento.`, '😤'); }
    if (!(await pay(M(opt.c), 'o casamento'))) return;
    n.role = 'conjuge'; n.married = G.s.year; n.prenup = !!prenup; chR(n, 15); ch('hap', opt.h);
    if (opt.elope) { for (const x of alive('mae', 'pai')) chR(x, -15); }
    log(`Casei com ${fname(n)}! 💍`, 'good'); cnt('casamentos'); Meta.ach('casou');
    // enteados
    if (n.kids && R.ch(.5)) { const st = mkNPC({ age: R.int(1, 15), last: n.last, role: 'enteado', rel: R.int(20, 70) }); log(`${n.first} tem ${ga(st.g, 'um filho', 'uma filha')}, ${st.first}. Agora tenho ${ga(st.g, 'um enteado', 'uma enteada')}.`); }
    return UI.alert('Casados!', `Você e ${n.first} agora são casados! 💒`, '💒');
  },
  divorce(n, quiet = false) {
    const p = P();
    n.role = 'ex'; Meta.ach('divorcio'); cnt('divorcios');
    if (!n.prenup && p.money > 0) {
      const lost = Math.round(p.money * R.int(30, 50) / 100); cash(-lost);
      log(`Divorciei de ${fname(n)} e perdi ${fmt(lost)} na partilha.`, 'bad');
      const sharedHouse = p.assets.find(a => a.k === 'casa' && !a.inherited && R.ch(.5));
      if (sharedHouse) { p.assets = p.assets.filter(a => a !== sharedHouse); log(`${n.first} ficou com ${sharedHouse.t.toLowerCase()}.`, 'bad'); }
      if (alive('filho').some(k => k.age < 18 && k.otherParent === n.id) && (p.job?.sal || 0) > (n.money || 0) / 10) {
        G.s.flags.alimony = Math.round((p.job?.sal || M(20000)) * .15); G.s.flags.alimonyYears = 8; log(`Vou pagar pensão de ${fmt(G.s.flags.alimony)} por ano.`, 'bad');
      }
    } else log(`Divorciei de ${fname(n)}.${n.prenup ? ' O pacto antenupcial protegeu meu patrimônio.' : ''}`, 'bad');
    ch('hap', -10);
  },
  defaultWill() {
    const sp = spouse(); const kids = alive('filho'); const plan = {};
    if (sp && kids.length) { plan[sp.id] = 40; kids.forEach(k => plan[k.id] = 60 / kids.length); }
    else if (sp) plan[sp.id] = 100;
    else if (kids.length) kids.forEach(k => plan[k.id] = 100 / kids.length);
    else { const fam = alive('irmao', 'mae', 'pai'); fam.forEach(k => plan[k.id] = 100 / fam.length); }
    return plan;
  },
  willMenu() {
    const p = P(); const plan = p.willPlan || this.defaultWill();
    const cands = alive('conjuge', 'filho', 'neto', 'irmao', 'mae', 'pai', 'amigo', 'parceiro', 'noivo', 'enteado');
    const items = cands.map(n => ({ ic: '📜', t: `${fname(n)} (${roleName(n)})`, sub: `${Math.round(plan[n.id] || 0)}% da herança`, fn: async () => {
      const v = await UI.prompt('Testamento', [{ k: 'pct', label: `Porcentagem para ${n.first}`, type: 'number', value: Math.round(plan[n.id] || 0) }]);
      if (!v) return; const np = { ...plan }; np[n.id] = clamp(Number(v.pct) || 0);
      const tot = Object.values(np).reduce((a, b) => a + b, 0); if (tot > 100) return UI.alert('Testamento', 'O total passa de 100%. Reduza outros herdeiros primeiro.');
      p.willPlan = np; log('Atualizei meu testamento. 📜');
    } }));
    items.push({ ic: '🔄', t: 'Restaurar padrão', sub: 'Cônjuge e filhos', fn: () => { p.willPlan = null; } });
    items.push({ ic: '🏛️', t: 'Doar tudo para caridade', sub: 'Karma ++', fn: () => { p.willPlan = {}; p.willCharity = true; karma(10); log('Deixei tudo para a caridade no testamento.'); } });
    return { title: 'Testamento', head: `<p class="muted">Defina quem herda seu dinheiro quando você morrer. O herdeiro escolhido para continuar a vida recebe sua parte e os bens.</p>`, items };
  }
};

// ---------- Romance / Amor ----------
const Love = {
  wantG() { const p = P(); if (p.sex === 'het') return p.g === 'M' ? 'F' : 'M'; if (p.sex === 'gay') return p.g; return R.pick(['M', 'F']); },
  candidate(o = {}) {
    const p = P();
    const age = p.age < 18 ? clamp(p.age + R.int(-1, 1), 13, 17) : clamp(p.age + R.int(-8, 8), 18, 95);
    return mkNPC({ g: o.g || this.wantG(), age, role: 'candidato', rel: R.int(30, 60), money: age >= 22 ? M(R.int(1000, 200000)) : 0, job: age >= 22 ? gt(R.pick(JOBS)[1], 'M') : (age >= 18 ? 'Universitário(a)' : 'Estudante'), extra: { kids: age > 28 && R.ch(.2) } });
  },
  cleanCandidates() { for (const n of byRole('candidato')) delete G.s.npcs[n.id]; },
  async startDating(n) {
    const p = P(); const pt = partner();
    if (pt && pt !== n) {
      // traição
      n.role = 'amante'; cnt('casos');
      log(`Comecei um caso secreto com ${fname(n)}. 🤫`);
      if (R.ch(.3)) await this.caught(pt, n);
      return;
    }
    n.role = 'parceiro'; n.since = G.s.year; n.rel = clamp(n.rel + 20); cnt('parceiros');
    log(`Comecei a namorar ${fname(n)}. ❤️`, 'good'); ch('hap', 8);
  },
  async caught(pt, lover) {
    cnt('pegoTraindo'); log(`${pt.first} descobriu meu caso com ${lover.first}! 😱`, 'bad');
    const r = await UI.choose('Flagrante!', `${fname(pt)} descobriu que você está traindo com ${lover.first}.`, [
      { t: 'Implorar perdão', v: 'perdao' }, { t: 'Negar tudo', v: 'negar' }, { t: 'Assumir e terminar', v: 'fim' }]);
    if (r === 'perdao' && R.ch(pt.rel / 150)) { chR(pt, -30); delete G.s.npcs[lover.id]; return UI.alert(pt.first, `${pt.first} te perdoou... por enquanto.`, '😢'); }
    if (r === 'negar' && R.ch(.25)) { chR(pt, -15); return UI.alert(pt.first, 'Ufa, colou.', '😅'); }
    if (pt.role === 'conjuge') Family.divorce(pt); else pt.role = 'ex';
    lover.role = 'parceiro'; return UI.alert('Fim', `${pt.first} terminou com você.`, '💔');
  },
  menu() {
    const p = P(); const items = [];
    const adult = p.age >= 18;
    if (p.age >= 13) items.push({ ic: '🌹', t: 'Procurar um encontro', sub: 'Conheça pessoas', fn: () => this.dateMenu() });
    if (adult) items.push({ ic: '📱', t: 'App de namoro', sub: 'Escolha por fotos e perfis', fn: () => this.appMenu() });
    if (adult) items.push({ ic: '🔥', t: 'Ficar com alguém', sub: 'Sem compromisso', fn: () => this.hookup() });
    if (adult && (C().arranged || R.ch(1))) items.push({ ic: '🤝', t: 'Casamento arranjado', sub: C().arranged ? 'Tradição local' : 'Casamenteira profissional', fn: () => this.arranged() });
    if (adult) items.push({ ic: '🧪', t: 'Fertilidade', sub: 'FIV, barriga de aluguel, doação, adoção', fn: () => UI.open(() => this.fertMenu()) });
    if (p.age >= 12) items.push({ ic: '🏳️‍🌈', t: 'Orientação sexual', sub: p.out ? `Assumido(a): ${this.sexName()}` : 'Descobrir / assumir', fn: () => this.comeOut() });
    return { title: 'Amor', items };
  },
  sexName() { return { het: 'hétero', gay: P().g === 'F' ? 'lésbica' : 'gay', bi: 'bissexual' }[P().sex]; },
  async dateMenu() {
    if (!lim('encontro', 3)) return UI.alert('Encontros', 'Você já foi em encontros demais este ano.');
    this.cleanCandidates();
    const c = this.candidate();
    const go = await UI.choose('Um encontro', `Você conheceu ${fname(c)}, ${c.age} anos, ${c.job}.\nAparência ${c.loo}% • Inteligência ${c.smr}%`, [{ t: 'Chamar para sair', v: 1 }, { t: 'Deixar pra lá', v: 0 }]);
    if (!go) { delete G.s.npcs[c.id]; return; }
    const chance = .35 + (P().loo - c.loo) / 200 + (P().talent === 'carisma' ? .15 : 0);
    if (R.ch(chance)) { await this.startDating(c); return UI.alert('Deu match!', `${c.first} aceitou sair com você! ❤️`, '❤️'); }
    delete G.s.npcs[c.id]; ch('hap', -3); return UI.alert('Não rolou', `${c.first} recusou o convite.`, '🙈');
  },
  appMenu() {
    this.cleanCandidates();
    const list = Array.from({ length: 4 }, () => this.candidate());
    UI.open(() => ({ title: 'App de namoro', head: '<p class="muted">Arraste para a direita... ou só toque 😉</p>', items: list.filter(n => G.s.npcs[n.id] && n.role === 'candidato').map(n => ({
      ic: n.g === 'F' ? '👩' : '👨', t: `${n.first}, ${n.age}`, sub: `${n.job} • Aparência ${n.loo}% • Intel. ${n.smr}%`, fn: async () => {
        if (!lim('app', 5)) return UI.alert('App', 'Seus likes do ano acabaram.');
        if (R.ch(.3 + (P().loo - n.loo) / 180)) { await this.startDating(n); await UI.alert('Match! 💘', `Você e ${n.first} deram match e começaram a sair!`, '💘'); UI.back(); }
        else { n.role = 'x'; delete G.s.npcs[n.id]; await UI.alert('Sem match', `${n.first} não curtiu de volta.`, '💔'); }
      } })) }));
  },
  async hookup() {
    const p = P();
    if (!lim('ficar', 3)) return UI.alert('Ficar', 'Chega por este ano, né?');
    const c = this.candidate(); c.age = Math.max(18, c.age);
    const ok = await UI.confirm('Ficar', `${fname(c)} (${c.age}) topou passar a noite com você. Ir em frente?`);
    if (!ok) { delete G.s.npcs[c.id]; return; }
    ch('hap', 6); cnt('ficadas'); log(`Fiquei com ${fname(c)}.`);
    const pt = partner(); let extra = '';
    if (pt && R.ch(.25)) { await this.caught(pt, c); }
    if (R.ch(.07)) { const std = R.pick(DISEASES.filter(d => d.std)); Health.add(std.n); extra = `\nVocê pegou ${std.n.toLowerCase()}...`; }
    if (c.g !== p.g && R.ch(.06) && !Family.isPregnant()) { Family.addPreg(c.id); extra += `\n${p.g === 'F' ? 'Você engravidou!' : `${c.first} engravidou de você!`}`; c.role = 'ex'; log('A noite trouxe uma gravidez inesperada. 😳', 'bad'); }
    else if (c.role === 'candidato') delete G.s.npcs[c.id];
    return UI.alert('Ficada', `Foi uma noite divertida.${extra}`, '🔥');
  },
  async arranged() {
    const p = P();
    if (partner()) return UI.alert('Casamento arranjado', 'Você já está num relacionamento.');
    const c = this.candidate(); c.role = 'candidato';
    const ok = await UI.confirm('Casamento arranjado', `Sua família encontrou ${fname(c)}, ${c.age} anos, ${c.job}. Aceitar casar?`);
    if (!ok) { delete G.s.npcs[c.id]; for (const x of alive('mae', 'pai')) chR(x, -10); return UI.alert('Recusado', 'Sua família ficou decepcionada.'); }
    c.role = 'conjuge'; c.married = G.s.year; c.rel = R.int(30, 70); cnt('casamentos'); cnt('parceiros'); Meta.ach('casou');
    log(`Me casei com ${fname(c)} num casamento arranjado. 💍`); return UI.alert('Casados', `Você se casou com ${c.first}.`, '💍');
  },
  fertMenu() {
    const p = P(); const pt = partner();
    const items = [
      { ic: '🧫', t: 'Fertilização in vitro (FIV)', sub: fmt(M(15000)), fn: async () => {
        if (Family.isPregnant()) return UI.alert('FIV', 'Já há um bebê a caminho.');
        const carrier = p.g === 'F' ? p : (pt && pt.g === 'F' ? pt : null);
        if (!carrier || carrier.age > 50) return UI.alert('FIV', 'É preciso alguém que possa gestar (até 50 anos). Tente barriga de aluguel.');
        if (!(await pay(M(15000), 'a FIV'))) return;
        if (R.ch(.5)) { Family.addPreg(pt?.id || null, 'fiv'); log('A FIV funcionou! 🤰', 'good'); return UI.alert('FIV', 'Gravidez confirmada! 🤰'); }
        return UI.alert('FIV', 'Infelizmente não funcionou desta vez.', '😞');
      } },
      { ic: '🤰', t: 'Barriga de aluguel', sub: fmt(M(80000)), fn: async () => {
        if (Family.isPregnant()) return UI.alert('Barriga de aluguel', 'Já há um bebê a caminho.');
        if (!(await pay(M(80000), 'a barriga de aluguel'))) return;
        Family.addPreg(pt?.id || null, 'surrogate'); log('Contratei uma barriga de aluguel. Bebê a caminho!', 'good'); return UI.alert('Barriga de aluguel', 'Seu bebê nascerá no próximo ano!', '👶');
      } },
      { ic: '🧬', t: 'Doar esperma / óvulos', sub: 'Ganhe um dinheiro', fn: async () => {
        if (!lim('doacao')) return UI.alert('Doação', 'Você já doou este ano.');
        const v = M(R.int(100, 3000)); cash(v); log(`Doei ${p.g === 'M' ? 'esperma' : 'óvulos'} e recebi ${fmt(v)}.`); return UI.alert('Doação', `Você recebeu ${fmt(v)}.`, '🧬');
      } },
      { ic: '🏠', t: 'Adotar uma criança', sub: fmt(M(20000)), fn: () => this.adopt() }
    ];
    return { title: 'Fertilidade e adoção', items };
  },
  async adopt() {
    const p = P();
    if (p.age < 21) return UI.alert('Adoção', 'É preciso ter pelo menos 21 anos.');
    if (p.record.length && R.ch(.7)) return UI.alert('Adoção', 'Seu pedido foi negado por causa da sua ficha criminal.', '🚫');
    const age = await UI.choose('Adoção', 'Qual faixa etária?', [{ t: 'Bebê', v: 0 }, { t: 'Criança (3-8)', v: 5 }, { t: 'Adolescente (9-15)', v: 12 }]);
    if (age === null) return;
    if (!(await pay(M(20000), 'a adoção'))) return;
    const k = Family.birth(partner(), 'adocao'); k.age = age === 0 ? 0 : R.int(age - 2, age + 3); k.last = p.last;
    return UI.alert('Adoção', `${k.first} (${k.age} anos) agora faz parte da família! 💛`, '🏠');
  },
  async comeOut() {
    const p = P();
    if (!p.out) {
      const r = await UI.choose('Orientação', 'Como você se identifica?', [{ t: 'Hétero', v: 'het' }, { t: 'Gay / Lésbica', v: 'gay' }, { t: 'Bissexual', v: 'bi' }]);
      if (!r) return; p.sex = r; p.out = true;
      if (r !== 'het') {
        log(`Me assumi ${this.sexName()} para a família. 🏳️‍🌈`);
        for (const n of alive('mae', 'pai', 'irmao', 'avo')) { if (R.ch(.8)) chR(n, R.int(0, 10)); else { chR(n, -25); log(`${n.first} não reagiu bem.`, 'bad'); } }
        ch('hap', 10);
      }
      return UI.alert('Orientação', `Você agora se identifica como ${this.sexName()}.`, '🏳️‍🌈');
    }
    const r = await UI.choose('Orientação', 'Mudar sua orientação?', [{ t: 'Hétero', v: 'het' }, { t: 'Gay / Lésbica', v: 'gay' }, { t: 'Bissexual', v: 'bi' }]);
    if (r) { p.sex = r; log(`Agora me identifico como ${this.sexName()}.`); }
  }
};

// ---------- Menu de relacionamentos ----------
const Rel = {
  groups() {
    const p = P();
    return [
      ['Família', ['conjuge', 'noivo', 'parceiro', 'mae', 'pai', 'padrasto', 'irmao', 'meioirmao', 'filho', 'enteado', 'neto', 'avo']],
      ['Amantes', ['amante']], ['Amigos', ['amigo']], ['Inimigos e rivais', ['inimigo', 'rival']], ['Escola', ['prof', 'colegaE']],
      ['Trabalho', ['chefe', 'colegaT']], ['Prisão', ['detento']], ['Ex-parceiros', ['ex']], ['Crias vampíricas', ['vampfilho']]
    ];
  },
  menu() {
    const p = P(); const items = [];
    for (const [g, roles] of this.groups()) {
      const list = alive(...roles).sort((a, b) => roles.indexOf(a.role) - roles.indexOf(b.role));
      if (!list.length) continue;
      items.push({ sep: g });
      for (const n of list) items.push(this.row(n));
    }
    if (p.pets.length) { items.push({ sep: 'Pets' }); p.pets.forEach(pet => items.push({ ic: pet.ic, t: `${pet.name}`, sub: `${pet.t}${pet.breed ? ' • ' + pet.breed : ''} • ${pet.age} anos`, bar: pet.rel, fn: () => UI.open(() => Pets.menu(pet)) })); }
    const dead = Object.values(G.s.npcs).filter(n => !n.alive && ['mae', 'pai', 'avo', 'irmao', 'filho', 'conjuge', 'neto'].includes(n.role));
    if (dead.length) { items.push({ sep: 'Falecidos' }); dead.forEach(n => items.push({ ic: '🕯️', t: fname(n), sub: `${roleName(n)} • morreu aos ${n.died?.age} (${n.died?.cause})`, cls: 'dim', fn: () => this.grave(n) })); }
    if (!items.length) items.push({ ic: '🫥', t: 'Ninguém por aqui', sub: 'Você está sozinho(a) no mundo', dis: true });
    return { title: 'Relacionamentos', items };
  },
  row(n) {
    const icon = n.vamp ? '🧛' : n.age < 3 ? '👶' : n.age < 13 ? (n.g === 'F' ? '👧' : '👦') : n.age >= 65 ? (n.g === 'F' ? '👵' : '👴') : (n.g === 'F' ? '👩' : '👨');
    return { ic: icon, t: fname(n), sub: `${roleName(n)} • ${n.age} anos${n.sapo ? ' • 🐸' : ''}`, bar: n.rel, fn: () => UI.open(() => this.personMenu(n)) };
  },
  async grave(n) {
    if (!lim('tumulo_' + n.id)) return UI.alert('Túmulo', 'Você já visitou este ano.');
    ch('hap', R.int(-3, 5)); log(`Visitei o túmulo de ${fname(n)}. 🌷`); return UI.alert(fname(n), 'Você deixou flores no túmulo. 🌷', '🌷');
  },
  head(n) {
    const bar = (l, v) => `<div class="mini"><span>${l}</span><div class="mbar"><i style="width:${v}%"></i></div></div>`;
    return `<div class="npchead"><div class="big">${esc(fname(n))}</div><div class="muted">${esc(roleName(n))} • ${n.age} anos${n.job ? ' • ' + esc(n.job) : ''}${n.vamp ? ' • 🧛 vampiro' : ''}</div>
      ${bar('Relação', n.rel)}${bar('Saúde', n.hea)}${bar('Inteligência', n.smr)}${bar('Aparência', n.loo)}</div>`;
  },
  personMenu(n) {
    const p = P(); const items = []; const r = n.role;
    if (!n.alive || !G.s.npcs[n.id]) return { title: 'Relacionamento', items: [{ t: 'Esta pessoa não está mais na sua vida.', dis: true }] };
    const romantic = ['parceiro', 'noivo', 'conjuge', 'amante'].includes(r);
    const fam = ['mae', 'pai', 'irmao', 'meioirmao', 'avo', 'filho', 'neto', 'padrasto', 'enteado', 'conjuge'].includes(r);
    const add = (ic, t, fn, sub = '') => items.push({ ic, t, sub, fn });
    if (p.prison && !['mae', 'pai', 'conjuge', 'parceiro', 'filho', 'irmao', 'detento', 'avo'].includes(r)) return { title: fname(n), head: this.head(n), items: [{ t: 'Você está preso(a); só pode falar com família e colegas de cela.', dis: true }] };
    if (p.age < 3) {
      add('😊', 'Sorrir', () => this.simple(n, 4, 'sorriu de volta pra você.'));
      add('😭', 'Chorar', () => this.simple(n, -2, 'ficou preocupad' + ga(n.g, 'o', 'a') + ' com seu choro.'));
    } else {
      add('💬', 'Conversar', () => this.talk(n));
      add('⏳', 'Passar tempo juntos', () => this.spendTime(n));
      add('🫶', 'Elogiar', () => this.simple(n, R.int(2, 6), R.pick(['adorou o elogio.', 'ficou vermelh' + ga(n.g, 'o', 'a') + ' de vergonha.', 'sorriu.'])));
      add('🤗', 'Abraçar', () => this.simple(n, R.int(1, 5), 'retribuiu o abraço.'));
      if (p.age >= 6) add('🎁', 'Dar um presente', () => this.gift(n));
      if (p.age >= 6 && n.age >= 3) add('🤡', 'Pregar uma peça', () => this.prank(n));
      add('🗯️', 'Discutir', () => this.simple(n, -R.int(5, 15), R.pick(['saiu batendo a porta.', 'gritou de volta.', 'chorou.'])));
      add('🤬', 'Insultar', () => this.insult(n));
    }
    // família
    if (['mae', 'pai', 'avo', 'padrasto'].includes(r) && p.age >= 4) add('💵', 'Pedir dinheiro', () => this.askMoney(n));
    if (['mae', 'pai'].includes(r) && p.age >= 16 && p.age < 25 && n.money > M(30000)) add('🚗', 'Pedir um carro', () => this.askCar(n));
    if (['mae', 'pai', 'avo'].includes(r) && n.age >= 70 && p.age >= 25) add('🏥', 'Levar para um asilo', async () => { n.role = n.role; chR(n, -20); n.asilo = true; log(`Coloquei ${n.first} num asilo.`); return UI.alert('Asilo', `${n.first} foi para um asilo. Não pareceu feliz.`); });
    if (['filho', 'enteado', 'neto'].includes(r)) {
      if (n.age < 10) add('📖', 'Ler uma história', () => this.simple(n, R.int(3, 8), 'dormiu feliz.', () => { n.smr = clamp(n.smr + 2); }));
      if (n.age < 13) add('🧸', 'Brincar', () => this.simple(n, R.int(3, 8), 'se divertiu muito!'));
      if (n.age >= 6 && n.age < 18) add('✏️', 'Ajudar com o dever', () => this.simple(n, R.int(2, 6), 'agradeceu a ajuda.', () => { n.smr = clamp(n.smr + 3); }));
      if (n.age >= 5 && n.age < 18) add('🪙', 'Dar mesada', () => this.giveMoney(n, M(500)));
      if (n.age >= 13) add('🧭', 'Dar um conselho', () => this.simple(n, R.int(-3, 6), R.pick(['ouviu com atenção.', 'revirou os olhos.', 'disse que você tem razão.'])));
      if (n.age >= 18) add('💵', 'Pedir dinheiro', () => this.askMoney(n));
      if (n.age < 5 && r === 'filho') add('📄', 'Colocar para adoção', async () => { if (!(await UI.confirm('Adoção', `Colocar ${n.first} para adoção? Isso é permanente.`))) return; delete G.s.npcs[n.id]; karma(-20); ch('hap', -10); log(`Coloquei ${n.first} para adoção.`, 'bad'); UI.back(); });
      if (r === 'filho') add('🚪', n.disowned ? 'Reconciliar-se' : 'Deserdar', async () => { n.disowned = !n.disowned; chR(n, n.disowned ? -40 : 15); log(n.disowned ? `Deserdei ${n.first}.` : `Me reconciliei com ${n.first}.`); if (p.willPlan && n.disowned) delete p.willPlan[n.id]; });
    }
    if (fam && p.age >= 18 && n.age < 18 && ['filho', 'enteado'].includes(r) && n.age >= 16) add('🎓', 'Pagar faculdade (futuro)', () => this.simple(n, 10, 'ficou muito grat' + ga(n.g, 'o', 'a') + '!'));
    if (fam || r === 'amigo') if (p.age >= 18) add('💸', 'Dar dinheiro', () => this.giveMoney(n));
    // escola / trabalho / amizade
    if (['colegaE', 'colegaT', 'detento', 'inimigo', 'ex', 'rival'].includes(r) && n.age >= 3) add('🤝', r === 'inimigo' || r === 'rival' ? 'Fazer as pazes' : 'Fazer amizade', () => this.befriend(n));
    if (r === 'amigo') {
      add('🎉', 'Chamar para uma festa', () => this.simple(n, R.int(3, 10), R.pick(['foi a festa do ano!', 'chegou atrasad' + ga(n.g, 'o', 'a') + ' mas curtiu.', 'levou um bolo pra você.'])));
      add('👋', 'Terminar a amizade', async () => { n.role = 'ex_amigo'; log(`Terminei a amizade com ${fname(n)}.`); UI.back(); });
    }
    if (r === 'prof') { add('🙋', 'Pedir ajuda', () => this.simple(n, 3, 'te ajudou depois da aula.', () => { p.edu.perf = clamp(p.edu.perf + 5); })); add('🍎', 'Bajular', () => this.simple(n, R.int(-2, 6), 'aceitou a maçã.', () => { p.edu.perf = clamp(p.edu.perf + 2); })); }
    if (r === 'chefe') add('🍎', 'Bajular o chefe', () => this.simple(n, R.int(-3, 7), 'pareceu gostar.', () => { if (p.job) p.job.perf = clamp(p.job.perf + 4); }));
    if (['colegaT', 'chefe'].includes(r)) add('📢', 'Denunciar ao RH', () => this.reportHR(n));
    if (['colegaE'].includes(r)) add('🗣️', 'Espalhar um boato', async () => { chR(n, -15); p.edu.pop = clamp(p.edu.pop + R.int(-5, 8)); log(`Espalhei um boato sobre ${n.first}.`); if (R.ch(.3)) { n.role = 'inimigo'; return UI.alert('Boato', `${n.first} descobriu quem espalhou e virou seu inimigo!`, '😠'); } return UI.alert('Boato', 'O boato correu a escola inteira.', '🗣️'); });
    // romance
    const romanceOk = n.age >= 13 && Math.abs(n.age - p.age) <= (p.age < 18 ? 2 : 60) && ((p.age < 18) === (n.age < 18)) && !fam;
    if (['colegaE', 'colegaT', 'amigo', 'ex', 'chefe', 'detento'].includes(r) && romanceOk && p.age >= 13) add('😘', r === 'ex' ? 'Tentar reatar' : 'Chamar para sair', () => this.askOut(n));
    if (romantic) {
      add('🌹', 'Sair num encontro', () => this.date(n));
      if (r === 'parceiro' && p.age >= 18 && n.age >= 18) add('💍', 'Pedir em casamento', () => this.propose(n));
      if (r === 'noivo') add('💒', 'Planejar o casamento', () => Family.marry(n));
      if (['parceiro', 'noivo', 'conjuge'].includes(r) && p.age >= 18 && n.age >= 18) add('👶', 'Tentar ter um filho', () => Family.tryBaby(n));
      if (['noivo', 'conjuge'].includes(r)) add('🛋️', 'Terapia de casal', () => this.counseling(n));
      if (r === 'conjuge') add('⚖️', 'Pedir divórcio', async () => { if (!(await UI.confirm('Divórcio', `Pedir divórcio de ${n.first}?`))) return; Family.divorce(n); UI.back(); });
      else add('💔', 'Terminar', async () => { if (!(await UI.confirm('Terminar', `Terminar com ${n.first}?`))) return; n.role = 'ex'; ch('hap', -5); chR(n, -30); log(`Terminei com ${fname(n)}.`); UI.back(); });
      if (r === 'amante' && !partner()) add('❤️', 'Assumir relacionamento', () => { n.role = 'parceiro'; log(`Assumi meu relacionamento com ${n.first}.`); });
    }
    // supernatural / poderes
    if (p.vamp && n.age >= 16 && !n.vamp) { add('🩸', 'Beber sangue', () => Super.feedOn(n)); add('🌀', 'Hipnotizar', () => Super.hypnotize(n)); add('🧛', 'Transformar em vampiro', () => Super.turn(n)); }
    if (p.magic && p.magic.xp >= 10) add('🔮', 'Lançar feitiço', () => Super.castMenu(n));
    if (p.royal && C().mon?.abs && p.royal.monarch && !fam) add('⚔️', 'Exilar do reino', async () => { delete G.s.npcs[n.id]; p.royal.respect = clamp(p.royal.respect - 8); log(`Exilei ${fname(n)} do reino.`); UI.back(); });
    // agressão
    if (p.age >= 6 && !p.prison) add('👊', 'Atacar', () => Crime.assault(n));
    else if (p.prison && r === 'detento') add('👊', 'Brigar', () => Crime.assault(n));
    if (p.age >= 14) add('🔪', 'Assassinar', () => Crime.murder(n));
    if (G.meta?.god) add('✨', 'Modo Criador: editar', () => this.godEdit(n));
    return { title: fname(n), head: this.head(n), items };
  },
  async simple(n, d, txt, extra) {
    if (!lim('int_' + n.id, 6)) return UI.alert(fname(n), `${n.first} precisa de um tempo de você.`, '🙄');
    chR(n, d); extra && extra();
    return UI.alert(fname(n), `${n.first} ${txt}`, d >= 0 ? '😊' : '😠');
  },
  async talk(n) {
    const topics = ['o clima', 'futebol', 'política', 'filmes', 'música', 'o futuro', 'fofocas da família', 'comida', 'viagens', 'religião', 'trabalho', 'séries'];
    const t = R.pick(topics); const good = R.ch(.5 + n.rel / 250);
    return this.simple(n, good ? R.int(1, 5) : -R.int(1, 5), good ? `teve uma ótima conversa com você sobre ${t}.` : `discordou de você sobre ${t}.`);
  },
  async spendTime(n) {
    const p = P();
    const opts = p.age < 12 ? ['Brincar no parque', 'Ver desenho', 'Jogar videogame', 'Montar quebra-cabeça'] : ['Ir ao cinema', 'Jantar fora', 'Caminhar no parque', 'Ir ao shopping', 'Ir à praia', 'Jogar videogame', 'Ver um show', 'Fazer uma trilha', 'Cozinhar juntos'];
    const o = await UI.choose('Passar tempo', `O que fazer com ${n.first}?`, opts.map(t => ({ t, v: t })));
    if (!o) return;
    if (!lim('int_' + n.id, 6)) return UI.alert(fname(n), `${n.first} está ocupad${ga(n.g, 'o', 'a')} demais este ano.`);
    const good = R.ch(.75); chR(n, good ? R.int(4, 10) : -R.int(1, 5)); ch('hap', good ? 3 : -1);
    log(`${o} com ${n.first}.`);
    return UI.alert(o, good ? `Vocês se divertiram muito! ${n.first} adorou.` : `${n.first} ficou entediad${ga(n.g, 'o', 'a')}.`, good ? '🥰' : '😐');
  },
  async gift(n) {
    const gifts = [['Flores', 50, 4], ['Chocolate', 20, 3], ['Livro', 30, 3], ['Perfume', 120, 6], ['Roupa nova', 150, 6], ['Celular novo', 800, 12], ['Videogame', 500, 10], ['Viagem de fim de semana', 2000, 15]];
    const jew = P().assets.filter(a => a.k === 'joia');
    const opts = gifts.map(([t, c, d]) => ({ t, sub: fmt(M(c)), v: { t, c: M(c), d } })).concat(jew.map(j => ({ t: j.t, sub: 'Da sua coleção', v: { t: j.t, c: 0, d: 18, jew: j } })));
    const g = await UI.choose('Presente', `O que dar a ${n.first}?`, opts);
    if (!g) return;
    if (!(await pay(g.c, 'o presente'))) return;
    if (g.jew) P().assets = P().assets.filter(a => a !== g.jew);
    if (!lim('presente_' + n.id, 3)) return UI.alert('Presente', 'Presentes demais estragam a pessoa!');
    const ok = R.ch(.85); chR(n, ok ? g.d : -2);
    return UI.alert(g.t, ok ? `${n.first} amou o presente! 🎁` : `${n.first} fingiu que gostou...`, '🎁');
  },
  async prank(n) {
    const pranks = ['Almofada de pum', 'Sal no lugar do açúcar', 'Susto atrás da porta', 'Pegadinha no telefone', 'Aranha de plástico na cama'];
    const pk = await UI.choose('Pegadinha', 'Qual pegadinha?', pranks.map(t => ({ t, v: t }))); if (!pk) return;
    const ok = R.ch(.55); chR(n, ok ? R.int(1, 5) : -R.int(4, 12));
    return UI.alert(pk, ok ? `${n.first} caiu na risada!` : `${n.first} não achou graça nenhuma.`, ok ? '😂' : '😒');
  },
  async insult(n) {
    const ins = ['Chamar de feio', 'Zoar a inteligência', 'Criticar a roupa', 'Falar mal da família', 'Imitar a voz'];
    const i = await UI.choose('Insultar', `Como insultar ${n.first}?`, ins.map(t => ({ t, v: t }))); if (!i) return;
    chR(n, -R.int(8, 20)); karma(-2);
    if (n.rel < 15 && !['mae', 'pai', 'filho', 'irmao', 'avo'].includes(n.role) && R.ch(.5)) { n.role = 'inimigo'; log(`${fname(n)} virou meu inimigo.`, 'bad'); }
    return UI.alert(i, `${n.first} ficou furios${ga(n.g, 'o', 'a')}!`, '🤬');
  },
  async askMoney(n) {
    if (!lim('pedir_' + n.id)) return UI.alert(n.first, `${n.first} já te deu dinheiro este ano.`);
    const ok = R.ch((n.rel / 120) * (n.money > M(500) ? 1 : .1));
    if (!ok) { chR(n, -3); return UI.alert(n.first, `${n.first} recusou te dar dinheiro.`, '🙅'); }
    const amt = Math.max(M(5), Math.round(Math.min(n.money * R.int(1, 6) / 100, P().age < 13 ? M(R.int(5, 60)) : M(R.int(50, 5000)) * (n.money > M(1e6) ? 20 : 1))));
    n.money -= amt; cash(amt); log(`${n.first} me deu ${fmt(amt)}.`);
    return UI.alert(n.first, `${n.first} te deu ${fmt(amt)}! 💵`, '💵');
  },
  async askCar(n) {
    if (!lim('carroPais')) return UI.alert(n.first, 'Você já pediu este ano.');
    if (R.ch(n.rel / 150)) { const t = R.pick(CAR_TYPES.slice(0, 4)); const c = Assets.mkCar(t, true); P().assets.push(c); n.money -= c.val; log(`${n.first} me deu um ${c.t}! 🚗`, 'good'); return UI.alert('Carro!', `${n.first} te deu um ${c.t}!`, '🚗'); }
    chR(n, -4); return UI.alert(n.first, `${n.first} disse que você tem que trabalhar para isso.`, '😤');
  },
  async giveMoney(n, def) {
    const v = def ? { amt: def / C().rate * C().rate } : await UI.prompt('Dar dinheiro', [{ k: 'amt', label: `Quanto dar a ${n.first}? (${C().cur})`, type: 'number', value: Math.round(M(100) * C().rate) }]);
    if (!v) return; const amt = def || Math.round(Number(v.amt) / C().rate);
    if (!(amt > 0)) return;
    if (!(await pay(amt))) return;
    n.money += amt; chR(n, clamp(Math.round(Math.log10(amt + 1) * 3), 1, 20));
    log(`Dei ${fmt(amt)} para ${n.first}.`); return UI.alert(n.first, `${n.first} agradeceu pelos ${fmt(amt)}.`, '💸');
  },
  async befriend(n) {
    if (!lim('amizade_' + n.id)) return UI.alert(n.first, 'Calma, dê tempo ao tempo.');
    if (R.ch(.35 + n.rel / 200)) { const was = n.role; n.role = 'amigo'; chR(n, 15); log(`Fiz amizade com ${fname(n)}.`, 'good'); return UI.alert('Amizade', `${n.first} agora é ${ga(n.g, 'seu amigo', 'sua amiga')}! ${was === 'inimigo' ? '(as pazes foram feitas)' : ''}`, '🤝'); }
    chR(n, -3); return UI.alert(n.first, `${n.first} não está interessad${ga(n.g, 'o', 'a')}.`, '🤷');
  },
  async askOut(n) {
    const p = P();
    if (!lim('askout_' + n.id)) return UI.alert(n.first, 'Você já tentou este ano.');
    const compat = n.sex === 'bi' || (n.sex === 'het' ? n.g !== p.g : n.g === p.g);
    const chance = compat ? (.25 + n.rel / 200 + (p.loo - n.loo) / 250 + (p.talent === 'carisma' ? .15 : 0)) : .02;
    if (R.ch(chance)) {
      if (['colegaT', 'chefe'].includes(n.role) && R.ch(.15)) { log('O RH ficou sabendo do meu romance no trabalho.', 'bad'); if (p.job) p.job.perf = clamp(p.job.perf - 15); }
      await Love.startDating(n); return UI.alert('Sim!', `${n.first} aceitou! ❤️`, '❤️');
    }
    chR(n, -5); ch('hap', -3); return UI.alert('Não', `${n.first} recusou${compat ? '' : ' — não tem interesse em pessoas do seu gênero'}.`, '💔');
  },
  async date(n) {
    const spots = [['Jantar romântico', 150], ['Cinema', 40], ['Piquenique', 20], ['Show', 200], ['Viagem a dois', 2500], ['Noite de jogos em casa', 0]];
    const o = await UI.choose('Encontro', `Aonde levar ${n.first}?`, spots.map(([t, c]) => ({ t, sub: c ? fmt(M(c)) : 'Grátis', v: { t, c: M(c) } })));
    if (!o) return; if (!(await pay(o.c))) return;
    if (!lim('date_' + n.id, 4)) return UI.alert('Encontro', 'Vocês já saíram bastante este ano.');
    const ok = R.ch(.8); chR(n, ok ? R.int(5, 14) : -R.int(2, 8)); ch('hap', ok ? 5 : -2);
    return UI.alert(o.t, ok ? `Foi um encontro maravilhoso com ${n.first}. 💕` : `O encontro foi um desastre.`, ok ? '💕' : '😬');
  },
  async propose(n) {
    const p = P();
    const rings = p.assets.filter(a => a.k === 'joia' && a.ring);
    const opts = rings.map(r => ({ t: r.t, sub: `Seu (${fmt(r.val)})`, v: { own: r, val: r.val } })).concat([
      { t: 'Anel simples', sub: fmt(M(800)), v: { c: M(800), val: M(800) } }, { t: 'Anel médio', sub: fmt(M(5000)), v: { c: M(5000), val: M(5000) } }, { t: 'Anel de diamante enorme', sub: fmt(M(40000)), v: { c: M(40000), val: M(40000) } }, { t: 'Sem anel', v: { c: 0, val: 0 } }]);
    const r = await UI.choose('Pedido de casamento', `Qual anel para ${n.first}?`, opts); if (!r) return;
    if (r.c && !(await pay(r.c))) return;
    if (r.own) p.assets = p.assets.filter(a => a !== r.own);
    const yrs = G.s.year - (n.since || G.s.year);
    const chance = n.rel / 110 + Math.min(.2, yrs * .05) + Math.min(.15, r.val / M(40000) * .15) - (yrs < 1 ? .2 : 0);
    if (R.ch(chance)) { n.role = 'noivo'; chR(n, 10); log(`Fiquei noivo(a) de ${fname(n)}! 💍`, 'good'); return UI.alert('SIM!', `${n.first} aceitou! Vocês estão noivos! 💍`, '💍'); }
    chR(n, -10); ch('hap', -10); log(`${n.first} recusou meu pedido de casamento.`, 'bad');
    if (R.ch(.3)) { n.role = 'ex'; return UI.alert('Não...', `${n.first} recusou e terminou com você.`, '💔'); }
    return UI.alert('Não...', `${n.first} disse que ainda não está pront${ga(n.g, 'o', 'a')}.`, '😓');
  },
  async counseling(n) {
    if (!(await pay(M(400), 'a terapia de casal'))) return;
    if (!lim('terapia_' + n.id)) return UI.alert('Terapia', 'Já fizeram este ano.');
    const ok = R.ch(.65); chR(n, ok ? R.int(10, 25) : -R.int(0, 5));
    return UI.alert('Terapia de casal', ok ? 'A terapia aproximou vocês de novo.' : 'A sessão virou uma briga.', '🛋️');
  },
  async reportHR(n) {
    const p = P(); if (!lim('rh')) return UI.alert('RH', 'Você já foi ao RH este ano.');
    const why = await UI.choose('Denunciar ao RH', `Motivo da denúncia contra ${n.first}:`, ['Assédio', 'Roubo de material', 'Faltas frequentes', 'Discriminação', 'Comportamento agressivo'].map(t => ({ t, v: t })));
    if (!why) return;
    if (R.ch(.4)) { delete G.s.npcs[n.id]; log(`${fname(n)} foi demitid${ga(n.g, 'o', 'a')} após minha denúncia ao RH.`); UI.back(); return UI.alert('RH', `${n.first} foi demitid${ga(n.g, 'o', 'a')}.`, '📋'); }
    chR(n, -30); n.role = n.role === 'chefe' ? 'chefe' : 'inimigo'; if (p.job) p.job.perf = clamp(p.job.perf - 5);
    return UI.alert('RH', 'O RH não encontrou provas. Agora o clima está péssimo.', '😬');
  },
  async godEdit(n) {
    const v = await UI.prompt(`Editar ${n.first}`, [
      { k: 'rel', label: 'Relação', type: 'range', value: n.rel }, { k: 'hea', label: 'Saúde', type: 'range', value: n.hea },
      { k: 'smr', label: 'Inteligência', type: 'range', value: n.smr }, { k: 'loo', label: 'Aparência', type: 'range', value: n.loo }, { k: 'first', label: 'Nome', type: 'text', value: n.first }]);
    if (!v) return; for (const k of ['rel', 'hea', 'smr', 'loo']) n[k] = clamp(Number(v[k])); if (v.first) n.first = v.first;
  }
};

// ---------- Pets ----------
const Pets = {
  add(kind, exotic, breed) {
    const life = R.int(...kind.life);
    const pet = { id: uid(), t: kind.t, ic: kind.ic, name: R.pick(PET_NAMES), breed: breed || null, age: R.int(0, 3), life, rel: R.int(50, 90), exotic: !!exotic, d: kind.d || 0 };
    P().pets.push(pet); cnt('pets'); if (exotic) { cnt('exoticos'); Meta.ach('exotico'); }
    log(`Agora tenho ${ga('M', 'um', 'uma')} ${kind.t.toLowerCase()} chamado(a) ${pet.name}! ${kind.ic}`, 'good'); ch('hap', 8);
    return pet;
  },
  shopMenu() {
    const p = P(); const mk = (list, exotic, where) => list.map(k => {
      const price = where === 'abrigo' ? M(R.int(0, 150)) : M(R.int(...k.p));
      const breed = k.br ? (where === 'abrigo' ? 'Vira-lata' : R.pick(k.br.slice(1))) : null;
      return { ic: k.ic, t: `${k.t}${breed ? ' (' + breed + ')' : ''}`, sub: price ? fmt(price) : 'Adoção gratuita', fn: async () => {
        if (p.age < 8) return UI.alert('Pets', 'Peça aos seus pais quando for mais velho(a).');
        if (p.pets.length >= 8) return UI.alert('Pets', 'Você já tem animais demais!');
        if (!(await pay(price))) return;
        const pet = this.add(k, exotic, breed); return UI.alert('Novo pet!', `Diga oi para ${pet.name}! ${k.ic}`, k.ic);
      } };
    });
    return { title: 'Pets', items: [{ sep: 'Abrigo de animais' }, ...mk(R.sample(PETS.filter(k => ['Cachorro', 'Gato', 'Coelho', 'Porquinho-da-índia'].includes(k.t)), 3), false, 'abrigo'),
      { sep: 'Pet shop' }, ...mk(R.sample(PETS, 5), false, 'loja'), { sep: 'Criador de exóticos (arriscado!)' }, ...mk(R.sample(EXOTIC, 4), true, 'exotico')] };
  },
  menu(pet) {
    const p = P();
    const act = async (t, d, msg, extra) => { if (!lim('pet_' + pet.id, 4)) return UI.alert(pet.name, `${pet.name} quer descansar.`); pet.rel = clamp(pet.rel + d); extra && extra(); return UI.alert(pet.name, msg, pet.ic); };
    const items = [
      { ic: '🎾', t: 'Brincar', fn: () => act('Brincar', R.int(5, 12), `${pet.name} adorou brincar com você!`, () => ch('hap', 3)) },
      { ic: '🦴', t: 'Dar petisco', fn: () => act('Petisco', R.int(3, 8), `${pet.name} devorou o petisco.`) },
      { ic: '🩺', t: 'Levar ao veterinário', sub: fmt(M(150)), fn: async () => { if (!(await pay(M(150)))) return; pet.life += R.ch(.5) ? 1 : 0; return act('Vet', 3, `${pet.name} está saudável.`); } }
    ];
    if (['Cachorro', 'Cavalo', 'Lobo'].includes(pet.t)) items.push({ ic: '🦮', t: pet.t === 'Cavalo' ? 'Cavalgar' : 'Passear', fn: () => act('Passeio', R.int(5, 10), `Vocês deram um ótimo passeio.`, () => { ch('hea', 2); ch('hap', 2); }) });
    if (pet.exotic) items.push({ ic: '⚠️', t: 'Tentar adestrar', fn: async () => { if (R.ch(pet.d * 2)) { const d = R.int(10, 40); ch('hea', -d); await UI.alert('Ataque!', `${pet.name} te atacou! (-${d} saúde)`, '🩸'); if (p.hea <= 0) die(`atacado(a) por ${pet.t.toLowerCase()}`); return; } pet.d = Math.max(0, pet.d - .03); return act('Adestrar', 6, `${pet.name} está ficando mais dócil.`); } });
    items.push({ ic: '✏️', t: 'Renomear', fn: async () => { const v = await UI.prompt('Renomear', [{ k: 'n', label: 'Novo nome', type: 'text', value: pet.name }]); if (v?.n) pet.name = v.n; } });
    items.push({ ic: '🏡', t: pet.exotic ? 'Soltar na natureza' : 'Doar', fn: async () => { if (!(await UI.confirm('Despedida', `Abrir mão de ${pet.name}?`))) return; p.pets = p.pets.filter(x => x !== pet); log(`Me despedi de ${pet.name}.`); UI.back(); } });
    return { title: pet.name, head: `<div class="npchead"><div class="big">${pet.ic} ${esc(pet.name)}</div><div class="muted">${pet.t}${pet.breed ? ' • ' + pet.breed : ''} • ${pet.age} anos</div><div class="mini"><span>Relação</span><div class="mbar"><i style="width:${pet.rel}%"></i></div></div></div>`, items };
  }
};
