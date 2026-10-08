/* ---------- dashboard ---------- */
VIEWS.dashboard = async function () {
  const d = await api('/dashboard');
  const stats = `
    <div class="grid g4">
      <div class="stat due"><div class="lab">সর্বমোট বাকি (Total Shop Dues)</div><div class="val">${money(d.total_due)}</div></div>
      <div class="stat brand"><div class="lab">Today's Sales</div><div class="val">${money(d.today_sales)}</div><div class="lab" style="margin-top:4px">${d.today_invoices} invoices</div></div>
      <div class="stat"><div class="lab">Today's Collection</div><div class="val">${money(d.today_collection)}</div></div>
      <div class="stat brand"><div class="lab">💰 হাতে নগদ টাকা (Cash in Hand)</div><div class="val">${money(d.cash_balance)}</div></div>
      ${true ? `<div class="stat"><div class="lab">Stock Valuation (cost)</div><div class="val">${money(d.stock_valuation_cost)}</div><div class="lab" style="margin-top:4px">Sale value: ${money(d.stock_valuation_sale)}</div></div>` : `<div class="stat"><div class="lab">Customers</div><div class="val">${d.customers}</div></div>`}
    </div>`;
  const invRows = d.recent_invoices.map(i => `<tr onclick="viewInvoice(${i.id})" style="cursor:pointer"><td><b>${esc(i.invoice_no)}</b></td><td>${esc(i.customer_name)}</td><td class="num">${money(i.total)}</td><td class="num">${money(i.paid)}</td><td class="num ${i.due > 0 ? 'dueX' : 'due0'}">${money(i.due)}</td><td>${fmtDT(i.timestamp)}</td><td>${esc(i.user_name)}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">No invoices yet — start billing from POS</td></tr>';
  const low = d.low_stock.slice().sort(prodSort).map(p => `<div class="lowrow"><span>📦 ${esc(p.name)}</span><span class="dueX">${p.current_stock} ${esc(p.unit)} left (min ${p.low_stock})</span></div>`).join('') || '<div class="empty">All stocks healthy 👍</div>';
  const cashRows = (d.recent_cash || []).map(function (c) { return '<div class="lowrow"><span>' + (c.type === 'IN' ? '➕' : '➖') + ' ' + esc(c.source) + '</span><span>' + (c.type === 'IN' ? '+' : '−') + ' ' + money(c.amount) + ' <small style="color:var(--mut)">' + esc(c.time_display) + '</small></span></div>'; }).join('') || '<div class="empty">কোনো নগদ লেনদেন নেই</div>';
  layout(`
    <div class="page-head"><div><h1>Dashboard</h1><div class="sub">${new Date().toLocaleDateString((localStorage.getItem('pos_lang')==='bn'?'bn-BD':'en-GB'), { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn pri" href="#/pos">🧾 New Sale</a><a class="btn" href="#/stock">📥 Stock In</a><a class="btn" href="#/customers">👤 Customer</a></div></div>
    ${stats}
    <div class="grid g2">
      <div class="card"><h3>Recent Invoices</h3><div class="tblwrap"><table class="tbl"><tr><th>Invoice</th><th>Customer</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Due</th><th>Date</th><th>By</th></tr>${invRows}</table></div></div>
      <div class="card"><h3>⚠️ Low Stock Alerts</h3>${low}</div>
      <div class="card"><h3>💰 নগদ লেনদেন (Cash Movements)</h3>${cashRows}</div>
    </div>`);
};
