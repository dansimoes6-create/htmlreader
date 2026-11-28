'use strict';
// ===== Bens e finanças =====
const Assets = {
  mkCar(type, used = false) {
    const val = M(R.int(...type.p)) * (used ? R.int(40, 75) / 100 : 1);
    return { id: uid(), k: 'carro', t: `${R.pick(CAR_BRANDS)} ${type.t}`, ic: type.ic, val: Math.round(val), cond: used ? R.int(35, 85) : 100, loan: 0, pmt: 0, years: 0, yr: G.s.year - (used ? R.int(2, 15) : 0) };
  },
  mkHouse(type) {
    const val = M(R.int(...type.p));
    return { id: uid(), k: 'casa', t: type.t, ic: type.ic, val, cond: R.int(25, 100), beds: type.t === 'Quitinete' ? 1 : R.int(1, type.t === 'Mansão' || type.t === 'Castelo' ? 12 : 5), city: P().city, country: P().country, loan: 0, pmt: 0, years: 0, rented: false, rent: 0, yr: G.s.year - R.int(0, 80) };
  },
  addHeirloom(name, from) { P().assets.push({ id: uid(), k: 'reliquia', t: name, ic: '🏺', val: M(R.int(200, 200000)), cond: R.int(20, 100), cname: R.pick(HEIR_COND), from, inherited: true, loan: 0 }); },
  listings(kind) {
    const s = G.s; s.listings = s.listings || {};
    const key = kind + '_' + s.year + '_' + P().country;
    if (!s.listings[key]) {
      for (const k of Object.keys(s.listings)) if (k.startsWith(kind + '_')) delete s.listings[k];
      let list;
      if (kind === 'casa') list = R.sample(HOUSE_TYPES, 7).map(t => this.mkHouse(t)).sort((a, b) => a.val - b.val);
      else if (kind === 'carro') list = [...R.sample(CAR_TYPES, 6).map(t => this.mkCar(t)), ...R.sample(CAR_TYPES.slice(0, 9), 4).map(t => this.mkCar(t, true))].sort((a, b) => a.val - b.val);
      else if (kind === 'barco') list = BOATS.map(b => ({ id: uid(), k: 'barco', t: b.t, ic: '🛥️', val: M(R.int(...b.p)), cond: 100, loan: 0 }));
      else if (kind === 'aviao') list = AIRCRAFT.map(b => ({ id: uid(), k: 'aviao', t: b.t, ic: b.t === 'Helicóptero' ? '🚁' : '🛩️', val: M(R.int(...b.p)), cond: 100, loan: 0 }));
      else if (kind === 'joia') list = R.sample(JEWELRY, 7).map(j => ({ id: uid(), k: 'joia', t: j.t, ic: j.ring ? '💍' : '💎', val: M(R.int(...j.p)), cond: 100, ring: !!j.ring, loan: 0 }));
      s.listings[key] = list;
    }
    return s.listings[key];
  },
  menu() {
    const p = P();
    const items = [{ ic: '📊', t: 'Finanças', sub: `Patrimônio ${fmt(netWorth(), true)}`, fn: () => UI.open(() => this.finance()) }];
    const groups = [['casa', 'Imóveis'], ['carro', 'Veículos'], ['barco', 'Embarcações'], ['aviao', 'Aeronaves'], ['joia', 'Joias'], ['reliquia', 'Relíquias de família']];
    for (const [k, n] of groups) {
      const list = p.assets.filter(a => a.k === k);
      if (list.length) { items.push({ sep: n }); list.forEach(a => items.push({ ic: a.ic, t: a.t + (a.home ? ' 🏡' : '') + (a.stolen ? ' (roubado)' : ''), sub: `${fmt(a.val, true)}${a.loan > 0 ? ' • deve ' + fmt(a.loan, true) : ''}${a.rented ? ' • alugado' : ''}`, bar: a.k === 'joia' || a.k === 'reliquia' ? null : a.cond, fn: () => UI.open(() => this.assetMenu(a)) })); }
    }
    if (p.age >= 18) {
      items.push({ sep: 'Comprar' });
      items.push({ ic: '🏠', t: 'Imóveis', sub: 'Casas, apartamentos, mansões', fn: () => UI.open(() => this.shop('casa')) });
      items.push({ ic: '🚗', t: 'Concessionária', sub: 'Carros novos e usados', fn: () => UI.open(() => this.shop('carro')) });
      items.push({ ic: '🛥️', t: 'Marina', sub: 'Barcos e iates', fn: () => UI.open(() => this.shop('barco')) });
      items.push({ ic: '🛩️', t: 'Hangar', sub: 'Aviões e helicópteros', fn: () => UI.open(() => this.shop('aviao')) });
      items.push({ ic: '💎', t: 'Joalheria', sub: 'Anéis, colares, relógios', fn: () => UI.open(() => this.shop('joia')) });
    } else items.push({ ic: '🧸', t: 'Você ainda não pode comprar bens', sub: 'Espere até os 18 anos', dis: true });
    return { title: 'Bens', head: `<div class="npchead"><div class="big">${fmt(p.money)}</div><div class="muted">Dinheiro disponível</div></div>`, items };
  },
  finance() {
    const p = P();
    const loans = p.assets.reduce((v, a) => v + (a.loan || 0), 0);
    const income = (p.job?.sal || 0) + (p.pt?.sal || 0) + (p.pension || 0) + p.assets.filter(a => a.rented).reduce((v, a) => v + a.rent, 0);
    const bizVal = (p.sp.biz || []).reduce((v, b) => v + b.val * b.own, 0);
    const assetVal = p.assets.reduce((v, a) => v + a.val, 0);
    const rows = [['Dinheiro', fmt(p.money)], ['Bens', fmt(assetVal)], ['Empresas', fmt(bizVal)], ['Financiamentos', '-' + fmt(loans)], ['Empréstimo estudantil', '-' + fmt(p.debtStudent || 0)], ['Patrimônio líquido', fmt(netWorth())], ['Renda bruta anual', fmt(income)], ['Imposto de renda', Math.round(C().tax * 100) + '%']];
    const items = [];
    if (p.debtStudent > 0) items.push({ ic: '🎓', t: 'Quitar empréstimo estudantil', sub: fmt(p.debtStudent), fn: async () => { const v = Math.min(p.money, p.debtStudent); if (v <= 0) return UI.alert('Sem dinheiro', 'Você não tem dinheiro para pagar.'); cash(-v); p.debtStudent -= v; log(`Paguei ${fmt(v)} do empréstimo estudantil.`); } });
    if (p.money < -M(20000)) items.push({ ic: '📉', t: 'Declarar falência', cls: 'danger', fn: async () => { if (!(await UI.confirm('Falência', 'Declarar falência zera suas dívidas mas você perde todos os bens. Continuar?'))) return; p.money = 0; p.assets = []; p.debtStudent = 0; log('Declarei falência. 📉', 'bad'); ch('hap', -20); } });
    return { title: 'Finanças', head: `<table class="fin">${rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table>`, items };
  },
  shop(kind) {
    const p = P(); const list = this.listings(kind);
    return { title: { casa: 'Imóveis à venda', carro: 'Concessionária', barco: 'Marina', aviao: 'Hangar', joia: 'Joalheria' }[kind], items: list.filter(a => !a.sold).map(a => ({
      ic: a.ic, t: a.t + (a.k === 'carro' && a.cond < 100 ? ' (usado)' : ''), sub: `${fmt(a.val)}${a.k === 'casa' ? ` • ${a.beds} quarto(s) • condição ${a.cond}% • ${G.s.year - a.yr} anos` : a.k === 'carro' ? ` • condição ${a.cond}%` : ''}`,
      fn: () => this.buy(a)
    })) };
  },
  async buy(a) {
    const p = P();
    if ((a.k === 'barco' || a.k === 'aviao') && !(await UI.confirm('Licença', `Lembre-se: para usar ${a.k === 'barco' ? 'barcos você precisa de arrais' : 'aeronaves você precisa de licença de piloto'}. Comprar mesmo assim?`))) return;
    let opts = [{ t: 'Pagar à vista', sub: fmt(a.val), v: 0 }];
    if (['casa', 'carro'].includes(a.k)) opts = opts.concat([{ t: 'Financiar (entrada 10%)', sub: `Entrada ${fmt(a.val * .1)}`, v: .1 }, { t: 'Financiar (entrada 20%)', sub: `Entrada ${fmt(a.val * .2)}`, v: .2 }, { t: 'Financiar (entrada 50%)', sub: `Entrada ${fmt(a.val * .5)}`, v: .5 }]);
    const r = await UI.choose('Pagamento', `${a.t} — ${fmt(a.val)}`, opts); if (r === null) return;
    if (r === 0) { if (!(await pay(a.val))) return; }
    else {
      const down = Math.round(a.val * r);
      if ((p.job?.sal || 0) + (p.pension || 0) < (a.val - down) / 12 && R.ch(.7)) return UI.alert('Crédito negado', 'O banco acha que sua renda é baixa demais para esse financiamento.', '🏦');
      if (!(await pay(down))) return;
      const loan = a.val - down, n = a.k === 'casa' ? 30 : 5, rate = .08;
      a.loan = loan; a.pmt = Math.round(loan * rate / (1 - Math.pow(1 + rate, -n))); a.rate = rate;
    }
    a.sold = true; const own = { ...a }; delete own.sold; own.id = uid(); own.bought = G.s.year;
    p.assets.push(own);
    if (own.k === 'casa' && !p.assets.some(x => x.home)) own.home = true;
    log(`Comprei ${own.t.startsWith('A') || own.t.startsWith('E') ? 'um(a)' : 'um(a)'} ${own.t} por ${fmt(a.val)}. ${own.ic}`, 'good');
    if (own.t === 'Jato executivo') Meta.ach('jatinho'); if (/iate/i.test(own.t)) Meta.ach('iate');
    if (own.k === 'casa') Hunt.find('comprarCasa');
    ch('hap', 6);
    return UI.alert('Comprado!', `${own.t} agora é seu!${own.loan ? `\nParcelas: ${fmt(own.pmt)}/ano.` : ''}`, own.ic);
  },
  assetMenu(a) {
    const p = P(); const items = [];
    if (!p.assets.includes(a)) return { title: a.t, items: [{ t: 'Este bem não é mais seu.', dis: true }] };
    if (a.k === 'casa') {
      if (!a.home) items.push({ ic: '🏡', t: 'Morar aqui', fn: () => { p.assets.forEach(x => x.home = false); a.home = true; a.rented = false; log(`Me mudei para minha ${a.t.toLowerCase()}.`); } });
      items.push({ ic: '🔨', t: 'Reformar', sub: fmt(Math.round(a.val * .08)), fn: async () => { if (!lim('reforma_' + a.id)) return UI.alert('Reforma', 'Já está em obras.'); const c = Math.round(a.val * .08); if (!(await pay(c))) return; const bad = R.ch(.12); a.cond = clamp(a.cond + (bad ? R.int(0, 10) : R.int(20, 45))); a.val = Math.round(a.val * (bad ? 1.02 : R.int(106, 118) / 100)); return UI.alert('Reforma', bad ? 'O empreiteiro sumiu no meio da obra. 😤' : 'A casa ficou linda! O valor subiu.', '🔨'); } });
      if (!a.home) items.push({ ic: '🔑', t: a.rented ? 'Parar de alugar' : 'Alugar para inquilinos', sub: a.rented ? `${fmt(a.rent)}/ano` : `~${fmt(Math.round(a.val * .05))}/ano`, fn: () => { a.rented = !a.rented; a.rent = Math.round(a.val * R.int(35, 65) / 1000); log(a.rented ? `Coloquei minha ${a.t.toLowerCase()} para alugar.` : 'Retomei meu imóvel.'); } });
      items.push({ ic: '🎉', t: 'Dar uma festa', fn: async () => { if (!lim('festa_casa')) return UI.alert('Festa', 'Vizinhos já reclamaram.'); ch('hap', 6); a.cond = clamp(a.cond - R.int(0, 8)); for (const f of alive('amigo')) chR(f, 4); return UI.alert('Festa!', 'A festa foi épica! 🎉', '🎉'); } });
      if (p.age >= 18 && a.cond < 60) items.push({ ic: '👻', t: 'Investigar barulhos estranhos', fn: async () => { if (!lim('fantasma_' + a.id)) return; if (R.ch(.2)) { ch('hap', -5); return UI.alert('Assombrada!', 'Você viu uma figura translúcida no corredor... 👻', '👻'); } return UI.alert('Nada', 'Era só o encanamento velho.'); } });
    }
    if (a.k === 'carro') {
      items.push({ ic: '🛣️', t: 'Dar uma volta', fn: async () => { if (!lim('dirigir_' + a.id, 2)) return UI.alert('Volta', 'Já rodou bastante.'); ch('hap', 3); const risk = .02 + (100 - a.cond) / 800 + (!p.lic.carro ? .05 : 0) + (p.addict.alcool ? .05 : 0); if (!p.lic.carro && R.ch(.15)) { const f = M(800); cash(-f); return UI.alert('Blitz', `Você foi parado(a) sem carteira. Multa de ${fmt(f)}.`, '👮'); } if (R.ch(risk)) { const d = R.int(10, 60); ch('hea', -d); a.cond = clamp(a.cond - 40); log('Sofri um acidente de carro. 🚑', 'bad'); if (p.hea <= 0) { die('um acidente de carro'); return; } return UI.alert('Acidente!', `Você bateu o carro (-${d} saúde).`, '🚑'); } return UI.alert('Volta', 'Janela aberta, música alta. 🎶', '🚗'); } });
      items.push({ ic: '🔧', t: 'Manutenção', sub: fmt(Math.round(a.val * .05 + M(200))), fn: async () => { if (!(await pay(Math.round(a.val * .05 + M(200))))) return; a.cond = clamp(a.cond + R.int(15, 35)); return UI.alert('Oficina', 'Seu carro está novinho.', '🔧'); } });
    }
    if (a.k === 'barco' || a.k === 'aviao') items.push({ ic: a.k === 'barco' ? '🌊' : '☁️', t: a.k === 'barco' ? 'Navegar' : 'Voar', fn: async () => { const need = a.k === 'barco' ? 'barco' : 'aviao'; if (!p.lic[need]) return UI.alert('Licença', 'Você não tem licença para isso. Contrate um piloto (Atividades › Licenças).'); if (!lim('usar_' + a.id)) return; ch('hap', 8); if (R.ch(.015)) { die(a.k === 'barco' ? 'um naufrágio' : 'um acidente aéreo'); return; } return UI.alert('Passeio', 'Que vista incrível!', a.ic); } });
    if (a.k === 'reliquia') items.push({ ic: '🔍', t: 'Avaliar', fn: () => UI.alert(a.t, `Condição: ${a.cname}\nValor estimado: ${fmt(a.val)}\nOrigem: ${a.from || 'desconhecida'}`, '🏺') });
    if (a.loan > 0) items.push({ ic: '🏦', t: 'Quitar financiamento', sub: fmt(a.loan), fn: async () => { if (!(await pay(a.loan))) return; a.loan = 0; a.pmt = 0; log(`Quitei o financiamento de ${a.t}.`, 'good'); } });
    items.push({ ic: '💰', t: 'Vender', sub: `~${fmt(Math.round(a.val * (a.stolen ? .3 : .95) - (a.loan || 0)))}`, fn: async () => {
      if (!(await UI.confirm('Vender', `Vender ${a.t}?`))) return;
      const v = Math.round(a.val * (a.stolen ? R.int(15, 40) / 100 : R.int(85, 105) / 100)) - (a.loan || 0);
      if (a.stolen && R.ch(.2)) { p.assets = p.assets.filter(x => x !== a); await UI.alert('Polícia!', 'O comprador era policial disfarçado!', '🚓'); return Crime.arrest('Receptação de veículo roubado', [1, 3]); }
      cash(v); p.assets = p.assets.filter(x => x !== a); log(`Vendi ${a.t} por ${fmt(v)}.`); UI.back();
    } });
    if (a.k === 'joia' || a.k === 'reliquia') items.push({ ic: '🎁', t: 'Dar de presente', sub: 'Escolha em Relacionamentos › Dar um presente', dis: true });
    return { title: a.t, head: `<div class="npchead"><div class="muted">Valor ${fmt(a.val)}${a.loan ? ` • deve ${fmt(a.loan)} (${fmt(a.pmt)}/ano)` : ''}${a.city ? ' • ' + esc(a.city) : ''}</div>${a.cond !== undefined && a.k !== 'joia' ? `<div class="mini"><span>Condição</span><div class="mbar"><i style="width:${a.cond}%"></i></div></div>` : ''}</div>`, items };
  },
  tick() {
    const p = P();
    for (const a of p.assets.slice()) {
      a.years = (a.years || 0) + 1;
      if (a.k === 'casa') { a.val = Math.round(a.val * (1 + R.int(-3, 8) / 100)); a.cond = clamp(a.cond - R.int(0, 4)); cash(-Math.round(a.val * .006)); if (a.rented) { cash(Math.round(a.rent * (1 - C().tax))); if (R.ch(.08)) { a.cond = clamp(a.cond - 15); log(`Os inquilinos da minha ${a.t.toLowerCase()} destruíram parte do imóvel.`, 'bad'); } } }
      else if (a.k === 'carro') { a.val = Math.round(a.val * R.int(82, 92) / 100); a.cond = clamp(a.cond - R.int(3, 10)); cash(-M(400)); if (a.cond <= 0) { p.assets = p.assets.filter(x => x !== a); log(`Meu ${a.t} deu perda total de tão velho.`, 'bad'); continue; } }
      else if (a.k === 'barco' || a.k === 'aviao') { a.val = Math.round(a.val * R.int(88, 96) / 100); cash(-Math.round(a.val * .04)); }
      else if (a.k === 'joia' || a.k === 'reliquia') { a.val = Math.round(a.val * (1 + R.int(-2, 6) / 100)); }
      if (a.loan > 0) {
        const interest = Math.round(a.loan * (a.rate || .08)); const pmt = Math.min(a.pmt, a.loan + interest);
        cash(-pmt); a.loan = Math.max(0, a.loan + interest - pmt);
        if (a.loan === 0) log(`Quitei o financiamento de ${a.t}! 🎉`, 'good');
        if (p.money < -M(30000) && R.ch(.4)) { p.assets = p.assets.filter(x => x !== a); log(`O banco tomou ${a.t} por falta de pagamento!`, 'bad'); }
      }
    }
    if (p.assets.filter(a => a.k === 'joia').length >= 5) cnt('joias5', 0);
  }
};
