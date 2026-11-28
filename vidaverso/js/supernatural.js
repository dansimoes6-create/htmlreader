'use strict';
// ===== Realeza, Vampiros, Magia e Redes sociais =====
function mkMagic(born, inherit) {
  return { type: inherit?.type ?? null, xp: inherit ? Math.floor(inherit.xp / 3) : (born ? 5 : 0), mana: 5, maxMana: 5, coven: null, familiar: null, ingr: {}, casts: 0, born: !!born, tome: !!inherit };
}
const magicRank = m => { let r = 0; MAGIC_RANKS.forEach(([n, x], i) => { if (m.xp >= x) r = i; }); return r; };

const Super = {
  tick() {
    const p = P();
    // vampiro
    if (p.vamp) {
      const v = p.vamp;
      if (!v.fed) { ch('hea', -R.int(8, 15)); ch('hap', -10); log('Passei o ano inteiro sem sangue. Estou fraco(a)... 🩸', 'bad'); }
      v.fed = false;
      const need = [0, 10, 30, 60, 100];
      while (v.rank < 4 && v.ess >= need[v.rank + 1]) { v.rank++; const pw = VAMP_POWERS.find(x => !v.powers.includes(x)); if (pw) v.powers.push(pw); log(`Evoluí para ${VAMP_RANKS[v.rank]}! Novo poder: ${pw || '—'} 🧛`, 'magic'); }
      if (R.ch(.03)) Events.queue(() => this.hunter());
    }
    // magia
    if (p.magic) { const m = p.magic; m.maxMana = 5 + magicRank(m) * 3; m.mana = m.maxMana; if (m.xp >= 150) Meta.ach('arquimago'); }
    // realeza
    if (p.royal?.monarch) {
      const c = C();
      if (c.mon?.abs && p.royal.respect < 20 && R.ch(.25)) Events.queue(() => this.revolution());
      p.royal.respect = clamp(p.royal.respect + R.int(-4, 3));
    }
    if (p.royal && !p.royal.monarch && p.royal.respect < 60 && R.ch(.2)) p.royal.respect = clamp(p.royal.respect + 2);
  },
  // ---------- Realeza ----------
  royalMenu() {
    const p = P(), r = p.royal, c = C();
    const act = (ic, t, d, msg, f) => ({ ic, t, fn: async () => { if (!lim('royal_' + t, 1)) return UI.alert(t, 'Você já fez isso este ano.'); const dd = typeof d === 'function' ? d() : d; r.respect = clamp(r.respect + dd); f && f(); return UI.alert(t, msg + `\nRespeito ${dd >= 0 ? '+' : ''}${dd}`, '👑'); } });
    const items = [
      act('🎗️', 'Evento de caridade', () => R.int(2, 8), 'O povo aplaudiu sua generosidade.', () => { cash(-M(20000)); karma(3); }),
      act('🎤', 'Discurso ao povo', () => R.int(-5, 9), 'Seu discurso foi transmitido em rede nacional.'),
      act('🌍', 'Visita oficial a outro país', () => R.int(-2, 6), 'Você foi recebido(a) com honras de chefe de Estado.', () => ch('hap', 5)),
      act('🏗️', 'Inaugurar uma obra', () => R.int(1, 5), 'Você cortou a fita de um novo hospital.'),
      act('🥂', 'Dar um baile no palácio', () => R.int(-4, 6), 'A nobreza inteira compareceu.', () => cash(-M(100000))),
      act('🐎', 'Desfile real', () => R.int(0, 7), 'Multidões acenaram para você.')
    ];
    if (r.monarch) {
      items.push(act('💰', 'Aumentar impostos', () => -R.int(6, 15), 'Os cofres reais encheram.', () => cash(M(R.int(1, 10) * 1e6))));
      items.push(act('📉', 'Reduzir impostos', () => R.int(5, 12), 'O povo comemorou nas ruas.', () => cash(-M(500000))));
      items.push(act('🎉', 'Decretar feriado nacional', () => R.int(3, 8), 'Um dia de folga para todos!'));
      if (c.mon?.abs) items.push(act('⚔️', 'Prender opositores', () => -R.int(5, 15), 'Seus guardas prenderam os críticos do regime.', () => karma(-10)));
      items.push({ ic: '🚪', t: 'Abdicar do trono', cls: 'danger', fn: async () => { if (!(await UI.confirm('Abdicar', 'Abrir mão da coroa?'))) return; r.monarch = false; r.title = gt('Ex-rei|Ex-rainha', p.g); log('Abdiquei do trono. 👑', 'bad'); } });
    } else items.push({ ic: '🚶', t: 'Renunciar ao título', cls: 'danger', fn: async () => { if (!(await UI.confirm('Renunciar', 'Renunciar ao título real? Você perderá a mesada.'))) return; p.royal = null; log('Renunciei ao meu título real.'); UI.back(); } });
    return { title: r.title, head: `<div class="npchead"><div class="muted">${c.n} ${c.f} • ${c.mon?.abs ? 'Monarquia absoluta' : 'Monarquia constitucional'} • ${r.monarch ? 'No trono' : `${r.line}º na linha de sucessão`}</div><div class="mini"><span>Respeito</span><div class="mbar"><i style="width:${r.respect}%"></i></div></div></div>`, items };
  },
  royalSucceed() {
    const p = P(); if (!p.royal || p.royal.monarch) return;
    if (p.royal.line > 1 && alive('irmao').some(s => s.age > p.age)) { p.royal.line = Math.max(1, p.royal.line - 1); return; }
    p.royal.monarch = true; p.royal.title = gt(C().mon?.emp ? 'Imperador|Imperatriz' : 'Rei|Rainha', p.g); cnt('reinou'); Meta.ach('rei'); fame(30);
    log(`Fui coroad${ga(p.g, 'o', 'a')} ${p.royal.title} de ${C().n}! 👑`, 'good');
  },
  async revolution() {
    const p = P();
    const r = await UI.choose('Revolução!', 'O povo invadiu o palácio exigindo sua queda!', [{ t: 'Fugir do país', v: 'fugir' }, { t: 'Enfrentar a multidão', v: 'ficar' }, { t: 'Prometer reformas', v: 'reforma' }]);
    if (r === 'reforma' && R.ch(.5)) { p.royal.respect = 40; return UI.alert('Reformas', 'O povo aceitou suas promessas... por enquanto.'); }
    if (r === 'ficar' && R.ch(.5)) { die('derrubado(a) por uma revolução popular'); return; }
    p.royal = null; cash(-Math.round(p.money * .7)); const dest = R.pick(COUNTRIES.filter(c => c.id !== p.country)); p.country = dest.id; p.city = R.pick(dest.cities);
    log(`Fui deposto(a) e fugi para o exílio em ${dest.n}.`, 'bad'); return UI.alert('Exílio', `Você perdeu a coroa e agora vive exilado(a) em ${dest.n}.`, '🏃');
  },
  // ---------- Vampiro ----------
  becomeVampire(how) {
    const p = P(); if (p.vamp) return;
    p.vamp = { rank: 0, ess: 0, fed: true, powers: [], council: false, since: p.age };
    p.ill = p.ill.filter(i => i.mental); p.hea = 100; ch('loo', 10);
    log(`${how} Agora sou um(a) vampiro(a). 🧛`, 'magic'); Meta.ach('vampiro');
  },
  vampMenu() {
    const p = P(), v = p.vamp;
    return { title: 'Vida vampírica', head: `<div class="npchead"><div class="muted">${VAMP_RANKS[v.rank]} • Essência ${v.ess} • ${v.fed ? 'Alimentado(a)' : '⚠️ Com fome'}${v.council ? ' • Membro do Conselho' : ''}</div><div class="muted">Poderes: ${v.powers.join(', ') || 'nenhum ainda'}</div></div>`, items: [
      { ic: '🩸', t: 'Caçar um estranho', sub: 'Risco de ser visto', fn: async () => { if (!lim('caca', 3)) return UI.alert('Caça', 'Muita caça chama atenção.'); v.fed = true; v.ess += R.int(2, 5); ch('hea', 10); if (R.ch(.12)) { await UI.alert('Testemunha!', 'Alguém viu você atacando!', '👀'); return Crime.arrest('Agressão', [1, 4]); } return UI.alert('Caça', 'Você bebeu até se saciar.', '🩸'); } },
      { ic: '🏥', t: 'Roubar banco de sangue', sub: 'Seguro, pouca essência', fn: async () => { if (!lim('banco_sangue', 2)) return UI.alert('Banco de sangue', 'O estoque acabou.'); v.fed = true; v.ess += 1; ch('hea', 5); return UI.alert('Banco de sangue', 'Bolsas de sangue... não é a mesma coisa, mas serve.', '🩸'); } },
      { ic: '🐀', t: 'Beber sangue de animais', sub: 'Mata a fome, sem essência', fn: async () => { v.fed = true; ch('hap', -3); return UI.alert('Ratos', 'Nojento, mas funciona.', '🐀'); } },
      { ic: '😈', t: 'Alimentar-se de um inimigo', sub: 'Muita essência', fn: async () => { const e = alive('inimigo', 'rival')[0]; if (!e) return UI.alert('Inimigos', 'Você não tem inimigos. Que sorte a deles.'); return this.feedOn(e); } },
      { ic: '🌀', t: 'Hipnotizar humano fraco', sub: 'Faça-os obedecer', fn: async () => { if (!lim('hipnose', 2)) return UI.alert('Hipnose', 'Sua mente precisa descansar.'); const v2 = M(R.int(100, 5000)) * (v.rank + 1); cash(v2); return UI.alert('Hipnose', `Um humano hipnotizado te entregou ${fmt(v2)}.`, '🌀'); } },
      { ic: '🦇', t: v.council ? 'Reunião do Conselho' : 'Pedir entrada no Conselho Vampírico', fn: async () => { if (!v.council) { if (v.rank < 2) return UI.alert('Conselho', 'O Conselho só aceita Predadores ou acima.'); v.council = true; log('Fui aceito(a) no Conselho Vampírico. 🦇', 'magic'); return; } if (!lim('conselho')) return; v.ess += 5; return UI.alert('Conselho', 'Os anciões compartilharam segredos com você. (+essência)', '🦇'); } },
      { ic: '☀️', t: 'Andar sob o sol', cls: 'danger', fn: async () => { if (v.rank >= 4 && R.ch(.7)) return UI.alert('Sol', 'Seu poder ancestral te protege do sol.', '😎'); ch('hea', -50); if (p.hea <= 0) { die('queimado(a) pelo sol'); return; } return UI.alert('AAAH!', 'Sua pele começou a queimar! (-50 saúde)', '🔥'); } }
    ] };
  },
  async feedOn(n) {
    const p = P(); if (!lim('feed_' + n.id)) return UI.alert(n.first, 'Deixe-o(a) se recuperar.');
    p.vamp.fed = true; const big = ['inimigo', 'rival'].includes(n.role); p.vamp.ess += big ? R.int(5, 10) : R.int(2, 4);
    n.hea = clamp(n.hea - R.int(15, 35)); chR(n, -15); ch('hea', 10);
    if (n.hea <= 0) { npcDies(n, 'perda de sangue'); karma(-15); return UI.alert('Exagero', `Você bebeu demais... ${n.first} morreu.`, '💀'); }
    return UI.alert('Banquete', `Você se alimentou de ${n.first}.`, '🩸');
  },
  async hypnotize(n) {
    if (!lim('hipn_' + n.id)) return UI.alert(n.first, 'A mente dele(a) resiste agora.');
    const r = await UI.choose('Hipnose', `O que mandar ${n.first} fazer?`, [{ t: 'Me dar dinheiro', v: 'm' }, { t: 'Gostar de mim', v: 'r' }, { t: 'Esquecer o que viu', v: 'f' }]);
    if (r === 'm') { const v = Math.round(Math.max(M(50), (n.money || 0) * .1)); n.money = Math.max(0, (n.money || 0) - v); cash(v); return UI.alert('Hipnose', `${n.first} te entregou ${fmt(v)}.`, '🌀'); }
    if (r === 'r') { chR(n, 25); return UI.alert('Hipnose', `${n.first} agora te adora.`, '🌀'); }
    if (r === 'f') { P().notor = clamp(P().notor - 10); return UI.alert('Hipnose', 'Memórias apagadas.', '🌀'); }
  },
  async turn(n) {
    if (!(await UI.confirm('Transformar', `Transformar ${n.first} em vampiro(a)? Não há volta.`))) return;
    if (R.ch(.8)) { n.vamp = true; n.hea = 100; cnt('transformou'); if (!['conjuge', 'parceiro', 'filho', 'mae', 'pai', 'irmao'].includes(n.role)) n.role = 'vampfilho'; log(`Transformei ${fname(n)} em vampiro(a). 🧛`, 'magic'); return UI.alert('Cria', `${n.first} despertou como vampiro(a)!`, '🧛'); }
    npcDies(n, 'uma transformação vampírica fracassada'); return UI.alert('Fracasso', `${n.first} não sobreviveu à transformação.`, '💀');
  },
  async hunter() {
    const p = P(); const v = p.vamp; if (!v) return;
    const r = await UI.choose('Caçador de vampiros!', 'Um caçador com estacas e alho invadiu seu esconderijo!', [{ t: 'Lutar', v: 'l' }, { t: 'Fugir em forma de névoa', v: 'n' }, { t: 'Hipnotizá-lo', v: 'h' }]);
    const bonus = v.rank * .1;
    if (r === 'n' && (v.powers.includes('Forma de névoa') || R.ch(.4 + bonus))) return UI.alert('Fuga', 'Você escapou por entre as frestas.', '🌫️');
    if (r === 'h' && (v.powers.includes('Hipnose') ? R.ch(.85) : R.ch(.3 + bonus))) return UI.alert('Hipnose', 'O caçador largou a estaca e foi embora sonâmbulo.', '🌀');
    if (r === 'l' && R.ch(.45 + bonus)) { v.ess += 8; return UI.alert('Vitória', 'Você derrotou o caçador e absorveu sua essência.', '🧛'); }
    ch('hea', -R.int(25, 55)); if (p.hea <= 0) { die('uma estaca no coração'); return; }
    return UI.alert('Ferido(a)', 'O caçador te feriu gravemente antes de você escapar.', '🩸');
  },
  // ---------- Magia ----------
  async awaken() {
    const p = P(); if (p.magic && p.magic.xp > 0 && p.magic.type) return;
    if (!p.magic) p.magic = mkMagic(false);
    // teste de personalidade
    const qs = [
      ['Numa noite de lua cheia você prefere...', [['Caminhar no bosque', 0], ['Olhar as estrelas', 1], ['Ir a uma festa', 2], ['Ler um livro proibido', 3]]],
      ['Seu maior desejo é...', [['Curar o mundo', 0], ['Saber o futuro', 1], ['Ser adorado(a)', 2], ['Ter poder absoluto', 3]]],
      ['Um inimigo te humilhou. Você...', [['Perdoa', 0], ['Espera o momento certo', 1], ['Conquista os amigos dele', 2], ['Amaldiçoa', 3]]]
    ];
    const sc = [0, 0, 0, 0];
    for (const [q, ans] of qs) { const r = await UI.choose('Que bruxa(o) é você?', q, ans.map(([t, v]) => ({ t, v: String(v) }))); if (r === null) return; sc[Number(r)]++; }
    const idx = sc.indexOf(Math.max(...sc)); const t = WITCH_TYPES[idx];
    p.magic.type = t.n; p.magic.xp = Math.max(p.magic.xp, 10); ch(t.b, 5);
    cnt('magia'); Meta.ach('bruxo'); log(`Meus poderes mágicos despertaram! Sou ${t.n} — ${t.d}. ✨`, 'magic');
    return UI.alert('Magia desperta!', `Você é ${t.n}!\n${t.d}`, '✨');
  },
  magicMenu() {
    const p = P(), m = p.magic;
    if (!m || !m.type) return { title: 'Magia', items: [{ ic: '✨', t: 'Despertar seus poderes', sub: m ? 'Você sente a magia dentro de si' : 'Faça o teste... talvez haja algo em você', fn: async () => {
      if (!m && !R.ch(.35) && !lim('tentarMagia')) return UI.alert('Magia', 'Nada aconteceu. Talvez outro ano.');
      if (!m && !R.ch(.35)) return UI.alert('Magia', 'Você se concentrou muito... mas nada aconteceu. Tente no próximo ano.', '🫥');
      return this.awaken();
    } }] };
    const rk = magicRank(m);
    const items = [
      { ic: '🪄', t: 'Lançar feitiço em si', sub: `Mana ${m.mana}/${m.maxMana}`, fn: () => this.castMenu(null) },
      { ic: '🐈‍⬛', t: m.familiar ? `Familiar: ${m.familiar}` : 'Invocar um familiar', sub: m.familiar ? 'Mandar buscar ingredientes' : '', fn: async () => {
        if (!m.familiar) { const f = await UI.choose('Familiar', 'Escolha seu companheiro mágico:', FAMILIARS.map(t => ({ t, v: t }))); if (f) { m.familiar = f; log(`Invoquei um familiar: ${f}. 🐈‍⬛`, 'magic'); } return; }
        if (!lim('forragem', 2)) return UI.alert(m.familiar, 'Seu familiar está cansado.');
        const got = R.sample(INGREDIENTS, R.int(1, 3)); got.forEach(g => m.ingr[g] = (m.ingr[g] || 0) + 1);
        return UI.alert(m.familiar, `Seu familiar trouxe: ${got.join(', ')}.`, '🌿');
      } },
      { ic: '⚗️', t: 'Preparar poção', sub: `${Object.values(m.ingr).reduce((a, b) => a + b, 0)} ingredientes`, fn: () => this.brew() },
      { ic: '🕯️', t: m.coven ? `Coven: ${m.coven}` : 'Entrar num coven', sub: m.coven ? 'Participar de ritual' : 'Bem ou Mal', fn: () => this.coven() },
      { ic: '📕', t: 'Estudar o grimório', fn: async () => { if (!lim('grimorio', 2)) return UI.alert('Grimório', 'Sua cabeça está cheia de runas.'); m.xp += R.int(2, 5) + (m.tome ? 2 : 0); ch('smr', 1); return UI.alert('Grimório', 'Você aprendeu novos encantamentos.', '📕'); } }
    ];
    return { title: 'Magia', head: `<div class="npchead"><div class="muted">${esc(m.type)} • ${MAGIC_RANKS[rk][0]} (${m.xp} XP)${m.tome ? ' • Herdeiro(a) do Tomo' : ''}</div><div class="mini"><span>Mana</span><div class="mbar"><i style="width:${m.mana / m.maxMana * 100}%"></i></div></div></div>`, items };
  },
  castMenu(target) {
    const p = P(), m = p.magic; if (!m) return;
    const rk = magicRank(m);
    UI.open(() => ({ title: target ? `Feitiço em ${target.first}` : 'Feitiços', items: SPELLS.filter(s => s.t === (target ? 'npc' : 'self')).map(s => ({ ic: s.evil ? '🖤' : '💫', t: s.n, sub: s.lv > rk ? `🔒 Requer ${MAGIC_RANKS[s.lv][0]}` : `${s.d} • ${s.lv + 1} mana`, cls: s.lv > rk ? 'dim' : '', fn: () => this.cast(s, target) })) }));
  },
  async cast(s, n) {
    const p = P(), m = p.magic; const rk = magicRank(m);
    if (s.lv > rk) return UI.alert(s.n, 'Você ainda não domina este feitiço.');
    if (m.mana < s.lv + 1) return UI.alert(s.n, 'Mana insuficiente. Ela recarrega a cada ano.');
    m.mana -= s.lv + 1; m.casts++; cnt('feiticos'); m.xp += 1 + s.lv;
    if (s.evil) karma(-4);
    if (m.coven === 'Círculo da Aurora' && s.evil && R.ch(.4)) { m.coven = null; log('Fui expulso(a) do Círculo da Aurora por usar magia sombria.', 'bad'); }
    const fail = R.ch(.12 - rk * .015);
    if (fail) { ch('hea', -5); return UI.alert('Falhou!', 'O feitiço saiu pela culatra! 💥', '💥'); }
    let msg = '';
    switch (s.id) {
      case 'luz': ch('hap', 5); msg = 'Faíscas coloridas dançaram ao seu redor.'; break;
      case 'cura': ch('hea', 15); if (p.ill.length && R.ch(.4)) { msg = `Você se curou de ${p.ill[0].n}!`; p.ill.shift(); } else msg = 'Você se sente revigorado(a).'; break;
      case 'brilho': ch('loo', 5); msg = 'Sua pele brilha.'; break;
      case 'sabedoria': ch('smr', 4); msg = 'Sua mente ficou afiada.'; break;
      case 'ouro': { const v = M(R.int(500, 20000)) * (rk + 1); cash(v); msg = `Moedas de ouro surgiram do nada: ${fmt(v)}!`; break; }
      case 'invis': G.s.flags.invis = true; msg = 'Você está invisível. Seu próximo crime será mais fácil.'; break;
      case 'juventude': if (p.age > 18) { p.age--; msg = 'Você rejuvenesceu um ano!'; } else msg = 'Nada a rejuvenescer.'; break;
      case 'tempestade': ch('hap', 8); msg = 'Raios rasgaram o céu. A cidade inteira ficou sem luz.'; fame(2); break;
      case 'charme': chR(n, 20); msg = `${n.first} ficou encantad${ga(n.g, 'o', 'a')} por você.`; break;
      case 'azar': n.hea = clamp(n.hea - 20); n.ill = R.pick(['uma doença misteriosa', 'gripe forte']); msg = `${n.first} começou a passar mal...`; break;
      case 'cura_outro': n.hea = clamp(n.hea + 30); n.ill = null; chR(n, 10); msg = `${n.first} se sente renovad${ga(n.g, 'o', 'a')}.`; break;
      case 'esquecer': chR(n, 15); if (n.role === 'inimigo') n.role = 'amigo'; msg = `${n.first} esqueceu todas as brigas.`; break;
      case 'sapo': n.sapo = 2; chR(n, -20); msg = `${n.first} virou um sapo! 🐸 (por um tempinho)`; break;
    }
    log(`Lancei "${s.n}"${n ? ' em ' + n.first : ''}. ✨`, 'magic');
    return UI.alert(s.n, msg, '✨');
  },
  async brew() {
    const p = P(), m = p.magic;
    const total = Object.values(m.ingr).reduce((a, b) => a + b, 0);
    const pot = await UI.choose('Caldeirão', `Você tem ${total} ingrediente(s).`, POTIONS.map(x => ({ t: x.n, sub: `${x.need} ingredientes`, v: x }))); if (!pot) return;
    if (total < pot.need) return UI.alert('Caldeirão', 'Ingredientes insuficientes. Mande seu familiar buscar mais.');
    let left = pot.need; for (const k of Object.keys(m.ingr)) { const t = Math.min(left, m.ingr[k]); m.ingr[k] -= t; left -= t; if (!m.ingr[k]) delete m.ingr[k]; if (!left) break; }
    m.xp += 3; cnt('pocoes');
    let msg = '';
    if (pot.fx === 'luck') { G.s.flags.luck = true; msg = 'Você está com sorte! Sua próxima aposta terá vantagem.'; }
    else if (pot.fx === 'love') { const pt = partner() || alive('amigo')[0]; if (pt) { chR(pt, 25); msg = `${pt.first} bebeu e está apaixonad${ga(pt.g, 'o', 'a')}.`; } else msg = 'Não havia ninguém para beber a poção.'; }
    else { ch(pot.fx, 10); msg = 'O efeito foi imediato!'; }
    log(`Preparei uma ${pot.n.toLowerCase()}. ⚗️`, 'magic');
    return UI.alert(pot.n, msg, '⚗️');
  },
  async coven() {
    const m = P().magic;
    if (m.coven) { if (!lim('ritual')) return UI.alert('Ritual', 'O próximo ritual é só no ano que vem.'); m.xp += R.int(3, 8); return UI.alert(m.coven, 'O ritual à luz da lua fortaleceu seus poderes.', '🕯️'); }
    const c = await UI.choose('Covens', 'Escolha seu caminho:', [{ t: 'Círculo da Aurora', sub: 'Magia do bem', v: 'Círculo da Aurora' }, { t: 'Irmandade da Lua Negra', sub: 'Magia sombria', v: 'Irmandade da Lua Negra' }]); if (!c) return;
    const trial = await UI.choose('Provação', c === 'Círculo da Aurora' ? 'Um estranho ferido pede ajuda. Você:' : 'Para entrar, você deve sacrificar algo. Você oferece:', c === 'Círculo da Aurora' ? [{ t: 'Cura-o sem pedir nada', v: 1 }, { t: 'Cobra pela cura', v: 0 }] : [{ t: 'Uma memória feliz', v: 1 }, { t: 'Nada', v: 0 }]);
    if (!trial) return UI.alert('Reprovado(a)', 'O coven te rejeitou.', '🚫');
    m.coven = c; if (c === 'Círculo da Aurora') karma(5); else { karma(-5); ch('hap', -5); }
    log(`Entrei para o coven ${c}. 🕯️`, 'magic'); return UI.alert('Bem-vindo(a)', `Você agora faz parte do ${c}.`, '🕯️');
  },
  menu() {
    const p = P(); const items = [];
    items.push({ ic: '🔮', t: 'Magia', sub: p.magic?.type ? `${p.magic.type} • ${MAGIC_RANKS[magicRank(p.magic)][0]}` : 'Descubra seus poderes', fn: () => UI.open(() => this.magicMenu()) });
    if (p.vamp) items.push({ ic: '🧛', t: 'Vida vampírica', sub: VAMP_RANKS[p.vamp.rank], fn: () => UI.open(() => this.vampMenu()) });
    else items.push({ ic: '🦇', t: 'Procurar vampiros', sub: 'Dizem que vivem na noite...', fn: async () => {
      if (p.age < 16) return UI.alert('Vampiros', 'Muito novo(a) para sair à noite.');
      if (!lim('procVamp')) return UI.alert('Vampiros', 'Você não encontrou nada este ano.');
      if (R.ch(.25)) { const ok = await UI.confirm('Encontro na névoa', 'Uma figura pálida oferece a vida eterna em troca de uma mordida. Aceitar?'); if (ok) { this.becomeVampire('Fui mordido(a) por um vampiro ancião.'); return UI.alert('Imortal', 'Você despertou com sede... 🧛', '🧛'); } return UI.alert('Recusa', 'A figura desapareceu na névoa.'); }
      return UI.alert('Nada', 'Você vagou a noite inteira e só achou gatos.', '🌙');
    } });
    items.push({ ic: '🔭', t: 'Visitar uma vidente', sub: fmt(M(50)), fn: async () => { if (!(await pay(M(50)))) return; const prev = R.pick([`Vejo ${R.ch(.5) ? 'muito dinheiro' : 'perdas financeiras'} no seu futuro.`, 'Um grande amor está chegando.', 'Cuidado com quem sorri demais.', 'Você viverá muito... ou não.', 'Vejo uma viagem longa.', 'Há magia adormecida em você.']); return UI.alert('Vidente', prev, '🔮'); } });
    return { title: 'Sobrenatural', items };
  }
};

// ---------- Redes sociais ----------
const Social = {
  total() { return Object.values(P().social).reduce((a, s) => a + (s.fol || 0), 0); },
  menu() {
    const p = P(); const items = [];
    for (const app of SOCIAL_APPS) {
      const acc = p.social[app.id];
      items.push(acc ? { ic: app.ic, t: `${app.n}${acc.ver ? ' ☑️' : ''}`, sub: `@${acc.user} • ${acc.fol.toLocaleString('pt-BR')} seguidores`, fn: () => UI.open(() => this.accMenu(app)) }
        : { ic: app.ic, t: `Criar conta no ${app.n}`, sub: app.d, fn: async () => { if (p.age < 13) return UI.alert(app.n, 'Idade mínima: 13 anos.'); const v = await UI.prompt(app.n, [{ k: 'u', label: 'Nome de usuário', type: 'text', value: (p.first + p.last).toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '') + R.int(1, 99) }]); if (!v) return; p.social[app.id] = { user: v.u, fol: R.int(5, 60), posts: 0, ver: false, mon: false }; log(`Criei uma conta no ${app.n}.`); } });
    }
    return { title: 'Redes sociais', head: `<p class="muted">Total: ${this.total().toLocaleString('pt-BR')} seguidores. Monetização a partir de 10 mil; verificação a partir de 100 mil.</p>`, items };
  },
  accMenu(app) {
    const p = P(), acc = p.social[app.id];
    return { title: `${app.n} @${acc.user}`, head: `<p class="muted">${acc.fol.toLocaleString('pt-BR')} seguidores • ${acc.posts} posts${acc.ver ? ' • Verificado ☑️' : ''}${acc.mon ? ' • Monetizado 💰' : ''}</p>`, items: [
      ...POST_TYPES.map(pt => ({ ic: '📝', t: pt.n, fn: () => this.post(app, pt) })),
      ...(acc.fol >= 10000 && !acc.mon ? [{ ic: '💰', t: 'Ativar monetização', fn: () => { acc.mon = true; log(`Ativei a monetização no ${app.n}.`); } }] : []),
      ...(acc.fol >= 100000 && !acc.ver ? [{ ic: '☑️', t: 'Pedir verificação', fn: async () => { if (!lim('verif')) return UI.alert('Verificação', 'Pedido em análise.'); if (R.ch(.5)) { acc.ver = true; Meta.ach('verificado'); log(`Fui verificado(a) no ${app.n}! ☑️`, 'good'); return UI.alert('Verificado!', 'Agora você tem o selo! ☑️'); } return UI.alert('Negado', 'Pedido de verificação negado.'); } }] : []),
      { ic: '🗑️', t: 'Excluir conta', cls: 'danger', fn: async () => { if (!(await UI.confirm('Excluir', 'Excluir a conta?'))) return; delete p.social[app.id]; UI.back(); } }
    ] };
  },
  async post(app, pt) {
    const p = P(), acc = p.social[app.id];
    if (!lim('post', 6)) return UI.alert(app.n, 'Você já postou demais este ano. O algoritmo te castigou.');
    if (pt.pet && !p.pets.length) return UI.alert(app.n, 'Você não tem pet!');
    const st = pt.st ? p[pt.st] : 50;
    let gain = Math.round((acc.fol * R.int(1, 12) / 100) + R.int(0, 30) + Math.pow(st / 20, 2) * R.int(1, 10) + p.fame * R.int(5, 50));
    let msg = '';
    if (R.ch(.05)) { gain = gain * R.int(10, 60) + R.int(1000, 50000); msg = 'Seu post VIRALIZOU! 🚀'; fame(5); }
    if (pt.risk && R.ch(pt.risk)) { gain = -Math.round(acc.fol * R.int(10, 40) / 100); msg = 'Você foi cancelado(a)! 😱'; fame(-3); ch('hap', -8); }
    if (pt.ad && acc.fol >= 5000) { const v = M(Math.round(acc.fol / 1000 * R.int(5, 25))); cash(v); msg += ` Publi paga: ${fmt(v)}.`; }
    acc.fol = Math.max(0, acc.fol + gain); acc.posts++; cnt('posts');
    if (this.total() >= 1e6) Meta.ach('milhao_seg');
    if (acc.fol > 1e6) fame(1);
    return UI.alert(pt.n, `${msg}\n${gain >= 0 ? '+' : ''}${gain.toLocaleString('pt-BR')} seguidores.`, app.ic);
  },
  tick() {
    const p = P();
    for (const [id, acc] of Object.entries(p.social)) {
      acc.fol = Math.max(0, Math.round(acc.fol * (1 + R.int(-6, 4) / 100)));
      if (acc.mon && acc.fol >= 10000) { const v = M(Math.round(acc.fol * R.int(2, 6) / 100)); cash(v); if (v > M(1000)) log(`Ganhei ${fmt(v)} com minha conta no ${SOCIAL_APPS.find(a => a.id === id).n}.`); }
    }
    const t = this.total(); if (t > 1e5 && p.fame < 40) fame(2); if (t > 1e6 && p.fame < 70) fame(3);
  }
};
