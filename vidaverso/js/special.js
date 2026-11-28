'use strict';
// ===== Carreiras especiais =====
function fame(d) { const p = P(); p.fame = clamp(p.fame + d); if (p.fame >= 80) Meta.ach('famoso'); }

const Special = {
  menu() {
    const p = P(); const sp = p.sp;
    const row = (ic, t, on, sub, fn, dis) => ({ ic, t, sub: on ? '✅ ' + on : sub, fn, dis });
    const items = [
      row('🎭', 'Ator / Atriz', sp.actor && `${sp.actor.roles.length} papéis • fama ${p.fame}%`, 'Testes, papéis e prêmios', () => UI.open(() => Actor.menu())),
      row('🎤', 'Música', sp.music && `${sp.music.band || 'Solo'} • ${sp.music.fans.toLocaleString('pt-BR')} fãs`, 'Solo ou banda, álbuns e turnês', () => UI.open(() => Music.menu())),
      row('🏛️', 'Política', sp.pol && (sp.pol.office >= 0 && sp.pol.inOffice ? gt(POL_OFFICES[sp.pol.office].n, p.g) : 'Candidato(a)'), 'Eleições, mandatos e projetos', () => UI.open(() => Politics.menu())),
      row('🏟️', 'Atleta profissional', sp.athlete && `${sp.athlete.sport} • ${sp.athlete.team}`, 'Draft, temporadas e títulos', () => UI.open(() => Athlete.menu())),
      row('🥊', 'Lutador(a)', sp.fighter && `${sp.fighter.w}V ${sp.fighter.l}D`, 'Ruas, liga e cinturão', () => UI.open(() => Fighter.menu())),
      row('🏢', 'Empresário(a)', sp.biz?.length && `${sp.biz.length} empresa(s)`, 'Abra ou compre empresas', () => UI.open(() => Biz.menu())),
      row('🎬', 'Diretor(a) de cinema', sp.dir && `${sp.dir.films.length} filme(s)`, 'Produza filmes e vá a festivais', () => UI.open(() => Director.menu())),
      row('📸', 'Modelo', sp.model && `Nível ${sp.model.lvl}`, 'Desfiles e campanhas', () => UI.open(() => Model.menu())),
      row('📱', 'Influenciador(a)', Object.keys(p.social).length && `${Social.total().toLocaleString('pt-BR')} seguidores`, 'Redes sociais e publis', () => UI.open(() => Social.menu())),
      row('🎩', 'Crime organizado', sp.mafia && `${gt(MAFIA_RANKS[sp.mafia.rank], p.g)} • ${sp.mafia.fam}`, 'Famílias do submundo', () => UI.open(() => Mafia.menu())),
      row('🛹', 'Ambulante / Artista de rua', null, 'Ganhe a vida na rua', () => UI.open(() => Hustler.menu()))
    ];
    if (p.fame >= 20) items.unshift({ ic: '🌟', t: 'Vida de celebridade', sub: `Fama ${p.fame}%`, fn: () => UI.open(() => this.fameMenu()) });
    if (p.royal) items.unshift({ ic: '👑', t: 'Realeza', sub: `${p.royal.title} • respeito ${p.royal.respect}%`, fn: () => UI.open(() => Super.royalMenu()) });
    return { title: 'Carreiras especiais', items };
  },
  async tick() {
    const p = P();
    for (const f of [Actor, Music, Politics, Athlete, Fighter, Biz, Director, Model, Mafia]) { try { await f.tick?.(); } catch (e) { console.error(e); } }
    if (p.fame > 0 && !p.sp.actor && !p.sp.music && !p.sp.athlete && !(p.sp.pol?.inOffice)) fame(-R.int(1, 4));
    if (p.fame >= 50 && R.ch(.15)) log(R.pick(['Paparazzi me seguiram o ano todo. 📸', 'Uma revista de fofoca falou de mim.', 'Fui reconhecido(a) na rua por fãs.']));
  },
  fameMenu() {
    const p = P();
    const act = (ic, t, sub, f) => ({ ic, t, sub, fn: f });
    return { title: 'Vida de celebridade', head: `<p class="muted">Fama ${p.fame}% — use-a para ganhar dinheiro e influência.</p>`, items: [
      act('🎙️', 'Dar uma entrevista', '', async () => { if (!lim('entrevista')) return UI.alert('Entrevista', 'Você já deu entrevistas este ano.'); const good = R.ch(.7); fame(good ? 3 : -4); return UI.alert('Entrevista', good ? 'A entrevista viralizou positivamente!' : 'Você falou uma besteira que pegou mal.', '🎙️'); }),
      act('📺', 'Participar de um talk show', '', async () => { if (!lim('talkshow')) return UI.alert('Talk show', 'Já foi este ano.'); const v = M(R.int(5, 50) * 1000 * (p.fame / 30)); cash(v); fame(3); return UI.alert('Talk show', `Você arrasou no programa e recebeu ${fmt(v)}.`, '📺'); }),
      act('📢', 'Fazer um comercial', '', async () => { if (!lim('comercial')) return UI.alert('Comercial', 'Seu contrato de exclusividade impede outro este ano.'); const brand = R.pick(['refrigerante', 'carro', 'perfume', 'banco', 'fast-food', 'tênis', 'celular']); const v = M(Math.round(p.fame * p.fame * R.int(20, 80))); cash(v); log(`Fiz um comercial de ${brand} por ${fmt(v)}.`); return UI.alert('Comercial', `Comercial de ${brand}: ${fmt(v)}!`, '📢'); }),
      act('🧴', 'Lançar linha de produtos', 'Perfume, roupas, maquiagem', async () => { if (p.fame < 50) return UI.alert('Produtos', 'Você precisa de 50% de fama.'); if (!lim('linha')) return UI.alert('Produtos', 'Uma linha por ano.'); const t = await UI.choose('Produto', 'Lançar o quê?', ['Perfume', 'Linha de roupas', 'Maquiagem', 'Tênis', 'Bebida energética'].map(x => ({ t: x, v: x }))); if (!t) return; const ok = R.ch(.6); const v = ok ? M(R.int(100, 3000) * 1000 * p.fame / 50) : -M(R.int(20, 200) * 1000); cash(v); log(`Lancei ${t.toLowerCase()} com meu nome. ${ok ? 'Sucesso!' : 'Fracasso.'}`); return UI.alert(t, ok ? `Sucesso de vendas! Lucro ${fmt(v)}.` : `Encalhou. Prejuízo ${fmt(-v)}.`, '🧴'); }),
      act('📖', 'Escrever autobiografia', '', () => Books.write(true)),
      act('🤳', 'Encontrar fãs', '', async () => { if (!lim('fas')) return UI.alert('Fãs', 'Já fez sessão de fotos este ano.'); fame(2); ch('hap', 4); if (R.ch(.1)) { const f = mkNPC({ role: 'fa', age: R.int(18, 50), rel: 90 }); log(`Um(a) fã obsessivo(a), ${fname(f)}, começou a me perseguir.`, 'bad'); return UI.alert('Fã obsessivo', `${f.first} não para de te seguir... 😰`, '😰'); } return UI.alert('Fãs', 'Você tirou centenas de selfies e deu autógrafos!', '🤳'); }),
      act('⚖️', 'Processar um tabloide', '', async () => { if (!lim('tabloide')) return UI.alert('Processo', 'Já processou este ano.'); if (!(await pay(M(20000), 'o advogado'))) return; if (R.ch(.45)) { const v = M(R.int(50, 1500) * 1000); cash(v); return UI.alert('Vitória', `Você ganhou ${fmt(v)} de indenização!`, '⚖️'); } return UI.alert('Derrota', 'O juiz deu razão ao tabloide.', '⚖️'); }),
      act('🕶️', 'Contratar seguranças', fmt(M(80000)) + '/ano', async () => { if (p.flags?.seg) return; if (!(await pay(M(80000)))) return; G.s.flags.security = G.s.year; return UI.alert('Seguranças', 'Agora você tem guarda-costas. Mais difícil ser atacado(a).', '🕶️'); }),
      act('🤲', 'Fazer caridade em público', '', async () => { const v = M(10000); if (!(await pay(v))) return; fame(2); karma(4); p.donated += v; return UI.alert('Caridade', 'A imprensa elogiou sua generosidade.', '🤲'); })
    ] };
  }
};

// ---------- Livros ----------
const Books = {
  async write(auto = false) {
    const p = P();
    if (p.age < 12) return UI.alert('Livro', 'Você ainda é muito novo(a).');
    if (!lim('livro')) return UI.alert('Livro', 'Escrever um livro leva tempo! Um por ano.');
    const genre = auto ? 'Autobiografia' : await UI.choose('Escrever livro', 'Qual gênero?', ['Romance', 'Fantasia', 'Suspense', 'Terror', 'Autoajuda', 'Infantil', 'Ficção científica', 'Poesia', 'Biografia', 'Culinária'].map(t => ({ t, v: t })));
    if (!genre) return;
    const v = await UI.prompt('Título', [{ k: 't', label: 'Título do livro', type: 'text', value: R.pick(['O Último Verão', 'Sombras de Ontem', 'Coração de Vidro', 'A Casa no Fim da Rua', 'Minha Vida', 'Estrelas Caídas', 'O Segredo do Farol']) }]);
    if (!v) return;
    const q = clamp(Math.round(p.smr * .6 + R.int(0, 40) + (auto ? p.fame * .3 : 0)));
    const sales = Math.round(Math.pow(q / 100, 3) * R.int(1000, 2000000) * (auto ? 1 + p.fame / 30 : 1));
    const roy = M(Math.round(sales * 2 / 4));
    p.books.push({ t: v.t, g: genre, sales, roy, yrs: 4 });
    const best = sales > 500000;
    if (best) { cnt('bestseller'); Meta.ach('livro'); fame(10); }
    log(`Publiquei o livro "${v.t}" (${genre}). Vendeu ${sales.toLocaleString('pt-BR')} cópias${best ? ' — BEST-SELLER! 📚' : '.'}`, best ? 'good' : '');
    return UI.alert(v.t, `Nota da crítica: ${q}/100\nCópias vendidas: ${sales.toLocaleString('pt-BR')}\nRoyalties: ${fmt(roy)}/ano por 4 anos.`, '📖');
  }
};

// ---------- Ator ----------
const Actor = {
  menu() {
    const p = P(), a = p.sp.actor;
    if (!a) return { title: 'Atuação', items: [{ ic: '🎭', t: 'Começar carreira de ator/atriz', sub: 'A partir de 10 anos', fn: async () => { if (p.age < 10) return UI.alert('Atuação', 'Muito novo(a).'); p.sp.actor = { skill: p.talent === 'arte' ? 30 : R.int(5, 20), roles: [], awards: 0, agent: false }; log('Decidi tentar a carreira de atuação. 🎭'); } }] };
    return { title: 'Atuação', head: `<div class="npchead"><div class="muted">${a.roles.length} papéis • ${a.awards} prêmio(s) • ${a.agent ? 'Com agente' : 'Sem agente'}</div><div class="mini"><span>Talento</span><div class="mbar"><i style="width:${a.skill}%"></i></div></div><div class="mini"><span>Fama</span><div class="mbar"><i style="width:${p.fame}%"></i></div></div></div>`, items: [
      { ic: '🎓', t: 'Aulas de interpretação', sub: fmt(M(800)), fn: async () => { if (!lim('aulaAtor', 2)) return UI.alert('Aulas', 'Já fez aulas suficientes.'); if (!(await pay(M(800)))) return; a.skill = clamp(a.skill + R.int(3, 8) + (p.talent === 'arte' ? 3 : 0)); return UI.alert('Aulas', 'Você melhorou sua técnica!', '🎭'); } },
      { ic: '🎬', t: 'Fazer testes de elenco', sub: 'Até 2 por ano', fn: () => this.auditions() },
      { ic: '🤝', t: a.agent ? 'Demitir agente' : 'Contratar agente', sub: 'Leva 10% dos cachês', fn: async () => { a.agent = !a.agent; return UI.alert('Agente', a.agent ? 'Um agente agora busca papéis melhores para você.' : 'Você demitiu seu agente.'); } },
      { ic: '🚪', t: 'Largar a atuação', cls: 'danger', fn: async () => { if (await UI.confirm('Atuação', 'Desistir da carreira?')) { p.sp.actor = null; UI.back(); } } }
    ] };
  },
  async auditions() {
    const p = P(), a = p.sp.actor;
    if (used('teste') >= 2) return UI.alert('Testes', 'Você já fez 2 testes este ano.');
    const types = [['Comercial', 1], ['Peça de teatro', 1.5], ['Série', 3], ['Filme', 5], ['Novela', 2.5]];
    const sizes = [['Figurante', 0, .1], ['Coadjuvante', .2, .5], ['Protagonista', .45, 1]];
    const opts = Array.from({ length: 3 }, () => { const [t, m] = R.pick(types); const [sz, diff, fm] = R.pick(sizes); return { t: `${sz} em ${t.toLowerCase()} de ${R.pick(FILM_GENRES).toLowerCase()}`, pay: M(Math.round(m * (1 + fm * 9) * R.int(2, 8) * 1000 * (1 + p.fame / 20))), diff, sz, fm, type: t }; });
    const o = await UI.choose('Testes de elenco', 'Escolha um papel para tentar:', opts.map(x => ({ t: x.t, sub: fmt(x.pay), v: x })));
    if (!o) return; lim('teste', 2);
    const chance = .55 + a.skill / 250 + p.loo / 400 + p.fame / 300 + (a.agent ? .1 : 0) - o.diff;
    if (!R.ch(chance)) { a.skill = clamp(a.skill + 1); return UI.alert('Não passou', 'O diretor escolheu outra pessoa.', '🎭'); }
    const net = Math.round(o.pay * (a.agent ? .9 : 1)); cash(net);
    const rating = clamp(Math.round(a.skill * .6 + R.int(0, 45)));
    a.roles.push({ t: o.t, y: G.s.year, rating, sz: o.sz }); a.skill = clamp(a.skill + 2); fame(Math.round(o.fm * 12 + 1));
    if (o.sz === 'Protagonista') { cnt('protagonista'); Meta.ach('ator'); }
    a.last = { rating, sz: o.sz, y: G.s.year };
    log(`Consegui o papel: ${o.t}. Cachê ${fmt(net)}. Crítica: ${rating}/100.`, 'good');
    return UI.alert('Você conseguiu!', `${o.t}\nCachê: ${fmt(net)}\nCrítica: ${rating}/100`, '🎬');
  },
  tick() {
    const p = P(), a = p.sp.actor; if (!a) return;
    if (a.last && a.last.y === G.s.year - 1 && a.last.sz !== 'Figurante' && a.last.rating >= 85 && R.ch(.4)) {
      a.awards++; cnt('estatueta'); Meta.ach('estatueta'); fame(15);
      log(`Ganhei a Estatueta Dourada de ${a.last.sz === 'Protagonista' ? 'melhor atuação' : 'melhor coadjuvante'}! 🏆`, 'good');
    }
    if (a.roles.length && G.s.year - a.roles[a.roles.length - 1].y > 3) fame(-3);
  }
};

// ---------- Música ----------
const Music = {
  menu() {
    const p = P(), m = p.sp.music;
    const instrItems = [{ ic: '🎹', t: 'Aprender/praticar instrumento', sub: Object.entries(p.instr).map(([k, v]) => `${k} ${v}%`).join(', ') || 'Nenhum', fn: () => Activities.instrMenu() }];
    if (!m) return { title: 'Música', items: [...instrItems, { ic: '🎤', t: 'Começar carreira musical', sub: 'Solo ou banda', fn: () => this.start() }] };
    return { title: m.band || 'Carreira solo', head: `<div class="npchead"><div class="muted">${m.genre} • ${m.fans.toLocaleString('pt-BR')} fãs • ${m.albums.length} álbum(ns)${m.label ? ' • Gravadora ' + esc(m.label) : ''}</div><div class="mini"><span>Habilidade</span><div class="mbar"><i style="width:${m.skill}%"></i></div></div></div>`, items: [
      ...instrItems,
      { ic: '🎙️', t: 'Ensaiar / aulas de canto', fn: async () => { if (!lim('ensaio', 3)) return UI.alert('Ensaio', 'Já ensaiou demais.'); m.skill = clamp(m.skill + R.int(2, 6) + (p.talent === 'musica' ? 3 : 0)); return UI.alert('Ensaio', 'Você está soando melhor! 🎶'); } },
      { ic: '💿', t: 'Lançar um single', fn: () => this.release(false) },
      { ic: '📀', t: 'Gravar um álbum', sub: 'Um por ano', fn: () => this.release(true) },
      { ic: '🎟️', t: 'Fazer um show / turnê', fn: () => this.tour() },
      ...(m.fans >= 5000 && !m.label ? [{ ic: '✍️', t: 'Assinar com gravadora', sub: 'Mais alcance, menos lucro', fn: async () => { const l = R.pick(['Selo Estrela', 'Onda Records', 'Vinil Dourado', 'Pulso Music']); if (!(await UI.confirm('Gravadora', `A ${l} quer te contratar. Eles ficam com 60% das vendas, mas multiplicam o alcance. Aceitar?`))) return; m.label = l; log(`Assinei com a gravadora ${l}.`, 'good'); } }] : []),
      ...(m.label ? [{ ic: '✂️', t: 'Romper com a gravadora', fn: () => { m.label = null; log('Saí da minha gravadora.'); } }] : []),
      { ic: '🚪', t: 'Encerrar carreira musical', cls: 'danger', fn: async () => { if (await UI.confirm('Música', 'Encerrar a carreira?')) { p.sp.music = null; UI.back(); } } }
    ] };
  },
  async start() {
    const p = P(); if (p.age < 10) return UI.alert('Música', 'Muito novo(a).');
    const mode = await UI.choose('Carreira musical', 'Como você quer começar?', [{ t: 'Carreira solo', v: 'solo' }, { t: 'Formar uma banda', v: 'banda' }]); if (!mode) return;
    const genre = await UI.choose('Gênero', 'Qual estilo?', MUSIC_GENRES.map(g => ({ t: g, v: g }))); if (!genre) return;
    let band = null;
    if (mode === 'banda') { const v = await UI.prompt('Nome da banda', [{ k: 'n', label: 'Nome', type: 'text', value: R.pick(['Os Inquietos', 'Neon Fantasma', 'Vento Norte', 'Garagem 77', 'Lua de Lata']) }]); if (!v) return; band = v.n; }
    const best = Math.max(0, ...Object.values(p.instr));
    p.sp.music = { skill: clamp(Math.round(best * .6 + (p.talent === 'musica' ? 25 : 5))), genre, band, fans: R.int(5, 100), albums: [], label: null };
    log(`Comecei minha carreira musical${band ? ' com a banda ' + band : ''} (${genre}). 🎤`, 'good');
  },
  async release(album) {
    const p = P(), m = p.sp.music;
    if (album && !lim('album')) return UI.alert('Álbum', 'Um álbum por ano.');
    if (!album && !lim('single', 2)) return UI.alert('Single', 'Já lançou singles demais este ano.');
    if (album && m.skill < 20) return UI.alert('Álbum', 'Você precisa de pelo menos 20% de habilidade.');
    const v = await UI.prompt(album ? 'Novo álbum' : 'Novo single', [{ k: 't', label: 'Título', type: 'text', value: R.pick(['Céu Elétrico', 'Madrugada', 'Fogo e Gelo', 'Saudade Digital', 'Nós Dois', 'Rebelde', 'Horizonte']) }]);
    if (!v) return;
    const q = clamp(Math.round(m.skill * .7 + R.int(0, 35)));
    const reach = (m.fans + 500) * (m.label ? 4 : 1) * (1 + p.fame / 25);
    const sales = Math.round(reach * Math.pow(q / 60, 2.2) * R.int(50, 250) / 100 * (album ? 1 : .4));
    const earn = M(Math.round(sales * (album ? 1.5 : .3) * (m.label ? .4 : 1)));
    cash(earn); m.fans += Math.round(sales / (album ? 8 : 15)); fame(Math.min(15, Math.round(Math.log10(sales + 1) * (album ? 1.5 : .8))));
    let cert = '';
    if (album) { cert = sales >= 1e7 ? 'Diamante 💎' : sales >= 1e6 ? 'Platina 💿' : sales >= 5e5 ? 'Ouro 📀' : ''; m.albums.push({ t: v.t, q, sales, cert, y: G.s.year }); if (sales >= 1e6) { cnt('platina'); Meta.ach('platina'); } }
    m.skill = clamp(m.skill + 1);
    log(`Lancei ${album ? 'o álbum' : 'o single'} "${v.t}": ${sales.toLocaleString('pt-BR')} vendas${cert ? ' — ' + cert : ''}. Ganhei ${fmt(earn)}.`, 'good');
    return UI.alert(v.t, `Crítica: ${q}/100\nVendas: ${sales.toLocaleString('pt-BR')}\n${cert ? 'Certificado ' + cert + '\n' : ''}Lucro: ${fmt(earn)}`, '💿');
  },
  async tour() {
    const p = P(), m = p.sp.music;
    if (!lim('turne')) return UI.alert('Turnê', 'Uma turnê por ano.');
    const opts = [{ t: 'Show num bar', v: 0 }, { t: 'Turnê regional', sub: '1.000+ fãs', v: 1 }, { t: 'Turnê nacional', sub: '50.000+ fãs', v: 2 }, { t: 'Turnê mundial', sub: '1.000.000+ fãs', v: 3 }];
    const t = await UI.choose('Shows', 'Que tamanho?', opts); if (t === null) return;
    const need = [0, 1000, 50000, 1e6][t];
    if (m.fans < need) return UI.alert('Shows', 'Você não tem fãs suficientes para isso.');
    const earn = M(Math.round([300, 20000, 600000, 15000000][t] * R.int(50, 150) / 100 * (1 + m.skill / 100)));
    cash(earn); m.fans = Math.round(m.fans * (1 + R.int(2, 15) / 100)); fame(t * 2); ch('hea', -t); if (t === 3) cnt('turneMundial');
    log(`${opts[t].t}: faturei ${fmt(earn)}. 🎟️`, 'good');
    return UI.alert('Show!', `Público lotado! Lucro: ${fmt(earn)}`, '🎟️');
  },
  tick() {
    const p = P(), m = p.sp.music; if (!m) return;
    const last = m.albums[m.albums.length - 1];
    if (last && last.y === G.s.year - 1 && last.q >= 85 && R.ch(.35)) { fame(10); m.fans = Math.round(m.fans * 1.3); log(`"${last.t}" ganhou o Prêmio Gramofone de álbum do ano! 🏆`, 'good'); cnt('gramofone'); }
    m.fans = Math.max(0, Math.round(m.fans * (1 - R.int(0, 6) / 100)));
    if (m.band && R.ch(.04)) { log(`A banda ${m.band} se separou por brigas internas.`, 'bad'); m.band = null; }
  }
};

// ---------- Política ----------
const Politics = {
  menu() {
    const p = P(), pol = p.sp.pol, c = C();
    if (c.noElect) return { title: 'Política', items: [{ ic: '🚫', t: `Não há eleições livres em ${c.n}`, sub: 'Emigre para seguir carreira política', dis: true }] };
    if (!pol) return { title: 'Política', items: [{ ic: '🗳️', t: 'Filiar-se a um partido', sub: 'A partir de 18 anos', fn: async () => {
      if (p.age < 18) return UI.alert('Política', 'Você precisa ter 18 anos.');
      const party = await UI.choose('Partido', 'Escolha um partido:', PARTIES.map(t => ({ t, v: t }))); if (!party) return;
      p.sp.pol = { office: -1, inOffice: false, term: 0, approval: 50, party, terms: {} }; log(`Me filiei ao ${party}.`);
    } }] };
    const items = [];
    if (pol.inOffice) {
      const off = POL_OFFICES[pol.office];
      items.push({ ic: '📜', t: 'Propor um projeto de lei', fn: () => this.policy() });
      items.push({ ic: '🎤', t: 'Fazer um discurso', fn: async () => { if (!lim('discurso', 2)) return UI.alert('Discurso', 'Já discursou bastante.'); const d = R.int(-6, 10) + (p.talent === 'carisma' ? 4 : 0); pol.approval = clamp(pol.approval + d); return UI.alert('Discurso', d > 0 ? 'O discurso foi aplaudido!' : 'O discurso foi vaiado.', '🎤'); } });
      items.push({ ic: '✈️', t: 'Viagem oficial', fn: async () => { if (!lim('viagemOficial')) return UI.alert('Viagem', 'Uma por ano.'); pol.approval = clamp(pol.approval + R.int(-4, 6)); ch('hap', 4); return UI.alert('Viagem oficial', 'Você posou para fotos com líderes estrangeiros.', '✈️'); } });
      items.push({ ic: '💼', t: 'Aceitar propina', cls: 'danger', fn: async () => { if (!lim('propina')) return UI.alert('Propina', 'Melhor não abusar.'); const v = M(R.int(10, 500) * 1000 * (pol.office + 1)); cash(v); karma(-8); log(`Aceitei uma propina de ${fmt(v)}.`); if (R.ch(.2)) { pol.approval = clamp(pol.approval - 30); log('Um escândalo de corrupção estourou!', 'bad'); if (R.ch(.4)) { pol.inOffice = false; await UI.alert('Escândalo', 'Você foi cassado(a) e preso(a)!', '🚨'); return Crime.arrest('Corrupção', [2, 10]); } return UI.alert('Escândalo!', 'A imprensa descobriu. Sua aprovação despencou.', '📰'); } return UI.alert('Propina', `Você embolsou ${fmt(v)} sem ninguém saber.`, '🤫'); } });
      items.push({ ic: '🚪', t: 'Renunciar', cls: 'danger', fn: async () => { if (!(await UI.confirm('Renunciar', 'Renunciar ao cargo?'))) return; pol.inOffice = false; log(`Renunciei ao cargo de ${gt(off.n, p.g)}.`); } });
    }
    const next = pol.inOffice ? pol.office + 1 : Math.max(0, pol.office);
    if (next < POL_OFFICES.length && !(pol.inOffice && pol.term > 1)) {
      const off = POL_OFFICES[next];
      items.push({ ic: '🗳️', t: `Concorrer a ${gt(off.n, p.g)}`, sub: `Campanha ~${fmt(M(off.cost))} • idade ${off.age}+`, fn: () => this.run(next) });
    }
    if (pol.office >= 0 && !pol.inOffice && pol.office < POL_OFFICES.length) items.push({ ic: '🔁', t: `Concorrer de novo a ${gt(POL_OFFICES[pol.office].n, p.g)}`, fn: () => this.run(pol.office) });
    items.push({ ic: '🎗️', t: 'Trocar de partido', sub: pol.party, fn: async () => { const party = await UI.choose('Partido', 'Novo partido:', PARTIES.map(t => ({ t, v: t }))); if (party) { pol.party = party; pol.approval = clamp(pol.approval - 5); } } });
    return { title: 'Política', head: `<div class="npchead"><div class="muted">${esc(pol.party)} • ${pol.inOffice ? gt(POL_OFFICES[pol.office].n, p.g) + ` (${pol.term} ano(s) restantes)` : 'Fora do cargo'}</div><div class="mini"><span>Aprovação</span><div class="mbar"><i style="width:${pol.approval}%"></i></div></div></div>`, items };
  },
  async run(idx) {
    const p = P(), pol = p.sp.pol, off = POL_OFFICES[idx];
    if (p.age < off.age) return UI.alert('Eleição', `Idade mínima: ${off.age} anos.`);
    if (p.record.some(r => r.y >= 2)) return UI.alert('Eleição', 'Ficha suja: candidatura impugnada.', '🚫');
    if (idx === 5 && (pol.terms[5] || 0) >= 2) return UI.alert('Eleição', 'Limite de 2 mandatos presidenciais.');
    if (!lim('eleicao')) return UI.alert('Eleição', 'Só uma campanha por ano.');
    if (idx >= 3 && !hasDeg('uni') && R.ch(.5)) return UI.alert('Eleição', 'O partido preferiu um(a) candidato(a) com diploma.');
    let score = (pol.inOffice ? pol.approval - 50 : 0) / 4 + (p.talent === 'carisma' ? 6 : 0) + p.fame / 10 + (p.loo - 50) / 15;
    const budget = await UI.choose('Campanha', `Quanto investir na campanha para ${gt(off.n, p.g)}?`, [
      { t: 'Campanha humilde', sub: fmt(M(off.cost * .3)), v: .3 }, { t: 'Campanha normal', sub: fmt(M(off.cost)), v: 1 }, { t: 'Campanha milionária', sub: fmt(M(off.cost * 3)), v: 3 }]);
    if (!budget) return;
    if (!(await pay(M(off.cost * budget), 'a campanha'))) return;
    score += Math.log2(budget + .5) * 5;
    const deb = await UI.choose('Debate', 'No debate, o adversário te ataca. Você:', [{ t: 'Responde com dados', v: p.smr > 60 ? 8 : 2 }, { t: 'Ataca de volta', v: R.int(-6, 9) }, { t: 'Faz uma piada', v: R.int(-4, 7) }, { t: 'Muda de assunto', v: -3 }]);
    score += deb || 0;
    const ral = await UI.choose('Comício', 'Seu foco principal:', [{ t: 'Economia', v: R.int(0, 6) }, { t: 'Segurança', v: R.int(0, 6) }, { t: 'Saúde e educação', v: R.int(0, 6) }, { t: 'Promessas impossíveis', v: R.int(-5, 10) }]);
    score += ral || 0;
    const pct = clamp(Math.round(46 + score + R.int(-10, 10)), 3, 97);
    if (pct > 50) {
      pol.office = idx; pol.inOffice = true; pol.term = off.term; pol.approval = clamp(50 + R.int(0, 15)); pol.terms[idx] = (pol.terms[idx] || 0) + 1;
      cnt('eleito' + idx); fame(idx * 4 + 3); if (idx === 5) Meta.ach('presidente');
      log(`Fui eleito(a) ${gt(off.n, p.g)} com ${pct}% dos votos! 🗳️`, 'good');
      return UI.alert('Eleito(a)!', `Vitória com ${pct}% dos votos! Você é ${gt(off.n, p.g)}.`, '🎉');
    }
    log(`Perdi a eleição para ${gt(off.n, p.g)} com ${pct}% dos votos.`, 'bad');
    return UI.alert('Derrota', `Você teve ${pct}% dos votos e perdeu.`, '🗳️');
  },
  async policy() {
    const pol = P().sp.pol;
    if (!lim('lei', 2)) return UI.alert('Projeto', 'Você já propôs projetos demais este ano.');
    const pol2 = await UI.choose('Projeto de lei', 'Qual proposta?', R.sample(POLICIES, 4).map(t => ({ t, v: t }))); if (!pol2) return;
    const passed = R.ch(.3 + pol.approval / 200 + pol.office * .05);
    if (passed) { const d = R.int(-5, 12); pol.approval = clamp(pol.approval + d); log(`Aprovei o projeto "${pol2}".`); return UI.alert('Aprovado!', `"${pol2}" virou lei. Aprovação ${d >= 0 ? '+' : ''}${d}%.`, '📜'); }
    pol.approval = clamp(pol.approval - 3); return UI.alert('Rejeitado', `"${pol2}" foi rejeitado pelos parlamentares.`, '📜');
  },
  tick() {
    const p = P(), pol = p.sp.pol; if (!pol || !pol.inOffice) return;
    const off = POL_OFFICES[pol.office];
    cash(Math.round(M([20000, 90000, 150000, 180000, 200000, 400000][pol.office]) * (1 - C().tax)));
    pol.approval = clamp(pol.approval + R.int(-7, 5)); pol.term--;
    if (pol.approval < 10 && R.ch(.3)) { pol.inOffice = false; log(`Sofri impeachment do cargo de ${gt(off.n, p.g)}! 📉`, 'bad'); return; }
    if (pol.term <= 0) { pol.inOffice = false; log(`Meu mandato como ${gt(off.n, p.g)} terminou.`); }
  }
};

// ---------- Atleta ----------
const Athlete = {
  menu() {
    const p = P(), a = p.sp.athlete;
    if (!a) return { title: 'Esporte profissional', items: PRO_SPORTS.map(s => ({ ic: '🏟️', t: `Tentar o draft de ${s.n}`, sub: 'Idade 17-28 • atletismo alto', fn: () => this.draft(s) })) };
    if (a.retired) return { title: 'Esporte', items: [{ ic: '🏅', t: `Aposentado(a) do ${a.sport}`, sub: `${a.seasons} temporadas • ${a.titles} títulos`, dis: true }] };
    return { title: `${a.sport} — ${a.team}`, head: `<div class="npchead"><div class="muted">${a.pos} • ${a.seasons} temporada(s) • ${a.titles} título(s) • ${fmt(a.sal)}/ano</div><div class="mini"><span>Atletismo</span><div class="mbar"><i style="width:${p.ath}%"></i></div></div><div class="mini"><span>Moral com o time</span><div class="mbar"><i style="width:${a.morale}%"></i></div></div></div>`, items: [
      { ic: '🏋️', t: 'Treinar pesado', fn: async () => { if (!lim('treinoPro', 3)) return UI.alert('Treino', 'Seu corpo pede descanso.'); ch('ath', R.int(1, 3) + (p.talent === 'esporte' ? 1 : 0)); a.morale = clamp(a.morale + 2); if (R.ch(.05)) { ch('hea', -15); return UI.alert('Lesão', 'Você se lesionou no treino!', '🤕'); } return UI.alert('Treino', 'Você está voando! 💪'); } },
      { ic: '✍️', t: 'Renegociar contrato', fn: async () => { if (!lim('contrato')) return UI.alert('Contrato', 'Uma negociação por ano.'); if (R.ch(.3 + a.morale / 200)) { a.sal = Math.round(a.sal * R.int(115, 160) / 100); log(`Renovei contrato: ${fmt(a.sal)}/ano.`, 'good'); return UI.alert('Contrato', `Novo salário: ${fmt(a.sal)}/ano!`, '✍️'); } a.morale = clamp(a.morale - 10); return UI.alert('Contrato', 'A diretoria recusou.', '😤'); } },
      { ic: '🔁', t: 'Pedir transferência', fn: async () => { const s = PRO_SPORTS.find(x => x.n === a.sport); const t = R.pick(s.teams.filter(x => x !== a.team)); if (R.ch(.6)) { a.team = t; a.morale = 60; log(`Fui transferido(a) para o ${t}.`); return UI.alert('Transferência', `Agora você joga no ${t}!`); } return UI.alert('Transferência', 'Nenhum time fez proposta.'); } },
      { ic: '🎙️', t: 'Dar entrevista', fn: async () => { if (!lim('entrevistaPro')) return UI.alert('Entrevista', 'Já deu entrevista.'); fame(R.int(-2, 5)); return UI.alert('Entrevista', 'Você falou com a imprensa após o jogo.'); } },
      { ic: '🏁', t: 'Aposentar-se', cls: 'danger', fn: async () => { if (!(await UI.confirm('Aposentar', 'Encerrar a carreira?'))) return; a.retired = true; log(`Me aposentei do ${a.sport} após ${a.seasons} temporadas.`); } }
    ] };
  },
  async draft(s) {
    const p = P();
    if (p.age < 17 || p.age > 28) return UI.alert('Draft', 'O draft aceita atletas de 17 a 28 anos.');
    if (!lim('draft')) return UI.alert('Draft', 'Só uma tentativa por ano.');
    const chance = (p.ath - 50) / 60 + (p.edu.sport ? .15 : 0) + (p.talent === 'esporte' ? .15 : 0);
    if (!R.ch(clamp(chance * 100, 2, 90) / 100)) return UI.alert('Draft', 'Nenhum time te escolheu. Treine mais!', '😓');
    const team = R.pick(s.teams), pos = R.pick(s.pos);
    if (p.job) Career.quit(true);
    p.sp.athlete = { sport: s.n, team, pos, sal: M(R.int(80, 2000) * 1000), seasons: 0, titles: 0, morale: 60, retired: false };
    cnt('pro'); Meta.ach('atleta'); fame(10);
    log(`Fui draftado(a) pelo ${team} como ${pos} de ${s.n}! 🏟️`, 'good');
    return UI.alert('Draftado(a)!', `O ${team} te escolheu! Salário: ${fmt(p.sp.athlete.sal)}/ano.`, '🏟️');
  },
  tick() {
    const p = P(), a = p.sp.athlete; if (!a || a.retired) return;
    a.seasons++; cash(Math.round(a.sal * (1 - C().tax)));
    const perf = clamp(Math.round(p.ath * .7 + R.int(0, 35) + a.morale / 10 - Math.max(0, p.age - 32) * 3));
    const stat = perf >= 85 ? 'temporada de MVP' : perf >= 65 ? 'ótima temporada' : perf >= 45 ? 'temporada regular' : 'temporada ruim';
    log(`${a.sport}: tive uma ${stat} pelo ${a.team}.`);
    if (perf >= 85) fame(8); else if (perf >= 65) fame(3);
    if (R.ch(perf / 400)) { a.titles++; cnt('titulos'); Meta.ach('campeao'); fame(8); ch('hap', 15); log(`O ${a.team} foi CAMPEÃO! 🏆`, 'good'); }
    if (R.ch(.08)) { ch('hea', -R.int(10, 25)); log('Sofri uma lesão séria durante a temporada. 🤕', 'bad'); }
    if (perf < 35 && R.ch(.35)) { log(`Fui cortado(a) do ${a.team}.`, 'bad'); p.sp.athlete = null; return; }
    if (p.age >= 39) { a.retired = true; log(`Me aposentei do ${a.sport}.`); }
  }
};

// ---------- Lutador ----------
const Fighter = {
  menu() {
    const p = P(), f = p.sp.fighter;
    if (!f) return { title: 'Lutas', items: [{ ic: '🥊', t: 'Começar carreira de lutador(a)', sub: 'Idade 16-35, atletismo 40%+', fn: async () => {
      if (p.age < 16 || p.age > 35) return UI.alert('Lutas', 'Idade entre 16 e 35 anos.'); if (p.ath < 40) return UI.alert('Lutas', 'Melhore seu atletismo primeiro.');
      p.sp.fighter = { w: 0, l: 0, moves: ['Jab', 'Cruzado', 'Chute baixo'], power: R.int(10, 30) + (p.talent === 'lutas' ? 15 : 0), stamina: R.int(10, 30), coach: null, rank: 50, cred: 0, belt: false };
      log('Comecei a treinar para ser lutador(a) profissional. 🥊');
    } }] };
    return { title: 'Carreira de lutador(a)', head: `<div class="npchead"><div class="muted">Cartel ${f.w}V–${f.l}D • Ranking #${f.rank} • ${f.belt ? '🏆 Campeão(ã)' : ''} ${f.coach ? '• Treinador: ' + esc(f.coach) : ''}</div><div class="mini"><span>Força</span><div class="mbar"><i style="width:${f.power}%"></i></div></div><div class="mini"><span>Fôlego</span><div class="mbar"><i style="width:${f.stamina}%"></i></div></div><div class="mini"><span>Moral das ruas</span><div class="mbar"><i style="width:${f.cred}%"></i></div></div></div>`, items: [
      { ic: '🏋️', t: 'Treinar', fn: async () => { if (!lim('treinoLuta', 3)) return UI.alert('Treino', 'Descanse.'); const b = f.coach ? 2 : 0; f.power = clamp(f.power + R.int(1, 4) + b); f.stamina = clamp(f.stamina + R.int(1, 4) + b); ch('ath', 1); return UI.alert('Treino', 'Saco de pancada destruído. 💥'); } },
      { ic: '📖', t: 'Aprender golpe', sub: `${f.moves.length}/${FIGHT_MOVES.length} golpes`, fn: async () => { const opts = FIGHT_MOVES.filter(m => !f.moves.includes(m.n)); if (!opts.length) return UI.alert('Golpes', 'Você conhece todos!'); const m = await UI.choose('Novo golpe', 'Escolha (custa uma aula):', opts.map(x => ({ t: x.n, sub: `Poder ${x.pw} • Fôlego ${x.st} • ${fmt(M(300 * x.pw))}`, v: x }))); if (!m) return; if (!(await pay(M(300 * m.pw)))) return; f.moves.push(m.n); return UI.alert('Golpe aprendido', `Você dominou o ${m.n}!`, '🥋'); } },
      { ic: '🧑‍🏫', t: f.coach ? 'Demitir treinador' : 'Contratar treinador', sub: fmt(M(20000)) + '/ano', fn: async () => { if (f.coach) { f.coach = null; return; } if (!(await pay(M(20000)))) return; f.coach = R.pick(['Mestre Kenji', 'Treinador Rocha', 'Coach Valéria', 'Professor Duarte']); log(`Contratei ${f.coach} como treinador.`); } },
      { ic: '🛣️', t: 'Briga de rua (ilegal)', sub: 'Ganhe moral', fn: () => this.fight('rua') },
      { ic: '🏟️', t: 'Luta na liga', sub: 'Suba no ranking', fn: () => this.fight('liga') },
      ...(f.rank <= 3 ? [{ ic: '🏆', t: 'Disputar o cinturão', fn: () => this.fight('titulo') }] : []),
      { ic: '🗯️', t: 'Provocar um rival', fn: async () => { if (!lim('provocar')) return UI.alert('Provocação', 'Já provocou.'); let r = alive('rival')[0]; if (!r) r = mkNPC({ role: 'rival', age: p.age + R.int(-4, 4), g: p.g, rel: 10 }); chR(r, -10); fame(2); f.cred = clamp(f.cred + 4); return UI.alert('Provocação', `Você provocou ${fname(r)} nas redes. O hype aumentou!`, '🗯️'); } },
      { ic: '🚪', t: 'Aposentar-se das lutas', cls: 'danger', fn: async () => { if (await UI.confirm('Aposentar', 'Pendurar as luvas?')) { log('Pendurei as luvas.'); p.sp.fighter = null; UI.back(); } } }
    ] };
  },
  async fight(kind) {
    const p = P(), f = p.sp.fighter;
    if (!lim('luta', kind === 'rua' ? 3 : 2)) return UI.alert('Luta', 'Você precisa se recuperar das lutas.');
    const opp = { n: `${randFirst(C().lang, p.g)} "${R.pick(['Trovão', 'Martelo', 'Cobra', 'Furacão', 'Muralha', 'Lobo', 'Tanque'])}" ${randLast(C().lang)}`, hp: 100, pw: clamp(30 + (50 - f.rank) / 1.2 + R.int(-10, 15) + (kind === 'titulo' ? 15 : 0)) };
    const res = await Mini.fight(f, opp);
    if (res === null) return;
    if (res) {
      f.w++; cnt('vitoriasLuta');
      if (kind === 'rua') { const v = M(R.int(100, 2000)); cash(v); f.cred = clamp(f.cred + 8); if (R.ch(.15)) { await UI.alert('Polícia!', 'A polícia acabou com a briga.'); return Crime.arrest('Briga de rua', [0, 1]); } return UI.alert('Vitória!', `Você venceu ${opp.n} e ganhou ${fmt(v)}.`, '🥊'); }
      if (kind === 'titulo') { f.belt = true; f.rank = 1; cnt('cinturao'); cnt('titulos'); Meta.ach('lutador'); fame(15); const v = M(R.int(500, 3000) * 1000); cash(v); log(`Conquistei o CINTURÃO! 🏆 (${fmt(v)})`, 'good'); return UI.alert('CAMPEÃO!', `Você é o novo dono do cinturão! Bolsa: ${fmt(v)}`, '🏆'); }
      f.rank = Math.max(1, f.rank - R.int(3, 9)); const v = M(R.int(5, 80) * 1000 * (1 + (50 - f.rank) / 20)); cash(v); fame(3);
      log(`Venci ${opp.n} na liga. Ranking #${f.rank}.`, 'good'); return UI.alert('Vitória!', `Ranking #${f.rank}. Bolsa: ${fmt(v)}`, '🥊');
    }
    f.l++; ch('hea', -R.int(5, 20));
    if (kind === 'titulo' && f.belt) f.belt = false;
    if (kind !== 'rua') f.rank = Math.min(99, f.rank + R.int(2, 6));
    log(`Perdi a luta para ${opp.n}.`, 'bad');
    if (p.hea <= 0) die('ferimentos de uma luta');
    return UI.alert('Derrota', `${opp.n} venceu desta vez.`, '🤕');
  },
  tick() { const f = P().sp.fighter; if (!f) return; if (f.coach) cash(-M(20000)); if (P().age > 38) { f.power = clamp(f.power - 3); f.stamina = clamp(f.stamina - 3); } }
};

// ---------- Empresas ----------
const BIZ_IND = ['Tecnologia', 'Restaurante', 'Moda', 'Construção', 'Varejo', 'Entretenimento', 'Saúde', 'Imobiliária', 'Energia', 'Logística', 'Cosméticos', 'Games'];
const Biz = {
  menu() {
    const p = P(); const list = p.sp.biz || [];
    const items = [
      { ic: '🚀', t: 'Abrir uma empresa', sub: 'A partir de 18 anos', fn: () => this.start() },
      { ic: '🛒', t: 'Comprar uma empresa', sub: 'Aquisição', fn: () => this.acquire() }
    ];
    if (list.length) { items.push({ sep: 'Minhas empresas' }); list.forEach(b => items.push({ ic: '🏢', t: b.name, sub: `${b.ind} • valor ${fmt(b.val, true)} • ${b.emp} func.${b.pub ? ' • Bolsa' : ''}`, fn: () => UI.open(() => this.bizMenu(b)) })); }
    return { title: 'Empresas', items };
  },
  async start() {
    const p = P(); if (p.age < 18) return UI.alert('Empresa', 'Você precisa ter 18 anos.');
    const ind = await UI.choose('Ramo', 'Qual ramo?', BIZ_IND.map(t => ({ t, v: t }))); if (!ind) return;
    const cap = await UI.choose('Capital inicial', 'Quanto investir?', [{ t: 'Pequeno', sub: fmt(M(20000)), v: 20000 }, { t: 'Médio', sub: fmt(M(200000)), v: 200000 }, { t: 'Grande', sub: fmt(M(2000000)), v: 2000000 }]); if (!cap) return;
    const v = await UI.prompt('Nome da empresa', [{ k: 'n', label: 'Nome', type: 'text', value: `${p.last} ${R.pick(['& Cia', 'Group', 'Labs', 'Express', 'Holdings', 'Brasil'])}` }]); if (!v) return;
    if (!(await pay(M(cap), 'abrir a empresa'))) return;
    (p.sp.biz = p.sp.biz || []).push({ id: uid(), name: v.n, ind, val: M(cap), cash: 0, emp: Math.max(1, Math.round(cap / 20000)), yrs: 0, pub: false, own: 1, mkt: 0 });
    cnt('empresas'); Meta.ach('empresa'); log(`Fundei a empresa ${v.n} (${ind}). 🚀`, 'good');
  },
  async acquire() {
    const p = P(); if (p.age < 18) return UI.alert('Aquisição', 'Você precisa ter 18 anos.');
    const offers = Array.from({ length: 3 }, () => { const ind = R.pick(BIZ_IND); const val = M(R.int(5, 500) * 10000 * R.int(1, 10)); return { name: `${randLast(C().lang)} ${R.pick(['Indústria', 'Comércio', 'Tech', 'Serviços', 'Alimentos'])}`, ind, val, emp: Math.max(2, Math.round(val / M(40000))) }; });
    const o = await UI.choose('Empresas à venda', 'Escolha uma:', offers.map(x => ({ t: x.name, sub: `${x.ind} • ${fmt(x.val)} • ${x.emp} func.`, v: x }))); if (!o) return;
    if (!(await pay(o.val, 'a aquisição'))) return;
    (p.sp.biz = p.sp.biz || []).push({ id: uid(), name: o.name, ind: o.ind, val: o.val, cash: 0, emp: o.emp, yrs: 0, pub: false, own: 1, mkt: 0 });
    cnt('empresas'); Meta.ach('empresa'); log(`Comprei a empresa ${o.name}. 🛒`, 'good');
  },
  bizMenu(b) {
    const p = P();
    const items = [
      { ic: '👥', t: 'Contratar funcionários', sub: `${b.emp} atualmente`, fn: async () => { const v = await UI.prompt('Contratar', [{ k: 'n', label: 'Quantos?', type: 'number', value: 5 }]); const n = Math.max(0, Math.round(Number(v?.n) || 0)); if (!n) return; if (!(await pay(M(3000) * n))) return; b.emp += n; return UI.alert('Contratações', `${n} novos funcionários!`, '👥'); } },
      { ic: '✂️', t: 'Demitir funcionários', fn: async () => { const n = Math.round(b.emp * .2); b.emp = Math.max(1, b.emp - n); karma(-2); return UI.alert('Cortes', `${n} funcionários demitidos.`); } },
      { ic: '📣', t: 'Investir em marketing', sub: fmt(Math.round(b.val * .05 + M(5000))), fn: async () => { const c = Math.round(b.val * .05 + M(5000)); if (!(await pay(c))) return; b.mkt += 1; return UI.alert('Marketing', 'Campanha lançada! O próximo ano deve ser melhor.', '📣'); } },
      { ic: '💵', t: 'Retirar lucros', sub: `Caixa: ${fmt(b.cash)}`, fn: async () => { if (b.cash <= 0) return UI.alert('Lucros', 'Não há lucro no caixa.'); const v = Math.round(b.cash * (1 - C().tax)); cash(v); b.cash = 0; return UI.alert('Lucros', `Você recebeu ${fmt(v)}.`, '💵'); } },
      ...(!b.pub && b.val >= M(5e7) ? [{ ic: '🔔', t: 'Abrir capital (IPO)', sub: 'Venda 30% na bolsa', fn: async () => { const v = Math.round(b.val * .3 * R.int(90, 140) / 100); cash(v); b.pub = true; b.own = .7; cnt('ipo'); Meta.ach('ipo'); fame(10); log(`A ${b.name} abriu capital na bolsa! Recebi ${fmt(v)}. 🔔`, 'good'); return UI.alert('IPO!', `Sucesso! ${fmt(v)} na conta.`, '🔔'); } }] : []),
      { ic: '🤝', t: 'Vender a empresa', sub: `~${fmt(Math.round(b.val * b.own))}`, fn: async () => { if (!(await UI.confirm('Vender', `Vender ${b.name}?`))) return; const v = Math.round(b.val * b.own * R.int(80, 115) / 100) + b.cash; cash(v); p.sp.biz = p.sp.biz.filter(x => x !== b); log(`Vendi a ${b.name} por ${fmt(v)}.`, 'good'); UI.back(); } },
      { ic: '🔒', t: 'Fechar a empresa', cls: 'danger', fn: async () => { if (!(await UI.confirm('Fechar', 'Fechar as portas?'))) return; cash(Math.round(b.cash)); p.sp.biz = p.sp.biz.filter(x => x !== b); log(`Fechei a ${b.name}.`); UI.back(); } }
    ];
    return { title: b.name, head: `<div class="npchead"><div class="muted">${b.ind} • ${b.yrs} ano(s) • ${b.emp} funcionários • participação ${Math.round(b.own * 100)}%</div><div class="muted">Valor: <b>${fmt(b.val)}</b> • Faturamento anual: ${fmt(b.rev || 0)}</div></div>`, items };
  },
  tick() {
    const p = P(); if (!p.sp.biz) return;
    for (const b of p.sp.biz.slice()) {
      b.yrs++;
      const skill = (p.smr - 50) / 10 + (p.talent === 'negocios' ? 6 : 0) + b.mkt * 4 + Math.log2(b.emp + 1);
      const g = R.norm(4 + skill, 18) / 100;
      b.val = Math.max(0, Math.round(b.val * (1 + g)));
      b.rev = Math.round(b.val * R.int(30, 90) / 100);
      const profit = Math.round(b.rev * R.int(-8, 18) / 100) - M(2500) * b.emp * .2;
      b.cash = Math.round(b.cash + profit);
      b.mkt = 0;
      if (g > .5 && R.ch(.5)) b.emp = Math.round(b.emp * 1.3 + 1);
      if (b.val < M(2000) || b.cash < -b.val) { log(`A ${b.name} faliu! 📉`, 'bad'); p.sp.biz = p.sp.biz.filter(x => x !== b); ch('hap', -15); continue; }
      if (g > .4) log(`A ${b.name} cresceu ${Math.round(g * 100)}% este ano! 📈`, 'good'); else if (g < -.25) log(`A ${b.name} teve um ano ruim (${Math.round(g * 100)}%).`, 'bad');
    }
  }
};

// ---------- Diretor ----------
const Director = {
  menu() {
    const p = P(), d = p.sp.dir;
    if (!d) return { title: 'Cinema', items: [{ ic: '🎬', t: 'Começar carreira de diretor(a)', sub: 'Requer 18+ e formação em Cinema/Teatro/Artes/Comunicação ou experiência como ator', fn: async () => {
      if (p.age < 18) return UI.alert('Cinema', 'Você precisa ter 18 anos.');
      const ok = majorOf().some(m => ['Cinema', 'Teatro', 'Artes', 'Comunicação'].includes(m)) || (p.sp.actor?.roles.length >= 3);
      if (!ok) return UI.alert('Cinema', 'Nenhum estúdio confia em você ainda. Faça Cinema ou atue em 3+ papéis.');
      p.sp.dir = { films: [], rep: R.int(5, 20), awards: 0 }; log('Comecei minha carreira de diretor(a) de cinema. 🎬');
    } }] };
    return { title: 'Diretor(a) de cinema', head: `<div class="npchead"><div class="muted">${d.films.length} filme(s) • ${d.awards} prêmio(s)</div><div class="mini"><span>Reputação</span><div class="mbar"><i style="width:${d.rep}%"></i></div></div></div>`, items: [
      { ic: '🎥', t: 'Produzir um filme', sub: 'Um por ano', fn: () => this.make() },
      ...d.films.slice(-6).reverse().map(f => ({ ic: '🎞️', t: f.t, sub: `${f.g} • nota ${f.r}/100 • bilheteria ${fmt(f.box, true)}${f.fest ? ' • ' + f.fest : ''}`, fn: () => this.festival(f) })),
      { ic: '🚪', t: 'Abandonar a direção', cls: 'danger', fn: async () => { if (await UI.confirm('Cinema', 'Parar de dirigir?')) { p.sp.dir = null; UI.back(); } } }
    ] };
  },
  async make() {
    const p = P(), d = p.sp.dir;
    if (used('filme') >= 1) return UI.alert('Filme', 'Um filme por ano!');
    const g = await UI.choose('Gênero', 'Que filme vamos fazer?', FILM_GENRES.map(t => ({ t, v: t }))); if (!g) return;
    const b = await UI.choose('Orçamento', 'Quem paga?', [
      { t: 'Independente (seu dinheiro)', sub: fmt(M(200000)), v: { c: M(200000), own: true, m: 1 } },
      { t: 'Médio (seu dinheiro)', sub: fmt(M(5000000)), v: { c: M(5000000), own: true, m: 2 } },
      { t: 'Bancado por estúdio', sub: 'Requer reputação 30+ • você recebe 10%', v: { c: M(40000000), own: false, m: 3 } }]);
    if (!b) return;
    if (!b.own && d.rep < 30) return UI.alert('Estúdio', 'Os estúdios ainda não confiam em você.');
    if (b.own && !(await pay(b.c, 'o filme'))) return;
    const v = await UI.prompt('Título do filme', [{ k: 't', label: 'Título', type: 'text', value: R.pick(['A Última Fronteira', 'Noite Sem Fim', 'Meu Vizinho Alien', 'O Peso da Coroa', 'Corações em Chamas', 'Operação Tempestade']) }]); if (!v) { if (b.own) cash(b.c); return; }
    lim('filme');
    // testes de elenco
    const cast = await UI.choose('Testes de elenco', 'Quem será o protagonista?', [
      { t: 'Estrela famosa', sub: 'Caro, atrai público', v: 15 }, { t: 'Ator/atriz experiente', v: 8 }, { t: 'Novato talentoso', v: R.int(-5, 15) }, ...(p.sp.actor ? [{ t: 'Eu mesmo(a)', v: Math.round(p.sp.actor.skill / 8) }] : [])]);
    if (cast === null) return;
    const drama = await UI.choose('Bastidores', R.pick(['O protagonista exige um trailer maior.', 'Dois atores brigaram no set.', 'Choveu e destruiu o cenário.', 'O roteirista quer mudar o final.']), [{ t: 'Ceder', v: R.int(-2, 4) }, { t: 'Bater o pé', v: R.int(-6, 8) }, { t: 'Improvisar', v: R.int(-4, 10) }]);
    const r = clamp(Math.round(d.rep * .4 + p.smr * .2 + R.int(0, 40) + (cast || 0) + (drama || 0) + (p.talent === 'arte' ? 8 : 0)));
    const box = Math.round(b.c * Math.pow(r / 55, 3) * R.int(40, 200) / 100 * (cast >= 15 ? 1.4 : 1));
    const earn = b.own ? box : Math.round(box * .1);
    cash(earn); d.rep = clamp(d.rep + Math.round((r - 50) / 5)); fame(Math.max(0, Math.round((r - 40) / 8)));
    const film = { t: v.t, g, r, box, y: G.s.year, fest: null };
    d.films.push(film); cnt('filmes');
    if (box > b.c * 2.5) Meta.ach('cinema');
    log(`Lancei o filme "${v.t}" (${g}). Nota ${r}/100, bilheteria ${fmt(box)}.`, r >= 60 ? 'good' : 'bad');
    return UI.alert(v.t, `Crítica: ${r}/100\nBilheteria: ${fmt(box)}\nSeu ganho: ${fmt(earn)}\n\nToque no filme para enviá-lo a festivais.`, '🎬');
  },
  async festival(f) {
    const d = P().sp.dir;
    if (f.fest) return UI.alert(f.t, `Já participou: ${f.fest}.`);
    if (!lim('festival', 2)) return UI.alert('Festival', 'Inscrições encerradas para este ano.');
    const fest = await UI.choose('Festivais', 'Enviar para qual?', ['Festival da Riviera', 'Festival do Leão', 'Mostra de Inverno', 'Festival Independente da Montanha'].map(t => ({ t, v: t }))); if (!fest) return;
    if (R.ch(f.r / 140)) { f.fest = `🏆 ${fest}`; d.rep = clamp(d.rep + 10); d.awards++; fame(6); log(`"${f.t}" ganhou o prêmio principal no ${fest}! 🏆`, 'good'); return UI.alert('Premiado!', `"${f.t}" venceu no ${fest}!`, '🏆'); }
    f.fest = `Selecionado: ${fest}`; d.rep = clamp(d.rep + 2); return UI.alert('Festival', `"${f.t}" foi exibido, mas não ganhou.`, '🎞️');
  },
  tick() { const d = P().sp.dir; if (!d) return; const last = d.films[d.films.length - 1]; if (last && last.y === G.s.year - 1 && last.r >= 88 && R.ch(.35)) { d.awards++; cnt('estatueta'); fame(10); log(`Ganhei a Estatueta Dourada de melhor direção por "${last.t}"! 🏆`, 'good'); } }
};

// ---------- Modelo ----------
const Model = {
  menu() {
    const p = P(), m = p.sp.model;
    if (!m) return { title: 'Modelo', items: [{ ic: '📸', t: 'Procurar uma agência', sub: 'Aparência 70%+ • 15 a 35 anos', fn: async () => {
      if (p.age < 15 || p.age > 35) return UI.alert('Modelo', 'Agências aceitam de 15 a 35 anos.'); if (p.loo < 70) return UI.alert('Modelo', 'As agências recusaram. Aparência insuficiente.', '🙅');
      const ag = R.pick(['Elite Faces', 'Passarela Models', 'Studio Glam', 'Vogue Talents']); p.sp.model = { agency: ag, lvl: 1, shoots: 0 }; log(`Assinei com a agência de modelos ${ag}. 📸`, 'good');
    } }] };
    const job = (ic, t, mult, need) => ({ ic, t, sub: need ? `Nível ${need}+` : '', fn: async () => {
      if (m.lvl < (need || 0)) return UI.alert(t, 'Você ainda não tem nível para isso.');
      if (!lim('modelo', 3)) return UI.alert(t, 'Agenda cheia este ano.');
      const ok = R.ch(.5 + (p.loo - 70) / 60); if (!ok) return UI.alert(t, 'O cliente escolheu outra pessoa.');
      const v = M(Math.round(R.int(1, 5) * 1000 * mult * m.lvl)); cash(v); m.shoots++; fame(Math.round(mult / 2)); if (m.shoots % 4 === 0 && m.lvl < 10) { m.lvl++; log(`Subi para o nível ${m.lvl} como modelo.`); }
      return UI.alert(t, `Trabalho feito! Cachê: ${fmt(v)}.`, '📸');
    } });
    return { title: `Modelo — ${m.agency}`, head: `<p class="muted">Nível ${m.lvl}/10 • ${m.shoots} trabalhos</p>`, items: [job('📷', 'Ensaio fotográfico', 1), job('👠', 'Desfile', 3, 2), job('📺', 'Campanha publicitária', 6, 4), job('📰', 'Capa de revista', 12, 6), job('🌍', 'Semana de moda internacional', 25, 8),
      { ic: '🚪', t: 'Sair da agência', cls: 'danger', fn: async () => { p.sp.model = null; UI.back(); } }] };
  },
  tick() { const p = P(), m = p.sp.model; if (!m) return; if (p.age > 40 || p.loo < 55) { log('Minha agência de modelos rescindiu o contrato.', 'bad'); p.sp.model = null; } }
};

// ---------- Crime organizado ----------
const Mafia = {
  menu() {
    const p = P(), mf = p.sp.mafia;
    if (!mf) return { title: 'Crime organizado', head: `<p class="muted">Notoriedade: ${p.notor}%. Famílias poderosas só aceitam criminosos conhecidos.</p>`, items: MAFIA_FAMS.map(f => ({ ic: '🎩', t: f.n, sub: `Exige notoriedade ~${f.not}%`, fn: async () => {
      if (p.age < 16) return UI.alert('Máfia', 'Volte quando for mais velho(a), garoto(a).');
      if (!lim('mafiaTry', 2)) return UI.alert('Máfia', 'Ninguém atende suas ligações.');
      if (R.ch(clamp((p.notor - f.not) / 40 + .35, .03, .95))) { p.sp.mafia = { fam: f.n, rank: 0, resp: 0 }; cnt('mafia'); Meta.ach('mafia'); log(`Fui aceito(a) na ${f.n}. 🎩`, 'good'); return UI.alert('Bem-vindo(a) à família', `A ${f.n} agora te protege. Não traia a família.`, '🎩'); }
      return UI.alert('Recusado(a)', `A ${f.n} disse que você ainda não é ninguém.`, '🙅');
    } })) };
    const mission = (ic, t, risk, money, resp, minRank = 0) => ({ ic, t, sub: `Risco ${'⚠️'.repeat(risk)}${minRank ? ' • ' + gt(MAFIA_RANKS[minRank], p.g) + '+' : ''}`, fn: async () => {
      if (mf.rank < minRank) return UI.alert(t, 'Você não tem patente para isso.');
      if (!lim('missaoMafia', 4)) return UI.alert(t, 'O chefe mandou você ficar na moita este ano.');
      const succ = R.ch(.85 - risk * .12 + (p.talent === 'crime' ? .08 : 0) + (G.s.flags.invis ? .3 : 0)); G.s.flags.invis = false;
      cnt('crimes'); p.notor = clamp(p.notor + risk * 2);
      if (succ) { const v = M(R.int(...money)); cash(v); mf.resp += resp; karma(-risk); this.promote(); return UI.alert('Missão cumprida', `${t}: você faturou ${fmt(v)}.`, '💰'); }
      if (R.ch(.04 * risk)) { die('numa missão da máfia que deu errado'); return; }
      await UI.alert('Deu ruim', 'A polícia apareceu!', '🚨');
      return Crime.arrest(t, [risk, risk * 4]);
    } });
    return { title: mf.fam, head: `<div class="npchead"><div class="muted">${gt(MAFIA_RANKS[mf.rank], p.g)} • respeito ${mf.resp}</div></div>`, items: [
      mission('💼', 'Cobrar dívidas', 1, [500, 3000], 4), mission('🏪', 'Extorquir comerciantes', 2, [1000, 8000], 6), mission('🚚', 'Assaltar caminhão de carga', 3, [5000, 40000], 9, 1),
      mission('🚬', 'Contrabando no porto', 3, [10000, 80000], 10, 1), mission('🧺', 'Lavar dinheiro', 2, [20000, 150000], 8, 2), mission('🎯', 'Eliminar um rival', 5, [30000, 200000], 20, 2),
      { ic: '🚪', t: 'Sair da família', cls: 'danger', fn: async () => { if (!(await UI.confirm('Sair', 'Ninguém sai da família vivo... tem certeza?'))) return; if (R.ch(.3)) { die('assassinado(a) pela própria família criminosa'); return; } p.sp.mafia = null; log('Saí do crime organizado.'); UI.back(); } }
    ] };
  },
  promote() {
    const p = P(), mf = p.sp.mafia; const need = [20, 50, 100, 180];
    if (mf.rank < 4 && mf.resp >= need[mf.rank]) { mf.rank++; log(`Fui promovido(a) a ${gt(MAFIA_RANKS[mf.rank], p.g)} na ${mf.fam}. 🎩`, 'good'); if (mf.rank === 4) { cnt('chefao'); Meta.ach('chefao'); } }
  },
  tick() { const p = P(), mf = p.sp.mafia; if (!mf) return; if (mf.rank >= 2) cash(M(R.int(5, 40) * 1000 * mf.rank)); if (R.ch(.03 + mf.rank * .01)) { if (G.s.flags.security && R.ch(.6)) log('Meus seguranças impediram um atentado contra mim.'); else { ch('hea', -R.int(20, 60)); log('Uma família rival tentou me matar! 🔫', 'bad'); if (p.hea <= 0) die('atentado de uma família rival'); } } }
};

// ---------- Ambulante ----------
const Hustler = {
  menu() {
    const p = P();
    const h = (ic, t, range, risk, minA = 10) => ({ ic, t, fn: async () => {
      if (p.age < minA) return UI.alert(t, 'Muito novo(a).');
      if (!lim('hustle', 4)) return UI.alert(t, 'Você já ficou na rua o ano todo.');
      if (risk && R.ch(risk)) { const fine = M(R.int(100, 800)); cash(-fine); return UI.alert('Fiscalização', `O rapa apareceu! Você levou uma multa de ${fmt(fine)}.`, '👮'); }
      const v = M(R.int(...range)); cash(v); cnt('hustle'); return UI.alert(t, `Você faturou ${fmt(v)}.`, ic);
    } });
    return { title: 'Ambulante / Rua', items: [
      h('🌭', 'Vender cachorro-quente', [100, 1500], .1), h('📿', 'Vender bijuterias', [50, 900], .1), h('🕶️', 'Vender produtos falsificados', [300, 4000], .3, 14),
      h('🤹', 'Malabarismo no semáforo', [20, 400], 0), h('🗿', 'Estátua viva', [30, 500], 0), h('🎵', 'Tocar na praça', [10, 600], 0), h('🚗', 'Guardar carros', [50, 600], .05),
      h('🎨', 'Caricaturas na praia', [80, 1200], 0), h('🥤', 'Vender água no trânsito', [40, 500], .05), h('🙏', 'Pedir esmola', [0, 200], 0, 6)
    ] };
  }
};
