/* ---------- stock ledger ---------- */
VIEWS.stock = async function () {
  const [{ rows }, { ledger }] = await Promise.all([api('/stock/summary'), api('/stock/ledger')]);
  const sum = rows.slice().sort(prodSort).map(r => `<tr>
    <td><b>${esc(r.name)}</b></td><td>${esc(r.unit)}</td>
    <td class="num">${r.opening_stock}</td>
    <td class="num due0">+${r.stock_in}</td>
    <td class="num dueX">−${r.stock_out}</td>
    <td class="num"><b>${r.current_stock}</b></td>
    <td class="num">${money(r.current_stock * r.purchase_price)}</td>
    <td><button class="btn sm grn" onclick="openStockIn(${r.id})">+ In</button></td>
  </tr>`).join('');
  const log = ledger.map(l => `<tr>
    <td>${fmtDT(l.timestamp)}</td>
    <td><b>${esc(l.product_name)}</b></td>
    <td><span class="badge ${l.type === 'IN' ? 'in' : l.type === 'OUT' ? 'out' : 'open'}">${l.type}</span></td>
    <td class="num">${l.type === 'OUT' ? '−' : '+'}${l.quantity}</td>
    <td class="num">${l.unit_cost != null ? money(l.unit_cost) : (l.unit_price != null ? money(l.unit_price) : '—')}</td>
    <td>${esc(l.source)}${l.note ? ' <small style="color:var(--mut)">' + esc(l.note) + '</small>' : ''}</td>
    <td>${esc(l.user_name)}</td>
  </tr>`).join('') || '<tr><td colspan="7" class="empty">No stock movements yet</td></tr>';
  layout(`
    <div class="page-head"><div><h1>Stock Ledger (In−Out Tracking)</h1><div class="sub">Current = Opening + In − Out • every movement time-stamped</div></div>
      <button class="btn pri" onclick="openStockIn()">📥 Stock In</button></div>
    <div class="card"><h3>📊 Per-Item Stock Summary</h3><div class="tblwrap"><table class="tbl">
      <tr><th>Product</th><th>Unit</th><th class="num">Opening</th><th class="num">Stock In (+)</th><th class="num">Stock Out (−)</th><th class="num">Current Stock</th><th class="num">Valuation (cost)</th><th></th></tr>${sum}
    </table></div></div>
    <div class="card"><h3>🧾 Live Movement Log</h3><input id="slq" placeholder="Search product / source / user…" oninput="filterLedger(this.value)" style="max-width:320px;margin-bottom:10px"><div class="tblwrap"><table class="tbl" id="sltbl">
      <tr><th>Date & Time</th><th>Product</th><th>Type</th><th class="num">Qty</th><th class="num">Cost/Price</th><th>Source</th><th>By (User)</th></tr>${log}
    </table></div></div>`);
  window.__ledger = ledger;
};
function filterLedger(q) {
  q = q.toLowerCase();
  document.querySelectorAll('#sltbl tr[data-i]').forEach(() => {});
  const tbl = $('#sltbl');
  const rows = (window.__ledger || []).filter(l => (l.product_name + ' ' + l.source + ' ' + l.type + ' ' + l.user_name).toLowerCase().includes(q));
  tbl.innerHTML = '<tr><th>Date & Time</th><th>Product</th><th>Type</th><th class="num">Qty</th><th class="num">Cost/Price</th><th>Source</th><th>By (User)</th></tr>' + (rows.map(l => `<tr><td>${fmtDT(l.timestamp)}</td><td><b>${esc(l.product_name)}</b></td><td><span class="badge ${l.type === 'IN' ? 'in' : l.type === 'OUT' ? 'out' : 'open'}">${l.type}</span></td><td class="num">${l.type === 'OUT' ? '−' : '+'}${l.quantity}</td><td class="num">${l.unit_cost != null ? money(l.unit_cost) : (l.unit_price != null ? money(l.unit_price) : '—')}</td><td>${esc(l.source)}</td><td>${esc(l.user_name)}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">No match</td></tr>');
}
async function openStockIn(pid) { const { products } = await api('/products'); stockInModal(pid || null, products); }
