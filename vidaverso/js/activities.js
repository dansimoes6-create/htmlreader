'use strict';
// ===== Atividades =====
const Activities = {
  menu() {
    const p = P(), a = p.age;
    if (p.prison) return Prison.menu();
    const it = (ic, t, sub, fn, min = 0, extra = {}) => a >= min ? { ic, t, sub, fn, ...extra } : { ic, t, sub: `🔒 A partir de ${min} anos`, dis: true };
    const items = [
      it('🧘', 'Mente e corpo', 'Academia, meditação, artes marciais...', () => UI.open(() => this.mindBody()), 4),
      it('🩺', 'Médico', p.ill.length ? `${p.ill.length} problema(s) de saúde` : 'Check-up e tratamentos', () => UI.open(() => Health.doctorMenu()), 0),
      it('❤️', 'Amor', 'Encontros, apps, fertilidade', () => UI.open(() => Love.menu()), 13),
      it('🐾', 'Pets', 'Abrigo, pet shop, exóticos', () => UI.open(() => Pets.shopMenu()), 8),
      it('🦹', 'Crime', 'Furtos, assaltos, golpes...', () => UI.open(() => Crime.menu()), 8),
      it('🪩', 'Vida noturna', 'Baladas e bares', () => UI.open(() => this.nightlife()), 16),
      it('🎰', 'Cassino', 'Blackjack, roleta, caça-níquel, cavalos', () => UI.open(() => this.casino()), 18),
      it('🎟️', 'Loteria', 'Tente a sorte', () => UI.open(() => this.lottery()), 18),
      it('✈️', 'Férias', 'Viaje pelo mundo', () => UI.open(() => this.vacations()), 18),
      it('🏕️', 'Ao ar livre', 'Acampar, pescar, caçar, trilhas', () => UI.open(() => this.outdoors()), 8),
      it('🍿', 'Cinema', 'Assistir a um filme', () => this.movies(), 4),
      it('🛍️', 'Shopping', 'Roupas, eletrônicos, livros', () => UI.open(() => this.mall()), 8),
      it('💇', 'Salão e spa', 'Cabelo, unhas, massagem', () => UI.open(() => this.spa()), 6),
      it('💉', 'Cirurgia plástica', '', () => UI.open(() => Health.surgeryMenu()), 18),
      it('📱', 'Redes sociais', `${Social.total().toLocaleString('pt-BR')} seguidores`, () => UI.open(() => Social.menu()), 13),
      it('✍️', 'Escrever um livro', '', () => Books.write(), 12),
      it('🪪', 'Licenças', 'CNH, barco, avião', () => UI.open(() => this.licenses()), 15),
      it('⚖️', 'Processos judiciais', 'Processar alguém', () => UI.open(() => this.lawsuits()), 18),
      it('🌎', 'Emigrar', `Você mora em ${C().n} ${C().f}`, () => UI.open(() => this.emigrate()), 18),
      it('🙏', 'Religião', p.religion || 'Nenhuma', () => UI.open(() => this.religion()), 8),
      it('🔮', 'Sobrenatural', 'Magia, vampiros, videntes', () => UI.open(() => Super.menu()), 10),
      it('🤲', 'Doar para caridade', '', () => this.donate(), 10),
      it('🪞', 'Identidade', 'Nome, gênero', () => UI.open(() => this.identity()), 16),
      it('📜', 'Testamento', 'Quem herda seus bens', () => UI.open(() => Family.willMenu()), 18)
    ];
    if (a < 4) items.unshift({ ic: '👶', t: 'Coisas de bebê', sub: 'Chorar, brincar, explorar', fn: () => UI.open(() => this.baby()) });
    return { title: 'Atividades', items };
  },
  baby() {
    const b = (ic, t, msg, f) => ({ ic, t, fn: async () => { if (!lim('baby_' + t, 2)) return UI.alert(t, 'Você está cansadinho(a).'); f && f(); return UI.alert(t, msg, ic); } });
    return { title: 'Coisas de bebê', items: [
      b('😭', 'Chorar bem alto', 'Todo mundo correu para ver o que houve.', () => alive('mae', 'pai').forEach(x => chR(x, -1))),
      b('🧸', 'Brincar com brinquedos', 'Você se divertiu muito!', () => ch('hap', 4)),
      b('🗣️', 'Tentar falar', R.pick(['Você disse "mamá"!', 'Você disse "papá"!', 'Saiu só baba.', 'Você disse "não"!']), () => ch('smr', 1)),
      b('🚶', 'Tentar andar', R.pick(['Você deu os primeiros passos!', 'Você caiu de bunda.']), () => ch('ath', 1)),
      b('🍌', 'Comer papinha', 'Nham!', () => ch('hea', 1))
    ] };
  },
  // ---------- mente e corpo ----------
  mindBody() {
    const p = P();
    const act = (ic, t, sub, eff, msg, min = 0, k) => ({ ic, t, sub, dis: p.age < min, fn: async () => {
      if (p.age < min) return; if (!lim('mb_' + (k || t), 2)) return UI.alert(t, 'Você já fez isso o bastante este ano.');
      for (const [s, d] of Object.entries(eff)) ch(s, typeof d === 'function' ? d() : d);
      return UI.alert(t, typeof msg === 'function' ? msg() : msg, ic);
    } });
    const items = [
      act('🏋️', 'Academia', 'Saúde e aparência', { hea: () => R.int(1, 4), loo: () => R.int(0, 2), ath: () => R.int(1, 3) + (p.talent === 'esporte' ? 1 : 0), hap: () => R.int(-1, 3) }, () => R.pick(['Você pegou pesado no supino!', 'Esteira por uma hora. Ufa.', 'Treino de perna. Amanhã não anda.']), 12),
      act('🏃', 'Correr', '', { hea: 2, ath: 2 }, 'Você correu 5 km!', 8),
      act('🚶', 'Caminhar', '', { hea: 1, hap: 2 }, 'Uma caminhada tranquila pelo bairro.', 4),
      act('🧘', 'Meditar', '', { hap: () => R.int(2, 6), hea: 1, will: 2 }, 'Sua mente está em paz.', 8),
      act('🤸', 'Yoga', '', { hea: 2, hap: 3, loo: 1 }, 'Namastê.', 10),
      act('📚', 'Ir à biblioteca', 'Inteligência', { smr: () => R.int(1, 3) + (p.talent === 'intelecto' ? 1 : 0), hap: 1 }, () => { Hunt.find('biblioteca'); return R.pick(['Você leu um livro de história.', 'Um romance clássico te prendeu.', 'Você estudou física quântica. Mais ou menos.']); }, 5, 'biblioteca'),
      { ic: '🥋', t: 'Artes marciais', sub: `Faixa ${BELTS[p.belt]}`, dis: p.age < 6, fn: () => this.martial() },
      { ic: '🧠', t: 'Teste de QI', sub: 'Minijogo', dis: p.age < 8, fn: async () => { if (!lim('qi')) return UI.alert('QI', 'Um teste por ano.'); const sc = await Mini.quiz(); if (sc === null) return; const iq = Math.round(70 + sc * 15 + p.smr / 5 + R.int(-5, 5)); ch('smr', sc >= 3 ? 2 : 0); log(`Fiz um teste de QI: ${iq}.`); return UI.alert('Resultado', `Você acertou ${sc}/4. QI estimado: ${iq}.`, '🧠'); } },
      { ic: '🎹', t: 'Instrumentos musicais', sub: Object.keys(p.instr).join(', ') || 'Aprenda a tocar', dis: p.age < 5, fn: () => this.instrMenu() },
      { ic: '🥗', t: 'Dieta', sub: p.diet || 'Nenhuma', dis: p.age < 12, fn: async () => { const d = await UI.choose('Dieta', 'Escolha uma dieta:', ['Nenhuma', 'Vegana', 'Vegetariana', 'Low-carb', 'Mediterrânea', 'Jejum intermitente', 'Só fast-food'].map(t => ({ t, v: t }))); if (!d) return; p.diet = ['Nenhuma', 'Só fast-food'].includes(d) ? null : d; if (d === 'Só fast-food') { ch('hea', -5); ch('hap', 5); } log(`Comecei a dieta: ${d}.`); } },
      { ic: '🛋️', t: 'Psicólogo', sub: fmt(M(150)), dis: p.age < 6, fn: async () => { if (!(await pay(M(150)))) return; if (!lim('psico', 2)) return UI.alert('Psicólogo', 'Próxima sessão no ano que vem.'); ch('hap', R.int(3, 10)); const dep = p.ill.find(i => i.mental); if (dep && R.ch(.3)) { p.ill = p.ill.filter(x => x !== dep); return UI.alert('Terapia', `Você superou a ${dep.n.toLowerCase()}! 🌤️`, '🛋️'); } return UI.alert('Terapia', 'Falar sobre seus sentimentos fez bem.', '🛋️'); } }
    ];
    return { title: 'Mente e corpo', items };
  },
  async martial() {
    const p = P();
    if (!lim('marcial', 2)) return UI.alert('Artes marciais', 'Treinou demais este ano.');
    if (!(await pay(M(100)))) return;
    p.beltProg += R.int(20, 45) + (p.talent === 'lutas' ? 15 : 0); ch('ath', 1); ch('hea', 1);
    if (p.belt < 7 && p.beltProg >= 100) {
      const ok = await UI.confirm('Exame de faixa', `Fazer o exame para faixa ${BELTS[p.belt + 1]}?`);
      if (ok && R.ch(.7)) { p.belt++; p.beltProg = 0; log(`Conquistei a faixa ${BELTS[p.belt]} no caratê! 🥋`, 'good'); if (p.belt === 7) Meta.ach('faixapreta'); return UI.alert('Aprovado!', `Faixa ${BELTS[p.belt]}!`, '🥋'); }
      if (ok) { p.beltProg = 60; return UI.alert('Reprovado', 'Você não passou no exame. Continue treinando.'); }
    }
    return UI.alert('Treino', `Você treinou duro. Progresso para a próxima faixa: ${Math.min(100, p.beltProg)}%.`, '🥋');
  },
  instrMenu() {
    const p = P();
    UI.open(() => ({ title: 'Instrumentos', items: INSTRUMENTS.map(i => ({ ic: '🎵', t: i, sub: p.instr[i] ? `Nível ${p.instr[i]}%` : `Aulas: ${fmt(M(60))}`, fn: async () => {
      if (!lim('instr', 3)) return UI.alert(i, 'Seus dedos doem. Descanse.');
      if (!(await pay(M(60)))) return;
      p.instr[i] = clamp((p.instr[i] || 0) + R.int(3, 9) + (p.talent === 'musica' ? 5 : 0)); if (p.sp.music) p.sp.music.skill = clamp(p.sp.music.skill + 1);
      return UI.alert(i, `Você praticou ${i.toLowerCase()}. Nível ${p.instr[i]}%.`, '🎵');
    } })) }));
  },
  // ---------- noite ----------
  nightlife() {
    const p = P(); const c = C(); const canDrink = p.age >= c.drink;
    return { title: 'Vida noturna', items: [
      { ic: '🪩', t: 'Ir para a balada', fn: () => this.club() },
      { ic: '🍺', t: 'Ir a um bar', sub: canDrink ? '' : `Bebidas só a partir de ${c.drink > 50 ? 'nunca (proibido)' : c.drink + ' anos'}`, fn: async () => {
        if (!lim('bar', 3)) return UI.alert('Bar', 'O barman disse que você já bebeu demais este ano.');
        if (!canDrink) { ch('hap', 2); return UI.alert('Bar', 'Você tomou um refrigerante e jogou sinuca.'); }
        const d = await UI.choose('Bar', 'O que pedir?', ['Cerveja', 'Vinho', 'Drinks', 'Shots de tequila', 'Só água'].map(t => ({ t, v: t }))); if (!d) return;
        if (d === 'Só água') return UI.alert('Bar', 'Hidratado(a)!');
        ch('hap', R.int(2, 7)); ch('hea', -1); if (R.ch(.12 + (p.addict.alcool ? .1 : 0) - p.will / 500)) Health.addict('alcool');
        if (d === 'Shots de tequila' && R.ch(.2)) { ch('hea', -8); return UI.alert('Ressaca', 'Você acordou num lugar desconhecido sem lembrar de nada. 🥴'); }
        if (R.ch(.15)) { const f = mkNPC({ age: clamp(p.age + R.int(-5, 5), 18, 90), role: 'amigo', rel: R.int(40, 60) }); return UI.alert('Bar', `Você fez amizade com ${fname(f)} no bar!`, '🍻'); }
        return UI.alert('Bar', 'Uma noite agradável.', '🍺');
      } },
      { ic: '🚬', t: 'Fumar', cls: 'danger', fn: async () => { if (p.age < 14) return UI.alert('Não', 'Nem pensar.'); ch('hea', -2); if (R.ch(.3 - p.will / 400)) Health.addict('cigarro'); return UI.alert('Cigarro', 'Você tossiu um pouco.', '🚬'); } },
      { ic: '🎤', t: 'Karaokê', fn: async () => { if (!lim('karaoke')) return UI.alert('Karaokê', 'Sua garganta não aguenta.'); ch('hap', 5); const good = R.ch(.4 + (p.sp.music?.skill || 0) / 200); return UI.alert('Karaokê', good ? 'O bar inteiro aplaudiu! 🎤' : 'Você desafinou feio, mas se divertiu.', '🎤'); } }
    ] };
  },
  async club() {
    const p = P();
    if (!lim('balada', 3)) return UI.alert('Balada', 'O segurança disse que você já veio demais.');
    if (p.age < 18 && R.ch(.6)) return UI.alert('Barrado(a)', 'O segurança pediu sua identidade... e te mandou para casa.', '🚫');
    ch('hap', R.int(3, 8));
    const r = R.f();
    if (r < .2) { const c = Love.candidate(); c.age = Math.max(18, c.age); const ok = await UI.confirm('Na pista', `${fname(c)} (${c.age}) está dançando com você e quer seu número. Trocar contatos?`); if (ok) { await Love.startDating(c); return UI.alert('Balada', `Você e ${c.first} começaram a sair! 💃`, '💃'); } delete G.s.npcs[c.id]; return; }
    if (r < .3) { const d = R.int(5, 15); ch('hea', -d); return UI.alert('Confusão', `Uma briga começou e sobrou para você (-${d} saúde).`, '🤕'); }
    if (r < .31 && !p.vamp && p.age >= 18) { const ok = await UI.confirm('Estranho pálido', 'Um estranho de olhos vermelhos te leva para um canto escuro e mostra presas... Deixar que ele te morda?'); if (ok) { Super.becomeVampire('Fui mordido(a) numa balada.'); return UI.alert('Transformação', 'Você acordou com uma sede terrível. 🧛', '🧛'); } return UI.alert('Fuga', 'Você saiu correndo da balada.'); }
    if (r < .38 && p.age >= 18) { Health.addict('drogas'); return UI.alert('Balada', 'Alguém te ofereceu umas balas estranhas e você aceitou... Você não se sentiu bem depois.', '😵'); }
    if (r < .5) { const f = mkNPC({ age: clamp(p.age + R.int(-4, 4), 16, 80), role: 'amigo', rel: R.int(40, 65) }); return UI.alert('Balada', `Você fez amizade com ${fname(f)}!`, '🎉'); }
    return UI.alert('Balada', R.pick(['Você dançou até o sol nascer!', 'O DJ estava incrível.', 'A fila do banheiro era enorme, mas valeu.']), '🪩');
  },
  // ---------- cassino ----------
  casino() {
    const p = P();
    const game = (ic, t, f) => ({ ic, t, fn: async () => { if (!lim('cassino', 6)) return UI.alert('Cassino', 'O cassino pediu para você ir para casa.'); Hunt.find('cassino'); await f(); if (R.ch(.06 - p.will / 2000)) Health.addict('jogo'); } });
    return { title: 'Cassino', head: `<p class="muted">Saldo: ${fmt(p.money)}. Jogue com responsabilidade.</p>`, items: [
      game('🃏', 'Blackjack', () => Mini.blackjack()), game('🎡', 'Roleta', () => Mini.roulette()), game('🎰', 'Caça-níquel', () => Mini.slots()), game('🐎', 'Corrida de cavalos', () => Mini.horses()),
      game('🎲', 'Dados (craps)', async () => { const bet = await Mini.bet(); if (!bet) return; const d = R.int(1, 6) + R.int(1, 6); const win = [7, 11].includes(d) || (G.s.flags.luck && R.ch(.3)); G.s.flags.luck = false; cash(win ? bet : -bet); return UI.alert('Dados', `Você tirou ${d}. ${win ? `Ganhou ${fmt(bet)}!` : `Perdeu ${fmt(bet)}.`}`, '🎲'); })
    ] };
  },
  lottery() {
    const p = P();
    const t = (ic, n, cost, odds, prize) => ({ ic, t: n, sub: `${fmt(M(cost))} • prêmio até ${fmt(M(prize), true)}`, fn: async () => {
      if (!lim('loteria', 5)) return UI.alert('Loteria', 'Você já comprou bilhetes demais este ano.');
      if (!(await pay(M(cost)))) return;
      let luck = G.s.flags.luck ? 3 : 1; G.s.flags.luck = false;
      if (R.ch(odds * luck)) { const v = M(Math.round(prize * R.int(30, 100) / 100)); cash(v); log(`GANHEI NA LOTERIA: ${fmt(v)}! 🎉`, 'good'); if (prize >= 1e7) Meta.ach('loteria'); ch('hap', 30); return UI.alert('GANHOU!!!', `Você ganhou ${fmt(v)}! 🎉🎉🎉`, '🎟️'); }
      if (R.ch(.1)) { const v = M(cost * R.int(2, 10)); cash(v); return UI.alert('Prêmio pequeno', `Você ganhou ${fmt(v)}.`, '🎟️'); }
      return UI.alert('Não foi desta vez', 'Bilhete sem prêmio.', '🎟️');
    } });
    return { title: 'Loteria', items: [t('🪙', 'Raspadinha', 5, .005, 10000), t('🎟️', 'Loteria estadual', 10, .0005, 500000), t('💎', 'Mega-prêmio nacional', 20, .00003, 80000000)] };
  },
  // ---------- férias / ao ar livre ----------
  vacations() {
    const p = P();
    return { title: 'Férias', items: R.sample(VACATIONS, 8).map(v => ({ ic: v.ic, t: v.n, sub: fmt(M(v.c)), fn: async () => {
      if (!lim('ferias', 2)) return UI.alert('Férias', 'Você já viajou demais este ano!');
      if (!(await pay(M(v.c), 'a viagem'))) return;
      p.trips++; cnt('viagens'); if (p.trips >= 10) Meta.ach('viagem10'); if (v.n.includes('Safári')) cnt('safari');
      ch('hap', R.int(8, 18)); log(`Viajei para ${v.n}. ${v.ic}`);
      Hunt.find('ferias');
      const pt = partner(); if (pt) chR(pt, 8);
      const r = R.f();
      if (r < .15) { const c = Love.candidate(); c.age = Math.max(18, c.age); c.role = 'amigo'; return UI.alert(v.n, `Você conheceu ${fname(c)} durante a viagem e fizeram amizade!`, v.ic); }
      if (r < .25) { Health.add(R.pick(['Gripe', 'Infecção urinária', 'Conjuntivite'])); return UI.alert(v.n, 'Você ficou doente durante a viagem. 🤒', v.ic); }
      if (r < .32) { const lost = M(R.int(100, 900)); cash(-lost); return UI.alert(v.n, `A companhia aérea perdeu sua mala (prejuízo ${fmt(lost)}).`, '🧳'); }
      return UI.alert(v.n, R.pick(['Foi a viagem da sua vida!', 'Você tirou fotos incríveis.', 'A comida local era maravilhosa.', 'Você voltou renovado(a).']), v.ic);
    } })) };
  },
  outdoors() {
    const p = P();
    return { title: 'Ao ar livre', items: [
      { ic: '🏕️', t: 'Acampar', fn: async () => { if (!lim('acampar')) return UI.alert('Acampar', 'Você já acampou este ano.'); cnt('acampar'); ch('hap', 6); ch('hea', 2); Hunt.find('acampar'); const r = R.f(); if (r < .1) { ch('hea', -10); return UI.alert('Acampamento', 'Um urso revirou sua barraca! Você se machucou fugindo.', '🐻'); } if (r < .2) { return UI.alert('Acampamento', 'Choveu a noite toda. Que perrengue.', '⛈️'); } return UI.alert('Acampamento', 'Fogueira, estrelas e marshmallow. Perfeito. 🔥', '🏕️'); } },
      { ic: '🎣', t: 'Pescar', sub: 'Minijogo', fn: async () => { if (!lim('pescar', 3)) return UI.alert('Pesca', 'Os peixes sumiram por hoje.'); Hunt.find('pescar'); const f = await Mini.fishing(); if (f === null) return; if (f) { cnt('peixes'); ch('hap', 5); const fish = R.pick(['tilápia', 'tucunaré', 'truta', 'robalo', 'dourado', 'pirarucu', 'bota velha 👢', 'salmão', 'bagre']); log(`Pesquei um(a) ${fish}. 🎣`); return UI.alert('Pegou!', `Você pescou um(a) ${fish}!`, '🐟'); } return UI.alert('Escapou', 'O peixe escapou do anzol.', '🎣'); } },
      { ic: '🦌', t: 'Caçar', sub: 'Requer 16+', fn: async () => { if (p.age < 16) return UI.alert('Caça', 'Muito novo(a).'); if (!lim('cacar')) return UI.alert('Caça', 'Temporada encerrada.'); karma(-2); if (R.ch(.05)) { ch('hea', -30); if (p.hea <= 0) return die('um acidente de caça'); return UI.alert('Acidente!', 'Você se feriu com a própria arma!', '🩸'); } if (R.ch(.5)) { const a = R.pick(['um javali', 'um cervo', 'um pato', 'um coelho']); return UI.alert('Caça', `Você caçou ${a}.`, '🦌'); } return UI.alert('Caça', 'Você voltou de mãos vazias.'); } },
      { ic: '🏍️', t: 'Trilha de quadriciclo', fn: async () => { if (p.age < 14) return UI.alert('Quadriciclo', 'Muito novo(a).'); if (!lim('atv')) return UI.alert('Quadriciclo', 'Já foi este ano.'); if (!(await pay(M(150)))) return; ch('hap', 8); if (R.ch(.08)) { ch('hea', -20); if (p.hea <= 0) return die('um acidente de quadriciclo'); return UI.alert('Capotou!', 'Você capotou o quadriciclo! 🤕'); } return UI.alert('Quadriciclo', 'Muita lama e adrenalina! 🏍️'); } },
      { ic: '🧗', t: 'Escalada', fn: async () => { if (p.age < 10) return UI.alert('Escalada', 'Muito novo(a).'); if (!lim('escalada')) return UI.alert('Escalada', 'Seus braços não aguentam.'); ch('ath', 2); ch('hap', 5); if (R.ch(.03)) { die('uma queda durante uma escalada'); return; } return UI.alert('Escalada', 'Você chegou ao topo! 🏔️'); } },
      { ic: '🏄', t: 'Surfar', fn: async () => { if (!lim('surf')) return UI.alert('Surf', 'O mar está flat.'); ch('ath', 1); ch('hap', 6); if (R.ch(.02)) { ch('hea', -40); if (p.hea <= 0) return die('ataque de tubarão'); return UI.alert('Tubarão!', 'Um tubarão te mordeu!! 🦈'); } return UI.alert('Surf', 'Você pegou ondas incríveis! 🌊'); } }
    ] };
  },
  async movies() {
    const p = P();
    const g = await UI.choose('Cinema', 'Que filme assistir?', FILM_GENRES.map(t => ({ t, v: t }))); if (!g) return;
    if (!(await pay(M(15)))) return;
    if (!lim('cinema', 3)) return UI.alert('Cinema', 'Você já viu todos os filmes em cartaz.');
    const good = R.ch(.7); ch('hap', good ? R.int(3, 7) : -1); cnt('filmesVistos');
    return UI.alert(`Filme de ${g.toLowerCase()}`, good ? 'Que filmaço! 🍿' : 'Que filme horrível. Dormiu na metade.', '🍿');
  },
  mall() {
    const p = P();
    const buy = (ic, t, c, eff, msg) => ({ ic, t, sub: fmt(M(c)), fn: async () => { if (!(await pay(M(c)))) return; if (!lim('mall_' + t, 2)) return UI.alert(t, 'Você já comprou isso este ano.'); for (const [k, v] of Object.entries(eff)) ch(k, v); return UI.alert(t, msg, ic); } });
    return { title: 'Shopping', items: [
      buy('👗', 'Roupas novas', 150, { loo: 2, hap: 4 }, 'Visual renovado!'), buy('👟', 'Tênis de marca', 300, { hap: 5 }, 'Que tênis lindo.'), buy('📱', 'Celular novo', 1000, { hap: 6 }, 'Celular top de linha!'),
      buy('🎮', 'Videogame', 500, { hap: 8, smr: -1 }, 'Vício garantido.'), buy('📚', 'Livros', 60, { smr: 2, hap: 2 }, 'Você levou uma pilha de livros.'), buy('💄', 'Maquiagem e perfumes', 120, { loo: 1, hap: 3 }, 'Cheirosíssimo(a).'), buy('🕶️', 'Óculos escuros de grife', 400, { loo: 1, hap: 4 }, 'Estiloso(a).')
    ] };
  },
  spa() {
    const p = P();
    const s = (ic, t, c, eff, msg) => ({ ic, t, sub: fmt(M(c)), fn: async () => { if (!lim('spa_' + t, 2)) return UI.alert(t, 'Volte no ano que vem.'); if (!(await pay(M(c)))) return; for (const [k, v] of Object.entries(eff)) ch(k, v); return UI.alert(t, msg, ic); } });
    return { title: 'Salão e spa', items: [
      { ic: '💇', t: 'Cortar o cabelo', sub: fmt(M(40)), fn: async () => { const st = await UI.choose('Corte', 'Que estilo?', ['Curtinho', 'Moicano', 'Raspado', 'Chanel', 'Cacheado natural', 'Mullet', 'Franja', 'Tranças', 'Pintar de azul'].map(t => ({ t, v: t }))); if (!st) return; if (!(await pay(M(40)))) return; const ok = R.ch(.8); ch('loo', ok ? R.int(1, 3) : -R.int(1, 4)); log(`Mudei o cabelo: ${st.toLowerCase()}.`); return UI.alert('Novo visual', ok ? 'Ficou ótimo!' : 'Ficou... diferente. 😬', '💇'); } },
      s('💅', 'Manicure e pedicure', 40, { loo: 1, hap: 2 }, 'Unhas impecáveis.'), s('💆', 'Massagem', 90, { hap: 5, hea: 1 }, 'Que relaxante...'), s('🧖', 'Sauna', 30, { hea: 1, hap: 2 }, 'Suou tudo.'),
      s('🧴', 'Tratamento facial', 120, { loo: 2 }, 'Pele de bebê!'), s('📍', 'Acupuntura', 80, { hea: 2, hap: 1 }, 'Agulhas por toda parte, mas funcionou.'), s('🎨', 'Fazer tatuagem', 200, { hap: 3 }, R.pick(['Uma rosa no braço.', 'O nome da mãe no peito.', 'Um dragão nas costas.', 'Uma frase em latim.']))
    ] };
  },
  // ---------- licenças ----------
  licenses() {
    const p = P(), c = C();
    const lic = (k, ic, t, min, cost) => ({ ic, t, sub: p.lic[k] ? '✅ Habilitado(a)' : `${min}+ anos • ${fmt(M(cost))}`, dis: !!p.lic[k], fn: async () => {
      if (p.age < min) return UI.alert(t, `Você precisa ter ${min} anos.`);
      if (!lim('lic_' + k, 2)) return UI.alert(t, 'Você reprovou muitas vezes este ano. Tente depois.');
      if (!(await pay(M(cost)))) return;
      const ok = await Mini.drivingTest(k);
      if (ok === null) return;
      if (ok) { p.lic[k] = true; log(`Tirei minha licença: ${t}! 🪪`, 'good'); return UI.alert('Aprovado(a)!', `Parabéns, você tem ${t}!`, '🪪'); }
      return UI.alert('Reprovado(a)', 'Você não passou no exame.', '❌');
    } });
    return { title: 'Licenças', items: [lic('carro', '🚗', 'Carteira de motorista', c.drive, 800), lic('moto', '🏍️', 'Habilitação para moto', c.drive, 500), lic('barco', '⛵', 'Arrais (barco)', 18, 1500), lic('aviao', '✈️', 'Licença de piloto', 18, 15000)] };
  },
  // ---------- processos ----------
  lawsuits() {
    const p = P();
    const sue = (t, base, chance) => ({ ic: '⚖️', t, fn: async () => {
      if (!lim('processo')) return UI.alert('Processo', 'Um processo por ano.');
      const law = await UI.choose('Advogado', 'Quem vai te representar?', [{ t: 'Advogado barato', sub: fmt(M(2000)), v: [M(2000), 0] }, { t: 'Advogado renomado', sub: fmt(M(30000)), v: [M(30000), .2] }]); if (!law) return;
      if (!(await pay(law[0]))) return;
      if (R.ch(chance + law[1])) { const v = M(R.int(base / 10, base)); cash(v); log(`Ganhei um processo (${t.toLowerCase()}) e recebi ${fmt(v)}. ⚖️`, 'good'); return UI.alert('Vitória!', `Indenização de ${fmt(v)}!`, '⚖️'); }
      log(`Perdi o processo contra ${t.toLowerCase().replace('processar ', '')}.`, 'bad'); return UI.alert('Derrota', 'O juiz negou seu pedido.', '⚖️');
    } });
    const items = [sue('Processar o vizinho', 20000, .35), sue('Processar uma empresa', 500000, .2), sue('Processar o ex-empregador', 100000, .3), sue('Processar o hospital', 800000, .2), sue('Processar o governo', 2000000, .08)];
    for (const n of alive('ex', 'inimigo', 'colegaT', 'chefe').slice(0, 4)) items.push(sue(`Processar ${fname(n)}`, 50000, .3));
    return { title: 'Processos judiciais', items };
  },
  // ---------- emigrar ----------
  emigrate() {
    const p = P();
    return { title: 'Emigrar', head: '<p class="muted">Seu pedido pode ser recusado. Diplomas e dinheiro ajudam.</p>', items: COUNTRIES.filter(c => c.id !== p.country).map(c => ({ ic: c.f, t: c.n, sub: c.mon ? 'Monarquia' : '', fn: async () => {
      if (!lim('emigrar')) return UI.alert('Imigração', 'Seu pedido já está em análise. Tente no ano que vem.');
      const chance = .3 + (hasDeg('uni') ? .25 : 0) + (netWorth() > M(200000) ? .2 : 0) - (p.record.length ? .3 : 0) + (p.job ? .05 : 0);
      if (!R.ch(clamp(chance * 100, 5, 95) / 100)) return UI.alert('Visto negado', `${c.n} recusou seu pedido de imigração.`, '🛂');
      if (!(await pay(M(2000), 'a mudança'))) return;
      p.country = c.id; p.city = R.pick(c.cities); G.s.flags.emigrated = true; cnt('emigrou'); Meta.ach('emigrou');
      if (p.job) Career.quit(true); if (p.sp.pol) p.sp.pol.inOffice = false; if (p.royal) { p.royal = null; log('Perdi meu título real ao deixar o país.', 'bad'); }
      for (const n of alive('amigo', 'colegaE')) chR(n, -20);
      log(`Emigrei para ${p.city}, ${c.n} ${c.f}!`, 'good'); UI.back();
      return UI.alert('Bem-vindo(a)!', `Você agora vive em ${p.city}, ${c.n}.`, c.f);
    } })) };
  },
  // ---------- religião ----------
  religion() {
    const p = P();
    const items = [];
    if (p.religion) {
      items.push({ ic: '🙏', t: 'Rezar / meditar', fn: async () => { if (!lim('rezar', 3)) return UI.alert('Fé', 'Você já rezou muito.'); ch('hap', 2); karma(1); if (R.ch(.02) && p.ill.length) { const i = p.ill.shift(); return UI.alert('Milagre!', `Você se curou de ${i.n}! 🙌`); } return UI.alert('Fé', 'Você sente paz.', '🙏'); } });
      items.push({ ic: '⛪', t: 'Ir a um culto/cerimônia', fn: async () => { if (!lim('culto')) return UI.alert('Culto', 'Já foi este ano.'); ch('hap', 3); if (R.ch(.2)) { const f = mkNPC({ age: clamp(p.age + R.int(-10, 10), 6, 90), role: 'amigo', rel: 50 }); return UI.alert('Comunidade', `Você conheceu ${fname(f)} na cerimônia.`); } return UI.alert('Cerimônia', 'Foi bonito.', '⛪'); } });
      items.push({ ic: '🚶', t: 'Fazer uma peregrinação', sub: fmt(M(1500)), fn: async () => { if (!lim('peregrin')) return UI.alert('Peregrinação', 'Uma por ano.'); if (!(await pay(M(1500)))) return; ch('hap', 10); karma(5); ch('hea', -2); return UI.alert('Peregrinação', 'Uma jornada transformadora.', '🚶'); } });
      items.push({ ic: '🚪', t: 'Abandonar a religião', fn: () => { log(`Deixei de seguir: ${p.religion}.`); p.religion = null; } });
    }
    items.push({ sep: p.religion ? 'Converter-se' : 'Escolher uma religião' });
    RELIGIONS.filter(r => r !== p.religion).forEach(r => items.push({ ic: '✨', t: r, fn: () => { p.religion = r; log(`Passei a seguir: ${r}.`); for (const x of alive('mae', 'pai', 'avo')) chR(x, R.int(-8, 4)); } }));
    return { title: 'Religião', items };
  },
  async donate() {
    const p = P();
    const v = await UI.prompt('Doação', [{ k: 'amt', label: `Quanto doar? (${C().cur})`, type: 'number', value: Math.round(M(100) * C().rate) }, { k: 'to', label: 'Instituição', type: 'select', options: ['Hospital infantil', 'Abrigo de animais', 'Combate à fome', 'Pesquisa contra o câncer', 'Meio ambiente', 'Igreja/templo local', 'Escola pública'], value: 'Combate à fome' }]);
    if (!v) return; const amt = Math.round(Number(v.amt) / C().rate); if (!(amt > 0)) return;
    if (!(await pay(amt))) return;
    p.donated += amt; karma(clamp(Math.round(Math.log10(amt + 1) * 2), 1, 15)); ch('hap', 3); if (amt > M(1e6)) fame(3);
    log(`Doei ${fmt(amt)} para ${v.to}. 🤲`); return UI.alert('Obrigado!', `Sua doação de ${fmt(amt)} vai ajudar muita gente.`, '🤲');
  },
  identity() {
    const p = P();
    return { title: 'Identidade', items: [
      { ic: '✏️', t: 'Mudar de nome', sub: `${p.first} ${p.last}`, fn: async () => { const v = await UI.prompt('Novo nome', [{ k: 'f', label: 'Nome', type: 'text', value: p.first }, { k: 'l', label: 'Sobrenome', type: 'text', value: p.last }]); if (!v || !v.f) return; if (!(await pay(M(300)))) return; log(`Mudei meu nome para ${v.f} ${v.l}.`); p.first = v.f; p.last = v.l || p.last; } },
      { ic: '⚧️', t: 'Transição de gênero', sub: p.g === 'M' ? 'Masculino → Feminino' : 'Feminino → Masculino', fn: async () => { if (!(await UI.confirm('Transição', 'Iniciar a transição de gênero?'))) return; if (!(await pay(M(20000)))) return; p.g = p.g === 'M' ? 'F' : 'M'; ch('hap', 15); log(`Concluí minha transição de gênero. 🏳️‍⚧️`, 'good'); for (const n of alive('mae', 'pai', 'irmao', 'avo')) chR(n, R.ch(.7) ? 5 : -20); if (p.job) p.job.t = gt(p.job.ranks[p.job.rank], p.g); } },
      { ic: '🏳️‍🌈', t: 'Orientação sexual', sub: p.out ? Love.sexName() : 'Não assumida', fn: () => Love.comeOut() }
    ] };
  }
};

// ---------- Caça ao tesouro ----------
const Hunt = {
  find(act) {
    if (!G.meta) return; const h = HUNT.find(x => x.act === act); if (!h || G.meta.hunt.includes(h.id)) return;
    if (!R.ch(.18)) return;
    G.meta.hunt.push(h.id); log(`🔎 Encontrei uma relíquia escondida: ${h.n}! (${G.meta.hunt.length}/${HUNT.length})`, 'magic');
    UI.toast(`Relíquia encontrada: ${h.n}!`);
    if (G.meta.hunt.length >= HUNT.length) Meta.ach('reliquias');
    Meta.save();
  }
};
