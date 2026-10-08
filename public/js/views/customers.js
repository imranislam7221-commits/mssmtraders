/* ---------- customers ---------- */
VIEWS.customers = async function () {
  const { customers } = await api('/customers');
  const rows = customers.map(c => `<tr onclick="viewCustomer(${c.id})" style="cursor:pointer">
    <td><b>${esc(c.name)}</b></td><td>${esc(c.phone || '—')}</td>
    <td class="num ${c.total_due > 0 ? 'dueX' : 'due0'}"><b>${money(c.total_due)}</b></td>
    <td style="white-space:nowrap"><button class="btn sm grn" onclick="event.stopPropagation();payModal(${c.id}, ${c.total_due})">💵 Collect Due</button> <button class="btn sm" onclick="event.stopPropagation();editCustomer(${c.id})">✏️</button>${true ? ` <button class="btn sm dan" onclick="event.stopPropagation();delCustomer(${c.id})">🗑️</button>` : ''}</td>
  </tr>`).join('') || '<tr><td colspan="4" class="empty">No customers yet</td></tr>';
  layout(`
    <div class="page-head"><div><h1>Customers (Baki Ledger)</h1><div class="sub">Isolated credit account for every customer</div></div>
      <div style="display:flex;gap:8px;align-items:center"><input id="csearch2" placeholder="🔍 Customer khujun…" style="width:220px" oninput="filterCustomers(this.value)"><button class="btn pri" onclick="editCustomer(null)">+ Add Customer</button></div></div>
    <div class="card"><div class="tblwrap"><table class="tbl" id="ctable">
      <tr><th>Name</th><th>Phone</th><th class="num">Total Due (Baki)</th><th>Actions</th></tr>${rows}
    </table></div></div>`);
};
function customerModal(c) {
  c = c || {};
  modal(`<div class="modal-h"><h3>${c.id ? 'Edit Customer' : 'Add Customer'}</h3><button class="modal-x" onclick="closeModal()">×</button></div>
  <div class="modal-b"><form id="cform">
    <label>Name *</label><input name="name" required value="${esc(c.name || '')}">
    <label>Phone</label><input name="phone" value="${esc(c.phone || '')}" placeholder="01XXXXXXXXX">
    <label>Address (ঠিকানা)</label><input name="address" value="${esc(c.address || '')}" placeholder="e.g. Mirpur-1, Dhaka">
    <br><button class="btn pri blk">Save</button>
  </form></div>`);
  $('#cform').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target;
    const body = { name: f.name.value, phone: f.phone.value, address: f.address.value };
    try { if (c.id) await api('/customers/' + c.id, { method: 'PUT', body }); else await api('/customers', { method: 'POST', body }); closeModal(); toast('Customer saved ✅'); router(); } catch (ex) { toast(ex.message, true); }
  });
}
function editCustomer(id) { if (id == null) return customerModal(null); api('/customers').then(d => customerModal(d.customers.find(c => c.id === id))); }
async function delCustomer(id) { askConfirm('Delete customer?', async function () { try { await api('/customers/' + id, { method: 'DELETE' }); toast(t('Customer deleted')); router(); } catch (e) { toast(e.message, true); } }); }

async function viewCustomer(id) {
  const { customer: c, ledger } = await api('/customers/' + id + '/ledger');
  const rows = ledger.map(l => `<tr>
    <td>${fmtDT(l.timestamp)}</td>
    <td><span class="badge ${l.transaction_type === 'CREDIT' ? 'in' : 'out'}">${l.transaction_type}</span></td>
    <td class="num">${l.transaction_type === 'CREDIT' ? '−' : '+'}${money(l.amount)}</td>
    <td class="num"><b>${money(l.balance)}</b></td>
    <td>${esc(l.note || '')} <small style="color:var(--mut)">(${esc(l.source || '')} — ${esc(l.user_name || '')})</small></td>
  </tr>`).join('') || '<tr><td colspan="5" class="empty">No transactions</td></tr>';
  modal(`<div class="modal-h"><h3>👤 ${esc(c.name)} — Ledger</h3><button class="modal-x" onclick="closeModal()">×</button></div>
  <div class="modal-b">
    <div class="grid g3">
      <div class="stat"><div class="lab">Phone</div><div class="val" style="font-size:15px">${esc(c.phone || '—')}${c.address ? '<br><small style="font-weight:400;color:var(--mut)">' + esc(c.address) + '</small>' : ''}</div></div>
      <div class="stat ${c.total_due > 0 ? 'due' : ''}"><div class="lab">Outstanding Due</div><div class="val">${money(c.total_due)}</div></div>
      <div class="stat"><div class="lab">Entries</div><div class="val">${ledger.length}</div></div>
    </div>
    <div class="toolbar" style="margin-top:12px">
      <input type="date" id="cfrom"> <input type="date" id="cto">
      <button class="btn sm" onclick="filterCustLedger(${c.id})">Filter</button>
    </div>
    <div id="custledger"><div class="tblwrap"><table class="tbl">
      <tr><th>Date & Time</th><th>Type</th><th class="num">Amount</th><th class="num">Balance</th><th>Note</th></tr>${rows}
    </table></div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
      <button class="btn grn" onclick="payModal(${c.id}, ${c.total_due})">💵 Collect Due Payment</button>
      <button class="btn pri" onclick="printStatement(${c.id})">🖨️ Print Statement</button>
    </div>
  </div>`, true);
}
async function filterCustLedger(id) {
  const from = $('#cfrom').value, to = $('#cto').value;
  const { ledger } = await api('/customers/' + id + '/ledger' + (from || to ? '?' + new URLSearchParams({ from, to }) : ''));
  const rows = ledger.map(l => `<tr><td>${fmtDT(l.timestamp)}</td><td><span class="badge ${l.transaction_type === 'CREDIT' ? 'in' : 'out'}">${l.transaction_type}</span></td><td class="num">${l.transaction_type === 'CREDIT' ? '−' : '+'}${money(l.amount)}</td><td class="num"><b>${money(l.balance)}</b></td><td>${esc(l.note || '')}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">No transactions in range</td></tr>';
  $('#custledger table.tbl').innerHTML = '<tr><th>Date & Time</th><th>Type</th><th class="num">Amount</th><th class="num">Balance</th><th>Note</th></tr>' + rows;
}
function payModal(id, due) {
  if (!(due > 0)) { toast('No due to collect for this customer', true); return; }
  modal(`<div class="modal-h"><h3>💵 Collect Due Payment</h3><button class="modal-x" onclick="closeModal()">×</button></div>
  <div class="modal-b"><form id="payform">
    <p style="font-size:13.5px">Outstanding due: <b class="dueX">${money(due)}</b></p>
    <label>Amount Received (Tk) *</label><input name="amount" type="number" step="0.01" max="${due}" required placeholder="max ${due}">
    <label>Note</label><input name="note" placeholder="e.g. Cash / bKash">
    <br><button class="btn grn blk">Receive Payment</button>
  </form></div>`);
  $('#payform').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target;
    try { const d = await api('/customers/' + id + '/payment', { method: 'POST', body: { amount: f.amount.value, note: f.note.value } }); closeModal(); toast('Payment received ✅ New due: ' + money(d.customer.total_due)); router(); } catch (ex) { toast(ex.message, true); }
  });
}

function filterCustomers(q) { q = q.toLowerCase(); document.querySelectorAll("#ctable tr").forEach(function (tr, i) { if (i === 0) return; tr.style.display = tr.textContent.toLowerCase().includes(q) ? "" : "none"; }); }
