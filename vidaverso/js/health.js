'use strict';
// ===== Saúde, doenças, vícios, cirurgias =====
const Health = {
  add(name, quiet = false) {
    const p = P(); const d = DISEASES.find(x => x.n === name); if (!d) return;
    if (p.vamp && !d.mental) return;
    if (p.ill.some(i => i.n === name)) return;
    p.ill.push({ n: d.n, sev: d.sev, cure: d.cure, yrs: 0, mental: !!d.mental, std: !!d.std });
    if (!quiet) log(`Fui diagnosticado(a) com ${d.n.toLowerCase()}. 🤒`, 'bad');
    ch('hap', -d.sev * 3);
  },
  randomIll() {
    const p = P();
    const opts = DISEASES.filter(d => !d.std && (!d.minA || p.age >= d.minA) && (!d.maxA || p.age <= d.maxA) && !p.ill.some(i => i.n === d.n));
    const d = R.wpick(opts, x => x.sev === 4 ? (p.age > 50 ? 1.2 : .1) : x.sev === 3 ? (p.age > 40 ? 1 : .4) : 3);
    if (d) this.add(d.n);
  },
  tick() {
    const p = P();
    if (p.vamp) { p.ill = p.ill.filter(i => i.mental); }
    // contrair doença
    let risk = .07 + (p.age > 50 ? .06 : 0) + (p.age > 70 ? .08 : 0) + (100 - p.hea) / 600;
    if (p.diet) risk -= .02;
    if (!p.vamp && R.ch(risk)) this.randomIll();
    if (!p.ill.some(i => !i.mental) && p.age < 45) ch('hea', R.int(0, 3));
    // efeitos
    for (const i of p.ill.slice()) {
      i.yrs++;
      if (i.mental) { ch('hap', -R.int(4, 10)); }
      else ch('hea', -[0, R.int(0, 2), R.int(1, 4), R.int(2, 7), R.int(5, 13)][i.sev]);
      const heal = [0, .6, .3, .1, .04][i.sev] + (p.age < 30 ? .1 : 0);
      if (!i.mental && i.cure > .3 && R.ch(heal)) { p.ill = p.ill.filter(x => x !== i); log(`Me recuperei de ${i.n.toLowerCase()}.`, 'good'); }
    }
    // vícios
    const a = p.addict;
    if (a.alcool) { ch('hea', -a.alcool); ch('hap', R.int(-3, 2)); if (R.ch(.04 * a.alcool) && !p.vamp) { log('Tive um coma alcoólico. 🍾', 'bad'); ch('hea', -20); } }
    if (a.cigarro) { ch('hea', -a.cigarro); if (p.age > 40 && R.ch(.03 * a.cigarro)) this.add('Câncer'); }
    if (a.jogo) { const loss = Math.round(Math.max(M(200), p.money * .05 * a.jogo)); if (p.money > 0) { cash(-loss); log(`O vício em jogo me custou ${fmt(loss)} este ano.`, 'bad'); } }
    if (a.drogas) { ch('hea', -a.drogas * 2); ch('smr', -1); }
    if (p.hea <= 0 && !p.vamp) { const ph = p.ill.filter(i => !i.mental && i.sev >= 2).sort((a, b) => b.sev - a.sev); die(ph.length ? ph[0].n.toLowerCase() : p.age > 70 ? 'velhice' : 'complicações de saúde'); }
  },
  addict(k, quiet) {
    const p = P(); const was = p.addict[k] || 0; p.addict[k] = Math.min(5, was + 1);
    const nm = { alcool: 'álcool', cigarro: 'cigarro', jogo: 'jogos de azar', drogas: 'substâncias' }[k];
    if (!was && !quiet) log(`Acho que estou ficando viciado(a) em ${nm}.`, 'bad');
    G.s.flags.everAddicted = true;
  },
  // ------- menus -------
  doctorMenu() {
    const p = P();
    const items = [];
    items.push({ ic: '🩺', t: 'Check-up geral', sub: 'Descobre doenças escondidas', fn: async () => {
      const c = C().health ? 0 : M(200); if (!(await pay(c, 'o check-up'))) return;
      if (!lim('checkup', 2)) return UI.alert('Check-up', 'Você já fez check-ups demais este ano.');
      if (R.ch(.25) && p.age > 20) { Health.randomIll(); return UI.alert('Check-up', `O médico encontrou algo: ${p.ill[p.ill.length - 1]?.n || 'nada'}.`, '🩺'); }
      ch('hea', 2); return UI.alert('Check-up', 'Está tudo bem com você! Continue se cuidando.', '✅');
    } });
    for (const i of p.ill) {
      items.push({ ic: i.mental ? '🧠' : '🤒', t: i.n, sub: `Gravidade ${'●'.repeat(i.sev)}${'○'.repeat(4 - i.sev)} • há ${i.yrs} ano(s)`, fn: () => UI.open(() => this.treatMenu(i)) });
    }
    const adds = Object.entries(p.addict).filter(([, v]) => v > 0);
    if (adds.length) items.push({ ic: '🏥', t: 'Clínica de reabilitação', sub: 'Tratar vícios', fn: () => this.rehab() });
    items.push({ ic: '💊', t: 'Pedir remédios para dormir', sub: '', fn: async () => { if (!lim('remedio')) return UI.alert('Farmácia', 'Já pegou este ano.'); p.ill = p.ill.filter(i => i.n !== 'Insônia'); ch('hap', 3); return UI.alert('Farmácia', 'Você está dormindo melhor.', '😴'); } });
    items.push({ ic: '💉', t: 'Tomar vacinas', sub: 'Menos chance de doenças', fn: async () => { if (!lim('vacina')) return UI.alert('Vacinas', 'Você já se vacinou este ano.'); ch('hea', 3); G.s.flags.vacinado = G.s.year; return UI.alert('Vacinas', 'Vacinas em dia! 💪', '💉'); } });
    return { title: 'Médico', items };
  },
  treatMenu(ill) {
    const p = P(); const free = C().health;
    return { title: `Tratar ${ill.n}`, items: TREATMENTS.map(t => {
      const cost = (t.free && free) ? 0 : M(t.cost) * (ill.sev >= 3 ? 3 : 1);
      return { ic: t.ic, t: t.n, sub: cost ? fmt(cost) : 'Gratuito (saúde pública)', fn: async () => {
        if (!p.ill.includes(ill)) return UI.back();
        if (!(await pay(cost, 'o tratamento'))) return;
        const chance = t.p * (ill.cure + (1 - ill.cure) * .3);
        if (t.risky && R.ch(.1)) { ch('hea', -15); await UI.alert(t.n, 'O tratamento piorou as coisas! Você passou mal.', '🤢'); if (p.hea <= 0) die('tratamento malsucedido'); return; }
        if (R.ch(chance)) { p.ill = p.ill.filter(x => x !== ill); ch('hea', 5); ch('hap', 5); log(`Fui curado(a) de ${ill.n.toLowerCase()}! 🎉`, 'good'); await UI.alert('Sucesso', `Você está curado(a) de ${ill.n}!`, '✅'); UI.back(); }
        else { await UI.alert('Sem melhora', `O tratamento não funcionou para ${ill.n}.`, '😞'); }
      } };
    }).concat(ill.mental ? [{ ic: '🛋️', t: 'Terapia com psicólogo', sub: fmt(M(150) * 4), fn: async () => {
      if (!(await pay(M(600), 'a terapia'))) return;
      if (R.ch(.55)) { p.ill = p.ill.filter(x => x !== ill); log(`A terapia me ajudou a superar ${ill.n.toLowerCase()}.`, 'good'); ch('hap', 15); await UI.alert('Terapia', 'Você se sente muito melhor. 🌤️', '🛋️'); UI.back(); }
      else { ch('hap', 5); await UI.alert('Terapia', 'Foi uma boa sessão, mas ainda há trabalho a fazer.', '🛋️'); }
    } }] : []) };
  },
  async rehab() {
    const p = P(); const cost = C().health ? M(500) : M(15000);
    if (!(await UI.confirm('Reabilitação', `Internar-se por um período custa ${fmt(cost)}. Continuar?`))) return;
    if (!(await pay(cost, 'a reabilitação'))) return;
    let msg = [];
    for (const k of Object.keys(p.addict)) { if (p.addict[k] > 0 && R.ch(.35 + p.will / 200)) { p.addict[k] = 0; msg.push(`Larguei o vício em ${k}.`); } }
    ch('hea', 8); ch('will', 5);
    if (!msg.length) msg.push('A reabilitação foi difícil e eu recaí.');
    msg.forEach(m => log(m, 'good'));
    return UI.alert('Reabilitação', msg.join('\n'), '🏥');
  },
  surgeryMenu() {
    const p = P();
    return { title: 'Cirurgia plástica', items: SURGERIES.filter(s => (!s.g || s.g === p.g) && (!s.minA || p.age >= s.minA)).map(s => ({
      ic: '💉', t: s.n, sub: `${fmt(M(s.c))} • aparência +${s.loo}`, fn: async () => {
        if (p.age < 18) return UI.alert('Cirurgia', 'Você precisa ter 18 anos.');
        const clinic = await UI.choose('Escolha a clínica', 'Clínicas mais baratas têm mais risco.', [
          { t: 'Clínica premium', sub: fmt(M(s.c * 1.6)), v: 1.6 }, { t: 'Clínica comum', sub: fmt(M(s.c)), v: 1 }, { t: 'Clínica de fundo de quintal', sub: fmt(M(s.c * .35)), v: .35 }]);
        if (!clinic) return;
        if (!(await pay(M(s.c * clinic), 'a cirurgia'))) return;
        const bad = clinic === 1.6 ? .04 : clinic === 1 ? .12 : .35;
        cnt('cirurgias');
        if (R.ch(bad)) { ch('loo', -R.int(8, 20)); ch('hap', -15); log(`Minha ${s.n.toLowerCase()} deu errado! 😱`, 'bad'); if (R.ch(.05)) { ch('hea', -40); if (p.hea <= 0) return die('complicações cirúrgicas'); } return UI.alert('Deu errado', `A ${s.n} ficou horrível. Aparência caiu.`, '😱'); }
        ch('loo', s.loo + R.int(-2, 4)); ch('hap', 6); log(`Fiz ${s.n.toLowerCase()}. Ficou ótimo!`, 'good');
        return UI.alert('Sucesso', `A ${s.n} foi um sucesso!`, '✨');
      } })) };
  }
};
