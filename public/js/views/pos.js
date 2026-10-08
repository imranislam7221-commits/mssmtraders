/* ---------- POS / billing ---------- */
VIEWS.pos = async function () {
  const [{ products }, { customers }] = await Promise.all([api('/products'), api('/customers').catch(() => ({ customers: [] }))]);
  S.__products = products; S.__customers = customers; S.cart = S.cart || [];
  layout(`
    <div class="page-head"><div><h1>POS — Fast Billing</h1><div class="sub">Select item → enter Qty & Price → totals auto-calculate</div></div></div>
    <div class="pos-grid">
      <div class="card">
        <h3>1️⃣ Add Items</h3>
        <div class="psearch-wrap">
          <input id="psearch" placeholder="🔍 Search item (Rod, Cement, Tiles…)" autocomplete="off" oninput="pDrop()" onfocus="pDrop()">
          <div id="pdrop" class="pdrop" style="display:none"></div>
        </div>
        <div class="qtyrow" style="margin-top:10px">
          <div style="flex:1.4"><label style="margin-top:0">Qty (<span id="qtyunit" style="color:var(--brand)">—</span>) *</label><input id="pqty" type="number" step="0.01" placeholder="Qty"></div>
          <div style="flex:1.4"><label style="margin-top:0">Price (Tk)</label><input id="pprice" type="number" step="0.01"></div>
          <div style="flex:0.6;display:flex;align-items:flex-end"><button class="btn pri blk" style="padding:10px" onclick="addToCart()">+ Add</button></div>
        </div>
        <h3 style="margin-top:16px">2️⃣ Cart</h3><div id="cartbox">${cartHtml()}</div>
      </div>
      <div class="card">
        <h3>3️⃣ Customer & Payment</h3>
        <label>Customer (search by name/phone)</label>
        <div class="psearch-wrap">
          <input id="custsearch" placeholder="🔍 Customer name/phone likhun…" autocomplete="off" oninput="cDrop()" onfocus="cDrop()">
          <div id="cdrop" class="pdrop" style="display:none"></div>
        </div>
        <input type="hidden" id="custsel" value="0">
        <button class="btn sm" style="margin-top:6px" onclick="newCustInline()">+ New customer</button>
        <div id="newcust" style="display:none">
          <label>New Customer Name *</label><input id="ncname" placeholder="Name">
          <label>Phone</label><input id="ncphone" placeholder="01XXXXXXXXX">
          <label style="display:flex;gap:6px;align-items:center;margin-top:8px"><input type="checkbox" id="ncwa" style="width:auto"> WhatsApp enabled (statement via WhatsApp)</label>
        </div>
        <div class="grid g2">
          <div><label>Discount (Tk)</label><input id="fdiscount" type="number" step="0.01" value="0" oninput="calcTotals()"></div>
          <div><label>VAT %</label><input id="fvat" type="number" step="0.01" value="0" oninput="calcTotals()"></div>
        </div>
        <label>Paid Amount (Tk)</label><input id="fpaid" type="number" step="0.01" value="0" oninput="calcTotals()">
        <div style="margin-top:10px" id="totalsbox">${totalsHtml()}</div>
        <label>Note (optional)</label><input id="fnote" placeholder="any remark">
        <div style="display:flex;gap:8px;margin-top:12px"><button class="btn pri blk" onclick="saveInvoice(false)">💾 Save</button><button class="btn grn blk" onclick="saveInvoice(true)">🖨️ Save & Print</button></div>
      </div>
    </div>`, true);
};
function pDrop() {
  const q = ($('#psearch').value || '').toLowerCase();
  const box = $('#pdrop');
  const list = (S.__products || []).filter(p => (p.name + ' ' + p.category).toLowerCase().includes(q)).sort(prodSort).slice(0, 60);
  box.innerHTML = list.map(p => `<div class="pi ${p.current_stock <= 0 ? 'dis' : ''}" onmousedown="pickProduct(${p.id})"><span>${esc(p.name)} <small style="color:var(--mut)">${esc(p.category)}${p.size_mili ? ' • ' + p.size_mili + 'mm' : ''}</small></span><span class="st">${money(p.selling_price)}/${esc(p.unit)} • stock ${p.current_stock}</span></div>`).join('') || '<div class="pi dis">No product found</div>';
  box.style.display = 'block';
}
function pickProduct(id) {
  const p = S.__products.find(x => x.id === id);
  $('#psearch').value = p.name; $('#psearch').dataset.pid = p.id;
  $('#pdrop').style.display = 'none';
  $('#pprice').value = p.selling_price;
  const qu = $('#qtyunit'); if (qu) qu.textContent = p.unit;
  $('#pqty').value = 1; $('#pqty').focus();
}
function addToCart() {
  const ps = $('#psearch');
  let p = S.__products.find(x => x.id === +ps.dataset.pid) || S.__products.find(x => x.name.toLowerCase() === (ps.value || '').trim().toLowerCase());
  if (!p) { toast('Select a product from the list first', true); return; }
  const qty = parseFloat($('#pqty').value), price = parseFloat($('#pprice').value);
  if (!(qty > 0)) { toast('Enter quantity', true); return; }
  if (!(price >= 0)) { toast('Enter price', true); return; }
  if (qty > p.current_stock) { toast('Insufficient stock! Available: ' + p.current_stock + ' ' + p.unit, true); return; }
  const ex = S.cart.find(c => c.product_id === p.id);
  if (ex) { ex.qty = +(ex.qty + qty).toFixed(2); ex.price = price; ex.amount = +(ex.qty * ex.price).toFixed(2); }
  else S.cart.push({ product_id: p.id, name: p.name, unit: p.unit, qty, price, amount: +(qty * price).toFixed(2) });
  ps.value = ''; ps.dataset.pid = ''; $('#pqty').value = ''; $('#pprice').value = '';
  const qu = $('#qtyunit'); if (qu) qu.textContent = '—';
  $('#cartbox').innerHTML = cartHtml(); calcTotals();
}
function rmCart(i) { S.cart.splice(i, 1); $('#cartbox').innerHTML = cartHtml(); calcTotals(); }
function cartHtml() {
  if (!S.cart.length) return '<div class="empty">Cart is empty — search & add items above</div>';
  return S.cart.map((c, i) => `<div class="cart-line"><div class="nm">${esc(c.name)}<small>${c.qty} ${esc(c.unit)} × ${money(c.price)}</small></div><b>${money(c.amount)}</b><button class="btn sm dan" onclick="rmCart(${i})">✕</button></div>`).join('');
}
function calcTotals() {
  const box = $('#totalsbox'); if (box) box.innerHTML = totalsHtml();
}
function totalsHtml() {
  const sub = S.cart.reduce((s, c) => s + c.qty * c.price, 0);
  const disc = Math.max(0, parseFloat(($('#fdiscount') || {}).value) || 0);
  const vatP = parseFloat(($('#fvat') || {}).value) || 0;
  const vat = sub * vatP / 100;
  const total = sub + vat - disc;
  const paid = Math.max(0, parseFloat(($('#fpaid') || {}).value) || 0);
  const due = total - paid;
  return `<div class="sumrow"><span>Subtotal</span><span>${money(sub)}</span></div>
    <div class="sumrow"><span>Discount</span><span>− ${money(disc)}</span></div>
    <div class="sumrow"><span>VAT (${vatP}%)</span><span>+ ${money(vat)}</span></div>
    <div class="sumrow total"><span>Net Payable</span><span>${money(total)}</span></div>
    <div class="sumrow"><span>Paid</span><span>${money(paid)}</span></div>
    <div class="sumrow duerow"><span>Due (Baki)</span><span>${money(due)}</span></div>`;
}
function custChanged() { const nc = $('#newcust'); if (nc) nc.style.display = ($('#custsel').value === 'new' ? 'block' : 'none'); }
function newCustInline() { $('#newcust').style.display = 'block'; $('#ncname').focus(); }
async function saveInvoice(doPrint) {
  if (!S.cart.length) { toast('Cart is empty', true); return; }
  const custsel = $('#custsel').value;
  const body = { items: S.cart.map(c => ({ product_id: c.product_id, qty: c.qty, price: c.price })), discount: $('#fdiscount').value || 0, vat_percent: $('#fvat').value || 0, paid_amount: $('#fpaid').value || 0, note: $('#fnote').value };
  const ncDiv = $('#newcust');
  const ncName = (ncDiv && ncDiv.style.display !== 'none') ? $('#ncname').value.trim() : '';
  if (ncName) {
    body.customer = { name: ncName, phone: $('#ncphone').value, whatsapp_enabled: $('#ncwa').checked };
  } else if (+custsel > 0) body.customer_id = +custsel;
  try {
    const d = await api('/invoices', { method: 'POST', body });
    S.cart = [];
    invoiceSuccess(d.invoice, d.customer, doPrint);
  } catch (e) { toast(e.message, true); }
}
function invoiceSuccess(inv, customer, doPrint) {
  modal(`<div class="modal-h"><h3>✅ Invoice ${esc(inv.invoice_no)} saved</h3><button class="modal-x" onclick="closeModal();router()">×</button></div>
  <div class="modal-b">
    <div class="grid g2">
      <div class="stat"><div class="lab">Total</div><div class="val">${money(inv.total)}</div></div>
      <div class="stat ${inv.due > 0 ? 'due' : ''}"><div class="lab">Due (Baki)</div><div class="val">${money(inv.due)}</div></div>
    </div>
    <p style="margin-top:12px;font-size:13px">📱 Customer SMS: <b>${esc(inv.sms_status || 'pending')}</b></p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
      <button class="btn grn" onclick="printInvoice(${inv.id})">🖨️ Print Receipt</button>
      <button class="btn pri" onclick="closeModal();router()">Done</button>
    </div>
  </div>`);
  if (doPrint) setTimeout(() => printInvoice(inv.id), 400);
}
function waText(inv, customer) {
  let t = '*' + 'Invoice ' + inv.invoice_no + '*' + '\n' + esc(customer.name) + '\n\n';
  inv.items.forEach(i => { t += i.name + ' — ' + i.qty + ' ' + i.unit + ' x ' + i.price + ' = ' + i.amount + ' tk\n'; });
  t += '\nSubtotal: ' + inv.subtotal + ' tk';
  if (inv.discount > 0) t += '\nDiscount: -' + inv.discount + ' tk';
  if (inv.vat > 0) t += '\nVAT: +' + inv.vat + ' tk';
  t += '\n*Total: ' + inv.total + ' tk*\nPaid: ' + inv.paid + ' tk\n*Due: ' + inv.due + ' tk*\n\nDate: ' + inv.time_display + '\nThank you!';
  return t;
}

function cDrop() {
  const q = ($('#custsearch').value || '').toLowerCase();
  const box = $('#cdrop');
  const list = (S.__customers || []).filter(function (c) { return (c.name + ' ' + (c.phone || '')).toLowerCase().includes(q); }).slice(0, 30);
  box.innerHTML = '<div class="pi" onmousedown="pickCust(0, &quot;Cash Customer&quot;)"><span>🚶 Cash Customer <small style="color:var(--mut)">baki chhara</small></span></div>' + list.map(function (c) { return '<div class="pi" onmousedown="pickCust(' + c.id + ', this.dataset.nm)" data-nm="' + esc(c.name) + '"><span>' + esc(c.name) + ' <small style="color:var(--mut)">' + esc(c.phone || '') + '</small></span><span class="st">' + (c.total_due > 0 ? 'due ' + c.total_due : 'no due') + '</span></div>'; }).join('');
  box.style.display = 'block';
}
function pickCust(id, name) {
  $('#custsel').value = id;
  $('#custsearch').value = name;
  $('#cdrop').style.display = 'none';
  const nc = $('#newcust'); if (nc) nc.style.display = 'none';
}
