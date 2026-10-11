'use strict';
/* database: JSON-file store, atomic write, seed data */
const fs = require('fs');
const path = require('path');
const { sha256, nowIso, fmtDT } = require('./helpers');
const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
let db = null;
let _syncTimer = null;
function triggerSyncToGoogle() {
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => {
    try {
      const BACKUP = require('./backup');
      const g = db && db.settings && db.settings.google_sync;
      if (g && g.webhook_url && g.auto_sync) {
        BACKUP.syncToGoogle(g.webhook_url).then(() => {
          if (db && db.settings && db.settings.google_sync) {
            db.settings.google_sync.last_sync = nowIso();
          }
        }).catch(() => {});
      }
    } catch (_) {}
  }, 1200);
}

/* ---------- database (JSON file, atomic write) ---------- */
function saveDb() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  try {
    fs.renameSync(tmp, DB_FILE);
  } catch (err) {
    fs.copyFileSync(tmp, DB_FILE);
    try { fs.unlinkSync(tmp); } catch (_) {}
  }
  triggerSyncToGoogle();
}
function nextId(key) { db.counters[key] = (db.counters[key] || 0) + 1; return db.counters[key]; }
function loadDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      // Sync memo settings if they match default or are empty
      db.settings = db.settings || {};
      db.settings.shop_name = db.settings.shop_name || 'মেসার্স এম.এস ট্রেডার্স';
      db.settings.memo_logo = db.settings.memo_logo || 'MST';
      db.settings.memo_title_line = 'মেসার্স এম.এস ট্রেডার্স';
      db.settings.memo_pro_line = 'প্রোঃ মুনজুর আহমেদ';
      db.settings.memo_trade_line = 'এখানে রড, সিমেন্ট, ইট, বালি, খোয়া জাতীয় নির্মাণ সামগ্রী সুলভ মূল্যে বিক্রয় করা হয়।';
      db.settings.memo_address_line = 'সোসাইটি পুরাতন মার্কেট, পুরাতন বাজার, দর্শনা, চুয়াডাঙ্গা।';
      db.settings.memo_mobile_line = 'মোবাইল: ০১৯৫৬-২২৬৪৬৫, ০১৭৪৮-১৫২০৩৬';
      db.settings.memo_footer_note = 'এম.এস ট্রেডার্স এর মাল ক্রয় করার জন্য আপনাকে ধন্যবাদ';
      db.settings.google_sync = db.settings.google_sync || {};
      if (!db.settings.google_sync.webhook_url) {
        db.settings.google_sync.webhook_url = 'https://script.google.com/macros/s/AKfycbw2QoMQefpD_p6X2mt6aQAohxncSjuwm0gas_ModDjyeo_WIADjvcELu4njnhX3kxKf/exec';
      }
      db.settings.google_sync.auto_sync = true;
      db.users = [
        { id: 1, name: 'মুনজুর আহমেদ', email: 'monjurahmed1984dsn@gmail.com', username: 'mssmtradersdokan', pass: sha256('Smtradersdokan'), role: 'owner', created_at: (db.users && db.users[0] && db.users[0].created_at) || nowIso() }
      ];
      db.counters.user = 1;
      db.sessions = {};
      db.expenses = Array.isArray(db.expenses) ? db.expenses : [];

      // Auto-migrate products & stock ledger to 100% Bangla if any exist in English
      if (Array.isArray(db.products)) {
        let changed = false;
        const nameMap = {
          'MS Rod 8mm': 'এম.এস রড ৮ মি.মি',
          'MS Rod 10mm': 'এম.এস রড ১০ মি.মি',
          'MS Rod 12mm': 'এম.এস রড ১২ মি.মি',
          'MS Rod 14mm': 'এম.এস রড ১৪ মি.মি',
          'MS Rod 16mm': 'এম.এস রড ১৬ মি.মি',
          'MS Rod 18mm': 'এম.এস রড ১৮ মি.মি',
          'MS Rod 20mm': 'এম.এস রড ২০ মি.মি',
          'MS Rod 22mm': 'এম.এস রড ২২ মি.মি',
          'MS Rod 25mm': 'এম.এস রড ২৫ মি.মি',
          'BSRM Xtreme 500W 12mm': 'বিএসআরএম এক্সট্রিম ৫০০ডব্লিউ ১২ মি.মি',
          'BSRM Xtreme 500W 16mm': 'বিএসআরএম এক্সট্রিম ৫০০ডব্লিউ ১৬ মি.মি',
          'Shah Cement (50kg)': 'শাহ সিমেন্ট (৫০ কেজি)',
          'Scan Cement (50kg)': 'স্ক্যান সিমেন্ট (৫০ কেজি)',
          'Seven Rings Cement (50kg)': 'সেভেন রিংস সিমেন্ট (৫০ কেজি)',
          'Crown Cement (50kg)': 'ক্রাউন সিমেন্ট (৫০ কেজি)',
          'Meghna Cement (50kg)': 'মেঘনা সিমেন্ট (৫০ কেজি)',
          'Heidelberg Sea Plus (50kg)': 'হাইডেলবার্গ সি প্লাস (৫০ কেজি)',
          'Holcim Cement (50kg)': 'হোলসিম সিমেন্ট (৫০ কেজি)',
          'Confidence Cement (50kg)': 'কনফিডেন্স সিমেন্ট (৫০ কেজি)',
          'Premier Cement (50kg)': 'প্রিমিয়ার সিমেন্ট (৫০ কেজি)',
          'Fresh Cement (50kg)': 'ফ্রেশ সিমেন্ট (৫০ কেজি)',
          'Diamond Cement (50kg)': 'ডায়মন্ড সিমেন্ট (৫০ কেজি)',
          'Metrocem Cement (50kg)': 'মেট্রোসিম সিমেন্ট (৫০ কেজি)',
          'Ceramic Tiles 60x60': 'সিরামিক টাইলস ৬০×৬০',
          'Ceramic Tiles 40x40': 'সিরামিক টাইলস ৪০×৪০',
          'PVC Pipe 1 inch': 'পিভিসি পাইপ ১ ইঞ্চি',
          'PVC Pipe 2 inch': 'পিভিসি পাইপ ২ ইঞ্চি',
          'Wall Paint (Weather Coat)': 'ওয়াল পেইন্ট (ওয়েদার কোট)',
          'Claw Hammer': 'হাতুড়ি',
          'Balu (মোটা বালু) Coarse': 'সিলেট বালু (মোটা)',
          'Balu (চিকন বালু) Fine': 'লোকাল বালু (চিকন)',
          'Ita (ইট) Pilla Brick': '১নং লাল ইট (পিলা)',
          'Khoa (খোয়া) Brick Chips': 'ইটের খোয়া'
        };
        const catMap = {
          'Rod': 'রড',
          'Rod (Brand)': 'রড (ব্র্যান্ড)',
          'Cement': 'সিমেন্ট',
          'Tiles': 'টাইলস',
          'Pipes': 'পাইপ',
          'Paint': 'রং',
          'Tools': 'টুলস',
          'Balu (Sand)': 'বালু',
          'Brick (ইট)': 'ইট',
          'Brick': 'ইট',
          'Sand': 'বালু ও খোয়া'
        };
        const unitMap = {
          'kg': 'কেজি',
          'bag': 'বস্তা',
          'pc': 'পিস',
          'sft': 'বর্গফুট',
          'cft': 'ঘনফুট',
          'ltr': 'লিটার',
          'ton': 'টন',
          'bundle': 'বান্ডিল',
          'box': 'বক্স',
          'pkt': 'প্যাকেট'
        };
        const defaultStockMap = {
          'এম.এস রড ৮ মি.মি': 4980,
          'এম.এস রড ১০ মি.মি': 5000,
          'এম.এস রড ১২ মি.মি': 4000,
          'এম.এস রড ১৪ মি.মি': 3000,
          'এম.এস রড ১৬ মি.মি': 3000,
          'এম.এস রড ১৮ মি.মি': 2000,
          'এম.এস রড ২০ মি.মি': 2000,
          'এম.এস রড ২২ মি.মি': 1500,
          'এম.এস রড ২৫ মি.মি': 1500,
          'বিএসআরএম এক্সট্রিম ৫০০ডব্লিউ ১২ মি.মি': 3000,
          'বিএসআরএম এক্সট্রিম ৫০০ডব্লিউ ১৬ মি.মি': 3000,
          'শাহ সিমেন্ট (৫০ কেজি)': 350,
          'স্ক্যান সিমেন্ট (৫০ কেজি)': 250,
          'সেভেন রিংস সিমেন্ট (৫০ কেজি)': 250,
          'ক্রাউন সিমেন্ট (৫০ কেজি)': 250,
          'মেঘনা সিমেন্ট (৫০ কেজি)': 200,
          'হাইডেলবার্গ সি প্লাস (৫০ কেজি)': 200,
          'হোলসিম সিমেন্ট (৫০ কেজি)': 300,
          'কনফিডেন্স সিমেন্ট (৫০ কেজি)': 200,
          'প্রিমিয়ার সিমেন্ট (৫০ কেজি)': 200,
          'ফ্রেশ সিমেন্ট (৫০ কেজি)': 250,
          'ডায়মন্ড সিমেন্ট (৫০ কেজি)': 200,
          'মেট্রোসিম সিমেন্ট (৫০ কেজি)': 200,
          'সিরামিক টাইলস ৬০×৬০': 500,
          'সিরামিক টাইলস ৪০×৪০': 400,
          'পিভিসি পাইপ ১ ইঞ্চি': 120,
          'পিভিসি পাইপ ২ ইঞ্চি': 100,
          'ওয়াল পেইন্ট (ওয়েদার কোট)': 60,
          'হাতুড়ি': 30,
          'সিলেট বালু (মোটা)': 1000,
          'লোকাল বালু (চিকন)': 1000,
          '১নং লাল ইট (পিলা)': 10000,
          'ইটের খোয়া': 1000
        };
        db.products.forEach(p => {
          if (nameMap[p.name]) { p.name = nameMap[p.name]; changed = true; }
          if (catMap[p.category]) { p.category = catMap[p.category]; changed = true; }
          if (unitMap[p.unit]) { p.unit = unitMap[p.unit]; changed = true; }
          // If product currently has 0 stock, initialize with healthy stock
          if ((p.current_stock === 0 || p.current_stock == null) && defaultStockMap[p.name]) {
            p.current_stock = defaultStockMap[p.name];
            p.opening_stock = defaultStockMap[p.name];
            changed = true;
          }
        });
        if (Array.isArray(db.stock_ledger)) {
          db.stock_ledger.forEach(l => {
            if (nameMap[l.product_name]) { l.product_name = nameMap[l.product_name]; changed = true; }
          });
        }
        if (changed) {
          saveDb();
          console.log('Migrated products and stock ledger to pure Bangla with healthy initial stocks.');
        }
      }

      saveDb();
      console.log('Database loaded: ' + DB_FILE);
      return;
    }
    catch (e) { console.error('DB file corrupt, reseeding...', e.message); }
  }
  db = seedDb();
  saveDb();
  console.log('New database seeded at: ' + DB_FILE);
}

/* ---------- seed demo data ---------- */
function seedDb() {
  const d = { counters: {}, users: [], products: [], stock_ledger: [], customers: [], invoices: [], customer_ledger: [], cash_ledger: [], expenses: [], sessions: {}, settings: {} };
  const t = nowIso();
  d.settings = {
    shop_name: 'মেসার্স এম.এস ট্রেডার্স',
    shop_phone: '০১৯৫৬-২২৬৪৬৫',
    shop_address: 'সোসাইটি পুরাতন মার্কেট, পুরাতন বাজার, দর্শনা, চুয়াডাঙ্গা।',
    vat_percent: 0,
    opening_cash: 0,
    sms_template: 'Dear {name}, Total Bill: {total} tk. Paid: {paid} tk. Due: {due} tk. Thank you, {shop}.',
    notify_number: '',
    receipt_header: '',
    receipt_footer: '',
    memo_logo: 'MST',
    memo_title_line: 'মেসার্স এম.এস ট্রেডার্স',
    memo_pro_line: 'প্রোঃ মুনজুর আহমেদ',
    memo_trade_line: 'এখানে রড, সিমেন্ট, ইট, বালি, খোয়া জাতীয় নির্মাণ সামগ্রী সুলভ মূল্যে বিক্রয় করা হয়।',
    memo_address_line: 'সোসাইটি পুরাতন মার্কেট, পুরাতন বাজার, দর্শনা, চুয়াডাঙ্গা।',
    memo_mobile_line: 'মোবাইল: ০১৯৫৬-২২৬৪৬৫, ০১৭৪৮-১৫২০৩৬',
    memo_footer_note: 'এম.এস ট্রেডার্স এর মাল ক্রয় করার জন্য আপনাকে ধন্যবাদ',
    mimsms: { api_key: '', user_name: '', sender_name: '' }
  };
  d.users = [
    { id: 1, name: 'মুনজুর আহমেদ', email: 'monjurahmed1984dsn@gmail.com', username: 'mssmtradersdokan', pass: sha256('Smtradersdokan'), role: 'owner', created_at: t }
  ];
  d.counters.user = 1;
  const seedProducts = [
    { name: 'এম.এস রড ৮ মি.মি', category: 'রড', unit: 'কেজি', size_mili: 8, opening: 4980, pp: 70, sp: 78, low: 100 },
    { name: 'এম.এস রড ১০ মি.মি', category: 'রড', unit: 'কেজি', size_mili: 10, opening: 5000, pp: 70, sp: 78, low: 100 },
    { name: 'এম.এস রড ১২ মি.মি', category: 'রড', unit: 'কেজি', size_mili: 12, opening: 4000, pp: 70, sp: 79, low: 100 },
    { name: 'এম.এস রড ১৪ মি.মি', category: 'রড', unit: 'কেজি', size_mili: 14, opening: 3000, pp: 70, sp: 79, low: 100 },
    { name: 'এম.এস রড ১৬ মি.মি', category: 'রড', unit: 'কেজি', size_mili: 16, opening: 3000, pp: 70.5, sp: 80, low: 100 },
    { name: 'এম.এস রড ১৮ মি.মি', category: 'রড', unit: 'কেজি', size_mili: 18, opening: 2000, pp: 71, sp: 80, low: 80 },
    { name: 'এম.এস রড ২০ মি.মি', category: 'রড', unit: 'কেজি', size_mili: 20, opening: 2000, pp: 71, sp: 81, low: 80 },
    { name: 'এম.এস রড ২২ মি.মি', category: 'রড', unit: 'কেজি', size_mili: 22, opening: 1500, pp: 71.5, sp: 82, low: 50 },
    { name: 'এম.এস রড ২৫ মি.মি', category: 'রড', unit: 'কেজি', size_mili: 25, opening: 1500, pp: 71.5, sp: 82, low: 50 },
    { name: 'বিএসআরএম এক্সট্রিম ৫০০ডব্লিউ ১২ মি.মি', category: 'রড', unit: 'কেজি', size_mili: 12, opening: 3000, pp: 74, sp: 84, low: 50 },
    { name: 'বিএসআরএম এক্সট্রিম ৫০০ডব্লিউ ১৬ মি.মি', category: 'রড', unit: 'কেজি', size_mili: 16, opening: 3000, pp: 74, sp: 85, low: 50 },
    { name: 'শাহ সিমেন্ট (৫০ কেজি)', category: 'সিমেন্ট', unit: 'বস্তা', size_mili: null, opening: 350, pp: 445, sp: 480, low: 40 },
    { name: 'স্ক্যান সিমেন্ট (৫০ কেজি)', category: 'সিমেন্ট', unit: 'বস্তা', size_mili: null, opening: 250, pp: 440, sp: 475, low: 40 },
    { name: 'সেভেন রিংস সিমেন্ট (৫০ কেজি)', category: 'সিমেন্ট', unit: 'বস্তা', size_mili: null, opening: 250, pp: 435, sp: 470, low: 40 },
    { name: 'ক্রাউন সিমেন্ট (৫০ কেজি)', category: 'সিমেন্ট', unit: 'বস্তা', size_mili: null, opening: 250, pp: 438, sp: 472, low: 40 },
    { name: 'মেঘনা সিমেন্ট (৫০ কেজি)', category: 'সিমেন্ট', unit: 'বস্তা', size_mili: null, opening: 200, pp: 430, sp: 465, low: 40 },
    { name: 'হাইডেলবার্গ সি প্লাস (৫০ কেজি)', category: 'সিমেন্ট', unit: 'বস্তা', size_mili: null, opening: 200, pp: 428, sp: 462, low: 40 },
    { name: 'হোলসিম সিমেন্ট (৫০ কেজি)', category: 'সিমেন্ট', unit: 'বস্তা', size_mili: null, opening: 300, pp: 442, sp: 478, low: 40 },
    { name: 'কনফিডেন্স সিমেন্ট (৫০ কেজি)', category: 'সিমেন্ট', unit: 'বস্তা', size_mili: null, opening: 200, pp: 425, sp: 458, low: 40 },
    { name: 'প্রিমিয়ার সিমেন্ট (৫০ কেজি)', category: 'সিমেন্ট', unit: 'বস্তা', size_mili: null, opening: 200, pp: 432, sp: 466, low: 40 },
    { name: 'ফ্রেশ সিমেন্ট (৫০ কেজি)', category: 'সিমেন্ট', unit: 'বস্তা', size_mili: null, opening: 250, pp: 426, sp: 460, low: 40 },
    { name: 'ডায়মন্ড সিমেন্ট (৫০ কেজি)', category: 'সিমেন্ট', unit: 'বস্তা', size_mili: null, opening: 200, pp: 424, sp: 456, low: 30 },
    { name: 'মেট্রোসিম সিমেন্ট (৫০ কেজি)', category: 'সিমেন্ট', unit: 'বস্তা', size_mili: null, opening: 200, pp: 429, sp: 464, low: 30 },
    { name: 'সিরামিক টাইলস ৬০×৬০', category: 'টাইলস', unit: 'বর্গফুট', size_mili: null, opening: 500, pp: 62, sp: 85, low: 100 },
    { name: 'সিরামিক টাইলস ৪০×৪০', category: 'টাইলস', unit: 'বর্গফুট', size_mili: null, opening: 400, pp: 48, sp: 68, low: 80 },
    { name: 'পিভিসি পাইপ ১ ইঞ্চি', category: 'পাইপ', unit: 'পিস', size_mili: null, opening: 120, pp: 95, sp: 125, low: 30 },
    { name: 'পিভিসি পাইপ ২ ইঞ্চি', category: 'পাইপ', unit: 'পিস', size_mili: null, opening: 100, pp: 180, sp: 235, low: 30 },
    { name: 'ওয়াল পেইন্ট (ওয়েদার কোট)', category: 'রং', unit: 'লিটার', size_mili: null, opening: 60, pp: 310, sp: 375, low: 15 },
    { name: 'হাতুড়ি', category: 'টুলস', unit: 'পিস', size_mili: null, opening: 30, pp: 220, sp: 290, low: 5 },
    { name: 'সিলেট বালু (মোটা)', category: 'বালু', unit: 'ঘনফুট', size_mili: null, opening: 1000, pp: 55, sp: 70, low: 200 },
    { name: 'লোকাল বালু (চিকন)', category: 'বালু', unit: 'ঘনফুট', size_mili: null, opening: 1000, pp: 50, sp: 65, low: 200 },
    { name: '১নং লাল ইট (১ম শ্রেণি)', category: 'ইট', unit: 'পিস', size_mili: null, opening: 10000, pp: 12, sp: 16, low: 1000 },
    { name: 'ইটের খোয়া', category: 'ইট', unit: 'ঘনফুট', size_mili: null, opening: 1000, pp: 60, sp: 78, low: 200 }
  ];
  for (const p of seedProducts) {
    const id = nextIdOn(d, 'product');
    d.products.push({ id, name: p.name, category: p.category, unit: p.unit, size_mili: p.size_mili, opening_stock: p.opening, current_stock: p.opening, purchase_price: p.pp, selling_price: p.sp, low_stock: p.low, created_at: t, created_by: 1 });
    d.stock_ledger.push({ id: nextIdOn(d, 'ledger'), product_id: id, product_name: p.name, user_id: 1, user_name: 'মুনজুর আহমেদ (মালিক)', type: 'OPENING', quantity: p.opening, unit_cost: p.pp, unit_price: null, source: 'প্রারম্ভিক স্টক', note: 'প্রাথমিক ইনভেন্টরি', timestamp: t, time_display: fmtDT(t) });
  }
  d.customers = [];
  d.counters.customer = 0;
  return d;
}
function nextIdOn(dd, key) { dd.counters[key] = (dd.counters[key] || 0) + 1; return dd.counters[key]; }


module.exports = { get db() { return db; }, loadDb, saveDb, save: saveDb, nextId };
