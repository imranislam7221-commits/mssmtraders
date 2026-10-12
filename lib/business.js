'use strict';
/* business logic: invoicing, stock movement, SMS gateway, dashboard */
const DBMOD = require('./db');
const { saveDb: _unusedSaveDb, nextId } = DBMOD;
const { round2, nowIso, fmtDT, ApiError, dhakaDateStr, toAsciiDigits } = require('./helpers');
const DB = DBMOD;
/* ---------- core business logic ---------- */
function normPhone(ph) {
  let p = toAsciiDigits(String(ph || '')).replace(/[^0-9]/g, '');
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

  // Bug #4 fix: Idempotency deduplication for offline invoices
  if (p.offline_invoice_no) {
    const existingOffline = (DB.db.invoices || []).find(i => i.offline_invoice_no && i.offline_invoice_no === String(p.offline_invoice_no).trim());
    if (existingOffline) {
      return existingOffline;
    }
  }

  const items = Array.isArray(p.items) ? p.items.filter(i => Number(i.qty) > 0) : [];
  if (!items.length) throw new ApiError(400, 'Add at least one item.');
  let customer = null;
  if (p.customer_id) {
    customer = DB.db.customers.find(c => c.id === +p.customer_id);
    if (!customer) throw new ApiError(400, 'Customer not found');
    if (p.customer_address !== undefined && p.customer_address !== null && String(p.customer_address).trim() !== '') {
      customer.address = String(p.customer_address).trim();
    }
  } else if (p.customer && String(p.customer.name || '').trim()) {
    // Bug #7 fix: match existing customer by phone or name to prevent duplicate customer profiles in offline sync
    const rawName = String(p.customer.name).trim();
    const rawPhone = String(p.customer.phone || '').trim();
    const normPh = rawPhone ? normPhone(rawPhone) : '';
    let existing = null;
    if (normPh) {
      existing = DB.db.customers.find(c => c.phone && normPhone(c.phone) === normPh);
    }
    if (!existing && rawName) {
      existing = DB.db.customers.find(c => c.name && c.name.trim().toLowerCase() === rawName.toLowerCase() && (!c.phone || (normPh && normPhone(c.phone) === normPh)));
    }

    if (existing) {
      customer = existing;
      if (p.customer.address && !customer.address) customer.address = String(p.customer.address).trim();
      if (rawPhone && !customer.phone) customer.phone = rawPhone;
      if (p.customer.whatsapp_enabled) customer.whatsapp_enabled = true;
    } else {
      customer = {
        id: nextId('customer'),
        name: rawName,
        phone: rawPhone,
        address: String(p.customer.address || '').trim(),
        whatsapp_enabled: !!p.customer.whatsapp_enabled,
        total_due: 0,
        created_at: ts
      };
      DB.db.customers.push(customer);
    }
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
  const labor_cost = round2(Math.max(0, +p.labor_cost || +p.labor || 0));
  const discount = round2(Math.max(0, +p.discount || 0));
  if (discount > round2(subtotal + labor_cost)) throw new ApiError(400, 'ছাড় মোট বিল (' + round2(subtotal + labor_cost) + ' ৳) এর চেয়ে বেশি হতে পারে না।');
  
  // Bug #6 fix: calculate VAT if provided in invoice body or configured in settings
  const baseAfterDiscount = Math.max(0, round2(subtotal + labor_cost - discount));
  const vat_percent = round2(Math.max(0, p.vat_percent != null && p.vat_percent !== '' ? +p.vat_percent : +(DB.db.settings && DB.db.settings.vat_percent || 0)));
  const vat = round2(baseAfterDiscount * (vat_percent / 100));
  const total = round2(baseAfterDiscount + vat);

  const enteredPaid = round2(Math.max(0, +p.paid_amount || 0));
  const paid = customer ? enteredPaid : round2(Math.min(enteredPaid, total));
  const due = round2(Math.max(0, total - paid));
  if (due > 0 && !customer) throw new ApiError(400, 'Due sale requires a customer profile (Baki sale e customer profile lagbe).');
  const prevDue = customer ? round2(customer.total_due || 0) : 0;
  // Bug #3 fix: retain advance credit / negative due if customer overpaid or had advance balance
  const netDue = customer ? round2(prevDue + total - paid) : due;
  const inv = {
    id: nextId('invoice'),
    invoice_no: 'INV-' + DB.db.counters.invoice,
    offline_invoice_no: p.offline_invoice_no ? String(p.offline_invoice_no).trim() : null,
    customer_id: customer ? customer.id : null,
    customer_name: customer ? customer.name : 'Cash Customer',
    user_id: user.id,
    user_name: user.name,
    items: rows,
    subtotal,
    discount,
    labor_cost,
    vat_percent,
    vat,
    total,
    paid,
    due,
    prev_due: prevDue,
    net_due: netDue,
    note: String(p.note || ''),
    print_status: 'pending',
    sms_status: 'pending',
    wa_status: 'pending',
    timestamp: ts,
    time_display: tdisp
  };
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

  // Bug #2 fix: maintain deleted invoices audit log so audit trail is never lost
  DB.db.deleted_invoices = DB.db.deleted_invoices || [];
  DB.db.deleted_invoices.push({
    ...inv,
    deleted_at: ts,
    deleted_by: user.name,
    time_display: tdisp
  });

  for (const r of inv.items) {
    const prod = DB.db.products.find(x => x.id === r.product_id);
    if (prod) {
      prod.current_stock = round2(prod.current_stock + r.qty);
    }
  }
  // Remove stock ledger entries for this invoice so cancelled sales don't artificially inflate stock IN/OUT
  DB.db.stock_ledger = (DB.db.stock_ledger || []).filter(l => l.source !== inv.invoice_no && l.source !== ('Reversal: ' + inv.invoice_no + ' deleted'));

  if (inv.customer_id) {
    const cust = DB.db.customers.find(c => c.id === inv.customer_id);
    if (cust) {
      DB.db.customer_ledger = (DB.db.customer_ledger || []).filter(l => l.source !== inv.invoice_no && !(l.note && l.note.includes(inv.invoice_no)));
      
      // Bug #2 fix: Recompute chronological customer ledger running balances to prevent balance corruption
      let runningCustDue = 0;
      for (const entry of (DB.db.customer_ledger || [])) {
        if (entry.customer_id === cust.id) {
          if (entry.transaction_type === 'DEBIT') {
            runningCustDue = round2(runningCustDue + entry.amount);
          } else if (entry.transaction_type === 'CREDIT') {
            runningCustDue = round2(runningCustDue - entry.amount);
          }
          entry.balance = runningCustDue;
        }
      }
      cust.total_due = runningCustDue;
    }
  }
  DB.db.invoices.splice(idx, 1);
  // Remove cash ledger entries for this invoice so cancelled sales don't artificially inflate cash collection or clutter cash book
  DB.db.cash_ledger = (DB.db.cash_ledger || []).filter(l => l.source !== inv.invoice_no && !(l.note && l.note.includes(inv.invoice_no)));
  // Recompute running balances on remaining cash ledger entries
  let runningBal = round2(DB.db.settings.opening_cash || 0);
  for (const entry of (DB.db.cash_ledger || [])) {
    runningBal = round2(runningBal + (entry.type === 'IN' ? entry.amount : -entry.amount));
    entry.balance = runningBal;
  }
  notify('Invoice delete: ' + inv.invoice_no + ' | (stock, due & cash reversed) | ' + DB.db.settings.shop_name, 'delete');
}
function dashboardData(user) {
  const todayStr = dhakaDateStr();
  const thisMonthStr = todayStr.slice(0, 7);
  const todays = DB.db.invoices.filter(i => dhakaDateStr(i.timestamp) === todayStr);
  const todaysCashIn = (DB.db.cash_ledger || []).filter(l => l.type === 'IN' && dhakaDateStr(l.timestamp) === todayStr);
  const todaysCashOutRev = (DB.db.cash_ledger || []).filter(l => l.type === 'OUT' && (l.source === 'Reversal' || (l.source && l.source.includes('বাতিল'))) && dhakaDateStr(l.timestamp) === todayStr);
  const todayCollection = round2(Math.max(0, todaysCashIn.reduce((s, l) => s + l.amount, 0) - todaysCashOutRev.reduce((s, l) => s + l.amount, 0)));
  const out = {
    total_due: round2(DB.db.customers.reduce((s, c) => s + (c.total_due || 0), 0)),
    total_supplier_payable: round2((DB.db.suppliers || []).reduce((s, sup) => s + (sup.total_payable || 0), 0)),
    today_sales: round2(todays.reduce((s, i) => s + i.total, 0)),
    today_collection: todayCollection,
    today_invoices: todays.length,
    customers: DB.db.customers.length,
    suppliers: (DB.db.suppliers || []).length,
    products: (DB.db.products || []).filter(p => !p.is_archived).length,
    low_stock: (DB.db.products || []).filter(p => !p.is_archived && p.current_stock <= p.low_stock).map(p => ({ id: p.id, name: p.name, category: p.category, current_stock: p.current_stock, unit: p.unit, low_stock: p.low_stock })),
    recent_invoices: DB.db.invoices.slice(-6).reverse(),
    cash_balance: round2((DB.db.settings.opening_cash || 0) + (DB.db.cash_ledger || []).filter(function (l) { return l.type === 'IN'; }).reduce(function (s, l) { return s + l.amount; }, 0) - (DB.db.cash_ledger || []).filter(function (l) { return l.type === 'OUT'; }).reduce(function (s, l) { return s + l.amount; }, 0)),
    recent_cash: (DB.db.cash_ledger || []).slice(-5).reverse()
  };
  const exps = Array.isArray(DB.db.expenses) ? DB.db.expenses : [];
  const todaysExp = exps.filter(e => (e.date || dhakaDateStr(e.timestamp)) === todayStr);
  out.today_expense = round2(todaysExp.reduce((s, e) => s + e.amount, 0));
  const monthsExp = exps.filter(e => (e.date || dhakaDateStr(e.timestamp)).startsWith(thisMonthStr));
  out.month_expense = round2(monthsExp.reduce((s, e) => s + e.amount, 0));
  out.recent_expenses = exps.slice(-6).reverse();

  const incs = Array.isArray(DB.db.incomes) ? DB.db.incomes : [];
  const todaysInc = incs.filter(e => (e.date || dhakaDateStr(e.timestamp)) === todayStr);
  out.today_income = round2(todaysInc.reduce((s, e) => s + e.amount, 0));
  const monthsInc = incs.filter(e => (e.date || dhakaDateStr(e.timestamp)).startsWith(thisMonthStr));
  out.month_income = round2(monthsInc.reduce((s, e) => s + e.amount, 0));
  out.recent_incomes = incs.slice(-6).reverse();

  out.stock_valuation_cost = round2(DB.db.products.reduce((s, p) => s + p.current_stock * p.purchase_price, 0));
  out.stock_valuation_sale = round2(DB.db.products.reduce((s, p) => s + p.current_stock * p.selling_price, 0));
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
