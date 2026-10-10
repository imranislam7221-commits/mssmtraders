/* ---------- customers ---------- */
VIEWS.customers = async function () {
  const isBn = window.LANG === 'bn';
  const { customers } = await api('/customers');
  const rows = customers.map(c => `<tr onclick="viewCustomer(${c.id})" style="cursor:pointer">
    <td><b>${esc(c.name)}</b></td>
    <td>${esc(c.phone || '—')}</td>
    <td class="num ${c.total_due > 0 ? 'dueX' : 'due0'}"><b>${money(c.total_due)}</b></td>
    <td style="white-space:nowrap">
      <button class="btn sm grn" onclick="event.stopPropagation();payModal(${c.id}, ${c.total_due})">${isBn ? '💵 বাকি জমা নিন' : '💵 Collect Due'}</button>
      <button class="btn sm" onclick="event.stopPropagation();editCustomer(${c.id})">✏️</button>
      ${isOwner() ? ` <button class="btn sm dan" onclick="event.stopPropagation();delCustomer(${c.id})">🗑️</button>` : ''}
    </td>
  </tr>`).join('') || `<tr><td colspan="4" class="empty">${isBn ? 'কোনো কাস্টমার পাওয়া যায়নি' : 'No customers yet'}</td></tr>`;

  layout(`
    <div class="page-head">
      <div>
        <h1>${isBn ? 'কাস্টমার ও বাকি খাতা' : 'Customers (Baki Ledger)'}</h1>
        <div class="sub">${isBn ? 'প্রতিটি কাস্টমারের পৃথক বাকি ও লেনদেনের হিসাব খাতা' : 'Isolated credit account for every customer'}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <input id="csearch2" placeholder="${isBn ? '🔍 কাস্টমার খুঁজুন…' : '🔍 Search customer…'}" style="width:220px" oninput="filterCustomers(this.value)">
        <button class="btn pri" onclick="editCustomer(null)">${isBn ? '+ নতুন কাস্টমার' : '+ Add Customer'}</button>
      </div>
    </div>
    <div class="card">
      <div class="tblwrap">
        <table class="tbl" id="ctable">
          <tr>
            <th>${isBn ? 'নাম' : 'Name'}</th>
            <th>${isBn ? 'মোবাইল নম্বর' : 'Phone'}</th>
            <th class="num">${isBn ? 'মোট বাকি (টাকা)' : 'Total Due (Baki)'}</th>
            <th>${isBn ? 'অ্যাকশন' : 'Actions'}</th>
          </tr>
          ${rows}
        </table>
      </div>
    </div>`);
};

function customerModal(c) {
  const isBn = window.LANG === 'bn';
  c = c || {};
  modal(`
    <div class="modal-h">
      <h3>${c.id ? (isBn ? 'কাস্টমার তথ্য সংশোধন' : 'Edit Customer') : (isBn ? 'নতুন কাস্টমার যোগ' : 'Add Customer')}</h3>
      <button class="modal-x" onclick="closeModal()">×</button>
    </div>
    <div class="modal-b">
      <form id="cform">
        <label>${isBn ? 'কাস্টমারের নাম *' : 'Name *'}</label>
        <input name="name" required value="${esc(c.name || '')}">
        <label>${isBn ? 'মোবাইল নম্বর' : 'Phone'}</label>
        <input name="phone" value="${esc(c.phone || '')}" placeholder="০১XXXXXXXXX">
        <label>${isBn ? 'ঠিকানা' : 'Address'}</label>
        <input name="address" value="${esc(c.address || '')}" placeholder="${isBn ? 'যেমন: পুরাতন বাজার, দর্শনা' : 'e.g. Mirpur-1, Dhaka'}">
        <br>
        <button class="btn pri blk">${isBn ? 'সংরক্ষণ করুন' : 'Save'}</button>
      </form>
    </div>`);

  $('#cform').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const body = { name: f.name.value, phone: f.phone.value, address: f.address.value };
    try {
      if (c.id) await api('/customers/' + c.id, { method: 'PUT', body });
      else await api('/customers', { method: 'POST', body });
      closeModal();
      toast(isBn ? 'কাস্টমার তথ্য সংরক্ষিত হয়েছে ✅' : 'Customer saved ✅');
      router();
    } catch (ex) {
      toast(ex.message, true);
    }
  });
}

function editCustomer(id) {
  if (id == null) return customerModal(null);
  api('/customers').then(d => customerModal(d.customers.find(c => c.id === id)));
}

async function delCustomer(id) {
  const isBn = window.LANG === 'bn';
  askConfirm(isBn ? 'এই কাস্টমারকে মুছে ফেলতে চান?' : 'Delete customer?', async function () {
    try {
      await api('/customers/' + id, { method: 'DELETE' });
      toast(isBn ? 'কাস্টমার মুছে ফেলা হয়েছে' : 'Customer deleted');
      router();
    } catch (e) {
      toast(e.message, true);
    }
  });
}

async function viewCustomer(id) {
  const isBn = window.LANG === 'bn';
  const { customer: c, ledger } = await api('/customers/' + id + '/ledger');
  const rows = ledger.map(l => `<tr>
    <td>${fmtDT(l.timestamp)}</td>
    <td><span class="badge ${l.transaction_type === 'CREDIT' ? 'in' : 'out'}">${l.transaction_type === 'CREDIT' ? (isBn ? 'জমা' : 'CREDIT') : (isBn ? 'বিল' : 'DEBIT')}</span></td>
    <td class="num">${l.transaction_type === 'CREDIT' ? '−' : '+'}${money(l.amount)}</td>
    <td class="num"><b>${money(l.balance)}</b></td>
    <td>${esc(l.note || '')} <small style="color:var(--mut)">(${esc(l.source || '')} — ${esc(l.user_name || '')})</small></td>
  </tr>`).join('') || `<tr><td colspan="5" class="empty">${isBn ? 'কোনো লেনদেন পাওয়া যায়নি' : 'No transactions'}</td></tr>`;

  modal(`
    <div class="modal-h">
      <h3>👤 ${esc(c.name)} — ${isBn ? 'লেজার খাতা' : 'Ledger'}</h3>
      <button class="modal-x" onclick="closeModal()">×</button>
    </div>
    <div class="modal-b">
      <div class="grid g3">
        <div class="stat">
          <div class="lab">${isBn ? 'মোবাইল ও ঠিকানা' : 'Phone'}</div>
          <div class="val" style="font-size:15px">${esc(c.phone || '—')}${c.address ? '<br><small style="font-weight:400;color:var(--mut)">' + esc(c.address) + '</small>' : ''}</div>
        </div>
        <div class="stat ${c.total_due > 0 ? 'due' : ''}">
          <div class="lab">${isBn ? 'বর্তমান মোট বাকি' : 'Outstanding Due'}</div>
          <div class="val">${money(c.total_due)}</div>
        </div>
        <div class="stat">
          <div class="lab">${isBn ? 'মোট লেনদেন' : 'Entries'}</div>
          <div class="val">${isBn ? bnDigits(ledger.length) : ledger.length}</div>
        </div>
      </div>
      <div class="toolbar" style="margin-top:12px">
        <input type="date" id="cfrom">
        <input type="date" id="cto">
        <button class="btn sm" onclick="filterCustLedger(${c.id})">${isBn ? 'ফিল্টার' : 'Filter'}</button>
      </div>
      <div id="custledger">
        <div class="tblwrap">
          <table class="tbl">
            <tr>
              <th>${isBn ? 'তারিখ ও সময়' : 'Date & Time'}</th>
              <th>${isBn ? 'ধরন' : 'Type'}</th>
              <th class="num">${isBn ? 'পরিমাণ' : 'Amount'}</th>
              <th class="num">${isBn ? 'ব্যালেন্স' : 'Balance'}</th>
              <th>${isBn ? 'মন্তব্য' : 'Note'}</th>
            </tr>
            ${rows}
          </table>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
        <button class="btn grn" onclick="payModal(${c.id}, ${c.total_due})">💵 ${isBn ? 'বাকি জমা গ্রহণ করুন' : 'Collect Due Payment'}</button>
        <button class="btn pri" onclick="printStatement(${c.id})">🖨️ ${isBn ? 'লেজার প্রিন্ট প্রিভিউ' : 'Print Statement'}</button>
      </div>
    </div>`, true);
}

async function filterCustLedger(id) {
  const isBn = window.LANG === 'bn';
  const from = $('#cfrom').value, to = $('#cto').value;
  const { ledger } = await api('/customers/' + id + '/ledger' + (from || to ? '?' + new URLSearchParams({ from, to }) : ''));
  const rows = ledger.map(l => `<tr>
    <td>${fmtDT(l.timestamp)}</td>
    <td><span class="badge ${l.transaction_type === 'CREDIT' ? 'in' : 'out'}">${l.transaction_type === 'CREDIT' ? (isBn ? 'জমা' : 'CREDIT') : (isBn ? 'বিল' : 'DEBIT')}</span></td>
    <td class="num">${l.transaction_type === 'CREDIT' ? '−' : '+'}${money(l.amount)}</td>
    <td class="num"><b>${money(l.balance)}</b></td>
    <td>${esc(l.note || '')}</td>
  </tr>`).join('') || `<tr><td colspan="5" class="empty">${isBn ? 'এই তারিখে কোনো লেনদেন নেই' : 'No transactions in range'}</td></tr>`;

  $('#custledger table.tbl').innerHTML = `
    <tr>
      <th>${isBn ? 'তারিখ ও সময়' : 'Date & Time'}</th>
      <th>${isBn ? 'ধরন' : 'Type'}</th>
      <th class="num">${isBn ? 'পরিমাণ' : 'Amount'}</th>
      <th class="num">${isBn ? 'ব্যালেন্স' : 'Balance'}</th>
      <th>${isBn ? 'মন্তব্য' : 'Note'}</th>
    </tr>` + rows;
}

function payModal(id, due) {
  const isBn = window.LANG === 'bn';
  modal(`
    <div class="modal-h">
      <h3>💵 ${isBn ? 'বাকি টাকা জমা গ্রহণ' : 'Payment Collection'}</h3>
      <button class="modal-x" onclick="closeModal()">×</button>
    </div>
    <div class="modal-b">
      <form id="payform">
        <p style="font-size:13.5px">${isBn ? 'বর্তমান বকেয়া (Due):' : 'Current Due:'} <b class="${due > 0 ? 'dueX' : 'due0'}">${money(due)}</b></p>
        <label>${isBn ? 'জমা প্রাপ্ত টাকা (Tk) *' : 'Paid Amount (Tk) *'}</label>
        <input name="amount" type="number" step="0.01" required placeholder="${isBn ? 'টাকার পরিমাণ লিখুন' : 'Enter amount'}">
        <label>${isBn ? 'নোট বা মাধ্যম' : 'Note'}</label>
        <input name="note" placeholder="${isBn ? 'যেমন: নগদ / বিকাশ / ব্যাংক' : 'e.g. Cash / bKash'}">
        <br>
        <button class="btn grn blk">${isBn ? 'টাকা জমা নিন 💵' : 'Collect Payment 💵'}</button>
      </form>
    </div>`);

  $('#payform').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    try {
      const d = await api('/customers/' + id + '/payment', { method: 'POST', body: { amount: f.amount.value, note: f.note.value } });
      closeModal();
      toast(isBn ? 'টাকা জমা হয়েছে ✅ বর্তমান বাকি: ' + money(d.customer.total_due) : 'Payment recorded ✅ Due: ' + money(d.customer.total_due));
      router();
    } catch (ex) {
      toast(ex.message, true);
    }
  });
}

function filterCustomers(q) {
  q = q.toLowerCase();
  document.querySelectorAll("#ctable tr").forEach(function (tr, i) {
    if (i === 0) return;
    tr.style.display = tr.textContent.toLowerCase().includes(q) ? "" : "none";
  });
}
