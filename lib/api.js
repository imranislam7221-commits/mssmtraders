'use strict';
/* api: http server, static files, auth, all REST routes */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { sha256, uid, nowIso, round2, fmtDT, ApiError, sendJson, readBody } = require('./helpers');
const DBMOD = require('./db');
const { loadDb, saveDb, nextId } = DBMOD;
const DB = DBMOD;
const BIZ = require('./business');
const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
/* ---------- http server ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
function serveStatic(req, res, u) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'Method not allowed' });
  let p = decodeURIComponent(u.pathname);
  if (p === '/' || !path.extname(p)) p = '/index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, p));
  if (!file.startsWith(PUBLIC_DIR)) return sendJson(res, 403, { error: 'Forbidden' });
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { p = '/index.html'; const f2 = path.join(PUBLIC_DIR, p); if (!fs.existsSync(f2)) return sendJson(res, 404, { error: 'Not found' }); return streamFile(res, f2); }
  return streamFile(res, file);
}
function streamFile(res, file) {
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://local');
    if (u.pathname.startsWith('/api/')) return await handleApi(req, res, u);
    return serveStatic(req, res, u);
  } catch (e) {
    const code = e instanceof ApiError ? e.code : 500;
    if (code >= 500) console.error(e);
    try { sendJson(res, code, { error: e.message || 'Server error' }); } catch (_) {}
  }
});

/* ---------- auth + api dispatch ---------- */
function authUser(req) {
  const m = String(req.headers['authorization'] || '').match(/^Bearer (.+)$/);
  if (m && DB.db.sessions[m[1]]) {
    const user = DB.db.users.find(u => u.id === DB.db.sessions[m[1]].user_id);
    if (user) return { user, token: m[1] };
  }
  return {};
}
function requireAuth(ctx) { if (!ctx.user) throw new ApiError(401, 'Not logged in'); }
function requireOwner(ctx) { requireAuth(ctx); }
async function handleApi(req, res, u) {
  const method = req.method;
  const route = u.pathname;
  const body = (method === 'POST' || method === 'PUT' || method === 'DELETE') ? await readBody(req) : {};
  const ctx = authUser(req);
  const q = u.searchParams;
  /* ----- auth ----- */
  if (method === 'POST' && route === '/api/login') {
    const email = String(body.email || '').trim().toLowerCase();
    const user = DB.db.users.find(x => x.email.toLowerCase() === email);
    if (!user || user.pass !== sha256(body.password || '')) throw new ApiError(401, 'Wrong email or password');
    const token = uid();
    DB.db.sessions[token] = { user_id: user.id, created_at: nowIso() };
    saveDb();
    return sendJson(res, 200, { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  }
  if (method === 'POST' && route === '/api/logout') {
    if (ctx.token) { delete DB.db.sessions[ctx.token]; saveDb(); }
    return sendJson(res, 200, { ok: true });
  }
  if (method === 'GET' && route === '/api/me') {
    requireAuth(ctx);
    return sendJson(res, 200, { user: { id: ctx.user.id, name: ctx.user.name, email: ctx.user.email, role: ctx.user.role } });
  }
  if (method === 'GET' && route === '/api/dashboard') { requireAuth(ctx); return sendJson(res, 200, BIZ.dashboardData(ctx.user)); }

  /* ----- products ----- */
  if (method === 'GET' && route === '/api/products') {
    requireAuth(ctx);
    const s = String(q.get('q') || '').toLowerCase();
    let list = DB.db.products.slice().reverse();
    if (s) list = list.filter(p => (p.name + ' ' + p.category).toLowerCase().includes(s));
    return sendJson(res, 200, { products: list });
  }
  if (method === 'POST' && route === '/api/products') {
    requireAuth(ctx);
    const name = String(body.name || '').trim();
    if (!name) throw new ApiError(400, 'Product name required');
    const opening = round2(Math.max(0, +body.opening_stock || 0));
    const prod = { id: nextId('product'), name, category: String(body.category || 'General').trim(), unit: String(body.unit || 'pc').trim(), size_mili: body.size_mili != null && body.size_mili !== '' ? +body.size_mili : null, opening_stock: opening, current_stock: opening, purchase_price: round2(+body.purchase_price || 0), selling_price: round2(+body.selling_price || 0), low_stock: round2(+body.low_stock || 10), created_at: nowIso(), created_by: ctx.user.id };
    DB.db.products.push(prod);
    if (opening > 0) DB.db.stock_ledger.push({ id: nextId('ledger'), product_id: prod.id, product_name: prod.name, user_id: ctx.user.id, user_name: ctx.user.name, type: 'OPENING', quantity: opening, unit_cost: prod.purchase_price, unit_price: null, source: 'Opening Stock', note: 'Created with initial stock', timestamp: prod.created_at, time_display: fmtDT(prod.created_at) });
    saveDb();
    return sendJson(res, 200, { ok: true, product: prod });
  }
  let m = route.match(/^\/api\/products\/(\d+)$/);
  if (m && method === 'PUT') {
    requireAuth(ctx);
    const prod = DB.db.products.find(x => x.id === +m[1]);
    if (!prod) throw new ApiError(404, 'Product not found');
    const priceChanged = (body.purchase_price != null && round2(body.purchase_price) !== prod.purchase_price) || (body.selling_price != null && round2(body.selling_price) !== prod.selling_price);
    if (body.name != null) prod.name = String(body.name).trim() || prod.name;
    if (body.category != null) prod.category = String(body.category).trim();
    if (body.unit != null) prod.unit = String(body.unit).trim();
    if (body.size_mili !== undefined) prod.size_mili = body.size_mili === '' || body.size_mili == null ? null : +body.size_mili;
    if (body.low_stock != null) prod.low_stock = round2(+body.low_stock || 0);
    if (body.purchase_price != null) prod.purchase_price = round2(+body.purchase_price || 0);
    if (body.selling_price != null) prod.selling_price = round2(+body.selling_price || 0);
    saveDb();
    return sendJson(res, 200, { ok: true, product: prod });
  }
  if (m && method === 'DELETE') {
    requireOwner(ctx);
    const idx = DB.db.products.findIndex(x => x.id === +m[1]);
    if (idx < 0) throw new ApiError(404, 'Product not found');
    DB.db.products.splice(idx, 1);
    saveDb();
    return sendJson(res, 200, { ok: true });
  }

  /* ----- stock in / ledger ----- */
  if (method === 'POST' && route === '/api/stockin') {
    requireAuth(ctx);
    const prod = DB.db.products.find(x => x.id === +body.product_id);
    if (!prod) throw new ApiError(400, 'Product not found');
    const qty = round2(+body.quantity);
    if (!(qty > 0)) throw new ApiError(400, 'Quantity must be > 0');
    const cost = body.unit_cost === '' || body.unit_cost == null ? prod.purchase_price : round2(+body.unit_cost || 0);
    const ts = nowIso();
    prod.current_stock = round2(prod.current_stock + qty);
    DB.db.stock_ledger.push({ id: nextId('ledger'), product_id: prod.id, product_name: prod.name, user_id: ctx.user.id, user_name: ctx.user.name, type: 'IN', quantity: qty, unit_cost: cost, unit_price: null, source: String(body.supplier || 'Stock In').trim() || 'Stock In', note: String(body.note || ''), timestamp: ts, time_display: fmtDT(ts) });
    BIZ.addCash('OUT', round2(qty * cost), String(body.supplier || 'Stock In').trim() || 'Stock In', 'Purchase: ' + prod.name, ctx.user.name, ts);
    BIZ.notify('Maal kena: ' + prod.name + ' ' + qty + ' ' + prod.unit + ' @ ' + cost + ' = ' + round2(qty * cost) + ' tk | ' + DB.db.settings.shop_name, 'purchase');
    saveDb();
    return sendJson(res, 200, { ok: true, product: prod });
  }
  if (method === 'GET' && route === '/api/stock/summary') {
    requireAuth(ctx);
    const rows = DB.db.products.map(p => {
      const inSum = round2(DB.db.stock_ledger.filter(l => l.product_id === p.id && l.type === 'IN').reduce((s, l) => s + l.quantity, 0));
      const outSum = round2(DB.db.stock_ledger.filter(l => l.product_id === p.id && l.type === 'OUT').reduce((s, l) => s + l.quantity, 0));
      return { id: p.id, name: p.name, category: p.category, unit: p.unit, opening_stock: p.opening_stock, stock_in: inSum, stock_out: outSum, current_stock: round2(p.opening_stock + inSum - outSum), live_stock: p.current_stock, purchase_price: p.purchase_price, selling_price: p.selling_price, low_stock: p.low_stock };
    });
    return sendJson(res, 200, { rows });
  }
  if (method === 'GET' && route === '/api/stock/ledger') {
    requireAuth(ctx);
    const s = String(q.get('q') || '').toLowerCase();
    const pid = +q.get('product_id') || 0;
    let list = DB.db.stock_ledger.slice().reverse();
    if (pid) list = list.filter(l => l.product_id === pid);
    if (s) list = list.filter(l => (l.product_name + ' ' + l.source + ' ' + l.type + ' ' + l.user_name).toLowerCase().includes(s));
    return sendJson(res, 200, { ledger: list.slice(0, 400) });
  }
  /* ----- invoices ----- */
  if (method === 'POST' && route === '/api/invoices') {
    requireAuth(ctx);
    const inv = BIZ.makeInvoice(ctx.user, body);
    const customer = inv.customer_id ? DB.db.customers.find(c => c.id === inv.customer_id) : null;
    saveDb();
    await BIZ.sendSms(customer, inv, body.message);
    if (inv.sms_status && inv.sms_status.startsWith('sent')) inv.wa_status = customer && customer.whatsapp_enabled ? 'wa-link-ready' : 'disabled';
    saveDb();
    return sendJson(res, 200, { ok: true, invoice: inv, customer });
  }
  if (method === 'GET' && route === '/api/invoices') {
    requireAuth(ctx);
    const s = String(q.get('q') || '').toLowerCase();
    const from = q.get('from'), to = q.get('to');
    let list = DB.db.invoices.slice().reverse();
    if (from) { const f = new Date(from + 'T00:00:00'); list = list.filter(i => new Date(i.timestamp) >= f); }
    if (to) { const t2 = new Date(to + 'T23:59:59'); list = list.filter(i => new Date(i.timestamp) <= t2); }
    if (s) list = list.filter(i => (i.invoice_no + ' ' + i.customer_name).toLowerCase().includes(s));
    return sendJson(res, 200, { invoices: list.slice(0, 300) });
  }
  m = route.match(/^\/api\/invoices\/(\d+)$/);
  if (m && method === 'GET') {
    requireAuth(ctx);
    const inv = DB.db.invoices.find(i => i.id === +m[1]);
    if (!inv) throw new ApiError(404, 'Invoice not found');
    const customer = inv.customer_id ? DB.db.customers.find(c => c.id === inv.customer_id) : null;
    return sendJson(res, 200, { invoice: inv, customer });
  }
  if (m && method === 'DELETE') { requireOwner(ctx); BIZ.deleteInvoice(ctx.user, +m[1]); saveDb(); return sendJson(res, 200, { ok: true }); }
  m = route.match(/^\/api\/invoices\/(\d+)\/sms$/);
  if (m && method === 'POST') {
    requireAuth(ctx);
    const inv = DB.db.invoices.find(i => i.id === +m[1]);
    if (!inv) throw new ApiError(404, 'Invoice not found');
    const customer = inv.customer_id ? DB.db.customers.find(c => c.id === inv.customer_id) : null;
    await BIZ.sendSms(customer, inv, body.message);
    saveDb();
    return sendJson(res, 200, { ok: true, sms_status: inv.sms_status });
  }
  /* ----- customers ----- */
  if (method === 'GET' && route === '/api/customers') {
    requireAuth(ctx);
    const s = String(q.get('q') || '').toLowerCase();
    let list = DB.db.customers.slice().reverse();
    if (s) list = list.filter(c => (c.name + ' ' + (c.phone || '')).toLowerCase().includes(s));
    return sendJson(res, 200, { customers: list });
  }
  if (method === 'POST' && route === '/api/customers') {
    requireAuth(ctx);
    const name = String(body.name || '').trim();
    if (!name) throw new ApiError(400, 'Customer name required');
    const cust = { id: nextId('customer'), name, phone: String(body.phone || '').trim(), address: String(body.address || '').trim(), whatsapp_enabled: !!body.whatsapp_enabled, total_due: 0, created_at: nowIso() };
    DB.db.customers.push(cust);
    saveDb();
    return sendJson(res, 200, { ok: true, customer: cust });
  }
  m = route.match(/^\/api\/customers\/(\d+)$/);
  if (m && method === 'PUT') {
    requireAuth(ctx);
    const cust = DB.db.customers.find(c => c.id === +m[1]);
    if (!cust) throw new ApiError(404, 'Customer not found');
    if (body.name != null) cust.name = String(body.name).trim() || cust.name;
    if (body.phone != null) cust.phone = String(body.phone).trim();
    if (body.address != null) cust.address = String(body.address).trim();
    if (body.whatsapp_enabled !== undefined) cust.whatsapp_enabled = !!body.whatsapp_enabled;
    saveDb();
    return sendJson(res, 200, { ok: true, customer: cust });
  }
  if (m && method === 'DELETE') {
    requireOwner(ctx);
    const idx = DB.db.customers.findIndex(c => c.id === +m[1]);
    if (idx < 0) throw new ApiError(404, 'Customer not found');
    if (DB.db.customers[idx].total_due > 0) throw new ApiError(400, 'Customer has outstanding due — clear dues first');
    DB.db.customers.splice(idx, 1);
    saveDb();
    return sendJson(res, 200, { ok: true });
  }
  m = route.match(/^\/api\/customers\/(\d+)\/payment$/);
  if (m && method === 'POST') {
    requireAuth(ctx);
    const cust = DB.db.customers.find(c => c.id === +m[1]);
    if (!cust) throw new ApiError(404, 'Customer not found');
    const amount = round2(+body.amount);
    if (!(amount > 0)) throw new ApiError(400, 'Amount must be > 0');
    if (amount > cust.total_due + 0.001) throw new ApiError(400, 'Amount exceeds outstanding due (Tk ' + cust.total_due + ')');
    const ts = nowIso();
    cust.total_due = round2(cust.total_due - amount);
    DB.db.customer_ledger.push({ id: nextId('cleger'), customer_id: cust.id, user_id: ctx.user.id, user_name: ctx.user.name, transaction_type: 'CREDIT', amount, balance: cust.total_due, source: 'Due Collection', note: String(body.note || 'Cash received'), timestamp: ts, time_display: fmtDT(ts) });
    BIZ.addCash('IN', amount, 'Due Collection', String(body.note || 'Cash received'), ctx.user.name, ts);
    BIZ.notify('Baki joma: ' + amount + ' tk | ' + cust.name + ' | Due baki: ' + cust.total_due + ' tk | ' + DB.db.settings.shop_name, 'due');
    saveDb();
    return sendJson(res, 200, { ok: true, customer: cust });
  }
  m = route.match(/^\/api\/customers\/(\d+)\/ledger$/);
  if (m && method === 'GET') {
    requireAuth(ctx);
    const cust = DB.db.customers.find(c => c.id === +m[1]);
    if (!cust) throw new ApiError(404, 'Customer not found');
    const from = q.get('from'), to = q.get('to');
    let list = DB.db.customer_ledger.filter(l => l.customer_id === cust.id);
    if (from) { const f = new Date(from + 'T00:00:00'); list = list.filter(l => new Date(l.timestamp) >= f); }
    if (to) { const t2 = new Date(to + 'T23:59:59'); list = list.filter(l => new Date(l.timestamp) <= t2); }
    return sendJson(res, 200, { customer: cust, ledger: list.slice().reverse() });
  }

  /* ----- settings (owner only) ----- */
  if (route === '/api/settings') {
    requireOwner(ctx);
    if (method === 'GET') { if (!DB.db.settings.sms_template) DB.db.settings.sms_template = 'Dear {name}, Total Bill: {total} tk. Paid: {paid} tk. Due: {due} tk. Thank you, {shop}.'; return sendJson(res, 200, { settings: DB.db.settings }); }
    if (method === 'PUT') {
      const b = body || {};
      if (b.shop_name != null) DB.db.settings.shop_name = String(b.shop_name).trim() || DB.db.settings.shop_name;
      if (b.shop_phone != null) DB.db.settings.shop_phone = String(b.shop_phone).trim();
      if (b.shop_address != null) DB.db.settings.shop_address = String(b.shop_address).trim();
      if (b.vat_percent != null) DB.db.settings.vat_percent = round2(+b.vat_percent || 0);
      if (b.opening_cash != null) DB.db.settings.opening_cash = round2(+b.opening_cash || 0);
      if (b.notify_number != null) DB.db.settings.notify_number = String(b.notify_number).trim();
      if (b.receipt_header != null) DB.db.settings.receipt_header = String(b.receipt_header).trim();
      if (b.receipt_footer != null) DB.db.settings.receipt_footer = String(b.receipt_footer).trim();
      ['memo_logo','memo_title_line','memo_pro_line','memo_trade_line','memo_address_line','memo_mobile_line','memo_footer_note'].forEach(k => { if (b[k] != null) DB.db.settings[k] = String(b[k]).trim(); });
      if (b.mimsms) { DB.db.settings.mimsms = { api_key: String(b.mimsms.api_key || '').trim(), user_name: String(b.mimsms.user_name || '').trim(), sender_name: String(b.mimsms.sender_name || '').trim() }; }
      saveDb();
      return sendJson(res, 200, { ok: true, settings: DB.db.settings });
    }
  }
  throw new ApiError(404, 'API route not found: ' + method + ' ' + route);
}

/* ---------- start ---------- */
function startServer(port) {
  server.listen(port, () => {
    console.log('');
    console.log('==============================================');
    console.log('  ' + DB.db.settings.shop_name + ' — POS & Inventory');
    console.log('==============================================');
    console.log('  Local:    http://localhost:' + port);
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) console.log('  Mobile (same WiFi): http://' + net.address + ':' + port);
      }
    }
    console.log('  Owner login:   owner@shop.com / owner123');
    console.log('  Manager login: manager@shop.com / manager123');
    console.log('==============================================');
  });
}
let PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
server.on('error', e => {
  if (e.code === 'EADDRINUSE' && PORT < 3010) { console.log('Port ' + PORT + ' busy, trying ' + (PORT + 1) + '...'); PORT++; setTimeout(() => startServer(PORT), 300); }
  else { console.error('Server error:', e.message); process.exit(1); }
});


function boot() { loadDb(); startServer(PORT); }
module.exports = { boot, loadDb, startServer, get PORT() { return PORT; } };
