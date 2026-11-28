'use strict';
// ===== Utilitários =====
const R = {
  f: () => Math.random(),
  int: (a, b) => Math.floor(Math.random() * (b - a + 1)) + a,
  ch: p => Math.random() < p,
  pick: a => a[Math.floor(Math.random() * a.length)],
  wpick(items, w = x => (x.w ?? 1)) {
    let t = 0; for (const i of items) t += Math.max(0, w(i));
    let r = Math.random() * t;
    for (const i of items) { r -= Math.max(0, w(i)); if (r <= 0) return i; }
    return items[items.length - 1];
  },
  shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  sample: (a, n) => R.shuffle(a).slice(0, n),
  norm(m, sd) { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return m + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
};
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let _uid = Math.floor(Math.random() * 1e6);
const uid = () => (++_uid).toString(36) + Math.random().toString(36).slice(2, 6);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const Store = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { } }
};
// título com gênero: "Garçom|Garçonete"
const gt = (t, g) => (t && t.includes('|')) ? t.split('|')[g === 'F' ? 1 : 0] : t;
// palavra com gênero simples: o/a
const ga = (g, m, f) => g === 'F' ? f : m;
