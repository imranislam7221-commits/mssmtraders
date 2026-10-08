'use strict';
/* database: JSON-file store, atomic write, seed data */
const fs = require('fs');
const path = require('path');
const { sha256, nowIso, fmtDT } = require('./helpers');
const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
let db = null;
/* ---------- database (JSON file, atomic write) ---------- */
function saveDb() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, DB_FILE);
}
function nextId(key) { db.counters[key] = (db.counters[key] || 0) + 1; return db.counters[key]; }
function loadDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); console.log('Database loaded: ' + DB_FILE); return; }
    catch (e) { console.error('DB file corrupt, reseeding...', e.message); }
  }
  db = seedDb();
  saveDb();
  console.log('New database seeded at: ' + DB_FILE);
}

/* ---------- seed demo data ---------- */
function seedDb() {
  const d = { counters: {}, users: [], products: [], stock_ledger: [], customers: [], invoices: [], customer_ledger: [], cash_ledger: [], sessions: {}, settings: {} };
  const t = nowIso();
  d.settings = {
    shop_name: 'M/S S.M. Traders',
    shop_phone: '',
    shop_address: '',
    vat_percent: 0,
    opening_cash: 0,
    sms_template: 'Dear {name}, Total Bill: {total} tk. Paid: {paid} tk. Due: {due} tk. Thank you, {shop}.',
    notify_number: '',
    receipt_header: '',
    receipt_footer: '',
    memo_logo: 'MST',
    memo_title_line: 'মেসার্স এস.এম ট্রেডার্স',
    memo_pro_line: 'প্রো: মুনজুর আহমেদ',
    memo_trade_line: '',
    memo_address_line: '',
    memo_mobile_line: '',
    memo_footer_note: 'এম.এস ট্রেডার্স এর মাল কেনার জন্য আপনাকে ধন্যবাদ',
    mimsms: { api_key: '', user_name: '', sender_name: '' }
  };
  d.users = [
    { id: 1, name: 'Shop Owner (Malik)', email: 'owner@shop.com', pass: sha256('owner123'), role: 'owner', created_at: t },
    { id: 2, name: 'Shop Manager', email: 'manager@shop.com', pass: sha256('manager123'), role: 'manager', created_at: t }
  ];
  d.counters.user = 2;
  const seedProducts = [
    { name: 'MS Rod 8mm', category: 'Rod', unit: 'kg', size_mili: 8, opening: 0, pp: 70, sp: 78, low: 100 },
    { name: 'MS Rod 10mm', category: 'Rod', unit: 'kg', size_mili: 10, opening: 0, pp: 70, sp: 78, low: 100 },
    { name: 'MS Rod 12mm', category: 'Rod', unit: 'kg', size_mili: 12, opening: 0, pp: 70, sp: 79, low: 100 },
    { name: 'MS Rod 14mm', category: 'Rod', unit: 'kg', size_mili: 14, opening: 0, pp: 70, sp: 79, low: 100 },
    { name: 'MS Rod 16mm', category: 'Rod', unit: 'kg', size_mili: 16, opening: 0, pp: 70.5, sp: 80, low: 100 },
    { name: 'MS Rod 18mm', category: 'Rod', unit: 'kg', size_mili: 18, opening: 0, pp: 71, sp: 80, low: 80 },
    { name: 'MS Rod 20mm', category: 'Rod', unit: 'kg', size_mili: 20, opening: 0, pp: 71, sp: 81, low: 80 },
    { name: 'MS Rod 22mm', category: 'Rod', unit: 'kg', size_mili: 22, opening: 0, pp: 71.5, sp: 82, low: 50 },
    { name: 'MS Rod 25mm', category: 'Rod', unit: 'kg', size_mili: 25, opening: 0, pp: 71.5, sp: 82, low: 50 },
    { name: 'BSRM Xtreme 500W 12mm', category: 'Rod (Brand)', unit: 'kg', size_mili: 12, opening: 0, pp: 74, sp: 84, low: 50 },
    { name: 'BSRM Xtreme 500W 16mm', category: 'Rod (Brand)', unit: 'kg', size_mili: 16, opening: 0, pp: 74, sp: 85, low: 50 },
    { name: 'Shah Cement (50kg)', category: 'Cement', unit: 'bag', size_mili: null, opening: 0, pp: 445, sp: 480, low: 40 },
    { name: 'Scan Cement (50kg)', category: 'Cement', unit: 'bag', size_mili: null, opening: 0, pp: 440, sp: 475, low: 40 },
    { name: 'Seven Rings Cement (50kg)', category: 'Cement', unit: 'bag', size_mili: null, opening: 0, pp: 435, sp: 470, low: 40 },
    { name: 'Crown Cement (50kg)', category: 'Cement', unit: 'bag', size_mili: null, opening: 0, pp: 438, sp: 472, low: 40 },
    { name: 'Meghna Cement (50kg)', category: 'Cement', unit: 'bag', size_mili: null, opening: 0, pp: 430, sp: 465, low: 40 },
    { name: 'Heidelberg Sea Plus (50kg)', category: 'Cement', unit: 'bag', size_mili: null, opening: 0, pp: 428, sp: 462, low: 40 },
    { name: 'Holcim Cement (50kg)', category: 'Cement', unit: 'bag', size_mili: null, opening: 0, pp: 442, sp: 478, low: 40 },
    { name: 'Confidence Cement (50kg)', category: 'Cement', unit: 'bag', size_mili: null, opening: 0, pp: 425, sp: 458, low: 40 },
    { name: 'Premier Cement (50kg)', category: 'Cement', unit: 'bag', size_mili: null, opening: 0, pp: 432, sp: 466, low: 40 },
    { name: 'Fresh Cement (50kg)', category: 'Cement', unit: 'bag', size_mili: null, opening: 0, pp: 426, sp: 460, low: 40 },
    { name: 'Diamond Cement (50kg)', category: 'Cement', unit: 'bag', size_mili: null, opening: 0, pp: 424, sp: 456, low: 30 },
    { name: 'Metrocem Cement (50kg)', category: 'Cement', unit: 'bag', size_mili: null, opening: 0, pp: 429, sp: 464, low: 30 },
    { name: 'Ceramic Tiles 60x60', category: 'Tiles', unit: 'sft', size_mili: null, opening: 0, pp: 62, sp: 85, low: 100 },
    { name: 'Ceramic Tiles 40x40', category: 'Tiles', unit: 'sft', size_mili: null, opening: 0, pp: 48, sp: 68, low: 80 },
    { name: 'PVC Pipe 1 inch', category: 'Pipes', unit: 'pc', size_mili: null, opening: 0, pp: 95, sp: 125, low: 30 },
    { name: 'PVC Pipe 2 inch', category: 'Pipes', unit: 'pc', size_mili: null, opening: 0, pp: 180, sp: 235, low: 30 },
    { name: 'Wall Paint (Weather Coat)', category: 'Paint', unit: 'ltr', size_mili: null, opening: 0, pp: 310, sp: 375, low: 15 },
    { name: 'Claw Hammer', category: 'Tools', unit: 'pc', size_mili: null, opening: 0, pp: 220, sp: 290, low: 5 },
    { name: 'Balu (মোটা বালু) Coarse', category: 'Balu (Sand)', unit: 'cft', size_mili: null, opening: 0, pp: 55, sp: 70, low: 200 },
    { name: 'Balu (চিকন বালু) Fine', category: 'Balu (Sand)', unit: 'cft', size_mili: null, opening: 0, pp: 50, sp: 65, low: 200 },
    { name: 'Ita (ইট) Pilla Brick', category: 'Brick (ইট)', unit: 'pc', size_mili: null, opening: 0, pp: 12, sp: 16, low: 1000 },
    { name: 'Khoa (খোয়া) Brick Chips', category: 'Brick (ইট)', unit: 'cft', size_mili: null, opening: 0, pp: 60, sp: 78, low: 200 }
  ];
  for (const p of seedProducts) {
    const id = nextIdOn(d, 'product');
    d.products.push({ id, name: p.name, category: p.category, unit: p.unit, size_mili: p.size_mili, opening_stock: p.opening, current_stock: p.opening, purchase_price: p.pp, selling_price: p.sp, low_stock: p.low, created_at: t, created_by: 1 });
    d.stock_ledger.push({ id: nextIdOn(d, 'ledger'), product_id: id, product_name: p.name, user_id: 1, user_name: 'Shop Owner (Malik)', type: 'OPENING', quantity: p.opening, unit_cost: p.pp, unit_price: null, source: 'Opening Stock', note: 'Initial inventory', timestamp: t, time_display: fmtDT(t) });
  }
  d.customers = [];
  d.counters.customer = 0;
  return d;
}
function nextIdOn(dd, key) { dd.counters[key] = (dd.counters[key] || 0) + 1; return dd.counters[key]; }


module.exports = { get db() { return db; }, loadDb, saveDb, nextId };
