'use strict';
/* business logic: invoicing, stock movement, SMS gateway, dashboard */
const DBMOD = require('./db');
const { saveDb: _unusedSaveDb, nextId } = DBMOD;
const { round2, nowIso, fmtDT, ApiError } = require('./helpers');
const DB = DBMOD;
/* ---------- core business logic ---------- */
function normPhone(ph) {
  let p = String(ph || '').replace(/[^0-9]/g, '');
  if (p.startsWith('88')) return p;
  if (p.startsWith('01')) return '88' + p;
  return p;
}
function addCash(type, amount, source, note, userName, tsIso) {
  const ts = tsIso || nowIso();
  const c = (DB.db.cash_ledger = DB.db.cash_ledger || []);
  const inSum = c.filter(function (l) { return l.type === 'IN'; }).reduce(function (s, l) { return s + l.amount; }, 0);
  const outSum = c.filter(function (l) { return l.type === 'OUT'; }).reduce(function (s, l) { return s + l.amount; }, 0);
  const balance = round2((DB.db.settings.opening_cash || 0) + inSum - outSum + (type === 'IN' ? amount : -amount));
  c.push({ id: nextId('cash'), type: type, amount: round2(amount), balance: balance, source: source, note: note, user_name: userName, timestamp: ts, time_display: fmtDT(ts) });
}
function makeInvoice(user, p, tsIso) {
  const ts = tsIso || nowIso();
  const tdisp = fmtDT(ts);
  const items = Array.isArray(p.items) ? p.items.filter(i => Number(i.qty) > 0) : [];
  if (!items.length) throw new ApiError(400, 'Add at least one item.');
  let customer = null;
  if (p.customer_id) {
    customer = DB.db.customers.find(c => c.id === +p.customer_id);
    if (!customer) throw new ApiError(400, 'Customer not found');
  } else if (p.customer && String(p.customer.name || '').trim()) {
    customer = { id: nextId('customer'), name: String(p.customer.name).trim(), phone: String(p.customer.phone || '').trim(), whatsapp_enabled: !!p.customer.whatsapp_enabled, total_due: 0, created_at: ts };
    DB.db.customers.push(customer);
  }
  const qtyByProduct = {};
  for (const it of items) { const pid = +it.product_id; qtyByProduct[pid] = round2((qtyByProduct[pid] || 0) + (+it.qty || 0)); }
  for (const pid of Object.keys(qtyByProduct)) {
    const prod = DB.db.products.find(x => x.id === +pid);
    if (prod && qtyByProduct[pid] > prod.current_stock + 0.001) throw new ApiError(400, 'Insufficient stock: ' + prod.name + ' (Available ' + prod.current_stock + ' ' + prod.unit + ', requested ' + qtyByProduct[pid] + ')');
  }
  const rows = items.map(it => {
    const prod = DB.db.products.find(x => x.id === +it.product_id);
    if (!prod) throw new ApiError(400, 'Product not found');
    const qty = round2(it.qty);
    if (qty <= 0) throw new ApiError(400, 'Invalid quantity for ' + prod.name);
    const price = round2(it.price === '' || it.price == null ? prod.selling_price : it.price);
    if (prod.current_stock < qty) throw new ApiError(400, 'Insufficient stock: ' + prod.name + ' (Available ' + prod.current_stock + ' ' + prod.unit + ')');
    return { product_id: prod.id, name: prod.name, unit: prod.unit, qty, price, amount: round2(qty * price) };
  });
  const subtotal = round2(rows.reduce((s, r) => s + r.amount, 0));
  const vat_percent = round2(+p.vat_percent || 0);
  const vat = round2(subtotal * vat_percent / 100);
  const discount = round2(Math.max(0, +p.discount || 0));
  if (discount > round2(subtotal + vat)) throw new ApiError(400, 'Discount bill total (' + round2(subtotal + vat) + ' tk) er cheye beshi hote pare na.');
  const total = round2(subtotal + vat - discount);
  const paid = round2(Math.min(Math.max(0, +p.paid_amount || 0), total));
  const due = round2(total - paid);
  if (due > 0 && !customer) throw new ApiError(400, 'Due sale requires a customer profile (Baki sale e customer profile lagbe).');
  const inv = { id: nextId('invoice'), invoice_no: 'INV-' + (1000 + DB.db.counters.invoice), customer_id: customer ? customer.id : null, customer_name: customer ? customer.name : 'Cash Customer', user_id: user.id, user_name: user.name, items: rows, subtotal, discount, vat_percent, vat, total, paid, due, note: String(p.note || ''), print_status: 'pending', sms_status: 'pending', wa_status: 'pending', timestamp: ts, time_display: tdisp };
  for (const r of rows) {
    const prod = DB.db.products.find(x => x.id === r.product_id);
    prod.current_stock = round2(prod.current_stock - r.qty);
    DB.db.stock_ledger.push({ id: nextId('ledger'), product_id: prod.id, product_name: prod.name, user_id: user.id, user_name: user.name, type: 'OUT', quantity: r.qty, unit_cost: null, unit_price: r.price, source: inv.invoice_no, note: 'Sold to ' + inv.customer_name, timestamp: ts, time_display: tdisp });
  }
  if (customer) {
    if (total > 0) {
      customer.total_due = round2(customer.total_due + total);
      DB.db.customer_ledger.push({ id: nextId('cleger'), customer_id: customer.id, user_id: user.id, user_name: user.name, transaction_type: 'DEBIT', amount: total, balance: customer.total_due, source: inv.invoice_no, note: 'Invoice ' + inv.invoice_no, timestamp: ts, time_display: tdisp });
    }
    if (paid > 0) {
      customer.total_due = round2(customer.total_due - paid);
      DB.db.customer_ledger.push({ id: nextId('cleger'), customer_id: customer.id, user_id: user.id, user_name: user.name, transaction_type: 'CREDIT', amount: paid, balance: customer.total_due, source: inv.invoice_no, note: 'Payment for ' + inv.invoice_no, timestamp: ts, time_display: tdisp });
    }
  }
  DB.db.invoices.push(inv);
  if (paid > 0) addCash('IN', paid, inv.invoice_no, 'Sale payment', user.name, ts);
  const cashNow = round2((DB.db.settings.opening_cash || 0) + (DB.db.cash_ledger || []).reduce(function (s, l) { return s + (l.type === 'IN' ? l.amount : -l.amount); }, 0));
  notify('Bikri: ' + inv.invoice_no + ' | Total: ' + inv.total + ' tk | Paid: ' + inv.paid + ' tk | Due: ' + inv.due + ' tk | Cash: ' + cashNow + ' tk | ' + DB.db.settings.shop_name, 'sale');
  return inv;
}

function buildSms(customer, inv) {
  const tpl = DB.db.settings.sms_template || 'Dear {name}, Total Bill: {total} tk. Paid: {paid} tk. Due: {due} tk. Thank you, {shop}.';
  return tpl.split('{name}').join(customer ? customer.name : '').split('{total}').join(String(inv.total)).split('{paid}').join(String(inv.paid)).split('{due}').join(String(inv.due)).split('{shop}').join(DB.db.settings.shop_name || '');
}
async function sendSms(customer, inv, customMsg) {
  const cfg = DB.db.settings.mimsms || {};
  if (!cfg.api_key || !cfg.user_name || !cfg.sender_name) { inv.sms_status = 'skipped (MiMSMS not configured)'; return; }
  if (!customer || !customer.phone) { inv.sms_status = 'skipped (no phone number)'; return; }
  const msg = customMsg || buildSms(customer, inv);
  const body = { apiKey: cfg.api_key, userName: cfg.user_name, senderName: cfg.sender_name, transactionType: 'T', mobileNumber: normPhone(customer.phone), message: msg };
  try {
    const res = await fetch('https://mimsms.com', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
    inv.sms_status = res.ok ? 'sent' : 'failed (HTTP ' + res.status + ')';
    const txt = await res.text().catch(() => '');
    console.log('[MiMSMS] ' + inv.sms_status + ' -> ' + body.mobileNumber + ' ' + txt.slice(0, 120));
  } catch (e) { inv.sms_status = 'failed (' + (e.message || 'network error') + ')'; }
}
function deleteInvoice(user, id) {
  const idx = DB.db.invoices.findIndex(i => i.id === id);
  if (idx < 0) throw new ApiError(404, 'Invoice not found');
  const inv = DB.db.invoices[idx];
  const ts = nowIso(), tdisp = fmtDT(ts);
  for (const r of inv.items) {
    const prod = DB.db.products.find(x => x.id === r.product_id);
    if (prod) {
      prod.current_stock = round2(prod.current_stock + r.qty);
      DB.db.stock_ledger.push({ id: nextId('ledger'), product_id: prod.id, product_name: prod.name, user_id: user.id, user_name: user.name, type: 'IN', quantity: r.qty, unit_cost: null, unit_price: r.price, source: 'Reversal: ' + inv.invoice_no + ' deleted', note: 'Stock returned (invoice deleted by ' + user.name + ')', timestamp: ts, time_display: tdisp });
    }
  }
  if (inv.customer_id) {
    const cust = DB.db.customers.find(c => c.id === inv.customer_id);
    if (cust) {
      if (inv.total > 0) { cust.total_due = round2(cust.total_due - inv.total); DB.db.customer_ledger.push({ id: nextId('cleger'), customer_id: cust.id, user_id: user.id, user_name: user.name, transaction_type: 'CREDIT', amount: inv.total, balance: cust.total_due, source: 'Reversal', note: 'Reversal of ' + inv.invoice_no + ' (deleted)', timestamp: ts, time_display: tdisp }); }
      if (inv.paid > 0) { cust.total_due = round2(cust.total_due + inv.paid); DB.db.customer_ledger.push({ id: nextId('cleger'), customer_id: cust.id, user_id: user.id, user_name: user.name, transaction_type: 'DEBIT', amount: inv.paid, balance: cust.total_due, source: 'Reversal', note: 'Payment taken back for deleted ' + inv.invoice_no, timestamp: ts, time_display: tdisp }); }
    }
  }
  DB.db.invoices.splice(idx, 1);
  if (inv.paid > 0) addCash('OUT', inv.paid, 'Reversal', 'Invoice deleted: ' + inv.invoice_no, user.name, ts);
  notify('Invoice delete: ' + inv.invoice_no + ' | Cash -' + inv.paid + ' tk (stock & due reversed) | ' + DB.db.settings.shop_name, 'delete');
}
function dashboardData(user) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todays = DB.db.invoices.filter(i => new Date(i.timestamp) >= today);
  const out = {
    total_due: round2(DB.db.customers.reduce((s, c) => s + (c.total_due || 0), 0)),
    today_sales: round2(todays.reduce((s, i) => s + i.total, 0)),
    today_collection: round2(todays.reduce((s, i) => s + i.paid, 0)),
    today_invoices: todays.length,
    customers: DB.db.customers.length,
    products: DB.db.products.length,
    low_stock: DB.db.products.filter(p => p.current_stock <= p.low_stock).map(p => ({ id: p.id, name: p.name, category: p.category, current_stock: p.current_stock, unit: p.unit, low_stock: p.low_stock })),
    recent_invoices: DB.db.invoices.slice(-6).reverse(),
    cash_balance: round2((DB.db.settings.opening_cash || 0) + (DB.db.cash_ledger || []).filter(function (l) { return l.type === 'IN'; }).reduce(function (s, l) { return s + l.amount; }, 0) - (DB.db.cash_ledger || []).filter(function (l) { return l.type === 'OUT'; }).reduce(function (s, l) { return s + l.amount; }, 0)),
    recent_cash: (DB.db.cash_ledger || []).slice(-5).reverse()
  };
  {
    out.stock_valuation_cost = round2(DB.db.products.reduce((s, p) => s + p.current_stock * p.purchase_price, 0));
    out.stock_valuation_sale = round2(DB.db.products.reduce((s, p) => s + p.current_stock * p.selling_price, 0));
  }
  return out;
}


async function notify(text, source) {
  const cfg = DB.db.settings.mimsms || {};
  const num = DB.db.settings.notify_number;
  if (!num || !cfg.api_key || !cfg.user_name || !cfg.sender_name) return;
  const body = { apiKey: cfg.api_key, userName: cfg.user_name, senderName: cfg.sender_name, transactionType: 'T', mobileNumber: normPhone(num), message: text };
  try { const res = await fetch('https://mimsms.com', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) }); console.log('[Notify SMS]', source, res.ok ? 'sent' : 'HTTP ' + res.status); } catch (e) { console.log('[Notify SMS] failed:', e.message); }
}
module.exports = { makeInvoice, sendSms, deleteInvoice, dashboardData, normPhone, addCash, buildSms, notify };
