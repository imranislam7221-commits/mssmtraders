/* ---------- invoices ---------- */
VIEWS.invoices = async function () {
  const { invoices } = await api('/invoices');
  const rows = invoices.map(i => `<tr>
    <td><b>${esc(i.invoice_no)}</b></td>
    <td>${esc(i.customer_name)}</td>
    <td class="num">${money(i.total)}</td>
    <td class="num">${money(i.paid)}</td>
    <td class="num ${i.due > 0 ? 'dueX' : 'due0'}">${money(i.due)}</td>
    <td><span class="badge mut">${esc(i.sms_status || '—')}</span></td>
    <td>${fmtDT(i.timestamp)}</td>
    <td>${esc(i.user_name)}</td>
    <td style="white-space:nowrap"><button class="btn sm pri" onclick="viewInvoice(${i.id})">View</button> ${true ? `<button class="btn sm dan" onclick="delInvoice(${i.id})">🗑️</button>` : ''}</td>
  </tr>`).join('') || '<tr><td colspan="9" class="empty">No invoices found</td></tr>';
  layout(`
    <div class="page-head"><div><h1>Invoices</h1><div class="sub">All bills — immutable audit trail (who & when)</div></div>
      <div style="display:flex;gap:8px;align-items:center"><input id="isearch2" placeholder="🔍 Invoice khujun…" style="width:220px" oninput="filterInvoices(this.value)"><a class="btn pri" href="#/pos">🧾 New Sale</a></div></div>
    <div class="card"><div class="tblwrap"><table class="tbl" id="itable">
      <tr><th>Invoice</th><th>Customer</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Due</th><th>SMS</th><th>Date & Time</th><th>By</th><th>Actions</th></tr>${rows}
    </table></div></div>`);
};
async function viewInvoice(id) {
  const { invoice: inv, customer } = await api('/invoices/' + id);
  const items = inv.items.map(i => `<tr><td>${esc(i.name)}</td><td class="num">${i.qty} ${esc(i.unit)}</td><td class="num">${money(i.price)}</td><td class="num">${money(i.amount)}</td></tr>`).join('');
  modal(`<div class="modal-h"><h3>${esc(inv.invoice_no)} — ${esc(inv.customer_name)}</h3><button class="modal-x" onclick="closeModal()">×</button></div>
  <div class="modal-b">
    <div class="tblwrap"><table class="tbl"><tr><th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Amount</th></tr>${items}</table></div>
    <div style="margin-top:10px">
      <div class="sumrow"><span>Subtotal</span><span>${money(inv.subtotal)}</span></div>
      ${inv.discount > 0 ? `<div class="sumrow"><span>Discount</span><span>− ${money(inv.discount)}</span></div>` : ''}
      ${inv.vat > 0 ? `<div class="sumrow"><span>VAT (${inv.vat_percent}%)</span><span>+ ${money(inv.vat)}</span></div>` : ''}
      <div class="sumrow total"><span>Total</span><span>${money(inv.total)}</span></div>
      <div class="sumrow"><span>Paid</span><span>${money(inv.paid)}</span></div>
      <div class="sumrow duerow"><span>Due</span><span>${money(inv.due)}</span></div>
    </div>
    <p style="margin-top:10px;font-size:12.5px;color:var(--mut)">🕒 ${esc(inv.time_display)} • 👤 ${esc(inv.user_name)} • 📱 SMS: ${esc(inv.sms_status || '—')}${inv.note ? '<br>📝 ' + esc(inv.note) : ''}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
      <button class="btn grn" onclick="printInvoice(${inv.id})">🖨️ Print</button>
      <button class="btn" onclick="resendSms(${inv.id})">📱 Resend SMS</button>
    </div>
  </div>`, true);
}
async function resendSms(id) {
  const d = await api('/invoices/' + id);
  const inv = d.invoice, customer = d.customer;
  if (!customer || !customer.phone) { toast(t('No phone number on this customer'), true); return; }
  let s = { settings: {} }; try { s = await api('/settings'); } catch (e) {}
  const tpl = s.settings.sms_template || 'Dear {name}, Total Bill: {total} tk. Paid: {paid} tk. Due: {due} tk. Thank you, {shop}.';
  const pre = tpl.split('{name}').join(customer.name).split('{total}').join(String(inv.total)).split('{paid}').join(String(inv.paid)).split('{due}').join(String(inv.due)).split('{shop}').join(s.settings.shop_name || '');
  modal('<div class="modal-h"><h3>📱 ' + t('Send SMS') + ' — ' + esc(customer.phone) + '</h3><button class="modal-x" onclick="closeModal()">×</button></div><div class="modal-b"><label>' + t('SMS Message') + '</label><textarea id="smsmsg" rows="4">' + esc(pre) + '</textarea><p style="font-size:12px;color:var(--mut);margin-top:6px">' + t('Auto-filled from template — edit if needed, then send.') + '</p><br><button class="btn pri blk" id="smssend">📤 ' + t('Send') + '</button></div>');
  $('#smssend').addEventListener('click', async function () {
    try { const r = await api('/invoices/' + id + '/sms', { method: 'POST', body: { message: $('#smsmsg').value } }); toast('SMS: ' + r.sms_status); closeModal(); } catch (e) { toast(e.message, true); }
  });
}
async function delInvoice(id) { askConfirm('Delete this invoice? Stock & customer ledger will be auto-reversed.', async function () { try { await api('/invoices/' + id, { method: 'DELETE' }); toast(t('Invoice deleted & reversed')); closeModal(); router(); } catch (e) { toast(e.message, true); } }); }

function filterInvoices(q) { q = q.toLowerCase(); document.querySelectorAll("#itable tr").forEach(function (tr, i) { if (i === 0) return; tr.style.display = tr.textContent.toLowerCase().includes(q) ? "" : "none"; }); }
