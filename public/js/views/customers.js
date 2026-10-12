/* ---------- customers ---------- */
VIEWS.customers = async function () {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const { customers } = await api('/customers');
  const rows = customers.map((c, i) => `<tr onclick="viewCustomer(${c.id})" style="cursor:pointer">
    <td class="c-sl" style="text-align:center;font-weight:600;color:var(--mut);width:50px">${isBn ? bnDigits(i + 1) : (i + 1)}</td>
    <td><b>${esc(c.name)}</b></td>
    <td>${c.phone ? `<a href="tel:${toAsciiDigits(c.phone)}" onclick="event.stopPropagation()" class="phone-link" title="${isBn ? 'সরাসরি কল দিন' : 'Call'}">📞 ${esc(c.phone)}</a>` : '—'}</td>
    <td>${esc(c.address || '—')}</td>
    <td class="num ${c.total_due > 0 ? 'dueX' : 'due0'}"><b>${money(c.total_due)}</b></td>
    <td style="white-space:nowrap">
      <button class="btn sm grn" onclick="event.stopPropagation();payModal(${c.id}, ${c.total_due})">${isBn ? '💵 বাকি জমা নিন' : '💵 Collect Due'}</button>
      <button class="btn sm" onclick="event.stopPropagation();editCustomer(${c.id})">✏️</button>
      ${isOwner() ? ` <button class="btn sm ${c.total_due > 0 ? 'mut' : 'dan'}" onclick="event.stopPropagation();delCustomer(${c.id}, ${c.total_due})" title="${c.total_due > 0 ? (isBn ? 'বাকি টাকা পরিশোধ ছাড়া ডিলিট বন্ধ 🔒' : 'Locked — clear due first') : (isBn ? 'মুছুন' : 'Delete')}">${c.total_due > 0 ? '🔒' : '🗑️'}</button>` : ''}
    </td>
  </tr>`).join('') || `<tr><td colspan="6" class="empty">${isBn ? 'কোনো কাস্টমার পাওয়া যায়নি' : 'No customers yet'}</td></tr>`;

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
            <th style="width:50px;text-align:center">${isBn ? 'ক্র. নং' : 'SL'}</th>
            <th>${isBn ? 'নাম' : 'Name'}</th>
            <th>${isBn ? 'মোবাইল নম্বর' : 'Phone'}</th>
            <th>${isBn ? 'ঠিকানা' : 'Address'}</th>
            <th class="num">${isBn ? 'মোট বাকি (টাকা)' : 'Total Due (Baki)'}</th>
            <th>${isBn ? 'অ্যাকশন' : 'Actions'}</th>
          </tr>
          ${rows}
        </table>
      </div>
    </div>`);
};

function customerModal(c) {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
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
        ${c.id ? `
        <label>${isBn ? 'বর্তমান মোট বাকি' : 'Current Due'}</label>
        <div style="padding:9px 12px;background:var(--brandbg,#fffbeb);border:1px solid rgba(217,119,6,0.3);border-radius:6px;font-weight:700;color:var(--brand);margin-bottom:6px">${money(c.total_due || 0)}</div>
        <small style="color:var(--mut);display:block;margin-top:2px;font-size:12px">${isBn ? '💡 বাকি জমা নিতে কাস্টমার তালিকা থেকে \"💵 বাকি জমা নিন\" বাটন ব্যবহার করুন।' : '💡 To collect dues, use the Collect Due button from customer list.'}</small>
        ` : `
        <label>${isBn ? 'পূর্বের বাকি / বকেয়া (৳)' : 'Previous Due / Opening Due (Tk)'}</label>
        <input name="opening_due" type="number" step="0.01" min="0" value="" placeholder="${isBn ? '০.০০ (যদি পূর্বের বাকি থাকে)' : '0.00'}">
        <small style="color:var(--mut);display:block;margin-top:2px;font-size:12px">${isBn ? '💡 কাস্টমারের পূর্বের কোনো বাকি বা বকেয়া থাকলে এখানে টাকার পরিমাণ লিখুন।' : '💡 Enter existing outstanding due amount if any.'}</small>
        `}
        <br>
        <button class="btn pri blk">${isBn ? 'সংরক্ষণ করুন' : 'Save'}</button>
      </form>
    </div>`);

  $('#cform').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const body = { 
      name: f.name.value, 
      phone: f.phone.value, 
      address: f.address.value 
    };
    if (!c.id && f.opening_due) {
      body.opening_due = f.opening_due.value;
    }
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

async function delCustomer(id, due) {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  if (due > 0) {
    toast(isBn ? '⚠️ এই কাস্টমারের বকেয়া বাকি রয়েছে! সম্পূর্ণ বাকি পরিশোধ ছাড়া কাস্টমার ডিলিট করা যাবে না।' : 'Cannot delete! Customer has pending due amount.', true);
    return;
  }
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
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const { customer: c, ledger } = await api('/customers/' + id + '/ledger');
  const rows = ledger.map(l => `<tr>
    <td>${fmtDT(l.timestamp)}</td>
    <td><span class="badge ${l.transaction_type === 'CREDIT' ? 'in' : 'out'}">${l.transaction_type === 'CREDIT' ? (isBn ? 'জমা' : 'CREDIT') : (isBn ? 'বিল' : 'DEBIT')}</span></td>
    <td class="num">${l.transaction_type === 'CREDIT' ? '−' : '+'}${money(l.amount)}</td>
    <td class="num"><b>${money(l.balance)}</b></td>
    <td>
      ${esc(l.note || '')} <small style="color:var(--mut)">(${esc(l.source || '')} — ${esc(l.user_name || '')})</small>
      ${l.transaction_type === 'CREDIT' ? `<button class="btn sm" style="padding:2px 8px;margin-left:6px;font-size:11px" onclick="printSinglePayment(${c.id}, ${l.id})">🖨️ রসিদ</button>` : ''}
    </td>
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
          <div class="val" style="font-size:15px">
            ${c.phone ? `<a href="tel:${toAsciiDigits(c.phone)}" class="phone-link" style="margin-bottom:4px">📞 ${esc(c.phone)}</a>` : '—'}
            ${c.address ? '<br><small style="font-weight:400;color:var(--mut)">' + esc(c.address) + '</small>' : ''}
          </div>
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
      <div class="pill-group" style="margin-top:14px;margin-bottom:8px">
        <button type="button" class="cat-pill active" id="dp-all" onclick="setCustDateRange(${c.id}, 'all')">${isBn ? 'সব লেনদেন' : 'All'}</button>
        <button type="button" class="cat-pill" id="dp-today" onclick="setCustDateRange(${c.id}, 'today')">${isBn ? 'আজকের' : 'Today'}</button>
        <button type="button" class="cat-pill" id="dp-week" onclick="setCustDateRange(${c.id}, 'week')">${isBn ? 'চলতি সপ্তাহ' : 'This Week'}</button>
        <button type="button" class="cat-pill" id="dp-month" onclick="setCustDateRange(${c.id}, 'month')">${isBn ? 'চলতি মাস' : 'This Month'}</button>
        <button type="button" class="cat-pill" id="dp-prev" onclick="setCustDateRange(${c.id}, 'prev_month')">${isBn ? 'গত মাস' : 'Last Month'}</button>
      </div>
      <div class="toolbar" style="margin-top:6px;margin-bottom:8px">
        <input type="date" id="cfrom" onchange="highlightCustomDate()">
        <input type="date" id="cto" onchange="highlightCustomDate()">
        <button class="btn sm" onclick="filterCustLedger(${c.id})">${isBn ? '🔍 ফিল্টার করুন' : 'Filter'}</button>
      </div>
      <div id="cperiod-summary" class="period-summary" style="display:none"></div>
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
        <button class="btn pri" id="btn-print-stmt" onclick="printStatement(${c.id}, ($('#cfrom')||{}).value, ($('#cto')||{}).value)">🖨️ ${isBn ? 'লেজার প্রিন্ট প্রিভিউ' : 'Print Statement'}</button>
      </div>
    </div>`, true);
}

function highlightCustomDate() {
  document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
}

function setCustDateRange(id, type) {
  const now = new Date();
  const f = $('#cfrom'), t = $('#cto');
  document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
  const activeBtn = $(`#dp-${type}`);
  if (activeBtn) activeBtn.classList.add('active');

  const fmt = d => d.toISOString().split('T')[0];
  if (type === 'all') {
    f.value = ''; t.value = '';
  } else if (type === 'today') {
    const todayStr = fmt(now);
    f.value = todayStr; t.value = todayStr;
  } else if (type === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    f.value = fmt(start); t.value = fmt(now);
  } else if (type === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    f.value = fmt(start); t.value = fmt(now);
  } else if (type === 'prev_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    f.value = fmt(start); t.value = fmt(end);
  }
  filterCustLedger(id);
}

async function filterCustLedger(id) {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const from = $('#cfrom').value, to = $('#cto').value;
  const { ledger, customer: c } = await api('/customers/' + id + '/ledger' + (from || to ? '?' + new URLSearchParams({ from, to }) : ''));
  const rows = ledger.map(l => `<tr>
    <td>${fmtDT(l.timestamp)}</td>
    <td><span class="badge ${l.transaction_type === 'CREDIT' ? 'in' : 'out'}">${l.transaction_type === 'CREDIT' ? (isBn ? 'জমা' : 'CREDIT') : (isBn ? 'বিল' : 'DEBIT')}</span></td>
    <td class="num">${l.transaction_type === 'CREDIT' ? '−' : '+'}${money(l.amount)}</td>
    <td class="num"><b>${money(l.balance)}</b></td>
    <td>
      ${esc(l.note || '')}
      ${l.transaction_type === 'CREDIT' ? `<button class="btn sm" style="padding:2px 8px;margin-left:6px;font-size:11px" onclick="printSinglePayment(${c.id}, ${l.id})">🖨️ রসিদ</button>` : ''}
    </td>
  </tr>`).join('') || `<tr><td colspan="5" class="empty">${isBn ? 'এই তারিখে কোনো লেনদেন নেই' : 'No transactions in range'}</td></tr>`;

  $('#custledger table.tbl').innerHTML = `
    <tr>
      <th>${isBn ? 'তারিখ ও সময়' : 'Date & Time'}</th>
      <th>${isBn ? 'ধরন' : 'Type'}</th>
      <th class="num">${isBn ? 'পরিমাণ' : 'Amount'}</th>
      <th class="num">${isBn ? 'ব্যালেন্স' : 'Balance'}</th>
      <th>${isBn ? 'মন্তব্য' : 'Note'}</th>
    </tr>` + rows;

  const sumBox = $('#cperiod-summary');
  if (sumBox) {
    if (from || to) {
      const billed = ledger.filter(l => l.transaction_type !== 'CREDIT').reduce((s, l) => s + l.amount, 0);
      const paid = ledger.filter(l => l.transaction_type === 'CREDIT').reduce((s, l) => s + l.amount, 0);
      const rngTxt = (from || 'শুরু') + ' থেকে ' + (to || 'আজ');
      sumBox.innerHTML = `
        <div>📅 <b>${isBn ? bnDigits(rngTxt) : rngTxt}</b> এর লেনদেন (${isBn ? bnDigits(ledger.length) : ledger.length} টি)</div>
        <div>
          <span style="color:var(--red);font-weight:700">${isBn ? 'মোট বিল: ' : 'Billed: '}${money(billed)}</span> | 
          <span style="color:var(--green);font-weight:700">${isBn ? 'মোট জমা: ' : 'Paid: '}${money(paid)}</span>
        </div>`;
      sumBox.style.display = 'flex';
    } else {
      sumBox.style.display = 'none';
    }
  }

  const pBtn = $('#btn-print-stmt');
  if (pBtn && c) {
    pBtn.onclick = () => printStatement(c.id, from, to);
  }
}

function payModal(id, due) {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  modal(`
    <div class="modal-h">
      <h3>💵 ${isBn ? 'বাকি টাকা জমা গ্রহণ' : 'Payment Collection'}</h3>
      <button class="modal-x" onclick="closeModal()">×</button>
    </div>
    <div class="modal-b">
      <form id="payform">
        <p style="font-size:13.5px">${isBn ? 'বর্তমান বকেয়া / বাকি:' : 'Current Due:'} <b class="${due > 0 ? 'dueX' : 'due0'}">${money(due)}</b></p>
        <label>${isBn ? 'জমা প্রাপ্ত টাকা (৳) *' : 'Paid Amount (Tk) *'}</label>
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
      if (d.payment && typeof printPaymentReceipt === 'function') {
        printPaymentReceipt(d.payment, d.customer);
      }
    } catch (ex) {
      toast(ex.message, true);
    }
  });
}

window.printSinglePayment = async function (cid, lid) {
  try {
    const { customer: c, ledger } = await api('/customers/' + cid + '/ledger');
    const entry = ledger.find(x => x.id === lid);
    if (!entry) return toast('লেনদেন পাওয়া যায়নি', true);
    if (typeof printPaymentReceipt === 'function') {
      printPaymentReceipt(entry, c);
    }
  } catch (e) {
    toast('রসিদ লোড হতে সমস্যা: ' + e.message, true);
  }
};

function filterCustomers(q) {
  q = q.toLowerCase();
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  let sl = 1;
  document.querySelectorAll("#ctable tr").forEach(function (tr, i) {
    if (i === 0) return;
    const match = tr.textContent.toLowerCase().includes(q);
    tr.style.display = match ? "" : "none";
    if (match) {
      const slCell = tr.querySelector('.c-sl');
      if (slCell) slCell.textContent = isBn ? bnDigits(sl++) : (sl++);
    }
  });
}
