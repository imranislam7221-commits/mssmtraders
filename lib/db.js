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
          console.log('[GoogleSync] Successfully synced database & invoices to Google Sheet & Drive!');
        }).catch(err => {
          console.error('[GoogleSync Error]', err.message);
        });
      }
    } catch (e) {
      console.error('[GoogleSync Exception]', e.message);
    }
  }, 400);
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
      db.settings.shop_phone = '01956-226465';
      db.settings.memo_logo = db.settings.memo_logo || 'MST';
      db.settings.memo_title_line = 'মেসার্স এম.এস ট্রেডার্স';
      db.settings.memo_pro_line = 'প্রোঃ মুনজুর আহমেদ';
      db.settings.memo_trade_line = 'এখানে রড, সিমেন্ট, ইট, বালি, খোয়া জাতীয় নির্মাণ সামগ্রী সুলভ মূল্যে বিক্রয় করা হয়।';
      db.settings.memo_address_line = 'সোসাইটি পুরাতন মার্কেট, পুরাতন বাজার, দর্শনা, চুয়াডাঙ্গা।';
      db.settings.memo_mobile_line = 'মোবাইল: 01956-226465, 01748-152036';
      db.settings.memo_footer_note = 'এম.এস ট্রেডার্স এর মাল ক্রয় করার জন্য আপনাকে ধন্যবাদ';
      db.settings.google_sync = db.settings.google_sync || {};
      if (!db.settings.google_sync.webhook_url) {
        db.settings.google_sync.webhook_url = 'https://script.google.com/macros/s/AKfycbw2QoMQefpD_p6X2mt6aQAohxncSjuwm0gas_ModDjyeo_WIADjvcELu4njnhX3kxKf/exec';
      }
      db.settings.google_sync.auto_sync = true;
      db.users = [
        { id: 1, name: 'মুনজুর আহমেদ', email: 'mssmtradersdokan@gmail.com', username: 'mssmtradersdokan', pass: sha256('Smtradersdokan'), role: 'owner', created_at: (db.users && db.users[0] && db.users[0].created_at) || nowIso() }
      ];
      db.counters.user = 1;
      db.sessions = {};
      db.expenses = Array.isArray(db.expenses) ? db.expenses : [];
      db.incomes = Array.isArray(db.incomes) ? db.incomes : [];

      // Auto-migrate products & stock ledger to 100% Bangla if any exist in English
      if (Array.isArray(db.products)) {
        let changed = false;
        const nameMap = {
          'MS Rod 8mm': 'এম.এস রড 8 মি.লি',
          'MS Rod 10mm': 'এম.এস রড 10 মি.লি',
          'MS Rod 12mm': 'এম.এস রড 12 মি.লি',
          'MS Rod 14mm': 'এম.এস রড 14 মি.লি',
          'MS Rod 16mm': 'এম.এস রড 16 মি.লি',
          'MS Rod 18mm': 'এম.এস রড 18 মি.লি',
          'MS Rod 20mm': 'এম.এস রড 20 মি.লি',
          'MS Rod 22mm': 'এম.এস রড 22 মি.লি',
          'MS Rod 25mm': 'এম.এস রড 25 মি.লি',
          'BSRM Xtreme 500W 12mm': 'বিএসআরএম এক্সট্রিম ৫০০ডব্লিউ 12 মি.লি',
          'BSRM Xtreme 500W 16mm': 'বিএসআরএম এক্সট্রিম ৫০০ডব্লিউ 16 মি.লি',
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
          'এম.এস রড 8 মি.লি': 50000,
          'এম.এস রড 10 মি.লি': 50000,
          'এম.এস রড 12 মি.লি': 50000,
          'এম.এস রড 14 মি.লি': 50000,
          'এম.এস রড 16 মি.লি': 50000,
          'এম.এস রড 18 মি.লি': 50000,
          'এম.এস রড 20 মি.লি': 50000,
          'এম.এস রড 22 মি.লি': 50000,
          'এম.এস রড 25 মি.লি': 50000,
          'বিএসআরএম এক্সট্রিম ৫০০ডব্লিউ 12 মি.লি': 50000,
          'বিএসআরএম এক্সট্রিম ৫০০ডব্লিউ 16 মি.লি': 50000,
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
        const bnToEnMili = {
          'এম.এস রড ৮ মি.লি': 'এম.এস রড 8 মি.লি',
          'এম.এস রড ১০ মি.লি': 'এম.এস রড 10 মি.লি',
          'এম.এস রড ১২ মি.লি': 'এম.এস রড 12 মি.লি',
          'এম.এস রড ১৪ মি.লি': 'এম.এস রড 14 মি.লি',
          'এম.এস রড ১৬ মি.লি': 'এম.এস রড 16 মি.লি',
          'এম.এস রড ১৮ মি.লি': 'এম.এস রড 18 মি.লি',
          'এম.এস রড ২০ মি.লি': 'এম.এস রড 20 মি.লি',
          'এম.এস রড ২২ মি.লি': 'এম.এস রড 22 মি.লি',
          'এম.এস রড ২৫ মি.লি': 'এম.এস রড 25 মি.লি',
          'বিএসআরএম এক্সট্রিম ৫০০ডব্লিউ ১২ মি.লি': 'বিএসআরএম এক্সট্রিম ৫০০ডব্লিউ 12 মি.লি',
          'বিএসআরএম এক্সট্রিম ৫০০ডব্লিউ ১৬ মি.লি': 'বিএসআরএম এক্সট্রিম ৫০০ডব্লিউ 16 মি.লি'
        };
        db.products.forEach(p => {
          if (p.name && p.name.includes('রডড')) { p.name = p.name.replace(/রডড/g, 'রড'); changed = true; }
          if (p.category && p.category.includes('রডড')) { p.category = p.category.replace(/রডড/g, 'রড'); changed = true; }
          if (p.name && p.name.includes('মি.মি')) { p.name = p.name.replace(/মি\.মি/g, 'মি.লি'); changed = true; }
          if (bnToEnMili[p.name]) { p.name = bnToEnMili[p.name]; changed = true; }
          if (p.name && (p.name.includes('\uFFFD') || p.name === 'ইট (পিলা)')) { p.name = '১নং লাল ইট (পিলা)'; changed = true; }
          if (p.category && p.category !== 'সিমেন্ট' && (p.category.includes('সিম') || p.category.includes('\uFFFD'))) { p.category = 'সিমেন্ট'; changed = true; }
          if (p.category && catMap[p.category]) { p.category = catMap[p.category]; changed = true; }
          if (p.unit && unitMap[p.unit]) { p.unit = unitMap[p.unit]; changed = true; }
        });
        if (Array.isArray(db.stock_ledger)) {
          db.stock_ledger.forEach(l => {
            if (l.product_name && l.product_name.includes('মি.মি')) { l.product_name = l.product_name.replace(/মি\.মি/g, 'মি.লি'); changed = true; }
            if (nameMap[l.product_name]) { l.product_name = nameMap[l.product_name]; changed = true; }
          });
        }
        if (Array.isArray(db.invoices)) {
          db.invoices.forEach(inv => {
            if (Array.isArray(inv.items)) {
              inv.items.forEach(it => {
                if (it.product_name && it.product_name.includes('মি.মি')) { it.product_name = it.product_name.replace(/মি\.মি/g, 'মি.লি'); changed = true; }
              });
            }
          });
        }
        if (changed) {
          saveDb();
          console.log('Migrated products and stock ledger to pure Bangla with healthy initial stocks.');
        }
      }

      saveDb();
      console.log('Database loaded: ' + DB_FILE);
      
      // If local products are missing or empty, check Google Drive to auto-restore
      if ((!Array.isArray(db.products) || db.products.length === 0) && db.settings && db.settings.google_sync && db.settings.google_sync.webhook_url) {
        try {
          const BACKUP = require('./backup');
          BACKUP.pullFromGoogle(db.settings.google_sync.webhook_url).then(() => {
            console.log('[Auto-Restore] Successfully restored database from Google Drive on startup!');
          }).catch(err => {
            console.log('[Auto-Restore] Info:', err.message);
          });
        } catch (_) {}
      }
      return;
    }
    catch (e) { console.error('DB file corrupt, reseeding...', e.message); }
  }
  db = seedDb();
  saveDb();
  console.log('New database seeded at: ' + DB_FILE);

  // Attempt auto-restore on freshly seeded container
  if (db.settings && db.settings.google_sync && db.settings.google_sync.webhook_url) {
    try {
      const BACKUP = require('./backup');
      BACKUP.pullFromGoogle(db.settings.google_sync.webhook_url).then(() => {
        console.log('[Auto-Restore] Successfully restored database from Google Drive on startup!');
      }).catch(err => {
        console.log('[Auto-Restore] Info:', err.message);
      });
    } catch (_) {}
  }
}

/* ---------- seed demo data ---------- */
function seedDb() {
  const d = { counters: {}, users: [], products: [], stock_ledger: [], customers: [], invoices: [], customer_ledger: [], cash_ledger: [], expenses: [], incomes: [], sessions: {}, settings: {} };
  const t = nowIso();
  d.settings = {
    shop_name: 'মেসার্স এম.এস ট্রেডার্স',
    shop_phone: '01956-226465',
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
    memo_mobile_line: 'মোবাইল: 01956-226465, 01748-152036',
    memo_footer_note: 'এম.এস ট্রেডার্স এর মাল ক্রয় করার জন্য আপনাকে ধন্যবাদ',
    mimsms: { api_key: '', user_name: '', sender_name: '' },
    google_sync: {
      webhook_url: 'https://script.google.com/macros/s/AKfycbw2QoMQefpD_p6X2mt6aQAohxncSjuwm0gas_ModDjyeo_WIADjvcELu4njnhX3kxKf/exec',
      auto_sync: true,
      last_sync: null
    }
  };
  d.users = [
    { id: 1, name: 'মুনজুর আহমেদ', email: 'mssmtradersdokan@gmail.com', username: 'mssmtradersdokan', pass: sha256('Smtradersdokan'), role: 'owner', created_at: t }
  ];
  d.counters.user = 1;
  const seedProducts = [
    // 1. Fresh Cement (3 categories / models)
    { name: 'ফ্রেশ সিমেন্ট ১০০', category: 'সিমেন্ট', unit: 'বস্তা', size_mili: null, opening: 0, pp: 430, sp: 465, low: 40 },
    { name: 'ফ্রেশ সিমেন্ট ৯৪', category: 'সিমেন্ট', unit: 'বস্তা', size_mili: null, opening: 0, pp: 425, sp: 460, low: 40 },
    { name: 'ফ্রেশ সিমেন্ট ৮০', category: 'সিমেন্ট', unit: 'বস্তা', size_mili: null, opening: 0, pp: 420, sp: 455, low: 40 },

    // 2. Rods: BSRM, AKS, HKG, CSRM, PSRM (6 sizes each: 8, 10, 12, 16, 20, 25 mm)
    { name: 'বিএসআরএম রড ৮ মি.লি', category: 'রড', unit: 'কেজি', size_mili: 8, opening: 0, pp: 74, sp: 84, low: 100 },
    { name: 'বিএসআরএম রড ১০ মি.লি', category: 'রড', unit: 'কেজি', size_mili: 10, opening: 0, pp: 74, sp: 84, low: 100 },
    { name: 'বিএসআরএম রড ১২ মি.লি', category: 'রড', unit: 'কেজি', size_mili: 12, opening: 0, pp: 74, sp: 84, low: 100 },
    { name: 'বিএসআরএম রড ১৬ মি.লি', category: 'রড', unit: 'কেজি', size_mili: 16, opening: 0, pp: 74, sp: 84, low: 100 },
    { name: 'বিএসআরএম রড ২০ মি.লি', category: 'রড', unit: 'কেজি', size_mili: 20, opening: 0, pp: 74, sp: 84, low: 100 },
    { name: 'বিএসআরএম রড ২৫ মি.লি', category: 'রড', unit: 'কেজি', size_mili: 25, opening: 0, pp: 74, sp: 84, low: 100 },

    { name: 'একেএস রড ৮ মি.লি', category: 'রড', unit: 'কেজি', size_mili: 8, opening: 0, pp: 72, sp: 82, low: 100 },
    { name: 'একেএস রড ১০ মি.লি', category: 'রড', unit: 'কেজি', size_mili: 10, opening: 0, pp: 72, sp: 82, low: 100 },
    { name: 'একেএস রড ১২ মি.লি', category: 'রড', unit: 'কেজি', size_mili: 12, opening: 0, pp: 72, sp: 82, low: 100 },
    { name: 'একেএস রড ১৬ মি.লি', category: 'রড', unit: 'কেজি', size_mili: 16, opening: 0, pp: 72, sp: 82, low: 100 },
    { name: 'একেএস রড ২০ মি.লি', category: 'রড', unit: 'কেজি', size_mili: 20, opening: 0, pp: 72, sp: 82, low: 100 },
    { name: 'একেএস রড ২৫ মি.লি', category: 'রড', unit: 'কেজি', size_mili: 25, opening: 0, pp: 72, sp: 82, low: 100 },

    { name: 'এইচকেজি রড ৮ মি.লি', category: 'রড', unit: 'কেজি', size_mili: 8, opening: 0, pp: 71, sp: 81, low: 100 },
    { name: 'এইচকেজি রড ১০ মি.লি', category: 'রড', unit: 'কেজি', size_mili: 10, opening: 0, pp: 71, sp: 81, low: 100 },
    { name: 'এইচকেজি রড ১২ মি.লি', category: 'রড', unit: 'কেজি', size_mili: 12, opening: 0, pp: 71, sp: 81, low: 100 },
    { name: 'এইচকেজি রড ১৬ মি.লি', category: 'রড', unit: 'কেজি', size_mili: 16, opening: 0, pp: 71, sp: 81, low: 100 },
    { name: 'এইচকেজি রড ২০ মি.লি', category: 'রড', unit: 'কেজি', size_mili: 20, opening: 0, pp: 71, sp: 81, low: 100 },
    { name: 'এইচকেজি রড ২৫ মি.লি', category: 'রড', unit: 'কেজি', size_mili: 25, opening: 0, pp: 71, sp: 81, low: 100 },

    { name: 'সিএসআরএম রড ৮ মি.লি', category: 'রড', unit: 'কেজি', size_mili: 8, opening: 0, pp: 70, sp: 80, low: 100 },
    { name: 'সিএসআরএম রড ১০ মি.লি', category: 'রড', unit: 'কেজি', size_mili: 10, opening: 0, pp: 70, sp: 80, low: 100 },
    { name: 'সিএসআরএম রড ১২ মি.লি', category: 'রড', unit: 'কেজি', size_mili: 12, opening: 0, pp: 70, sp: 80, low: 100 },
    { name: 'সিএসআরএম রড ১৬ মি.লি', category: 'রড', unit: 'কেজি', size_mili: 16, opening: 0, pp: 70, sp: 80, low: 100 },
    { name: 'সিএসআরএম রড ২০ মি.লি', category: 'রড', unit: 'কেজি', size_mili: 20, opening: 0, pp: 70, sp: 80, low: 100 },
    { name: 'সিএসআরএম রড ২৫ মি.লি', category: 'রড', unit: 'কেজি', size_mili: 25, opening: 0, pp: 70, sp: 80, low: 100 },

    { name: 'পিএসআরএম রড ৮ মি.লি', category: 'রড', unit: 'কেজি', size_mili: 8, opening: 0, pp: 70, sp: 80, low: 100 },
    { name: 'পিএসআরএম রড ১০ মি.লি', category: 'রড', unit: 'কেজি', size_mili: 10, opening: 0, pp: 70, sp: 80, low: 100 },
    { name: 'পিএসআরএম রড ১২ মি.লি', category: 'রড', unit: 'কেজি', size_mili: 12, opening: 0, pp: 70, sp: 80, low: 100 },
    { name: 'পিএসআরএম রড ১৬ মি.লি', category: 'রড', unit: 'কেজি', size_mili: 16, opening: 0, pp: 70, sp: 80, low: 100 },
    { name: 'পিএসআরএম রড ২০ মি.লি', category: 'রড', unit: 'কেজি', size_mili: 20, opening: 0, pp: 70, sp: 80, low: 100 },
    { name: 'পিএসআরএম রড ২৫ মি.লি', category: 'রড', unit: 'কেজি', size_mili: 25, opening: 0, pp: 70, sp: 80, low: 100 },

    // 3. Other hardware products
    { name: 'তার (বাইন্ডিং ওয়্যার)', category: 'অন্যান্য', unit: 'কেজি', size_mili: null, opening: 0, pp: 95, sp: 115, low: 20 },
    { name: 'পলিথিন রোল', category: 'অন্যান্য', unit: 'পিস', size_mili: null, opening: 0, pp: 8, sp: 12, low: 50 },
    { name: 'পেরেক (কাটা)', category: 'টুলস', unit: 'কেজি', size_mili: null, opening: 0, pp: 85, sp: 105, low: 30 },
    { name: 'ফুল ঝাড়ু', category: 'অন্যান্য', unit: 'পিস', size_mili: null, opening: 0, pp: 150, sp: 200, low: 10 }
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
