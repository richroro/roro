(() => {
'use strict';

/* ===================== 유틸 ===================== */
const $ = (s, r) => (r || document).querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[ri(0, a.length - 1)];
const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'k' : String(Math.floor(n));
const fmtTime = ms => {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return s + '초';
  const m = Math.floor(s / 60);
  if (m < 60) return m + '분 ' + (s % 60) + '초';
  const h = Math.floor(m / 60);
  return h + '시간 ' + (m % 60) + '분';
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = x => (x >= 0 ? '+' : '') + Math.round(x * 100) + '%';
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(Math.round(((n >> 16) & 255) * k), 0, 255), g = clamp(Math.round(((n >> 8) & 255) * k), 0, 255), b = clamp(Math.round((n & 255) * k), 0, 255);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

/* ===================== 데이터 ===================== */
const RES = { gold: { n: '금화', c: '#f5c542' }, wood: { n: '목재', c: '#a0673b' }, food: { n: '식량', c: '#e35d5d' }, iron: { n: '철', c: '#7f9cc4' } };
const RES_KEYS = ['gold', 'wood', 'food', 'iron'];
const MAX_LV = 25, MAX_CASTLE = 8, MAX_SOLDIERS = 16, MAX_INV = 40;

const BLD = {
  farm:     { n: '농장',   res: 'food', base: 0.5,  stat: 'vit', job: 'farmer',   cost: { wood: 20 },                     unlock: 1, desc: '식량을 생산합니다. 농부가 일하면 훨씬 빨라요.' },
  lumber:   { n: '벌목장', res: 'wood', base: 0.4,  stat: 'str', job: 'lumber',   cost: { gold: 20 },                     unlock: 1, desc: '목재를 생산합니다. 나무꾼에게 맡기세요.' },
  house:    { n: '주택',   pop: true,                            cost: { wood: 30, gold: 15 },           unlock: 1, desc: '주민 상한이 늘어납니다.' },
  market:   { n: '시장',   res: 'gold', base: 0.3,  stat: 'int', job: 'merchant', cost: { wood: 50, food: 30 },           unlock: 2, desc: '금화를 법니다. 상인이 제격!' },
  mine:     { n: '광산',   res: 'iron', base: 0.15, stat: 'str', job: 'miner',    cost: { wood: 60, gold: 40 },           unlock: 2, desc: '철을 캡니다. 성 업그레이드에 필요해요.' },
  barracks: { n: '병영',   train: true,                          cost: { wood: 80, gold: 60, iron: 10 }, unlock: 2, max: 1, desc: '병사를 훈련합니다. 레벨당 병사 능력 +8%.' },
};
const BLD_ORDER = ['farm', 'lumber', 'house', 'market', 'mine', 'barracks'];
const UNLOCKS = { 2: '건설 칸 +2, 시장·광산·병영, 영웅 슬롯 2, 사막 지역', 3: '건설 칸 +2, 궁병 훈련, 설산 지역', 4: '건설 칸 +2, 영웅 슬롯 3, 광산 지역', 5: '건설 칸 +2, 해안 지역', 6: '생산 보너스', 7: '생산 보너스', 8: '생산 보너스' };

const JOBS = {
  farmer:   { n: '농부',   stat: 'vit', kind: 'work',  col: '#7ac74f', role: 'melee' },
  lumber:   { n: '나무꾼', stat: 'str', kind: 'work',  col: '#a0673b', role: 'melee' },
  miner:    { n: '광부',   stat: 'str', kind: 'work',  col: '#8a8f99', role: 'melee' },
  merchant: { n: '상인',   stat: 'int', kind: 'work',  col: '#e0a040', role: 'melee' },
  warrior:  { n: '전사',   stat: 'str', kind: 'fight', col: '#d94b4b', role: 'tank' },
  archer:   { n: '궁수',   stat: 'dex', kind: 'fight', col: '#3f9a4f', role: 'ranged' },
  mage:     { n: '마법사', stat: 'int', kind: 'fight', col: '#7b5cd6', role: 'mage' },
  priest:   { n: '사제',   stat: 'int', kind: 'fight', col: '#e8dfc0', role: 'healer' },
};
const JOB_KEYS = Object.keys(JOBS);
const STATS = { str: '힘', dex: '민첩', int: '지혜', vit: '체력' };
const RARITY = [
  { n: '일반', sum: 100, maxLv: 20, stars: '★' },
  { n: '희귀', sum: 140, maxLv: 30, stars: '★★' },
  { n: '전설', sum: 190, maxLv: 40, stars: '★★★' },
];
const ROLE_NAME = { melee: '근접', tank: '방패', ranged: '원거리', mage: '광역 마법', healer: '치유' };
const NICKS = ['재빠른', '졸린', '용감한', '수줍은', '씩씩한', '느긋한', '똑똑한', '배고픈', '조용한', '장난꾸러기', '우람한', '반짝이는', '고집센', '다정한', '새침한', '꾀많은', '털복숭이', '노래하는'];
const NAMES = ['보리', '마루', '하늘', '나래', '달래', '미르', '도담', '하람', '온유', '새롬', '아라', '바다', '한별', '초롱', '누리', '가온', '라온', '솔', '이든', '유리', '호수', '다온', '봄', '여울', '노을', '구름'];
const HAIR = ['#2b1d12', '#6b3f1d', '#c98b3a', '#e8d27a', '#b03a3a', '#3a4fa0', '#e8e8e8', '#7b5cd6'];
const SKIN = ['#f4c9a0', '#e8b48c', '#c68e63', '#a06b45'];

const SOLD = {
  militia: { n: '민병', hp: 22, atk: 3, def: 1, range: 5, speed: 12, period: 1, role: 'melee', cost: { food: 12 }, time: 8, unlock: 2, col: '#5f6f9f', desc: '튼튼한 근접 병사' },
  archer:  { n: '궁병', hp: 14, atk: 4, def: 0, range: 30, speed: 11, period: 1.1, role: 'ranged', cost: { food: 15, wood: 5 }, time: 12, unlock: 3, col: '#3f7a4f', desc: '뒤에서 화살을 쏩니다' },
};
const SOLD_KEYS = ['militia', 'archer'];

const REGIONS = [
  { n: '속삭이는 숲',  sky: '#3d6b3a', ground: '#5a3d22', pal: ['#6fae4f', '#3f6f2c'], res: 'wood', mat: '나무', enemies: ['이끼 슬라임', '숲 멧돼지', '고블린 투석병'], boss: '나무정령 옹이' },
  { n: '모래바람 사막', sky: '#d9b064', ground: '#b07d3a', pal: ['#e0b060', '#9a6a30'], res: 'gold', mat: '모래', enemies: ['모래 슬라임', '사막 전갈', '사막 도적'],   boss: '모래벌레 사구' },
  { n: '하얀 설산',    sky: '#a9c4de', ground: '#dfe8f0', pal: ['#cfe3f5', '#6d8fb0'], res: 'food', mat: '얼음', enemies: ['서리 슬라임', '눈늑대', '설인 병사'],       boss: '예티 얼음니' },
  { n: '잿빛 광산',    sky: '#4a4a55', ground: '#2f2f38', pal: ['#8a8f99', '#5a5f6b'], res: 'iron', mat: '강철', enemies: ['돌 슬라임', '광산 박쥐', '강철 병사'],       boss: '강철 대장 쇠발톱' },
  { n: '안개 해안',    sky: '#3f6d8a', ground: '#6f8a5a', pal: ['#5ec8f0', '#2a6f8f'], res: 'gold', mat: '산호', enemies: ['해파리 슬라임', '게 병사', '해적'],          boss: '재의 왕 카르반' },
];
const ENEMY_TYPES = [
  { shape: 'slime', hp: 22, atk: 3,   def: 1, range: 5,  speed: 10, period: 1 },
  { shape: 'beast', hp: 16, atk: 4,   def: 0, range: 5,  speed: 18, period: 0.8 },
  { shape: 'human', hp: 14, atk: 3.5, def: 0, range: 30, speed: 11, period: 1.2 },
];
const SLOTS = { weapon: '무기', armor: '갑옷', acc: '장신구' };
const SLOT_NOUN = { weapon: '검', armor: '갑옷', acc: '반지' };
const OPTS = {
  atk:  { n: '공격',   min: 2,  max: 5,  unit: '' },
  hp:   { n: '체력',   min: 8,  max: 20, unit: '' },
  def:  { n: '방어',   min: 1,  max: 3,  unit: '' },
  crit: { n: '치명타', min: 2,  max: 5,  unit: '%' },
  prod: { n: '생산',   min: 3,  max: 8,  unit: '%' },
};
const RAR_MUL = [1, 1.4, 2], SELL_MUL = [1, 3, 10], PREFIX = ['', '빛나는 ', '전설의 '];

/* ===================== 상태 ===================== */
const SAVE_KEY = 'kk_forestwar_v1';
let S;
function newState() {
  const s = {
    v: 1, t: Date.now(), res: { gold: 60, wood: 40, food: 40, iron: 0 }, castle: 1, slots: [],
    chars: {}, nextId: 1, heroes: [null, null, null], soldiers: { militia: 0, archer: 0 }, queue: [],
    tavern: { cands: [], next: 0 }, freeRecruits: 2, inv: [], nextItem: 1,
    cleared: 0, sel: 1, auto: false, speed: 1, settings: { sound: true },
    stats: { wins: 0, losses: 0, recruits: 0 },
  };
  for (let i = 0; i < 12; i++) s.slots.push({ type: null, lv: 0, workers: [] });
  return s;
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const o = JSON.parse(raw);
      if (o && o.v === 1 && Array.isArray(o.slots) && o.slots.length === 12) {
        S = Object.assign(newState(), o);
        S.settings = Object.assign({ sound: true }, o.settings || {});
        return true;
      }
    }
  } catch (e) { /* 손상된 저장 → 새 게임 */ }
  S = newState();
  initNewGame();
  return false;
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 저장 실패 무시 */ } }
function initNewGame() {
  S.tavern.cands = [genChar(1, 'warrior', '우람한 마루'), genChar(1, 'lumber', '도토리 보리'), genChar()];
  S.tavern.next = Date.now() + 5 * 60 * 1000;
}

/* ===================== 캐릭터 ===================== */
function weightedRar() { const r = Math.random() * 100; return r < 5 ? 2 : r < 30 ? 1 : 0; }
function genChar(rar, job, name) {
  if (rar == null) rar = weightedRar();
  job = job || pick(JOB_KEYS);
  const R = RARITY[rar], J = JOBS[job];
  const stats = { str: 0, dex: 0, int: 0, vit: 0 };
  const main = Math.round(R.sum * 0.4);
  stats[J.stat] = main;
  let rest = R.sum - main;
  const keys = ['str', 'dex', 'int', 'vit'].filter(k => k !== J.stat);
  keys.forEach((k, i) => { const v = i === keys.length - 1 ? rest : ri(Math.floor(rest * 0.15), Math.floor(rest * 0.5)); stats[k] = v; rest -= v; });
  return { id: 0, name: name || pick(NICKS) + ' ' + pick(NAMES), job, rar, stats, lv: 1, seed: ri(1, 1e9), equip: { weapon: null, armor: null, acc: null } };
}
const cstat = (c, k) => Math.round(c.stats[k] * (1 + 0.04 * (c.lv - 1)));
function equipBonus(c) {
  const b = { atk: 0, hp: 0, def: 0, crit: 0, prod: 0 };
  for (const k in c.equip) {
    const it = getItem(c.equip[k]);
    if (!it) continue;
    b[it.mainKey] += it.main;
    for (const o of it.opts) b[o.k] += o.v;
  }
  return b;
}
function combat(c) {
  const J = JOBS[c.job], b = equipBonus(c);
  const main = cstat(c, J.stat), vit = cstat(c, 'vit'), fighter = J.kind === 'fight';
  const hp = Math.round((40 + vit * 2.5 + c.lv * 8) * (fighter ? 1 : 0.7)) + b.hp;
  const atk = Math.round(((3 + main * 0.35 + c.lv * 1.2) * (fighter ? 1 : 0.5) + b.atk) * 10) / 10;
  const def = Math.round((vit * 0.1 + c.lv * 0.2 + b.def) * 10) / 10;
  const crit = clamp(cstat(c, 'dex') * 0.002 + b.crit / 100, 0, 0.5);
  return { hp, atk, def, crit, role: J.role, cp: Math.round(hp / 10 + atk * 3) };
}
const levelCost = c => ({ food: Math.ceil(20 * Math.pow(1.2, c.lv - 1)), gold: Math.ceil(10 * Math.pow(1.2, c.lv - 1)) });
function recruitCost() {
  if (S.freeRecruits > 0) return {};
  const n = popCount();
  return { food: Math.ceil(25 * Math.pow(1.15, n)), gold: Math.ceil(15 * Math.pow(1.15, n)) };
}

/* ===================== 경제 ===================== */
const costMul = (cost, m) => { const o = {}; for (const k in cost) o[k] = Math.ceil(cost[k] * m); return o; };
const canAfford = c => RES_KEYS.every(k => (S.res[k] || 0) >= (c[k] || 0));
function spend(c) { if (!canAfford(c)) return false; for (const k in c) S.res[k] -= c[k]; return true; }
const costStr = c => RES_KEYS.filter(k => c[k]).map(k => `<span style="color:${RES[k].c}">${RES[k].n} ${fmt(c[k])}</span>`).join(' ') || '<span class="gain">무료</span>';
const bldCost = (type, lv) => costMul(BLD[type].cost, Math.pow(1.6, lv - 1));
const castleCost = lv => ({ gold: Math.ceil(80 * Math.pow(2, lv - 1)), wood: Math.ceil(60 * Math.pow(1.8, lv - 1)), iron: lv >= 2 ? Math.ceil(10 * Math.pow(1.8, lv - 2)) : 0 });
const openSlots = () => Math.min(12, 4 + 2 * (S.castle - 1));
const slotUnlockLv = i => 2 + Math.floor((i - 4) / 2);
const popCap = () => 3 + S.slots.reduce((a, s) => a + (s.type === 'house' ? 2 + s.lv : 0), 0);
const popCount = () => Object.keys(S.chars).length;
const barracksLv = () => S.slots.reduce((a, s) => s.type === 'barracks' ? Math.max(a, s.lv) : a, 0);
const heroSlots = () => 1 + (S.castle >= 2 ? 1 : 0) + (S.castle >= 4 ? 1 : 0);
const countOf = type => S.slots.filter(s => s.type === type).length;
const soldierCount = () => S.soldiers.militia + S.soldiers.archer + S.queue.length;

function workerBonus(c, type) {
  const B = BLD[type];
  if (!B || !B.res) return 0;
  return cstat(c, B.stat) / 100 * (c.job === B.job ? 1.5 : 0.4) + equipBonus(c).prod / 100;
}
function prodOf(slot) {
  const B = BLD[slot.type];
  if (!B || !B.res) return 0;
  let W = 0;
  for (const id of slot.workers) { const c = S.chars[id]; if (c) W += workerBonus(c, slot.type); }
  return B.base * slot.lv * (1 + W) * (1 + 0.03 * (S.castle - 1));
}
function rates() {
  const r = { gold: 0.15 * S.castle, wood: 0, food: 0, iron: 0 };
  for (const s of S.slots) if (s.type && BLD[s.type].res) r[BLD[s.type].res] += prodOf(s);
  return r;
}
function tick(dt) {
  const r = rates();
  for (const k of RES_KEYS) S.res[k] += r[k] * dt;
  processQueue();
  tavernTick();
}
function processQueue() {
  const now = Date.now();
  while (S.queue.length && S.queue[0].done <= now) { const q = S.queue.shift(); S.soldiers[q.type]++; }
}
function tavernTick() {
  if (Date.now() >= S.tavern.next) { refreshTavern(); }
}
function refreshTavern() {
  S.tavern.cands = [genChar(), genChar(), genChar()];
  S.tavern.next = Date.now() + 5 * 60 * 1000;
}
function applyOffline(ms) {
  const capped = Math.min(ms, 8 * 3600 * 1000), eff = 0.5, r = rates(), gains = {};
  for (const k of RES_KEYS) { gains[k] = r[k] * capped / 1000 * eff; S.res[k] += gains[k]; }
  processQueue();
  tavernTick();
  return { ms, capped, gains };
}

/* ===================== 배정 ===================== */
function whereIs(id) {
  for (let i = 0; i < S.slots.length; i++) if (S.slots[i].workers.includes(id)) return { kind: 'building', idx: i };
  const h = S.heroes.indexOf(id);
  if (h >= 0) return { kind: 'hero', slot: h };
  return null;
}
function whereLabel(id) {
  const w = whereIs(id);
  if (!w) return '미배정';
  if (w.kind === 'hero') return '영웅 ' + (w.slot + 1) + '번';
  return BLD[S.slots[w.idx].type].n + ' 근무';
}
function unassign(id) {
  for (const s of S.slots) { const i = s.workers.indexOf(id); if (i >= 0) s.workers.splice(i, 1); }
  const h = S.heroes.indexOf(id);
  if (h >= 0) S.heroes[h] = null;
}
function assignWorker(id, idx) {
  const s = S.slots[idx];
  if (!s.type || !BLD[s.type].res || s.workers.length >= 2) return false;
  unassign(id);
  s.workers.push(id);
  return true;
}
function setHero(slot, id) {
  if (slot >= heroSlots()) return false;
  unassign(id);
  S.heroes[slot] = id;
  return true;
}
function bestSpots(c) {
  const out = [];
  S.slots.forEach((s, i) => {
    if (s.type && BLD[s.type].res && s.workers.length < 2) out.push({ kind: 'building', idx: i, gain: workerBonus(c, s.type), label: BLD[s.type].n + ' Lv' + s.lv, sub: '생산 ' + pct(workerBonus(c, s.type)) });
  });
  for (let i = 0; i < heroSlots(); i++) if (S.heroes[i] == null) { out.push({ kind: 'hero', slot: i, gain: JOBS[c.job].kind === 'fight' ? 1 : 0.1, label: '영웅 ' + (i + 1) + '번 슬롯', sub: '전투력 ' + combat(c).cp }); break; }
  return out.sort((a, b) => b.gain - a.gain);
}

/* ===================== 장비 ===================== */
const getItem = id => id == null ? null : S.inv.find(i => i.id === id) || null;
function rollItem(s, rarMin) {
  const R = REGIONS[Math.floor((s - 1) / 5)];
  let rar = weightedRar();
  if (rarMin != null) rar = Math.max(rar, rarMin);
  const slot = pick(Object.keys(SLOTS)), m = RAR_MUL[rar], g = s;
  const it = { id: S.nextItem++, slot, rar, g, opts: [], by: null };
  if (slot === 'weapon') { it.mainKey = 'atk'; it.main = Math.round(3 * Math.pow(1.15, g) * m * 10) / 10; }
  else if (slot === 'armor') { it.mainKey = 'hp'; it.main = Math.round(15 * Math.pow(1.15, g) * m); }
  else { it.mainKey = 'def'; it.main = Math.round((1 + 0.4 * g) * m * 10) / 10; }
  const keys = Object.keys(OPTS).filter(k => k !== it.mainKey);
  for (let i = 0; i <= rar && keys.length; i++) {
    const k = keys.splice(ri(0, keys.length - 1), 1)[0], O = OPTS[k];
    const v = O.unit === '%' ? Math.round(rnd(O.min, O.max) + g * 0.2) : Math.round(rnd(O.min, O.max) * (1 + g * 0.08));
    it.opts.push({ k, v });
  }
  it.name = PREFIX[rar] + R.mat + ' ' + SLOT_NOUN[slot];
  return it;
}
const sellPrice = it => Math.ceil(10 * SELL_MUL[it.rar] * (1 + it.g / 5));
function itemScore(it) {
  const w = { atk: 3, hp: 0.1, def: 2, crit: 1.5, prod: 0.3 };
  return it.main * w[it.mainKey] + it.opts.reduce((a, o) => a + o.v * w[o.k], 0);
}
function itemDesc(it) {
  const main = `${OPTS[it.mainKey].n} +${it.main}`;
  const opts = it.opts.map(o => `${OPTS[o.k].n} +${o.v}${OPTS[o.k].unit}`).join(' · ');
  return main + (opts ? ' · ' + opts : '');
}
function equipItem(itemId, charId) {
  const it = getItem(itemId), c = S.chars[charId];
  if (!it || !c) return false;
  if (it.by != null && S.chars[it.by]) S.chars[it.by].equip[it.slot] = null;
  const old = getItem(c.equip[it.slot]);
  if (old) old.by = null;
  c.equip[it.slot] = it.id;
  it.by = charId;
  return true;
}
function unequipSlot(charId, slot) {
  const c = S.chars[charId], it = getItem(c.equip[slot]);
  if (it) it.by = null;
  c.equip[slot] = null;
}
function sellItem(itemId) {
  const it = getItem(itemId);
  if (!it) return 0;
  if (it.by != null && S.chars[it.by]) S.chars[it.by].equip[it.slot] = null;
  S.inv = S.inv.filter(i => i.id !== itemId);
  const p = sellPrice(it);
  S.res.gold += p;
  return p;
}
function autoEquip() {
  let n = 0;
  for (const id of S.heroes) {
    const c = S.chars[id];
    if (!c) continue;
    for (const slot in SLOTS) {
      const cands = S.inv.filter(i => i.slot === slot && (i.by == null || i.by === id));
      if (!cands.length) continue;
      const best = cands.reduce((a, b) => itemScore(b) > itemScore(a) ? b : a);
      if (c.equip[slot] !== best.id) { equipItem(best.id, id); n++; }
    }
  }
  return n;
}
function addItem(it) {
  if (S.inv.length >= MAX_INV) { S.res.gold += sellPrice(it); return false; }
  S.inv.push(it);
  return true;
}

/* ===================== 스프라이트 ===================== */
const SPR = {
  human: {
    w: 12, h: 14,
    base: [[3, 0, 6, 2, 'h'], [3, 2, 1, 2, 'h'], [8, 2, 1, 2, 'h'], [4, 2, 4, 4, 's'], [5, 3, 1, 1, 'e'], [7, 3, 1, 1, 'e'], [3, 6, 6, 4, 'b'], [2, 6, 1, 3, 's'], [9, 6, 1, 3, 's']],
    legs: [
      [[4, 10, 2, 3, 'l'], [7, 10, 2, 3, 'l'], [4, 13, 2, 1, 'o'], [7, 13, 2, 1, 'o']],
      [[3, 10, 2, 3, 'l'], [8, 10, 2, 3, 'l'], [3, 13, 2, 1, 'o'], [8, 13, 2, 1, 'o']],
    ],
  },
  slime: {
    w: 12, h: 10,
    frames: [
      [[3, 2, 6, 1, 'b'], [2, 3, 8, 1, 'b'], [1, 4, 10, 4, 'b'], [2, 8, 8, 1, 'b'], [3, 9, 6, 1, 'b'], [3, 3, 2, 1, 'a'], [4, 5, 1, 2, 'e'], [8, 5, 1, 2, 'e']],
      [[2, 3, 8, 1, 'b'], [1, 4, 10, 5, 'b'], [2, 9, 8, 1, 'b'], [3, 4, 2, 1, 'a'], [4, 6, 1, 2, 'e'], [8, 6, 1, 2, 'e']],
    ],
  },
  beast: {
    w: 14, h: 10,
    frames: [
      [[1, 3, 2, 1, 'd'], [3, 3, 9, 4, 'b'], [10, 1, 4, 4, 'b'], [11, 0, 1, 1, 'b'], [12, 2, 1, 1, 'e'], [4, 7, 2, 3, 'd'], [9, 7, 2, 3, 'd']],
      [[1, 2, 2, 1, 'd'], [3, 3, 9, 4, 'b'], [10, 1, 4, 4, 'b'], [11, 0, 1, 1, 'b'], [12, 2, 1, 1, 'e'], [3, 7, 2, 3, 'd'], [10, 7, 2, 3, 'd']],
    ],
  },
};
const WEAPONS = {
  tank: [[10, 4, 1, 6, 'w'], [9, 8, 3, 1, 'w']],
  melee: [[10, 4, 1, 6, 'w'], [10, 3, 2, 2, 'a']],
  ranged: [[10, 3, 1, 7, 'w'], [11, 4, 1, 5, 'a']],
  mage: [[10, 2, 1, 10, 'w'], [9, 1, 3, 2, 'a']],
  healer: [[10, 4, 1, 4, 'a'], [9, 5, 3, 1, 'a']],
};
function drawRects(ctx, rects, x, y, w, sc, pal, flip) {
  for (const r of rects) {
    const rx = flip ? w - r[0] - r[2] : r[0];
    ctx.fillStyle = pal[r[4]] || '#f0f';
    ctx.fillRect(Math.round(x + rx * sc), Math.round(y + r[1] * sc), r[2] * sc, r[3] * sc);
  }
}
function heroPal(c) {
  return { h: HAIR[c.seed % HAIR.length], s: SKIN[(c.seed >> 3) % SKIN.length], e: '#222', b: JOBS[c.job].col, l: '#3a3a4a', o: '#222', w: '#c8ccd4', a: c.job === 'mage' ? '#5ec8f0' : c.job === 'priest' ? '#f5c542' : '#8a6a3a' };
}
const portraitCache = new Map();
function portrait(c) {
  const key = c.seed + '/' + c.job + '/' + c.rar;
  if (portraitCache.has(key)) return portraitCache.get(key);
  const cv = document.createElement('canvas');
  cv.width = 32; cv.height = 32;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = ['#3a3a44', '#2a3f6a', '#5a4a1a'][c.rar];
  ctx.fillRect(0, 0, 32, 32);
  drawRects(ctx, SPR.human.base, -2, 2, 12, 3, heroPal(c), false);
  const url = cv.toDataURL();
  portraitCache.set(key, url);
  return url;
}
const princessPortrait = () => portrait({ seed: 3, job: 'priest', rar: 2 });

const BLD_ICON = {
  farm:     [[0, 20, 32, 12, '#6b4a2b'], [2, 22, 28, 2, '#8bc34a'], [2, 27, 28, 2, '#8bc34a'], [4, 18, 3, 4, '#3f9a4f'], [12, 18, 3, 4, '#3f9a4f'], [20, 18, 3, 4, '#3f9a4f'], [22, 4, 10, 8, '#a0673b'], [20, 2, 14, 3, '#7a3f1a'], [26, 8, 3, 4, '#3a2a1a']],
  lumber:   [[2, 20, 28, 10, '#6b4a2b'], [4, 14, 24, 6, '#8a5a2b'], [6, 8, 20, 6, '#a0673b'], [4, 16, 3, 3, '#5a3a1b'], [12, 16, 3, 3, '#5a3a1b'], [20, 16, 3, 3, '#5a3a1b'], [8, 10, 3, 3, '#5a3a1b'], [18, 10, 3, 3, '#5a3a1b'], [24, 2, 2, 10, '#5a3a1b'], [22, 0, 6, 4, '#c8ccd4']],
  house:    [[6, 14, 20, 16, '#d9b48a'], [4, 8, 24, 6, '#b03a3a'], [8, 4, 16, 4, '#b03a3a'], [12, 0, 8, 4, '#b03a3a'], [14, 20, 5, 10, '#5a3a1b'], [22, 18, 3, 3, '#5ec8f0'], [8, 18, 3, 3, '#5ec8f0'], [20, 2, 3, 6, '#555']],
  market:   [[4, 16, 24, 14, '#8a5a2b'], [2, 10, 28, 6, '#e35d5d'], [2, 10, 4, 6, '#f3eee6'], [10, 10, 4, 6, '#f3eee6'], [18, 10, 4, 6, '#f3eee6'], [26, 10, 4, 6, '#f3eee6'], [6, 20, 6, 6, '#f5c542'], [14, 20, 6, 6, '#7ac74f'], [22, 20, 4, 6, '#e0a040']],
  mine:     [[0, 16, 32, 16, '#5a5f6b'], [6, 10, 20, 6, '#6f747d'], [10, 14, 12, 18, '#1a1626'], [8, 12, 2, 20, '#8a5a2b'], [22, 12, 2, 20, '#8a5a2b'], [8, 10, 16, 2, '#8a5a2b'], [24, 4, 4, 4, '#7f9cc4'], [2, 6, 4, 4, '#7f9cc4']],
  barracks: [[4, 14, 24, 16, '#9aa3ad'], [4, 10, 24, 4, '#6f747d'], [4, 8, 4, 4, '#6f747d'], [12, 8, 4, 4, '#6f747d'], [20, 8, 4, 4, '#6f747d'], [14, 20, 5, 10, '#3a3a44'], [26, 0, 2, 12, '#5a3a1b'], [28, 0, 4, 5, '#d94b4b']],
  castle:   [[4, 12, 24, 18, '#b9bec8'], [2, 6, 8, 24, '#9aa3ad'], [22, 6, 8, 24, '#9aa3ad'], [2, 4, 2, 3, '#9aa3ad'], [6, 4, 2, 3, '#9aa3ad'], [24, 4, 2, 3, '#9aa3ad'], [28, 4, 2, 3, '#9aa3ad'], [13, 20, 6, 10, '#3a2a1a'], [14, 2, 1, 8, '#5a3a1b'], [15, 2, 4, 3, '#f5c542']],
};
const iconCache = new Map();
function bldIcon(type) {
  if (iconCache.has(type)) return iconCache.get(type);
  const cv = document.createElement('canvas');
  cv.width = 32; cv.height = 32;
  const ctx = cv.getContext('2d');
  for (const r of BLD_ICON[type]) { ctx.fillStyle = r[4]; ctx.fillRect(r[0], r[1], r[2], r[3]); }
  const url = cv.toDataURL();
  iconCache.set(type, url);
  return url;
}

/* ===================== 전투 ===================== */
let B = null, acc = 0, autoWait = 0, autoLosses = 0;
const STEP = 1 / 30;
const fx = { parts: [], nums: [], projs: [], shake: 0, flash: null };

function makeUnit(o) {
  return Object.assign({ x: 0, y: rnd(0.1, 0.9), hp: 10, maxHp: 10, atk: 1, def: 0, crit: 0, range: 5, speed: 12, period: 1, cd: rnd(0, 0.5), role: 'melee', alive: true, flash: 0, anim: rnd(0, 1), atkAnim: 0, side: 0, scale: 1, kind: 'hero', dr: 0 }, o);
}
const stageOf = s => ({ r: Math.floor((s - 1) / 5), i: (s - 1) % 5 + 1, R: REGIONS[Math.floor((s - 1) / 5)] });
function enemyList(s) {
  const { i, R } = stageOf(s), mul = Math.pow(1.17, s - 1), out = [];
  const n = Math.min(8, 3 + Math.floor((s - 1) / 3)) - (i === 5 ? 1 : 0);
  for (let k = 0; k < n; k++) {
    const T = ENEMY_TYPES[k % 3];
    out.push({ name: R.enemies[k % 3], shape: T.shape, hp: Math.round(T.hp * mul), atk: Math.round(T.atk * mul * 10) / 10, def: Math.round(T.def * Math.sqrt(mul) * 10) / 10, range: T.range, speed: T.speed, period: T.period, role: T.range > 10 ? 'ranged' : 'melee', kind: 'enemy', scale: 1, pal: R.pal });
  }
  if (i === 5) out.push({ name: R.boss, shape: k2shape(R), hp: Math.round(22 * 6 * mul), atk: Math.round(3 * 1.7 * mul * 10) / 10, def: Math.round(2 * Math.sqrt(mul) * 10) / 10, range: 7, speed: 8, period: 1.2, role: 'melee', kind: 'boss', scale: 2, pal: R.pal });
  return out;
}
const k2shape = R => R === REGIONS[2] || R === REGIONS[1] ? 'beast' : 'human';
const unitCp = u => u.hp / 10 + u.atk * 3;
const recCp = s => Math.round(enemyList(s).reduce((a, e) => a + unitCp(e), 0));
function partyCp() {
  let cp = 0;
  for (const id of S.heroes) if (S.chars[id]) cp += combat(S.chars[id]).cp;
  const sm = Math.pow(1.08, Math.max(0, barracksLv() - 1));
  for (const k of SOLD_KEYS) cp += S.soldiers[k] * unitCp({ hp: SOLD[k].hp * sm, atk: SOLD[k].atk * sm });
  return Math.round(cp);
}
function createBattle(s) {
  const { R } = stageOf(s), units = [];
  let hi = 0;
  for (const id of S.heroes) {
    const c = S.chars[id];
    if (!c) continue;
    const cb = combat(c);
    units.push(makeUnit({ side: 0, kind: 'hero', ref: c, name: c.name, hp: cb.hp, maxHp: cb.hp, atk: cb.atk, def: cb.def, crit: cb.crit, role: cb.role, dr: cb.role === 'tank' ? 0.2 : 0,
      range: cb.role === 'ranged' || cb.role === 'mage' ? 34 : cb.role === 'healer' ? 30 : 5, period: cb.role === 'mage' ? 1.6 : cb.role === 'healer' ? 1.3 : 1, speed: 13, x: -6 - hi * 5, y: 0.3 + hi * 0.25 }));
    hi++;
  }
  const sm = Math.pow(1.08, Math.max(0, barracksLv() - 1)), sent = { militia: 0, archer: 0 };
  for (const k of SOLD_KEYS) {
    for (let j = 0; j < S.soldiers[k]; j++) {
      const T = SOLD[k];
      units.push(makeUnit({ side: 0, kind: k, name: T.n, hp: Math.round(T.hp * sm), maxHp: Math.round(T.hp * sm), atk: T.atk * sm, def: T.def, role: T.role, range: T.range, speed: T.speed, period: T.period, x: -(10 + rnd(0, 22)) }));
      sent[k]++;
    }
    S.soldiers[k] = 0;
  }
  enemyList(s).forEach((e, k) => units.push(makeUnit(Object.assign({ side: 1, x: e.kind === 'boss' ? 120 : 104 + k * 6, y: e.kind === 'boss' ? 0.5 : rnd(0.1, 0.9) }, e))));
  return { s, R, t: 0, units, done: false, win: null, limit: 60, events: [], sent, endT: 0, boss: units.find(u => u.kind === 'boss') || null };
}
function stepBattle(b, dt) {
  b.t += dt;
  const alive = b.units.filter(u => u.alive);
  const sides = [alive.filter(u => u.side === 0), alive.filter(u => u.side === 1)];
  if (!sides[0].length || !sides[1].length) { b.done = true; b.win = sides[0].length > 0; return; }
  if (b.t >= b.limit) { b.done = true; b.win = false; return; }
  for (const u of alive) {
    if (!u.alive) continue;
    u.cd -= dt; u.flash = Math.max(0, u.flash - dt); u.atkAnim = Math.max(0, u.atkAnim - dt); u.anim += dt;
    const foes = sides[1 - u.side].filter(f => f.alive);
    if (!foes.length) break;
    let tgt = null, best = 1e9;
    for (const f of foes) { const d = Math.abs(f.x - u.x); if (d < best) { best = d; tgt = f; } }
    if (u.role === 'healer') {
      let low = null, lr = 0.75;
      for (const a of sides[u.side]) { if (!a.alive) continue; const r = a.hp / a.maxHp; if (r < lr) { lr = r; low = a; } }
      if (low && u.cd <= 0) { const amt = Math.round(u.atk * 2.2); low.hp = Math.min(low.maxHp, low.hp + amt); u.cd = u.period; u.atkAnim = 0.2; b.events.push({ t: 'heal', x: low.x, y: low.y, amt }); continue; }
    }
    const dir = u.side === 0 ? 1 : -1;
    if (best > u.range) { u.x = clamp(u.x + dir * u.speed * dt, -20, 122); u.moving = true; }
    else { u.moving = false; if (u.cd <= 0) { u.cd = u.period; attack(b, u, tgt, foes); } }
  }
}
function attack(b, u, tgt, foes) {
  const crit = Math.random() < u.crit;
  const base = u.atk * 100 / (100 + tgt.def) * (crit ? 1.5 : 1);
  if (u.role === 'ranged' || u.role === 'mage') b.events.push({ t: 'proj', x1: u.x, y1: u.y, x2: tgt.x, y2: tgt.y, kind: u.role === 'mage' ? 'magic' : 'arrow' });
  const victims = u.role === 'mage' ? foes.filter(f => Math.abs(f.x - tgt.x) <= 8).slice(0, 3) : [tgt];
  for (const v of victims) {
    const d = Math.max(1, Math.round((v === tgt ? base : base * 0.6) * (1 - v.dr)));
    v.hp -= d; v.flash = 0.12;
    b.events.push({ t: 'hit', x: v.x, y: v.y, dmg: d, crit, side: v.side, boss: v.kind === 'boss' });
    if (v.hp <= 0 && v.alive) { v.alive = false; b.events.push({ t: 'die', x: v.x, y: v.y, unit: v }); }
  }
  u.atkAnim = 0.2;
}
function runBattle(b) { let n = 0; while (!b.done && n++ < 3000) stepBattle(b, STEP); b.events = []; }
function startBattle(s, skip) {
  if (B) return false;
  if (!stageUnlocked(s)) { toast('아직 갈 수 없는 지역이에요', 'warn'); return false; }
  if (!S.heroes.some(id => S.chars[id])) { toast('부대 탭에서 영웅을 편성하세요', 'warn'); return false; }
  S.sel = s;
  B = createBattle(s); acc = 0; fx.parts = []; fx.nums = []; fx.projs = []; fx.flash = null;
  $('#btn-skip').classList.toggle('hidden', !(S.cleared >= s));
  updateLaneStatus();
  if (skip) { runBattle(B); finishBattle(); }
  return true;
}
function finishBattle() {
  const b = B; B = null;
  const win = b.win;
  for (const u of b.units) if (u.side === 0 && u.alive && SOLD[u.kind]) S.soldiers[u.kind]++;
  const lost = { militia: 0, archer: 0 };
  for (const k of SOLD_KEYS) lost[k] = b.sent[k] - b.units.filter(u => u.side === 0 && u.alive && u.kind === k).length;
  const res = { s: b.s, win, lost, gold: 0, byRes: null, byAmt: 0, item: null, first: false };
  if (win) {
    S.stats.wins++;
    res.first = b.s > S.cleared;
    S.cleared = Math.max(S.cleared, b.s);
    res.gold = Math.floor(8 * Math.pow(1.25, b.s - 1) * (res.first ? 2 : 1));
    res.byRes = b.R.res; res.byAmt = Math.floor(5 * Math.pow(1.25, b.s - 1));
    S.res.gold += res.gold; S.res[res.byRes] += res.byAmt;
    if (res.first || Math.random() < 0.55) { res.item = rollItem(b.s, res.first && b.s === 1 ? 1 : null); res.itemStored = addItem(res.item); }
    if (res.first && S.sel === b.s && b.s < 25) S.sel = b.s + 1;
  } else { S.stats.losses++; }
  if (b.endT === 0) sfx(win ? 'win' : 'lose');
  if (S.auto) {
    if (win) { autoLosses = 0; } else if (++autoLosses >= 3) { S.auto = false; autoLosses = 0; toast('연패로 자동 반복을 멈췄어요', 'danger'); }
    if (S.auto) { autoRefill(lost); autoWait = 3; toast((win ? '승리! ' : '패배… ') + stageName(b.s) + (res.item ? ' · ' + res.item.name + ' 획득' : ''), win ? 'ok' : 'danger'); }
    else showResult(res);
  } else showResult(res);
  $('#btn-skip').classList.add('hidden');
  updateLaneStatus(); renderAll(); save();
}
function skipBattle() { if (!B || S.cleared < B.s) return; runBattle(B); finishBattle(); }
function autoRefill(lost) {
  if (!barracksLv()) return;
  for (const k of SOLD_KEYS) for (let i = 0; i < lost[k]; i++) if (!trainSoldier(k, true)) break;
}
function trainSoldier(type, quiet) {
  const T = SOLD[type];
  if (!barracksLv()) { if (!quiet) toast('병영이 필요해요', 'warn'); return false; }
  if (S.castle < T.unlock) { if (!quiet) toast('성 Lv' + T.unlock + ' 필요', 'warn'); return false; }
  if (soldierCount() >= MAX_SOLDIERS) { if (!quiet) toast('병사는 최대 ' + MAX_SOLDIERS + '명까지예요', 'warn'); return false; }
  if (!spend(T.cost)) { if (!quiet) toast('자원이 부족해요', 'warn'); return false; }
  const last = S.queue.length ? S.queue[S.queue.length - 1].done : Date.now();
  S.queue.push({ type, done: Math.max(last, Date.now()) + T.time * 1000 });
  return true;
}
const regionUnlocked = r => S.castle >= r + 1 && S.cleared >= r * 5;
const stageUnlocked = s => regionUnlocked(stageOf(s).r) && S.cleared >= s - 1;
const stageName = s => { const { r, i } = stageOf(s); return (r + 1) + '-' + i + (i === 5 ? ' 보스' : ''); };

/* ===================== 캔버스 렌더 ===================== */
const cv = $('#battle'), cx = cv.getContext('2d');
let lastTs = 0;
const W = cv.width, H = cv.height, GROUND = 118;
const ux = x => 20 + x / 100 * (W - 40);
const uy = y => GROUND + 8 + y * 62;
function frame(ts) {
  const dt = Math.min(0.1, (ts - lastTs) / 1000 || 0);
  lastTs = ts;
  if (B) {
    if (!B.done) {
      acc += dt * S.speed;
      while (acc >= STEP && !B.done) { stepBattle(B, STEP); acc -= STEP; }
      consumeEvents(B);
    } else {
      if (!fx.flash) { fx.flash = B.win ? 'win' : 'lose'; sfx(fx.flash); }
      B.endT += dt;
      if (B.endT > 1.3) finishBattle();
    }
  } else if (autoWait > 0) {
    autoWait -= dt;
    if (autoWait <= 0 && S.auto) startBattle(S.sel);
  }
  updateFx(dt);
  draw(dt);
  requestAnimationFrame(frame);
}
function consumeEvents(b) {
  for (const e of b.events) {
    if (e.t === 'hit') {
      fx.nums.push({ x: ux(e.x) + rnd(-4, 4), y: uy(e.y) - 26, text: String(e.dmg), life: 0.8, col: e.crit ? '#f5c542' : e.side === 0 ? '#ff7a7a' : '#fff', big: e.crit });
      for (let i = 0; i < 2; i++) fx.parts.push({ x: ux(e.x), y: uy(e.y) - 10, vx: rnd(-30, 30), vy: rnd(-50, -10), life: 0.4, col: '#ddd', s: 2 });
      if (e.boss || e.crit) fx.shake = Math.max(fx.shake, 0.12);
      sfx('hit');
    } else if (e.t === 'heal') {
      fx.nums.push({ x: ux(e.x), y: uy(e.y) - 26, text: '+' + e.amt, life: 0.8, col: '#7af07a' });
    } else if (e.t === 'die') {
      const col = e.unit.side === 0 ? '#6f8fd0' : b.R.pal[0];
      for (let i = 0; i < 6; i++) fx.parts.push({ x: ux(e.x), y: uy(e.y) - 12, vx: rnd(-50, 50), vy: rnd(-90, -20), life: 0.7, col, s: 3, g: 1 });
      if (e.unit.kind === 'boss') fx.shake = 0.4;
    } else if (e.t === 'proj') {
      fx.projs.push({ x1: ux(e.x1), y1: uy(e.y1) - 14, x2: ux(e.x2), y2: uy(e.y2) - 12, life: 0.18, max: 0.18, kind: e.kind });
    }
  }
  b.events = [];
}
function updateFx(dt) {
  for (const p of fx.parts) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.g) p.vy += 200 * dt; p.life -= dt; }
  fx.parts = fx.parts.filter(p => p.life > 0);
  for (const n of fx.nums) { n.y -= 22 * dt; n.life -= dt; }
  fx.nums = fx.nums.filter(n => n.life > 0);
  for (const p of fx.projs) p.life -= dt;
  fx.projs = fx.projs.filter(p => p.life > 0);
  fx.shake = Math.max(0, fx.shake - dt);
}
function idleUnits() {
  const out = [];
  let hi = 0;
  for (const id of S.heroes) { const c = S.chars[id]; if (!c) continue; out.push({ kind: 'hero', ref: c, role: JOBS[c.job].role, x: 10 + hi * 7, y: 0.3 + hi * 0.25, side: 0, anim: hi, moving: false, alive: true, flash: 0, scale: 1, hp: 1, maxHp: 1 }); hi++; }
  let si = 0;
  for (const k of SOLD_KEYS) for (let j = 0; j < S.soldiers[k]; j++) { out.push({ kind: k, role: SOLD[k].role, x: 30 + (si % 6) * 6, y: 0.15 + Math.floor(si / 6) * 0.35 + (si % 2) * 0.1, side: 0, anim: si, moving: false, alive: true, flash: 0, scale: 1, hp: 1, maxHp: 1 }); si++; }
  return out;
}
function drawUnit(u, t) {
  const sc = 2 * u.scale, px = ux(u.x), py = uy(u.y) - (u.moving ? Math.abs(Math.sin(u.anim * 10)) * 2 : 0);
  const frame = u.moving ? Math.floor(u.anim * 6) % 2 : 0;
  const flip = u.side === 1;
  const lunge = u.atkAnim > 0 ? (flip ? -1 : 1) * 4 : 0;
  let spec, rects, pal, w;
  if (u.kind === 'hero' || SOLD[u.kind] || (u.shape === 'human')) {
    spec = SPR.human; w = spec.w;
    rects = spec.base.concat(spec.legs[frame], WEAPONS[u.role] || WEAPONS.melee);
    if (u.kind === 'hero') pal = heroPal(u.ref);
    else if (SOLD[u.kind]) pal = { h: '#4a3020', s: '#f4c9a0', e: '#222', b: SOLD[u.kind].col, l: '#3a3a4a', o: '#222', w: '#c8ccd4', a: '#8a6a3a' };
    else pal = { h: '#222', s: u.pal[0], b: u.pal[1], e: '#ff3b3b', l: '#222', o: '#111', w: '#555', a: '#999' };
  } else {
    spec = SPR[u.shape]; w = spec.w;
    rects = spec.frames[frame];
    pal = { b: u.pal[0], a: shade(u.pal[0], 1.35), d: u.pal[1], e: '#ff3b3b' };
  }
  const left = px - w * sc / 2 + lunge, top = py - spec.h * sc;
  cx.fillStyle = 'rgba(0,0,0,.25)';
  cx.fillRect(Math.round(px - w * sc / 2 + 2), Math.round(py - 2), w * sc - 4, 3);
  if (u.flash > 0) {
    const white = {}; for (const k in pal) white[k] = '#fff';
    drawRects(cx, rects, left, top, w, sc, white, flip);
  } else drawRects(cx, rects, left, top, w, sc, pal, flip);
  if (u.kind === 'boss') { cx.fillStyle = '#f5c542'; cx.fillRect(Math.round(left + w * sc / 2 - 6), Math.round(top - 6), 12, 4); cx.fillRect(Math.round(left + w * sc / 2 - 6), Math.round(top - 9), 3, 3); cx.fillRect(Math.round(left + w * sc / 2 + 3), Math.round(top - 9), 3, 3); }
  if (B && u.maxHp > 1 && (u.kind === 'hero' || u.hp < u.maxHp) && u.kind !== 'boss') {
    const bw = 22 * u.scale;
    cx.fillStyle = '#000'; cx.fillRect(Math.round(px - bw / 2), Math.round(top - 5), bw, 3);
    cx.fillStyle = u.side === 0 ? '#5fc46a' : '#e35d5d'; cx.fillRect(Math.round(px - bw / 2), Math.round(top - 5), Math.round(bw * clamp(u.hp / u.maxHp, 0, 1)), 3);
  }
}
const hillCache = {};
function drawProps(R) {
  const r = REGIONS.indexOf(R);
  for (let i = 0; i < 6; i++) {
    const x = 10 + i * 64 + (i * 29) % 20, y = GROUND + 4;
    if (r === 0) { cx.fillStyle = '#5a3a1b'; cx.fillRect(x + 6, y - 18, 6, 18); cx.fillStyle = R.pal[1]; cx.fillRect(x, y - 36, 18, 20); cx.fillStyle = R.pal[0]; cx.fillRect(x + 3, y - 42, 12, 12); }
    else if (r === 1) { cx.fillStyle = '#4f9a3f'; cx.fillRect(x + 6, y - 30, 6, 30); cx.fillRect(x, y - 22, 6, 8); cx.fillRect(x + 12, y - 26, 6, 8); cx.fillRect(x, y - 16, 6, 3); cx.fillRect(x + 12, y - 20, 6, 3); }
    else if (r === 2) { cx.fillStyle = '#2f5f48'; cx.fillRect(x + 3, y - 34, 12, 26); cx.fillRect(x, y - 18, 18, 8); cx.fillStyle = '#f3f6fa'; cx.fillRect(x + 3, y - 37, 12, 4); cx.fillRect(x, y - 21, 18, 3); cx.fillStyle = '#5a3a1b'; cx.fillRect(x + 6, y - 10, 6, 10); }
    else if (r === 3) { cx.fillStyle = R.pal[1]; cx.fillRect(x, y - 14, 20, 14); cx.fillStyle = R.pal[0]; cx.fillRect(x + 4, y - 22, 12, 8); cx.fillStyle = '#7f9cc4'; cx.fillRect(x + 7, y - 19, 3, 3); }
    else { cx.fillStyle = '#8a5a2b'; cx.fillRect(x + 8, y - 32, 4, 32); cx.fillStyle = '#3f9a4f'; cx.fillRect(x - 4, y - 36, 12, 5); cx.fillRect(x + 12, y - 36, 12, 5); cx.fillRect(x + 4, y - 42, 12, 8); cx.fillStyle = '#f5c542'; cx.fillRect(x + 8, y - 34, 4, 4); }
  }
}
function draw(dt) {
  const s = B ? B.s : S.sel, R = stageOf(s).R;
  cx.save();
  if (fx.shake > 0) cx.translate(Math.round(rnd(-3, 3)), Math.round(rnd(-3, 3)));
  const g = cx.createLinearGradient(0, 0, 0, GROUND);
  g.addColorStop(0, R.sky); g.addColorStop(1, shade(R.sky, 1.25));
  cx.fillStyle = g; cx.fillRect(-4, -4, W + 8, GROUND + 4);
  const hills = hillCache[R.n] || (hillCache[R.n] = Array.from({ length: 7 }, (_, i) => ({ x: i * 60 + (i * 37) % 30, r: 40 + (i * 53) % 35 })));
  cx.fillStyle = shade(R.sky, 0.75);
  for (const h of hills) { cx.beginPath(); cx.arc(h.x, GROUND + 10, h.r, Math.PI, 0); cx.fill(); }
  cx.fillStyle = shade(R.ground, 1.15); cx.fillRect(-4, GROUND, W + 8, 6);
  cx.fillStyle = R.ground; cx.fillRect(-4, GROUND + 6, W + 8, H - GROUND);
  cx.fillStyle = shade(R.ground, 0.85);
  for (let i = 0; i < 12; i++) cx.fillRect((i * 67) % W, GROUND + 20 + (i * 31) % 70, 14, 3);
  drawProps(R);
  const units = (B ? B.units.filter(u => u.alive) : idleUnits()).sort((a, b) => a.y - b.y);
  for (const p of fx.projs) {
    const k = 1 - p.life / p.max, x = p.x1 + (p.x2 - p.x1) * k, y = p.y1 + (p.y2 - p.y1) * k;
    if (p.kind === 'arrow') { cx.strokeStyle = '#e8d27a'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(x - (p.x2 - p.x1) * 0.08, y - (p.y2 - p.y1) * 0.08); cx.lineTo(x, y); cx.stroke(); }
    else { cx.fillStyle = '#5ec8f0'; cx.beginPath(); cx.arc(x, y, 4, 0, Math.PI * 2); cx.fill(); }
  }
  for (const u of units) drawUnit(u);
  for (const p of fx.parts) { cx.globalAlpha = clamp(p.life * 2, 0, 1); cx.fillStyle = p.col; cx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); }
  cx.globalAlpha = 1;
  cx.textAlign = 'center';
  for (const n of fx.nums) {
    cx.globalAlpha = clamp(n.life * 1.5, 0, 1);
    cx.font = (n.big ? 'bold 14px' : 'bold 11px') + ' sans-serif';
    cx.lineWidth = 3; cx.strokeStyle = '#000'; cx.strokeText(n.text, n.x, n.y);
    cx.fillStyle = n.col; cx.fillText(n.text, n.x, n.y);
  }
  cx.globalAlpha = 1;
  if (B && B.boss) {
    const bo = B.boss;
    cx.font = 'bold 11px sans-serif'; cx.fillStyle = '#fff'; cx.lineWidth = 3; cx.strokeStyle = '#000';
    cx.strokeText(bo.name, W / 2, 34); cx.fillText(bo.name, W / 2, 34);
    cx.fillStyle = '#000'; cx.fillRect(W / 2 - 80, 38, 160, 7);
    cx.fillStyle = '#e35d5d'; cx.fillRect(W / 2 - 80, 38, Math.round(160 * clamp(bo.hp / bo.maxHp, 0, 1)), 7);
  }
  if (B && B.done) {
    cx.fillStyle = B.win ? 'rgba(245,197,66,.15)' : 'rgba(0,0,0,.4)'; cx.fillRect(-4, -4, W + 8, H + 8);
    cx.font = 'bold 30px sans-serif'; cx.lineWidth = 5; cx.strokeStyle = '#000';
    const txt = B.win ? '승리!' : '후퇴…';
    cx.strokeText(txt, W / 2, H / 2 + 10); cx.fillStyle = B.win ? '#f5c542' : '#ccc'; cx.fillText(txt, W / 2, H / 2 + 10);
  }
  if (!B && !S.heroes.some(id => S.chars[id])) {
    cx.font = 'bold 12px sans-serif'; cx.lineWidth = 3; cx.strokeStyle = '#000';
    cx.strokeText('주민을 영입하고 영웅을 편성하세요', W / 2, H - 12); cx.fillStyle = '#fff'; cx.fillText('주민을 영입하고 영웅을 편성하세요', W / 2, H - 12);
  }
  cx.restore();
}

/* ===================== 사운드 ===================== */
let audio = null, lastHit = 0;
function ensureAudio() { if (!audio) { try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audio = null; } } if (audio && audio.state === 'suspended') audio.resume(); }
function tone(f, dur, type, vol, delay) {
  if (!audio) return;
  const t0 = audio.currentTime + (delay || 0), o = audio.createOscillator(), gn = audio.createGain();
  o.type = type || 'square'; o.frequency.setValueAtTime(f, t0);
  gn.gain.setValueAtTime(vol || 0.08, t0); gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(gn); gn.connect(audio.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
function sfx(k) {
  if (!S.settings.sound || !audio) return;
  const now = performance.now();
  if (k === 'hit') { if (now - lastHit < 120) return; lastHit = now; tone(160 + rnd(0, 60), 0.05, 'sawtooth', 0.05); }
  else if (k === 'tap') tone(880, 0.03, 'square', 0.04);
  else if (k === 'build') { tone(523, 0.1, 'triangle', 0.08); tone(659, 0.1, 'triangle', 0.08, 0.1); tone(784, 0.14, 'triangle', 0.08, 0.2); }
  else if (k === 'coin') { tone(1320, 0.06, 'sine', 0.07); tone(1760, 0.08, 'sine', 0.07, 0.07); }
  else if (k === 'recruit') { tone(440, 0.1, 'sine', 0.08); tone(660, 0.12, 'sine', 0.08, 0.1); }
  else if (k === 'win') { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'square', 0.08, i * 0.13)); }
  else if (k === 'lose') { tone(330, 0.2, 'square', 0.07); tone(262, 0.3, 'square', 0.07, 0.2); }
}

/* ===================== UI ===================== */
let tab = 'kingdom', gearFilter = 'all', pickCbs = [], modalOpen = false;
const panel = $('#panel');
const statLine = c => Object.keys(STATS).map(k => STATS[k] + ' ' + cstat(c, k)).join(' · ');
const shortName = c => c.name.split(' ')[1] || c.name;

function toast(msg, kind) {
  const root = $('#toasts');
  while (root.children.length >= 3) root.removeChild(root.firstChild);
  const el = document.createElement('div');
  el.className = 'toast ' + (kind || '');
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}
function openModal(html) {
  $('#modal').innerHTML = '<button class="modal-close" data-act="close" aria-label="닫기">✕</button>' + html;
  $('#modal-root').classList.remove('hidden');
  $('#modal').scrollTop = 0;
  modalOpen = true;
}
function closeModal() { $('#modal-root').classList.add('hidden'); modalOpen = false; pickCbs = []; }
function openPicker(title, items, empty) {
  pickCbs = items.map(i => i.cb);
  openModal(`<div class="modal-title">${title}</div><div class="list">${items.length ? items.map((it, i) => `<button class="row ${it.cls || ''}" data-act="pick" data-i="${i}">${it.html}</button>`).join('') : `<div class="sub">${empty || '선택할 항목이 없어요'}</div>`}</div>`);
}
function confirmModal(title, text, yesLabel, cb) {
  pickCbs = [cb];
  openModal(`<div class="modal-title">${title}</div><p class="sub">${text}</p><div class="row-btns"><button class="btn" data-act="close">취소</button><button class="btn danger" data-act="pick" data-i="0">${yesLabel}</button></div>`);
}

function renderHud() {
  $('#castle-lv').textContent = '성 Lv' + S.castle;
  $('#pop').textContent = '주민 ' + popCount() + '/' + popCap();
  const r = rates();
  $('#res').innerHTML = RES_KEYS.map(k => `<div class="chip"><i style="background:${RES[k].c}"></i><b>${fmt(S.res[k])}</b><small>+${r[k].toFixed(2)}/s</small></div>`).join('');
  const upAny = S.slots.some((s, i) => i < openSlots() && s.type && s.lv < MAX_LV && canAfford(bldCost(s.type, s.lv + 1))) || (S.castle < MAX_CASTLE && canAfford(castleCost(S.castle)));
  const badges = { kingdom: upAny, people: canAfford(recruitCost()) && popCount() < popCap(), army: barracksLv() > 0 && S.queue.length === 0 && soldierCount() < 4 && canAfford(SOLD.militia.cost), gear: S.inv.some(i => i.by == null), quest: !B && stageUnlocked(S.cleared + 1) && S.heroes.some(id => S.chars[id]) && S.cleared < 25 };
  document.querySelectorAll('.tab').forEach(t => t.querySelector('.badge').classList.toggle('on', !!badges[t.dataset.tab]));
}
function updateLaneStatus() {
  const el = $('#lane-status');
  if (B) el.textContent = REGIONS[stageOf(B.s).r].n + ' ' + stageName(B.s) + ' 전투 중' + (S.auto ? ' (자동)' : '');
  else if (S.auto && autoWait > 0) el.textContent = '자동 반복: ' + stageName(S.sel) + ' 잠시 후 재출발';
  else el.textContent = S.cleared >= 25 ? '모든 땅을 되찾았어요! 자유롭게 사냥하세요' : '대기 중 — 원정 탭에서 출발';
  $('#btn-speed').textContent = S.speed + 'x';
}
function renderPanel() {
  const fn = { kingdom: renderKingdom, people: renderPeople, army: renderArmy, gear: renderGear, quest: renderQuest }[tab];
  panel.innerHTML = fn();
}
function renderAll() { renderHud(); renderPanel(); updateLaneStatus(); }

function renderKingdom() {
  const cc = castleCost(S.castle), maxC = S.castle >= MAX_CASTLE;
  let h = `<div class="card"><img src="${bldIcon('castle')}" alt=""><div class="grow"><div class="title">성 Lv${S.castle}<small>세금 +${(0.15 * S.castle).toFixed(2)} 금화/s · 생산 +${(S.castle - 1) * 3}%</small></div><div class="sub">${maxC ? '최대 레벨입니다' : '다음 레벨: ' + UNLOCKS[S.castle + 1]}</div></div>${maxC ? '' : `<button class="btn primary" data-act="castleUp" ${canAfford(cc) ? '' : 'disabled'}>업그레이드<small>${costStr(cc)}</small></button>`}</div>`;
  h += '<div class="grid">';
  S.slots.forEach((s, i) => {
    if (i >= openSlots()) h += `<div class="slot locked"><span>🔒</span><small>성 Lv${slotUnlockLv(i)}</small></div>`;
    else if (!s.type) h += `<button class="slot empty" data-act="slot" data-idx="${i}">＋<small>건설</small></button>`;
    else {
      const Bd = BLD[s.type], up = s.lv < MAX_LV && canAfford(bldCost(s.type, s.lv + 1));
      const info = Bd.res ? '+' + prodOf(s).toFixed(1) + ' ' + RES[Bd.res].n + '/s' : Bd.pop ? '주민 +' + (2 + s.lv) : '병사 +' + (Math.round((Math.pow(1.08, s.lv - 1) - 1) * 100)) + '%';
      h += `<button class="slot built" data-act="slot" data-idx="${i}"><img src="${bldIcon(s.type)}" alt="">${up ? '<em class="up">↑</em>' : ''}${Bd.res ? `<span class="workers">👤${s.workers.length}/2</span>` : ''}<b>${Bd.n} Lv${s.lv}</b><small>${info}</small></button>`;
    }
  });
  h += '</div>';
  h += `<div class="sub" style="margin-top:8px">건물을 짓고 주민을 배정하면 자원이 자동으로 쌓입니다. 자리를 비워도 8시간까지 절반 효율로 생산돼요.</div>`;
  return h;
}
function renderPeople() {
  const cost = recruitCost(), left = S.tavern.next - Date.now(), full = popCount() >= popCap();
  let h = `<h3>선술집 <span class="sub">무료 갱신까지 ${fmtTime(left)}</span></h3><div class="list">`;
  S.tavern.cands.forEach((c, i) => {
    const spots = bestSpots(c), cb = combat(c);
    h += `<div class="row b-rar${c.rar}"><img class="pt" src="${portrait(c)}" alt=""><div class="grow"><b class="rar${c.rar}">${esc(c.name)}</b><span class="tag">${JOBS[c.job].n}</span><span class="stars">${RARITY[c.rar].stars}</span><small>${statLine(c)} · 전투력 ${cb.cp}</small><small>추천: ${spots.length ? esc(spots[0].label) + ' <span class="gain">' + spots[0].sub + '</span>' : '빈 자리가 없어요'}</small></div><button class="btn primary small" data-act="recruit" data-i="${i}" ${canAfford(cost) && !full ? '' : 'disabled'}>영입<small>${full ? '주민 상한' : costStr(cost)}</small></button></div>`;
  });
  h += `</div><div class="row-btns"><button class="btn small" data-act="refresh" ${S.res.gold >= refreshCost() ? '' : 'disabled'}>후보 갱신 (금화 ${refreshCost()})</button></div>`;
  h += `<h3>내 백성 <span>${popCount()}/${popCap()}</span></h3><div class="list">`;
  const list = Object.values(S.chars).sort((a, b) => b.rar - a.rar || b.lv - a.lv);
  h += list.length ? list.map(c => `<button class="row b-rar${c.rar}" data-act="char" data-id="${c.id}"><img class="pt" src="${portrait(c)}" alt=""><div class="grow"><b class="rar${c.rar}">${esc(c.name)}</b><span class="tag">${JOBS[c.job].n} Lv${c.lv}</span><small>${whereLabel(c.id)} · 전투력 ${combat(c).cp}</small></div><span class="sub">›</span></button>`).join('') : '<div class="sub">아직 주민이 없어요. 선술집에서 영입하세요. 처음 2명은 무료!</div>';
  return h + '</div>';
}
const refreshCost = () => 20 * S.castle;
function renderArmy() {
  let h = `<h3>영웅 편성 <span>부대 전투력 ${partyCp()}</span></h3><div class="heroes">`;
  for (let i = 0; i < 3; i++) {
    if (i >= heroSlots()) { h += `<div class="hero-slot locked">🔒<small>성 Lv${i === 1 ? 2 : 4}</small></div>`; continue; }
    const c = S.chars[S.heroes[i]];
    h += c ? `<button class="hero-slot filled b-rar${c.rar}" data-act="hero" data-i="${i}"><img src="${portrait(c)}" alt=""><b>${esc(shortName(c))}</b><small>${JOBS[c.job].n} · ${combat(c).cp}</small></button>` : `<button class="hero-slot" data-act="hero" data-i="${i}">＋<small>영웅 배치</small></button>`;
  }
  h += '</div>';
  h += `<h3>병사 <span>${soldierCount()}/${MAX_SOLDIERS}</span></h3>`;
  if (!barracksLv()) h += '<div class="sub">병영(성 Lv2)을 지으면 병사를 훈련할 수 있어요. 병사는 전투에서 죽으면 사라집니다.</div>';
  else {
    const sm = Math.pow(1.08, barracksLv() - 1);
    h += '<div class="list">';
    for (const k of SOLD_KEYS) {
      const T = SOLD[k], locked = S.castle < T.unlock;
      h += `<div class="row"><div class="grow"><b>${T.n}</b><span class="tag">보유 ${S.soldiers[k]}</span><small>${T.desc} · 체력 ${Math.round(T.hp * sm)} 공격 ${(T.atk * sm).toFixed(1)}</small></div><button class="btn small" data-act="train" data-k="${k}" ${locked || !canAfford(T.cost) || soldierCount() >= MAX_SOLDIERS ? 'disabled' : ''}>${locked ? '성 Lv' + T.unlock : '훈련 ' + T.time + '초'}<small>${costStr(T.cost)}</small></button></div>`;
    }
    h += '</div>';
    if (S.queue.length) h += `<div class="sub" style="margin-top:6px">훈련 중: ${S.queue.map(q => SOLD[q.type].n).join(', ')} · 다음 완료 ${fmtTime(S.queue[0].done - Date.now())}</div>`;
  }
  h += `<h3>전투 설정</h3><div class="toggle"><span>자동 반복<br><small class="sub">선택한 원정을 계속 반복하고 잃은 병사를 자동 보충</small></span><button class="sw ${S.auto ? 'on' : ''}" data-act="auto" aria-label="자동 반복"></button></div>`;
  h += `<div class="toggle"><span>전투 배속</span><button class="btn small" data-act="speed">${S.speed}x</button></div>`;
  return h;
}
function renderGear() {
  const filters = [['all', '전체'], ['weapon', '무기'], ['armor', '갑옷'], ['acc', '장신구'], ['free', '미착용']];
  let h = `<div class="chips">${filters.map(f => `<button class="chipbtn ${gearFilter === f[0] ? 'active' : ''}" data-act="gfilter" data-k="${f[0]}">${f[1]}</button>`).join('')}</div>`;
  h += `<div class="row-btns"><button class="btn" data-act="autoEquip">영웅 최적 장착</button><button class="btn" data-act="sellCommon">일반 장비 일괄 판매</button></div>`;
  const items = S.inv.filter(i => gearFilter === 'all' || (gearFilter === 'free' ? i.by == null : i.slot === gearFilter)).sort((a, b) => itemScore(b) - itemScore(a));
  h += `<h3>가방 <span>${S.inv.length}/${MAX_INV}</span></h3><div class="list">`;
  h += items.length ? items.map(it => `<button class="row b-rar${it.rar}" data-act="item" data-id="${it.id}"><div class="grow"><b class="rar${it.rar}">${esc(it.name)}</b><span class="tag">${SLOTS[it.slot]}</span>${it.by != null && S.chars[it.by] ? `<span class="tag">${esc(shortName(S.chars[it.by]))} 장착</span>` : ''}<small>${itemDesc(it)}</small></div><span class="sub">›</span></button>`).join('') : '<div class="sub">장비가 없어요. 원정에서 적을 물리치면 랜덤 옵션 장비를 얻습니다.</div>';
  return h + '</div>';
}
function renderQuest() {
  const { r } = stageOf(S.sel), R = REGIONS[r];
  let h = `<div class="chips">${REGIONS.map((Rg, i) => `<button class="chipbtn ${i === r ? 'active' : ''}" data-act="region" data-r="${i}" ${regionUnlocked(i) ? '' : 'disabled'}>${regionUnlocked(i) ? '' : '🔒 '}${Rg.n}</button>`).join('')}</div>`;
  h += '<div class="stages">';
  for (let i = 1; i <= 5; i++) { const s = r * 5 + i; h += `<button class="stage-cell ${s <= S.cleared ? 'cleared' : ''} ${s === S.sel ? 'active' : ''} ${stageUnlocked(s) ? '' : 'locked'}" data-act="stage" data-s="${s}">${i === 5 ? '👑' : s <= S.cleared ? '★' : stageUnlocked(s) ? '⚔' : '🔒'}<small>${r + 1}-${i}</small></button>`; }
  h += '</div>';
  const s = S.sel, en = enemyList(s), rec = recCp(s), my = partyCp(), ratio = rec ? my / rec : 1;
  h += `<div class="card"><div class="grow"><div class="title">${R.n} ${stageName(s)}</div><div class="sub">적: ${[...new Set(en.map(e => e.name))].join(', ')} (${en.length}명)</div><div class="sub">보상: 금화 ${Math.floor(8 * Math.pow(1.25, s - 1))} · ${RES[R.res].n} ${Math.floor(5 * Math.pow(1.25, s - 1))} · 장비 드롭 ${S.cleared >= s ? '55%' : '확정 (첫 클리어 보상 2배)'}</div>
    <div class="statbar"><span>권장</span><div class="bar"><i style="width:100%;background:#e35d5d"></i></div><b>${rec}</b></div>
    <div class="statbar"><span>내 부대</span><div class="bar"><i class="${ratio < 0.8 ? 'warn' : ''}" style="width:${clamp(ratio * 100, 0, 100)}%"></i></div><b>${my}</b></div>
    ${ratio < 0.8 ? '<div class="sub" style="color:var(--warn)">전투력이 부족해요. 영웅 레벨업, 장비 장착, 병사 훈련으로 보강하세요.</div>' : ''}
    <button class="btn primary block" data-act="depart" ${stageUnlocked(s) && !B ? '' : 'disabled'}>${B ? '전투 중…' : stageUnlocked(s) ? '출발!' : '잠김'}</button></div></div>`;
  if (!regionUnlocked(r)) h += `<div class="sub">이 지역은 성 Lv${r + 1} 과 이전 지역 보스 클리어가 필요해요.</div>`;
  h += `<div class="sub" style="margin-top:6px">전투는 자동으로 진행돼요. 화면 위 전장을 구경하세요! 자동 반복은 부대 탭에서 켤 수 있어요.</div>`;
  return h;
}

/* ---- 모달 ---- */
function openBuild(idx) {
  const h = BLD_ORDER.map(t => {
    const Bd = BLD[t], cost = bldCost(t, 1), locked = S.castle < Bd.unlock, maxed = Bd.max && countOf(t) >= Bd.max, ok = !locked && !maxed && canAfford(cost);
    return `<button class="row" data-act="build" data-t="${t}" data-idx="${idx}" ${ok ? '' : 'disabled'}><img class="pt" src="${bldIcon(t)}" alt=""><div class="grow"><b>${Bd.n}</b><small>${Bd.desc}</small><small>${locked ? '성 Lv' + Bd.unlock + ' 필요' : maxed ? '최대 1개' : costStr(cost)}</small></div></button>`;
  }).join('');
  openModal(`<div class="modal-title">무엇을 지을까요?</div><div class="list">${h}</div>`);
}
function openBuilding(idx) {
  const s = S.slots[idx], Bd = BLD[s.type], up = s.lv < MAX_LV ? bldCost(s.type, s.lv + 1) : null;
  let h = `<div class="card" style="margin-bottom:8px"><img src="${bldIcon(s.type)}" alt=""><div class="grow"><div class="modal-title" style="margin:0">${Bd.n} Lv${s.lv}</div><div class="sub">${Bd.desc}</div></div></div>`;
  if (Bd.res) {
    let W = 0; for (const id of s.workers) if (S.chars[id]) W += workerBonus(S.chars[id], s.type);
    h += `<div class="sub">생산: 기본 ${(Bd.base * s.lv).toFixed(2)} × 일꾼 ${pct(W)} × 성 +${(S.castle - 1) * 3}% = <b style="color:var(--text)">${prodOf(s).toFixed(2)} ${RES[Bd.res].n}/s</b></div><h3>일꾼 <span>${JOBS[Bd.job].n}이면 보너스 큼</span></h3>`;
    for (let w = 0; w < 2; w++) {
      const c = S.chars[s.workers[w]];
      h += c ? `<button class="equip-slot" data-act="worker" data-idx="${idx}" data-w="${w}"><img class="pt" src="${portrait(c)}" alt="" style="width:28px;height:28px"><div class="grow"><b class="rar${c.rar}">${esc(c.name)}</b> <small class="sub">${JOBS[c.job].n} · 생산 <span class="gain">${pct(workerBonus(c, s.type))}</span></small></div><small class="sub">해제</small></button>` : `<button class="equip-slot" data-act="worker" data-idx="${idx}" data-w="${w}"><span class="k">빈 자리</span><span class="sub">＋ 주민 배정</span></button>`;
    }
  } else if (Bd.pop) h += `<div class="sub">주민 상한 +${2 + s.lv} (레벨당 +1)</div>`;
  else h += `<div class="sub">병사 능력 +${Math.round((Math.pow(1.08, s.lv - 1) - 1) * 100)}% · 부대 탭에서 훈련하세요</div>`;
  h += `<div class="row-btns">${up ? `<button class="btn primary" data-act="upgrade" data-idx="${idx}" ${canAfford(up) ? '' : 'disabled'}>업그레이드 Lv${s.lv + 1}<small>${costStr(up)}</small></button>` : '<button class="btn" disabled>최대 레벨</button>'}<button class="btn" data-act="demolish" data-idx="${idx}">철거<small>비용 50% 환급</small></button></div>`;
  openModal(h);
}
function openChar(id) {
  const c = S.chars[id]; if (!c) return;
  const cb = combat(c), R = RARITY[c.rar], lc = levelCost(c), maxed = c.lv >= R.maxLv;
  let h = `<div class="card b-rar${c.rar}" style="margin-bottom:8px"><img src="${portrait(c)}" alt=""><div class="grow"><div class="modal-title rar${c.rar}" style="margin:0">${esc(c.name)}</div><div class="sub">${R.n} <span class="stars">${R.stars}</span> · ${JOBS[c.job].n} (${ROLE_NAME[JOBS[c.job].role]}) · Lv${c.lv}/${R.maxLv}</div><div class="sub">${whereLabel(id)}</div></div></div>`;
  h += Object.keys(STATS).map(k => `<div class="statbar"><span>${STATS[k]}</span><div class="bar"><i style="width:${clamp(cstat(c, k) / 1.5, 0, 100)}%;background:${k === JOBS[c.job].stat ? 'var(--accent)' : 'var(--iron)'}"></i></div><b>${cstat(c, k)}</b></div>`).join('');
  h += `<div class="sub" style="margin:6px 0">전투: 체력 ${cb.hp} · 공격 ${cb.atk} · 방어 ${cb.def} · 치명타 ${Math.round(cb.crit * 100)}% · <b style="color:var(--text)">전투력 ${cb.cp}</b></div>`;
  h += `<div class="row-btns"><button class="btn primary" data-act="levelUp" data-id="${id}" ${!maxed && canAfford(lc) ? '' : 'disabled'}>${maxed ? '최대 레벨' : '레벨업'}<small>${maxed ? '' : costStr(lc) + ' · 능력 +4%'}</small></button><button class="btn" data-act="assign" data-id="${id}">배정 변경</button></div>`;
  h += '<h3>장비</h3>';
  for (const slot in SLOTS) {
    const it = getItem(c.equip[slot]);
    h += `<button class="equip-slot" data-act="equipSlot" data-id="${id}" data-slot="${slot}"><span class="k">${SLOTS[slot]}</span>${it ? `<div class="grow"><b class="rar${it.rar}">${esc(it.name)}</b><div class="opt">${itemDesc(it)}</div></div><small class="sub">교체</small>` : '<span class="sub">비어 있음 · 탭하여 장착</span>'}</button>`;
  }
  openModal(h);
}
function openItem(id) {
  const it = getItem(id); if (!it) return;
  let h = `<div class="modal-title rar${it.rar}">${esc(it.name)}</div><div class="sub">${RARITY[it.rar].n} ${SLOTS[it.slot]} · 아이템 레벨 ${it.g}</div><div style="margin:8px 0">${itemDesc(it)}</div>`;
  if (it.by != null && S.chars[it.by]) h += `<div class="sub">현재 ${esc(S.chars[it.by].name)} 장착 중</div>`;
  h += '<h3>장착할 영웅</h3><div class="list">';
  const heroes = S.heroes.filter(hid => S.chars[hid]);
  h += heroes.length ? heroes.map(hid => { const c = S.chars[hid], cur = getItem(c.equip[it.slot]); return `<button class="row" data-act="equipTo" data-id="${id}" data-c="${hid}" ${it.by === hid ? 'disabled' : ''}><img class="pt" src="${portrait(c)}" alt=""><div class="grow"><b>${esc(c.name)}</b><small>${cur ? '현재: ' + esc(cur.name) + ' (' + Math.round(itemScore(cur)) + ')' : '비어 있음'} → 점수 ${Math.round(itemScore(it))}</small></div></button>`; }).join('') : '<div class="sub">편성된 영웅이 없어요</div>';
  h += `</div><div class="row-btns"><button class="btn" data-act="sell" data-id="${id}">판매<small>금화 +${sellPrice(it)}</small></button></div>`;
  openModal(h);
}
function showResult(res) {
  const R = REGIONS[stageOf(res.s).r];
  let h = `<div class="center"><div class="big" style="color:${res.win ? 'var(--accent)' : 'var(--muted)'}">${res.win ? '승리!' : '후퇴…'}</div><div class="sub">${R.n} ${stageName(res.s)}${res.first ? ' · 첫 클리어!' : ''}</div></div>`;
  if (res.win) {
    h += `<div style="margin:10px 0"><span class="reward" style="color:var(--gold)">금화 +${res.gold}</span><span class="reward" style="color:${RES[res.byRes].c}">${RES[res.byRes].n} +${res.byAmt}</span></div>`;
    if (res.item) {
      const it = res.item;
      h += `<div class="row b-rar${it.rar}"><div class="grow"><b class="rar${it.rar}">${esc(it.name)}</b><span class="tag">${SLOTS[it.slot]}</span><small>${itemDesc(it)}</small>${res.itemStored ? '' : '<small style="color:var(--warn)">가방이 가득 차서 판매됐어요</small>'}</div>${res.itemStored ? `<button class="btn small primary" data-act="equipDrop" data-id="${it.id}">장착</button>` : ''}</div>`;
    }
  } else {
    const tips = [];
    if (!S.heroes.filter(id => S.chars[id]).length) tips.push('영웅을 편성하세요');
    if (partyCp() < recCp(res.s) * 0.9) tips.push('전투력이 권장치보다 낮아요. 레벨업·장비·병사를 보강하세요');
    if (!S.heroes.some(id => S.chars[id] && JOBS[S.chars[id].job].role === 'healer')) tips.push('사제(치유)가 있으면 오래 버틸 수 있어요');
    h += `<div class="sub" style="margin:8px 0">${tips[0] || '조금 더 강해져서 다시 도전해요'}</div>`;
  }
  const lostTxt = SOLD_KEYS.filter(k => res.lost[k]).map(k => SOLD[k].n + ' ' + res.lost[k]).join(', ');
  if (lostTxt) h += `<div class="sub">잃은 병사: ${lostTxt}</div>`;
  const next = res.s + 1;
  h += `<div class="row-btns">${res.win && next <= 25 && stageUnlocked(next) ? `<button class="btn primary" data-act="goStage" data-s="${next}">다음 스테이지</button>` : ''}<button class="btn ${res.win ? '' : 'primary'}" data-act="goStage" data-s="${res.s}">${res.win ? '다시 사냥' : '재도전'}</button><button class="btn" data-act="close">닫기</button></div>`;
  openModal(h);
}
function openSettings() {
  openModal(`<div class="modal-title">설정</div>
    <div class="toggle"><span>효과음</span><button class="sw ${S.settings.sound ? 'on' : ''}" data-act="sound" aria-label="효과음"></button></div>
    <div class="toggle"><span>전적</span><span class="sub">${S.stats.wins}승 ${S.stats.losses}패 · 영입 ${S.stats.recruits}명</span></div>
    <h3>저장 내보내기 / 불러오기</h3><textarea id="save-io" placeholder="여기에 저장 코드를 붙여넣고 불러오기를 누르세요"></textarea>
    <div class="row-btns"><button class="btn" data-act="export">내보내기</button><button class="btn" data-act="import">불러오기</button></div>
    <h3>위험 구역</h3><button class="btn danger block" data-act="reset">저장 초기화</button>
    <div class="sub center" style="margin-top:10px">꼬마 왕국: 숲의 전쟁 v1.0</div>`);
}
function openIntro() {
  openModal(`<div class="card b-rar2" style="margin-bottom:8px"><img src="${princessPortrait()}" alt=""><div class="grow"><div class="modal-title" style="margin:0">이슬 공주</div><div class="sub">도토리 왕국의 어린 지도자</div></div></div>
    <div class="intro"><p>"여기가… 우리 왕국이야. 아무것도 없지만."</p><p>"나무를 베고 밭을 갈면 사람들이 모여들 거야. 그리고 언젠가, 잿빛 군단에게 빼앗긴 다섯 땅을 되찾을 거야!"</p>
    <ol><li><b>왕국</b> 탭에서 벌목장과 농장을 지으세요.</li><li><b>주민</b> 탭 선술집에서 2명을 무료로 영입하고 일터에 배정하세요.</li><li><b>부대</b> 탭에서 전사를 영웅으로 편성하세요.</li><li><b>원정</b> 탭에서 1-1로 출발! 전투는 자동으로 진행돼요.</li></ol>
    <p class="sub">자리를 비워도 자원은 계속 쌓입니다(8시간, 50% 효율). 자기 페이스로 느긋하게 즐기세요.</p></div>
    <button class="btn primary block" data-act="close">시작하기</button>`);
}
function openOffline(rep) {
  const list = RES_KEYS.filter(k => rep.gains[k] >= 1).map(k => `<span class="reward" style="color:${RES[k].c}">${RES[k].n} +${fmt(rep.gains[k])}</span>`).join('') || '<span class="sub">생산 건물이 없어서 얻은 자원이 없어요</span>';
  openModal(`<div class="modal-title">자리를 비운 동안</div><div class="sub">${fmtTime(rep.ms)} 동안 주민들이 열심히 일했어요${rep.ms > rep.capped ? ' (최대 8시간까지 계산)' : ''} · 효율 50%</div><div style="margin:10px 0">${list}</div><button class="btn primary block" data-act="close">받기</button>`);
}

/* ---- 액션 ---- */
function pickWorker(idx) {
  const s = S.slots[idx];
  const cands = Object.values(S.chars).filter(c => !s.workers.includes(c.id)).map(c => ({ c, gain: workerBonus(c, s.type) })).sort((a, b) => b.gain - a.gain);
  openPicker(BLD[s.type].n + '에 누구를 배정할까요?', cands.map(({ c, gain }) => ({ cls: 'b-rar' + c.rar, html: `<img class="pt" src="${portrait(c)}" alt=""><div class="grow"><b class="rar${c.rar}">${esc(c.name)}</b><span class="tag">${JOBS[c.job].n}</span><small>${whereLabel(c.id)} → 생산 <span class="gain">${pct(gain)}</span></small></div>`, cb: () => { assignWorker(c.id, idx); sfx('tap'); openBuilding(idx); } })), '영입된 주민이 없어요. 선술집에서 영입하세요.');
}
function pickHero(slot) {
  const cands = Object.values(S.chars).filter(c => S.heroes[slot] !== c.id).map(c => ({ c, cp: combat(c).cp })).sort((a, b) => (JOBS[b.c.job].kind === 'fight') - (JOBS[a.c.job].kind === 'fight') || b.cp - a.cp);
  openPicker('영웅 ' + (slot + 1) + '번 슬롯', cands.map(({ c, cp }) => ({ cls: 'b-rar' + c.rar, html: `<img class="pt" src="${portrait(c)}" alt=""><div class="grow"><b class="rar${c.rar}">${esc(c.name)}</b><span class="tag">${JOBS[c.job].n} · ${ROLE_NAME[JOBS[c.job].role]}</span><small>${whereLabel(c.id)} · 전투력 ${cp}${JOBS[c.job].kind !== 'fight' ? ' (전투 직업 아님)' : ''}</small></div>`, cb: () => { setHero(slot, c.id); sfx('tap'); } })), '영입된 주민이 없어요.');
}
function pickAssign(id) {
  const c = S.chars[id], spots = bestSpots(c);
  const items = spots.map(sp => ({ html: `<div class="grow"><b>${esc(sp.label)}</b><small><span class="gain">${sp.sub}</span></small></div>`, cb: () => { sp.kind === 'hero' ? setHero(sp.slot, id) : assignWorker(id, sp.idx); sfx('tap'); toast(esc(c.name) + ' → ' + sp.label, 'ok'); } }));
  if (whereIs(id)) items.push({ html: '<div class="grow"><b>배정 해제</b><small>휴식</small></div>', cb: () => { unassign(id); } });
  openPicker(esc(c.name) + ' 어디에 배정할까요?', items, '빈 일터가 없어요. 건물을 더 짓거나 업그레이드하세요.');
}
function pickEquip(id, slot) {
  const c = S.chars[id], cur = getItem(c.equip[slot]);
  const items = S.inv.filter(i => i.slot === slot && i.id !== c.equip[slot]).sort((a, b) => itemScore(b) - itemScore(a)).map(it => ({ cls: 'b-rar' + it.rar, html: `<div class="grow"><b class="rar${it.rar}">${esc(it.name)}</b>${it.by != null && S.chars[it.by] ? `<span class="tag">${esc(shortName(S.chars[it.by]))} 장착 중</span>` : ''}<small>${itemDesc(it)} · 점수 ${Math.round(itemScore(it))}${cur ? ' (현재 ' + Math.round(itemScore(cur)) + ')' : ''}</small></div>`, cb: () => { equipItem(it.id, id); sfx('tap'); openChar(id); } }));
  if (cur) items.push({ html: '<div class="grow"><b>장착 해제</b></div>', cb: () => { unequipSlot(id, slot); openChar(id); } });
  openPicker(SLOTS[slot] + ' 선택', items, '가방에 ' + SLOTS[slot] + '이(가) 없어요.');
}
function handle(act, d) {
  const idx = +d.idx, id = +d.id;
  switch (act) {
    case 'close': closeModal(); break;
    case 'pick': { const cb = pickCbs[+d.i]; closeModal(); if (cb) cb(); break; }
    case 'slot': if (S.slots[idx].type) openBuilding(idx); else openBuild(idx); break;
    case 'build': { const cost = bldCost(d.t, 1); if (S.slots[idx].type || !spend(cost)) break; S.slots[idx] = { type: d.t, lv: 1, workers: [] }; sfx('build'); closeModal(); toast(BLD[d.t].n + ' 건설!', 'ok'); break; }
    case 'castleUp': { if (S.castle >= MAX_CASTLE || !spend(castleCost(S.castle))) break; S.castle++; sfx('build'); toast('성 Lv' + S.castle + '! ' + UNLOCKS[S.castle], 'ok'); break; }
    case 'upgrade': { const s = S.slots[idx]; if (!s.type || s.lv >= MAX_LV || !spend(bldCost(s.type, s.lv + 1))) break; s.lv++; sfx('build'); openBuilding(idx); break; }
    case 'demolish': confirmModal('철거할까요?', BLD[S.slots[idx].type].n + '을(를) 철거하면 일꾼은 해제되고 비용의 50%만 돌려받아요.', '철거', () => { const s = S.slots[idx]; for (let l = 1; l <= s.lv; l++) { const c = bldCost(s.type, l); for (const k in c) S.res[k] += c[k] * 0.5; } S.slots[idx] = { type: null, lv: 0, workers: [] }; toast('철거 완료', 'warn'); }); break;
    case 'worker': { const s = S.slots[idx], wid = s.workers[+d.w]; if (wid != null) { unassign(wid); openBuilding(idx); } else pickWorker(idx); break; }
    case 'recruit': { const c = S.tavern.cands[+d.i]; if (!c || popCount() >= popCap()) break; const cost = recruitCost(); if (!spend(cost)) break; if (S.freeRecruits > 0) S.freeRecruits--; c.id = S.nextId++; S.chars[c.id] = c; S.tavern.cands[+d.i] = genChar(); S.stats.recruits++; sfx('recruit'); toast(c.name + ' 영입!', 'ok'); pickAssign(c.id); break; }
    case 'refresh': if (S.res.gold >= refreshCost()) { S.res.gold -= refreshCost(); refreshTavern(); sfx('coin'); } break;
    case 'char': openChar(id); break;
    case 'levelUp': { const c = S.chars[id]; if (!c || c.lv >= RARITY[c.rar].maxLv || !spend(levelCost(c))) break; c.lv++; sfx('coin'); openChar(id); break; }
    case 'assign': pickAssign(id); break;
    case 'equipSlot': pickEquip(id, d.slot); break;
    case 'hero': { const i = +d.i; if (S.heroes[i] != null && S.chars[S.heroes[i]]) { openChar(S.heroes[i]); } else pickHero(i); break; }
    case 'train': if (trainSoldier(d.k)) sfx('coin'); break;
    case 'auto': S.auto = !S.auto; if (S.auto && !B) { autoWait = 1; toast('자동 반복 시작: ' + stageName(S.sel), 'ok'); } else if (!S.auto) autoWait = 0; break;
    case 'speed': S.speed = S.speed === 1 ? 2 : 1; break;
    case 'gfilter': gearFilter = d.k; break;
    case 'autoEquip': { const n = autoEquip(); toast(n ? n + '개 장비를 장착했어요' : '바꿀 장비가 없어요', n ? 'ok' : ''); if (n) sfx('tap'); break; }
    case 'sellCommon': { const list = S.inv.filter(i => i.rar === 0 && i.by == null); if (!list.length) { toast('팔 일반 장비가 없어요'); break; } let g = 0; for (const it of list) g += sellItem(it.id); sfx('coin'); toast(list.length + '개 판매, 금화 +' + g, 'ok'); break; }
    case 'item': openItem(id); break;
    case 'equipTo': equipItem(id, +d.c); sfx('tap'); closeModal(); toast('장착 완료', 'ok'); break;
    case 'equipDrop': { const heroes = S.heroes.filter(h => S.chars[h]); if (heroes.length === 1) { equipItem(id, heroes[0]); closeModal(); toast('장착 완료', 'ok'); } else openItem(id); break; }
    case 'sell': { const p = sellItem(id); closeModal(); sfx('coin'); toast('금화 +' + p, 'ok'); break; }
    case 'region': { const r = +d.r; if (!regionUnlocked(r)) break; S.sel = clamp(S.cleared + 1, r * 5 + 1, r * 5 + 5); if (stageOf(S.sel).r !== r) S.sel = r * 5 + 1; break; }
    case 'stage': if (stageUnlocked(+d.s)) S.sel = +d.s; else toast('이전 스테이지를 먼저 클리어하세요', 'warn'); break;
    case 'depart': if (startBattle(S.sel)) sfx('tap'); break;
    case 'goStage': closeModal(); S.sel = +d.s; tab = 'quest'; setTabUI(); startBattle(S.sel); break;
    case 'sound': S.settings.sound = !S.settings.sound; ensureAudio(); openSettings(); break;
    case 'export': { const ta = $('#save-io'); ta.value = btoa(unescape(encodeURIComponent(JSON.stringify(S)))); ta.select(); toast('저장 코드를 복사하세요', 'ok'); break; }
    case 'import': { try { const o = JSON.parse(decodeURIComponent(escape(atob($('#save-io').value.trim())))); if (!o || o.v !== 1 || !Array.isArray(o.slots)) throw new Error('bad'); localStorage.setItem(SAVE_KEY, JSON.stringify(o)); location.reload(); } catch (e) { toast('저장 코드가 올바르지 않아요', 'danger'); } break; }
    case 'reset': confirmModal('정말 초기화할까요?', '집사 도토: "정말요? 되돌릴 수 없어요."', '초기화', () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } S = newState(); location.reload(); }); break;
    default: return;
  }
  renderAll();
  save();
}
function setTabUI() {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  panel.scrollTop = 0;
  renderPanel();
}
function bind() {
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    ensureAudio();
    handle(el.dataset.act, el.dataset);
  });
  $('#modal-root').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => { ensureAudio(); sfx('tap'); tab = t.dataset.tab; setTabUI(); }));
  $('#btn-settings').addEventListener('click', () => { ensureAudio(); openSettings(); });
  $('#btn-speed').addEventListener('click', () => { S.speed = S.speed === 1 ? 2 : 1; updateLaneStatus(); save(); });
  $('#btn-skip').addEventListener('click', () => { skipBattle(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modalOpen) closeModal(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  window.addEventListener('beforeunload', save);
}
function econ() {
  const now = Date.now();
  const gap = now - S.t;
  S.t = now;
  if (gap <= 0) return;
  if (gap > 60000) { const rep = applyOffline(gap); if (!modalOpen) openOffline(rep); }
  else tick(gap / 1000);
}
function boot() {
  const isNew = !load();
  $('#princess').src = princessPortrait();
  const now = Date.now(), gap = now - S.t;
  S.t = now;
  let rep = null;
  if (!isNew && gap > 60000) rep = applyOffline(gap);
  bind();
  renderAll();
  if (isNew) openIntro(); else if (rep) openOffline(rep);
  setInterval(econ, 500);
  setInterval(save, 10000);
  setInterval(renderHud, 250);
  setInterval(() => { if (!modalOpen) renderPanel(); }, 1000);
  requestAnimationFrame(frame);
}
window.KK = { get state() { return S; }, save, startBattle, skipBattle, enemyList, partyCp, recCp, combat, genChar, createBattle, runBattle, toast };
boot();
})();
