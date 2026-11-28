'use strict';
// ===== Minijogos =====
const Mini = {
  async bet() {
    const p = P(); const c = C();
    if (p.money <= 0) { await UI.alert('Sem dinheiro', 'Você não tem dinheiro para apostar.'); return null; }
    const opts = [10, 100, 1000, 10000, 100000].map(x => M(x)).filter(x => x <= p.money);
    const r = await UI.choose('Aposta', `Saldo: ${fmt(p.money)}. Quanto apostar?`, opts.map(v => ({ t: fmt(v), v })).concat([{ t: 'Tudo!', sub: fmt(p.money), v: p.money }]));
    return r || null;
  },
  // ---------- Blackjack ----------
  async blackjack() {
    const bet = await this.bet(); if (!bet) return;
    const suits = ['♠', '♥', '♦', '♣'], ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    let deck = R.shuffle(suits.flatMap(s => ranks.map(r => ({ s, r }))));
    const val = h => { let t = 0, a = 0; for (const c of h) { if (c.r === 'A') { a++; t += 11; } else t += ['J', 'Q', 'K'].includes(c.r) ? 10 : Number(c.r); } while (t > 21 && a) { t -= 10; a--; } return t; };
    const card = c => `<span class="card ${['♥', '♦'].includes(c.s) ? 'red' : ''}">${c.r}${c.s}</span>`;
    const res = await UI.custom('Blackjack', (el, done) => {
      let ph = [deck.pop(), deck.pop()], dh = [deck.pop(), deck.pop()], stake = bet, over = false;
      const draw = (msg = '') => {
        el.innerHTML = `<div class="mg"><div class="muted">Banca ${over ? '(' + val(dh) + ')' : ''}</div><div class="hand">${over ? dh.map(card).join('') : card(dh[0]) + '<span class="card back">?</span>'}</div>
          <div class="muted">Você (${val(ph)}) • aposta ${fmt(stake)}</div><div class="hand">${ph.map(card).join('')}</div><div class="mgmsg">${msg}</div>
          <div class="mgbtns">${over ? '<button class="btn" data-a="ok">Continuar</button>' : '<button class="btn" data-a="hit">Pedir carta</button><button class="btn" data-a="stand">Parar</button>' + (ph.length === 2 && P().money >= stake * 2 ? '<button class="btn alt" data-a="dbl">Dobrar</button>' : '')}</div></div>`;
      };
      const finish = () => {
        over = true; while (val(dh) < 17) dh.push(deck.pop());
        const pv = val(ph), dv = val(dh); let w = 0, msg;
        if (pv > 21) { w = -1; msg = 'Estourou! 💥'; } else if (dv > 21 || pv > dv) { w = 1; msg = pv === 21 && ph.length === 2 ? 'BLACKJACK! 🃏' : 'Você venceu! 🎉'; } else if (pv === dv) msg = 'Empate.'; else { w = -1; msg = 'A banca venceu.'; }
        if (G.s.flags.luck && w < 0 && R.ch(.4)) { w = 1; msg = 'A sorte virou o jogo! 🍀 Você venceu!'; } G.s.flags.luck = false;
        const amt = w * stake * (pv === 21 && ph.length === 2 && w > 0 ? 1.5 : 1); cash(Math.round(amt));
        if (w > 0 && pv === 21) Meta.ach('cassino');
        draw(`${msg} ${w ? (w > 0 ? '+' : '') + fmt(amt) : ''}`); el.dataset.result = String(amt);
      };
      el.onclick = e => { const a = e.target.dataset?.a; if (!a) return;
        if (a === 'hit') { ph.push(deck.pop()); if (val(ph) >= 21) finish(); else draw(); }
        if (a === 'stand') finish();
        if (a === 'dbl') { stake *= 2; ph.push(deck.pop()); finish(); }
        if (a === 'ok') done(Number(el.dataset.result)); };
      if (val(ph) === 21) finish(); else draw();
    });
    if (res !== null && res !== undefined) log(`Joguei blackjack: ${res >= 0 ? 'ganhei' : 'perdi'} ${fmt(Math.abs(res))}.`);
  },
  // ---------- Roleta ----------
  async roulette() {
    const bet = await this.bet(); if (!bet) return;
    const reds = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    const choice = await UI.choose('Roleta', 'Apostar em:', [{ t: '🔴 Vermelho', sub: 'paga 1:1', v: 'red' }, { t: '⚫ Preto', sub: 'paga 1:1', v: 'black' }, { t: 'Par', sub: 'paga 1:1', v: 'even' }, { t: 'Ímpar', sub: 'paga 1:1', v: 'odd' }, { t: '1 a 12', sub: 'paga 2:1', v: 'd1' }, { t: 'Número da sorte (7)', sub: 'paga 35:1', v: 'n7' }, { t: 'Zero', sub: 'paga 35:1', v: 'n0' }]);
    if (!choice) return;
    let n = R.int(0, 36); if (G.s.flags.luck && R.ch(.3)) n = choice === 'n7' ? 7 : choice === 'red' ? 1 : choice === 'black' ? 2 : n; G.s.flags.luck = false;
    const red = reds.includes(n);
    const win = { red: red && n, black: !red && n, even: n && n % 2 === 0, odd: n % 2 === 1, d1: n >= 1 && n <= 12, n7: n === 7, n0: n === 0 }[choice];
    const mult = { d1: 2, n7: 35, n0: 35 }[choice] || 1;
    await UI.custom('Roleta', (el, done) => {
      let i = 0; const spin = setInterval(() => { el.innerHTML = `<div class="mg"><div class="wheel">${R.int(0, 36)}</div><div class="mgmsg">Girando...</div></div>`; if (++i > 18) { clearInterval(spin); const amt = win ? bet * mult : -bet; cash(amt); el.innerHTML = `<div class="mg"><div class="wheel ${n === 0 ? 'green' : red ? 'red' : 'black'}">${n}</div><div class="mgmsg">${win ? `Você ganhou ${fmt(bet * mult)}! 🎉` : `Perdeu ${fmt(bet)}.`}</div><div class="mgbtns"><button class="btn" data-a="ok">Continuar</button></div></div>`; el.onclick = e => e.target.dataset?.a && done(amt); } }, 70);
    });
  },
  // ---------- Caça-níquel ----------
  async slots() {
    const bet = await this.bet(); if (!bet) return;
    const sym = ['🍒', '🍋', '🔔', '⭐', '💎', '7️⃣', '🍀'];
    const r = [R.pick(sym), R.pick(sym), R.pick(sym)];
    if (G.s.flags.luck && R.ch(.4)) { r[1] = r[0]; } G.s.flags.luck = false;
    let mult = -1;
    if (r[0] === r[1] && r[1] === r[2]) mult = r[0] === '7️⃣' ? 50 : r[0] === '💎' ? 25 : 8;
    else if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) mult = 1;
    await UI.custom('Caça-níquel', (el, done) => {
      let i = 0; const t = setInterval(() => {
        const show = i < 15 ? [R.pick(sym), R.pick(sym), R.pick(sym)] : r;
        el.innerHTML = `<div class="mg"><div class="reels">${show.map(s => `<span>${s}</span>`).join('')}</div><div class="mgmsg">${i < 15 ? '...' : mult > 0 ? `Ganhou ${fmt(bet * mult)}! 🎉` : 'Nada desta vez.'}</div>${i >= 15 ? '<div class="mgbtns"><button class="btn" data-a="ok">Continuar</button></div>' : ''}</div>`;
        if (++i > 15) { clearInterval(t); cash(bet * mult); el.onclick = e => e.target.dataset?.a && done(bet * mult); }
      }, 80);
    });
  },
  // ---------- Cavalos ----------
  async horses() {
    const names = R.sample(['Relâmpago', 'Pé de Pano', 'Tormenta', 'Faísca', 'Sultão', 'Cometa', 'Zé Ventania', 'Princesa', 'Trovão Negro', 'Biscoito'], 6);
    const horses = names.map(n => ({ n, sp: R.int(70, 100) })); const odds = horses.map(h => Math.max(1.5, Math.round((200 - h.sp * 1.6) / 10 * 10) / 10));
    const pick = await UI.choose('Corrida de cavalos', 'Em qual cavalo apostar?', horses.map((h, i) => ({ t: `🐎 ${h.n}`, sub: `paga ${odds[i]}:1`, v: String(i) }))); if (pick === null) return;
    const bet = await this.bet(); if (!bet) return;
    const idx = Number(pick);
    await UI.custom('Corrida!', (el, done) => {
      const pos = horses.map(() => 0); let winner = -1; const luck = G.s.flags.luck; G.s.flags.luck = false;
      const t = setInterval(() => {
        horses.forEach((h, i) => { pos[i] += (h.sp / 100) * R.int(1, 6) * (luck && i === idx ? 1.2 : 1); if (pos[i] >= 100 && winner < 0) winner = i; });
        el.innerHTML = `<div class="mg"><div class="track">${horses.map((h, i) => `<div class="lane ${i === idx ? 'mine' : ''}"><span class="lname">${h.n}</span><div class="lbar"><i style="left:${Math.min(92, pos[i])}%">🐎</i></div></div>`).join('')}</div>
          <div class="mgmsg">${winner >= 0 ? (winner === idx ? `${horses[winner].n} venceu! Você ganhou ${fmt(bet * odds[idx])}! 🎉` : `${horses[winner].n} venceu. Você perdeu ${fmt(bet)}.`) : ''}</div>${winner >= 0 ? '<div class="mgbtns"><button class="btn" data-a="ok">Continuar</button></div>' : ''}</div>`;
        if (winner >= 0) { clearInterval(t); const amt = winner === idx ? Math.round(bet * odds[idx]) : -bet; cash(amt); el.onclick = e => e.target.dataset?.a && done(amt); }
      }, 120);
    });
  },
  // ---------- Assalto a casa ----------
  async burglary(tier, bonus) {
    const rooms = ['Sala', 'Cozinha', 'Quarto principal', 'Escritório', 'Garagem', 'Porão', 'Quarto de hóspedes', 'Banheiro', 'Closet'];
    const lootByTier = { 1: [['TV velha', 150], ['Notebook', 400], ['Moedas', 30], ['Relógio', 120]], 3: [['TV 4K', 900], ['Joias', 2500], ['Notebook gamer', 1500], ['Dinheiro no colchão', 3000]], 10: [['Quadro valioso', 40000], ['Cofre com dinheiro', 80000], ['Relógio suíço', 25000], ['Colar de diamantes', 60000]] }[tier];
    const grid = R.sample(rooms, 6).map(n => { const r = R.f(); return { n, c: r < .35 ? 'loot' : r < .35 + (.12 * Math.sqrt(tier)) - bonus / 2 ? 'alarm' : r < .62 ? 'dog' : 'nada', open: false, loot: R.pick(lootByTier) }; });
    return UI.custom('Assalto a residência', (el, done) => {
      let got = [], total = 0, alert = 0, ended = false;
      const draw = (msg) => {
        el.innerHTML = `<div class="mg"><p class="muted">Escolha os cômodos para vasculhar. Cuidado com alarmes e cães! Alerta: ${'🚨'.repeat(alert)}${'▫️'.repeat(Math.max(0, 3 - alert))}</p>
          <div class="rooms">${grid.map((r, i) => `<button class="room ${r.open ? 'open' : ''}" data-i="${i}" ${r.open || ended ? 'disabled' : ''}>${r.open ? ({ loot: '💰', alarm: '🚨', dog: '🐕', nada: '🕸️' }[r.c]) : '🚪'}<small>${r.n}</small></button>`).join('')}</div>
          <div class="mgmsg">${msg || ''}</div><div class="mgbtns">${ended ? '<button class="btn" data-a="ok">Continuar</button>' : `<button class="btn alt" data-a="leave">Fugir com o que tem (${fmt(total)})</button>`}</div></div>`;
      };
      el.onclick = e => {
        const t = e.target.closest('[data-i],[data-a]'); if (!t) return;
        if (t.dataset.a === 'ok') return done({ caught: el.dataset.caught === '1', loot: total, items: got });
        if (t.dataset.a === 'leave') { ended = true; cash(0); return draw(`Você saiu de fininho.`); }
        const r = grid[Number(t.dataset.i)]; if (!r || r.open) return; r.open = true;
        if (r.c === 'loot') { const v = M(r.loot[1] * R.int(60, 140) / 100); total += v; got.push(r.loot[0].toLowerCase()); return draw(`Você pegou ${r.loot[0]} (${fmt(v)})!`); }
        if (r.c === 'nada') return draw('Nada de valor aqui.');
        alert += r.c === 'alarm' ? 2 : 1;
        if (alert >= 3 || (r.c === 'alarm' && R.ch(.5))) { ended = true; el.dataset.caught = R.ch(.7) ? '1' : '0'; total = el.dataset.caught === '1' ? 0 : total; return draw(el.dataset.caught === '1' ? 'O alarme tocou e a polícia chegou! 🚓' : 'O alarme tocou! Você fugiu pela janela com o que deu.'); }
        draw(r.c === 'dog' ? 'Um cachorro começou a latir! 🐕' : 'Um sensor piscou... 🚨');
      };
      draw();
    });
  },
  // ---------- Hacker ----------
  async hack(diff, skill) {
    const L = 4, digits = [1, 2, 3, 4, 5, 6]; const code = Array.from({ length: L }, () => R.pick(digits));
    const tries = clamp(10 - diff + (skill > 80 ? 2 : skill > 60 ? 1 : 0), 4, 10);
    return UI.custom('Invasão hacker', (el, done) => {
      let hist = [], cur = [], over = null;
      const fb = g => { let a = 0, b = 0; const cr = code.slice(), gr = g.slice(); for (let i = 0; i < L; i++) if (gr[i] === cr[i]) { a++; cr[i] = gr[i] = null; } for (let i = 0; i < L; i++) if (gr[i] !== null) { const j = cr.indexOf(gr[i]); if (j >= 0) { b++; cr[j] = null; } } return [a, b]; };
      const draw = () => {
        el.innerHTML = `<div class="mg term"><p>&gt; Quebre a senha de ${L} dígitos (1-6). ${tries - hist.length} tentativa(s).</p><p class="muted">✅ = dígito e posição certos • 🔸 = dígito certo, posição errada</p>
          ${hist.map(([g, [a, b]]) => `<div class="hrow"><code>${g.join('')}</code> ${'✅'.repeat(a)}${'🔸'.repeat(b)}</div>`).join('')}
          ${over === null ? `<div class="hrow cur"><code>${cur.join('') || '____'}</code></div><div class="keys">${digits.map(d => `<button class="key" data-d="${d}">${d}</button>`).join('')}<button class="key" data-k="del">⌫</button><button class="key ok" data-k="go">↵</button></div>` : `<div class="mgmsg">${over ? 'ACESSO CONCEDIDO 🔓' : `ACESSO NEGADO 🔒 (senha: ${code.join('')})`}</div><div class="mgbtns"><button class="btn" data-k="ok">Continuar</button></div>`}
          ${over === null ? '<div class="mgbtns"><button class="btn alt" data-k="quit">Desconectar</button></div>' : ''}</div>`;
      };
      el.onclick = e => {
        const t = e.target.closest('[data-d],[data-k]'); if (!t) return;
        if (t.dataset.d && cur.length < L) cur.push(Number(t.dataset.d));
        if (t.dataset.k === 'del') cur.pop();
        if (t.dataset.k === 'quit') return done(false);
        if (t.dataset.k === 'ok') return done(over);
        if (t.dataset.k === 'go' && cur.length === L) { const f = fb(cur); hist.push([cur, f]); cur = []; if (f[0] === L) over = true; else if (hist.length >= tries) over = false; }
        draw();
      };
      draw();
    });
  },
  // ---------- Fuga da prisão (labirinto) ----------
  async maze(size, nGuards) {
    const W = size, H = size;
    const walls = Array.from({ length: H }, () => Array.from({ length: W }, () => ({ n: 1, s: 1, e: 1, w: 1 })));
    const seen = Array.from({ length: H }, () => Array(W).fill(false));
    const stack = [[0, 0]]; seen[0][0] = true;
    while (stack.length) {
      const [x, y] = stack[stack.length - 1];
      const nb = [[0, -1, 'n', 's'], [0, 1, 's', 'n'], [1, 0, 'e', 'w'], [-1, 0, 'w', 'e']].map(([dx, dy, a, b]) => [x + dx, y + dy, a, b]).filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < W && ny < H && !seen[ny][nx]);
      if (!nb.length) { stack.pop(); continue; }
      const [nx, ny, a, b] = R.pick(nb); walls[y][x][a] = 0; walls[ny][nx][b] = 0; seen[ny][nx] = true; stack.push([nx, ny]);
    }
    // remove algumas paredes extras para criar ciclos
    for (let i = 0; i < size; i++) { const x = R.int(0, W - 2), y = R.int(0, H - 1); walls[y][x].e = 0; walls[y][x + 1].w = 0; }
    return UI.custom('Fuga da prisão', (el, done) => {
      let px = 0, py = 0, over = null;
      const exit = [W - 1, H - 1];
      const guards = Array.from({ length: nGuards }, () => [R.int(Math.floor(W / 2), W - 1), R.int(1, H - 1)]);
      const can = (x, y, d) => !walls[y][x][d];
      const moveG = () => guards.forEach(g => { const opts = [['n', 0, -1], ['s', 0, 1], ['e', 1, 0], ['w', -1, 0]].filter(([d]) => can(g[0], g[1], d)); const toward = opts.filter(([, dx, dy]) => Math.abs(g[0] + dx - px) + Math.abs(g[1] + dy - py) < Math.abs(g[0] - px) + Math.abs(g[1] - py)); const [, dx, dy] = (toward.length && R.ch(.45)) ? R.pick(toward) : R.pick(opts); g[0] += dx; g[1] += dy; });
      const caught = () => guards.some(g => g[0] === px && g[1] === py);
      const draw = () => {
        let html = `<div class="mg"><p class="muted">Leve seu personagem 🏃 até a saída 🚪 sem encostar nos guardas 👮. Use as setas.</p><div class="maze" style="grid-template-columns:repeat(${W},1fr)">`;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const w = walls[y][x]; const g = guards.some(q => q[0] === x && q[1] === y);
          html += `<div class="cell" style="border-top-width:${w.n ? 2 : 0}px;border-bottom-width:${w.s ? 2 : 0}px;border-left-width:${w.w ? 2 : 0}px;border-right-width:${w.e ? 2 : 0}px">${x === px && y === py ? '🏃' : g ? '👮' : (x === exit[0] && y === exit[1]) ? '🚪' : ''}</div>`;
        }
        html += `</div>${over === null ? `<div class="pad"><button data-m="n">⬆️</button><div><button data-m="w">⬅️</button><button data-m="s">⬇️</button><button data-m="e">➡️</button></div></div><div class="mgbtns"><button class="btn alt" data-m="quit">Desistir</button></div>` : `<div class="mgmsg">${over ? 'Você escapou! 🎉' : 'Um guarda te pegou! 👮'}</div><div class="mgbtns"><button class="btn" data-m="ok">Continuar</button></div>`}</div>`;
        el.innerHTML = html;
      };
      const step = d => {
        if (over !== null) return;
        if (!can(px, py, d)) return;
        px += { e: 1, w: -1 }[d] || 0; py += { s: 1, n: -1 }[d] || 0;
        if (caught()) { over = false; return draw(); }
        if (px === exit[0] && py === exit[1]) { over = true; return draw(); }
        moveG(); if (caught()) over = false; draw();
      };
      el.onclick = e => { const m = e.target.closest('[data-m]')?.dataset.m; if (!m) return; if (m === 'quit') { document.removeEventListener('keydown', key); return done(false); } if (m === 'ok') { document.removeEventListener('keydown', key); return done(over); } step(m); };
      const key = e => { const m = { ArrowUp: 'n', ArrowDown: 's', ArrowLeft: 'w', ArrowRight: 'e' }[e.key]; if (m) { e.preventDefault(); step(m); } };
      document.addEventListener('keydown', key);
      draw();
    });
  },
  // ---------- Pesca ----------
  async fishing() {
    return UI.custom('Pescaria', (el, done) => {
      let pos = 0, dir = 1, stopped = false; const zone = [R.int(20, 60)]; zone.push(zone[0] + R.int(14, 22));
      const speed = R.int(2, 4);
      el.innerHTML = `<div class="mg"><p class="muted">Toque em "Puxar!" quando o peixe 🐟 estiver na área verde.</p><div class="fishbar"><div class="zone" style="left:${zone[0]}%;width:${zone[1] - zone[0]}%"></div><span class="fish">🐟</span></div><div class="mgmsg"></div><div class="mgbtns"><button class="btn" data-a="pull">🎣 Puxar!</button></div></div>`;
      const fish = el.querySelector('.fish');
      const t = setInterval(() => { if (stopped) return; pos += dir * speed; if (pos >= 95 || pos <= 0) dir *= -1; fish.style.left = pos + '%'; }, 30);
      el.onclick = e => { const a = e.target.dataset?.a; if (a === 'pull' && !stopped) { stopped = true; clearInterval(t); const ok = pos + 2 >= zone[0] && pos <= zone[1]; el.querySelector('.mgmsg').textContent = ok ? 'Fisgou! 🎉' : 'Escapou...'; el.querySelector('.mgbtns').innerHTML = '<button class="btn" data-a="ok">Continuar</button>'; el.dataset.r = ok ? '1' : '0'; } else if (a === 'ok') done(el.dataset.r === '1'); };
    });
  },
  // ---------- Quiz (QI) ----------
  async quiz() {
    const pool = [
      ['Qual número continua a sequência: 2, 4, 8, 16, ...?', ['32', '24', '20', '18'], 0], ['Se todos os gatos são animais e Mimi é um gato, então Mimi é...', ['um animal', 'um cachorro', 'nada', 'uma planta'], 0],
      ['Quanto é 15% de 200?', ['30', '15', '20', '45'], 0], ['Qual palavra não pertence ao grupo: maçã, banana, cenoura, uva?', ['cenoura', 'maçã', 'banana', 'uva'], 0],
      ['Complete: 1, 1, 2, 3, 5, 8, ...', ['13', '11', '10', '12'], 0], ['Um trem anda 60 km em 30 min. Qual a velocidade?', ['120 km/h', '60 km/h', '30 km/h', '90 km/h'], 0],
      ['Qual é o oposto de "efêmero"?', ['duradouro', 'rápido', 'pequeno', 'frio'], 0], ['Se ontem foi segunda, depois de amanhã será...', ['quinta', 'quarta', 'sexta', 'terça'], 0],
      ['Quantos lados tem um hexágono?', ['6', '5', '8', '7'], 0], ['3 x 7 - 4 = ?', ['17', '21', '13', '19'], 0]
    ];
    let score = 0;
    for (const [q, opts, ans] of R.sample(pool, 4)) {
      const shuffled = R.shuffle(opts.map((t, i) => ({ t, v: String(i === ans) })));
      const r = await UI.choose('Teste de QI', q, shuffled); if (r === null) return null;
      if (r === 'true') score++;
    }
    return score;
  },
  async drivingTest(k) {
    const pools = {
      carro: [['O semáforo ficou amarelo. Você:', ['Reduz e para se for seguro', 'Acelera', 'Buzina'], 0], ['Placa de PARE significa:', ['Parada obrigatória', 'Reduza a velocidade', 'Proibido estacionar'], 0], ['Um pedestre está na faixa. Você:', ['Para e espera', 'Desvia dele', 'Buzina para ele correr'], 0], ['Ao chover, você deve:', ['Aumentar a distância', 'Ligar o pisca-alerta e acelerar', 'Desligar os faróis'], 0]],
      moto: [['O equipamento obrigatório é:', ['Capacete', 'Luvas', 'Botas'], 0], ['Andar entre os carros parados:', ['Com cuidado e baixa velocidade', 'A toda velocidade', 'Na contramão'], 0], ['Na curva você deve:', ['Frear antes dela', 'Frear no meio', 'Acelerar no meio'], 0]],
      barco: [['Boreste é o lado:', ['Direito', 'Esquerdo', 'De trás'], 0], ['Em caso de neblina:', ['Reduz velocidade e usa sinal sonoro', 'Acelera para sair logo', 'Desliga o motor'], 0], ['Colete salva-vidas é:', ['Obrigatório para todos', 'Opcional', 'Só para crianças'], 0]],
      aviao: [['Antes de decolar você faz:', ['O checklist', 'Um lanche', 'Uma selfie'], 0], ['Estol é:', ['Perda de sustentação', 'Excesso de velocidade', 'Falha no rádio'], 0], ['O altímetro mede:', ['Altitude', 'Velocidade', 'Combustível'], 0], ['Para pousar você deve:', ['Alinhar com a pista e reduzir', 'Mergulhar rápido', 'Desligar os motores no ar'], 0]]
    }[k];
    let s = 0;
    for (const [q, o, a] of R.sample(pools, 3)) { const r = await UI.choose('Exame', q, R.shuffle(o.map((t, i) => ({ t, v: String(i === a) })))); if (r === null) return null; if (r === 'true') s++; }
    return s >= 2 && R.ch(.9);
  },
  // ---------- Luta ----------
  async fight(f, opp) {
    return UI.custom('Luta!', (el, done) => {
      let hp = 100, ohp = 100, st = 50 + f.stamina, round = 1, turn = 0, over = null, msg = `Você enfrenta ${opp.n}!`;
      const known = FIGHT_MOVES.filter(m => f.moves.includes(m.n));
      let offer = R.sample(known, Math.min(3, known.length));
      const draw = () => {
        el.innerHTML = `<div class="mg"><div class="fighters"><div><b>Você</b><div class="mbar hp"><i style="width:${hp}%"></i></div><small>Fôlego ${Math.max(0, st)}</small></div><div><b>${esc(opp.n)}</b><div class="mbar hp"><i style="width:${ohp}%"></i></div></div></div>
          <p class="muted">Round ${round}/3</p><div class="mgmsg">${msg}</div>
          ${over === null ? `<div class="mgbtns col">${offer.map((m, i) => `<button class="btn" data-i="${i}">${m.n} <small>(poder ${m.pw}, fôlego ${m.st})</small></button>`).join('')}<button class="btn alt" data-i="def">🛡️ Defender e recuperar fôlego</button></div>` : `<div class="mgbtns"><button class="btn" data-i="ok">Continuar</button></div>`}</div>`;
      };
      el.onclick = e => {
        const t = e.target.closest('[data-i]'); if (!t) return; const i = t.dataset.i;
        if (i === 'ok') return done(over);
        if (over !== null) return;
        let def = false; msg = '';
        if (i === 'def') { def = true; st += 15; msg = 'Você se defendeu e recuperou o fôlego. '; }
        else {
          const m = offer[Number(i)]; const tired = st < m.st * 5 ? .25 : 0; st -= m.st * 5;
          const hit = R.ch(clamp(.62 + (f.power - opp.pw) / 150 - m.pw / 45 - tired, .1, .92));
          if (hit) { const d = Math.round(m.pw * 3.2 + f.power / 8 + R.int(0, 6)); ohp -= d; msg = `Seu ${m.n} acertou! (-${d}) `; } else msg = `Seu ${m.n} errou. `;
        }
        if (ohp <= 0) { over = true; msg += 'NOCAUTE! 🥊'; return draw(); }
        const od = Math.round((opp.pw / 4 + R.int(0, 12)) * (def ? .35 : 1)); if (R.ch(.7)) { hp -= od; msg += `${opp.n.split(' ')[0]} revidou (-${od}).`; } else msg += `${opp.n.split(' ')[0]} errou o golpe.`;
        if (hp <= 0) { over = false; msg += ' Você foi nocauteado(a)! 😵'; return draw(); }
        turn++; if (turn % 3 === 0) { round++; st += 20; }
        if (round > 3) { over = hp >= ohp; msg += over ? ' Vitória por pontos! 🏅' : ' Derrota por pontos.'; }
        offer = R.sample(known, Math.min(3, known.length));
        draw();
      };
      draw();
    });
  }
};
