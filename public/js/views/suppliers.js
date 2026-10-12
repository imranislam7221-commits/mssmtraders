/* M/S M.S. Traders POS — Suppliers & Vendor Ledger (মহাজন / ডিলার খাতা) */
VIEWS.suppliers = async function () {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const { suppliers } = await api('/suppliers');
  window.__suppliers = suppliers || [];

  const totalPayable = round2((suppliers || []).reduce((s, sup) => s + (sup.total_payable || 0), 0));

  function renderList(list) {
    if (!list.length) {
      return `<tr><td colspan="6" class="empty">${isBn ? 'কোনো মহাজন বা ডিলার তথ্য পাওয়া যায়নি' : 'No suppliers found'}</td></tr>`;
    }
    return list.map(s => {
      const payable = round2(s.total_payable || 0);
      const isDue = payable > 0;
      return `<tr>
        <td><b>${esc(s.name)}</b>${s.company ? `<br><small style="color:var(--brand2);font-weight:600">${esc(s.company)}</small>` : ''}</td>
        <td>${s.phone ? `<a href="tel:${esc(s.phone)}" style="color:inherit">📞 ${esc(s.phone)}</a>` : '—'}</td>
        <td>${esc(s.address || '—')}</td>
        <td class="num"><b class="${isDue ? 'dueX' : 'due0'}" style="font-size:14px">${money(payable)}</b></td>
        <td style="white-space:nowrap">
          <button class="btn sm" onclick="openSupplierLedger(${s.id})">📋 ${isBn ? 'খাতা' : 'Ledger'}</button>
          <button class="btn sm grn" onclick="openSupplierPayment(${s.id})">💳 ${isBn ? 'পরিশোধ' : 'Pay'}</button>
          <button class="btn sm" onclick="openSupplierEdit(${s.id})">✏️</button>
          ${isOwner() ? `<button class="btn sm red" onclick="deleteSupplier(${s.id})">🗑️</button>` : ''}
        </td>
      </tr>`;
    }).join('');
  }

  layout(`
    <div class="page-head">
      <div>
        <h1>🏭 ${isBn ? 'মহাজন ও ডিলার খাতা (সাপ্লায়ার হিসাব)' : 'Suppliers & Mill Ledger'}</h1>
        <div class="sub">${isBn ? 'রড ও সিমেন্ট ডিলারদের থেকে বাকিতে ক্রয়ের দেনা এবং কিস্তিতে পরিশোধের হিসাব' : 'Track credit purchases from mills & dealers and payment vouchers'}</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn pri" onclick="openAddSupplierModal()">+ ${isBn ? 'নতুন মহাজন যোগ' : 'Add Supplier'}</button>
      </div>
    </div>

    <div class="grid g2" style="margin-bottom:15px">
      <div class="card" style="display:flex;align-items:center;gap:15px;padding:16px">
        <div style="font-size:32px;background:var(--card,#292524);border-radius:12px;padding:10px 14px">🏭</div>
        <div>
          <div class="lab" style="font-size:12px">${isBn ? 'মোট রেজিস্টার্ড মহাজন / ডিলার' : 'Total Suppliers / Mills'}</div>
          <div class="val" style="font-size:24px;font-weight:700">${isBn ? bnDigits(suppliers.length) : suppliers.length} ${isBn ? 'টি' : ''}</div>
        </div>
      </div>
      <div class="card" style="display:flex;align-items:center;gap:15px;padding:16px;border-left:4px solid var(--red,#ef4444)">
        <div style="font-size:32px;background:#fef2f2;border-radius:12px;padding:10px 14px">💸</div>
        <div>
          <div class="lab" style="font-size:12px;color:var(--red,#ef4444)">${isBn ? 'মহাজনদের কাছে দোকানের মোট দেনা (Payable)' : 'Total Payable Debt to Mills'}</div>
          <div class="val" style="font-size:24px;font-weight:700;color:var(--red,#ef4444)">${money(totalPayable)}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:10px">
        <input id="suppq" placeholder="${isBn ? '🔍 মহাজন / কোম্পানি / মোবাইল দিয়ে খুঁজুন…' : 'Search supplier name, company, phone…'}" oninput="searchSuppliers(this.value)" style="max-width:340px">
        <span style="font-size:12.5px;color:var(--mut)">${isBn ? 'মোট তালিকা:' : 'Total:'} <b>${suppliers.length}</b></span>
      </div>
      <div class="tblwrap">
        <table class="tbl" id="supptbl">
          <tr>
            <th>${isBn ? 'মহাজন / ডিলারের নাম' : 'Supplier Name'}</th>
            <th>${isBn ? 'মোবাইল নম্বর' : 'Phone'}</th>
            <th>${isBn ? 'ঠিকানা' : 'Address'}</th>
            <th class="num">${isBn ? 'বর্তমান দেনা (দোকানের বকেয়া)' : 'Payable Due'}</th>
            <th>${isBn ? 'অ্যাকশন' : 'Actions'}</th>
          </tr>
          ${renderList(suppliers)}
        </table>
      </div>
    </div>
  `);
};

function searchSuppliers(q) {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  q = q.toLowerCase();
  const list = (window.__suppliers || []).filter(s => (s.name + ' ' + (s.company || '') + ' ' + (s.phone || '') + ' ' + (s.address || '')).toLowerCase().includes(q));
  const tbl = $('#supptbl');
  if (!tbl) return;
  tbl.innerHTML = `<tr>
    <th>${isBn ? 'মহাজন / ডিলারের নাম' : 'Supplier Name'}</th>
    <th>${isBn ? 'মোবাইল নম্বর' : 'Phone'}</th>
    <th>${isBn ? 'ঠিকানা' : 'Address'}</th>
    <th class="num">${isBn ? 'বর্তমান দেনা (দোকানের বকেয়া)' : 'Payable Due'}</th>
    <th>${isBn ? 'অ্যাকশন' : 'Actions'}</th>
  </tr>` + (list.map(s => {
    const payable = round2(s.total_payable || 0);
    const isDue = payable > 0;
    return `<tr>
      <td><b>${esc(s.name)}</b>${s.company ? `<br><small style="color:var(--brand2);font-weight:600">${esc(s.company)}</small>` : ''}</td>
      <td>${s.phone ? `<a href="tel:${esc(s.phone)}" style="color:inherit">📞 ${esc(s.phone)}</a>` : '—'}</td>
      <td>${esc(s.address || '—')}</td>
      <td class="num"><b class="${isDue ? 'dueX' : 'due0'}" style="font-size:14px">${money(payable)}</b></td>
      <td style="white-space:nowrap">
        <button class="btn sm" onclick="openSupplierLedger(${s.id})">📋 ${isBn ? 'খাতা' : 'Ledger'}</button>
        <button class="btn sm grn" onclick="openSupplierPayment(${s.id})">💳 ${isBn ? 'পরিশোধ' : 'Pay'}</button>
        <button class="btn sm" onclick="openSupplierEdit(${s.id})">✏️</button>
        ${isOwner() ? `<button class="btn sm red" onclick="deleteSupplier(${s.id})">🗑️</button>` : ''}
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="5" class="empty">${isBn ? 'কোনো মহাজন পাওয়া যায়নি' : 'No suppliers found'}</td></tr>`);
}

function openAddSupplierModal() {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  modal(`
    <div class="modal-h">
      <h3>🏭 ${isBn ? 'নতুন মহাজন / ডিলার যুক্ত করুন' : 'Add New Supplier'}</h3>
      <button class="modal-x" onclick="closeModal()">×</button>
    </div>
    <div class="modal-b">
      <form id="suppform">
        <label>${isBn ? 'মহাজন / ডিলারের নাম *' : 'Supplier / Contact Name *'}</label>
        <input name="name" required placeholder="${isBn ? 'যেমন: মেসার্স চুয়াডাঙ্গা স্টিল সিন্ডিকেট / মমিনুল হক' : 'e.g. BSRM Authorized Dealer'}">
        <div class="grid g2">
          <div>
            <label>${isBn ? 'কোম্পানি / মিল' : 'Company / Mill'}</label>
            <input name="company" placeholder="${isBn ? 'যেমন: বিএসআরএম / শাহ সিমেন্ট / একেএস' : 'e.g. BSRM / Shah Cement'}">
          </div>
          <div>
            <label>${isBn ? 'মোবাইল নম্বর' : 'Phone Number'}</label>
            <input name="phone" placeholder="${isBn ? 'যেমন: 01711-XXXXXX' : 'Phone'}">
          </div>
        </div>
        <label>${isBn ? 'ঠিকানা / ডিপো অবস্থান' : 'Address / Depot Location'}</label>
        <input name="address" placeholder="${isBn ? 'যেমন: দর্শনা বাজার / চুয়াডাঙ্গা সদর' : 'Address'}">
        <label>${isBn ? 'প্রারম্ভিক দেনা / পূর্বের বকেয়া (টাকা)' : 'Opening Debt / Previous Balance (Tk)'}</label>
        <input name="opening_payable" type="number" step="0.01" value="0" placeholder="0">
        <div class="modal-f">
          <button type="button" class="btn" onclick="closeModal()">${isBn ? 'বাতিল' : 'Cancel'}</button>
          <button type="submit" class="btn pri">💾 ${isBn ? 'সংরক্ষণ করুন' : 'Save Supplier'}</button>
        </div>
      </form>
    </div>
  `);

  $('#suppform').onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    try {
      await api('/suppliers', {
        method: 'POST',
        body: {
          name: f.name.value,
          company: f.company.value,
          phone: f.phone.value,
          address: f.address.value,
          opening_payable: f.opening_payable.value
        }
      });
      closeModal();
      toast(isBn ? '✅ মহাজন তথ্য সফলভাবে সংরক্ষিত হয়েছে!' : '✅ Supplier created successfully');
      router();
    } catch (err) {
      toast(err.message, true);
    }
  };
}

function openSupplierEdit(id) {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const s = (window.__suppliers || []).find(x => x.id === id);
  if (!s) return;

  modal(`
    <div class="modal-h">
      <h3>✏️ ${isBn ? 'মহাজন তথ্য সম্পাদনা' : 'Edit Supplier'}</h3>
      <button class="modal-x" onclick="closeModal()">×</button>
    </div>
    <div class="modal-b">
      <form id="suppeditform">
        <label>${isBn ? 'মহাজন / ডিলারের নাম *' : 'Supplier Name *'}</label>
        <input name="name" value="${esc(s.name)}" required>
        <div class="grid g2">
          <div>
            <label>${isBn ? 'কোম্পানি / মিল' : 'Company'}</label>
            <input name="company" value="${esc(s.company || '')}">
          </div>
          <div>
            <label>${isBn ? 'মোবাইল নম্বর' : 'Phone'}</label>
            <input name="phone" value="${esc(s.phone || '')}">
          </div>
        </div>
        <label>${isBn ? 'ঠিকানা' : 'Address'}</label>
        <input name="address" value="${esc(s.address || '')}">
        <div class="modal-f">
          <button type="button" class="btn" onclick="closeModal()">${isBn ? 'বাতিল' : 'Cancel'}</button>
          <button type="submit" class="btn pri">💾 ${isBn ? 'আপডেট করুন' : 'Update Supplier'}</button>
        </div>
      </form>
    </div>
  `);

  $('#suppeditform').onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    try {
      await api('/suppliers/' + id, {
        method: 'PUT',
        body: {
          name: f.name.value,
          company: f.company.value,
          phone: f.phone.value,
          address: f.address.value
        }
      });
      closeModal();
      toast(isBn ? '✅ মহাজন তথ্য আপডেট হয়েছে' : '✅ Supplier updated');
      router();
    } catch (err) {
      toast(err.message, true);
    }
  };
}

async function deleteSupplier(id) {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  if (!confirm(isBn ? 'আপনি কি নিশ্চিতভাবে এই মহাজন রেকর্ড ডিলিট করতে চান?' : 'Are you sure you want to delete this supplier?')) return;
  try {
    await api('/suppliers/' + id, { method: 'DELETE' });
    toast(isBn ? '✅ মহাজন রেকর্ড ডিলিট করা হয়েছে' : '✅ Supplier deleted');
    router();
  } catch (err) {
    toast(err.message, true);
  }
}

function openSupplierPayment(id) {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const s = (window.__suppliers || []).find(x => x.id === id);
  if (!s) return;

  const currentPayable = round2(s.total_payable || 0);

  modal(`
    <div class="modal-h">
      <h3>💳 ${isBn ? 'মহাজনকে টাকা পরিশোধ (Payment Voucher)' : 'Pay Supplier'}</h3>
      <button class="modal-x" onclick="closeModal()">×</button>
    </div>
    <div class="modal-b">
      <div style="background:var(--card,#292524);padding:12px;border-radius:10px;margin-bottom:14px">
        <div><b>${esc(s.name)}</b> ${s.company ? `(${esc(s.company)})` : ''}</div>
        <div style="margin-top:5px;font-size:13px;color:var(--mut)">
          ${isBn ? 'বর্তমান বকেয়া দেনা:' : 'Current Payable:'} <b style="color:var(--red,#ef4444);font-size:16px">${money(currentPayable)}</b>
        </div>
      </div>
      <form id="supppayform">
        <label>${isBn ? 'পরিশোধের পরিমাণ (টাকা) *' : 'Payment Amount (Tk) *'}</label>
        <input name="amount" type="number" step="0.01" min="1" required placeholder="${isBn ? 'যেমন: ৫০০০০' : 'Amount'}" autofocus>
        <label>${isBn ? 'পরিশোধের বিবরণ / চেক / ভাউচার নম্বর' : 'Payment Note / Cheque No / Voucher'}</label>
        <input name="note" placeholder="${isBn ? 'যেমন: চেক নং ১২৩৪ / ব্যাংক ট্রান্সফার / নগদ ক্যাশ' : 'e.g. Cash / Cheque #1234'}">
        <div style="margin-top:8px;font-size:12px;color:var(--mut)">
          💡 ${isBn ? 'টাকা পরিশোধ করলে দোকানের ক্যাশ বুক থেকে নগদ টাকা স্বয়ংক্রিয়ভাবে খরচ (Cash OUT) হবে।' : 'Payment will automatically be recorded as Cash OUT in Cash Ledger.'}
        </div>
        <div class="modal-f">
          <button type="button" class="btn" onclick="closeModal()">${isBn ? 'বাতিল' : 'Cancel'}</button>
          <button type="submit" class="btn grn">✅ ${isBn ? 'পরিশোধ নিশ্চিত করুন' : 'Confirm Payment'}</button>
        </div>
      </form>
    </div>
  `);

  $('#supppayform').onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    try {
      await api('/suppliers/' + id + '/payment', {
        method: 'POST',
        body: {
          amount: f.amount.value,
          note: f.note.value
        }
      });
      closeModal();
      toast(isBn ? '✅ মহাজনকে টাকা পরিশোধ সফল হয়েছে এবং ক্যাশ বুকে যুক্ত হয়েছে!' : '✅ Payment recorded and cash book updated');
      router();
    } catch (err) {
      toast(err.message, true);
    }
  };
}

async function openSupplierLedger(id) {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const { supplier: s, ledger } = await api('/suppliers/' + id + '/ledger');

  function renderLedgerRows(rows) {
    if (!rows.length) {
      return `<tr><td colspan="6" class="empty">${isBn ? 'কোনো লেনদেন পাওয়া যায়নি' : 'No transactions recorded'}</td></tr>`;
    }
    return rows.map(l => {
      const isPurchase = l.transaction_type === 'PURCHASE' || l.transaction_type === 'OPENING';
      const isPay = l.transaction_type === 'PAYMENT';
      const typeBadge = isPurchase ? `<span class="badge in">${isBn ? 'মাল ক্রয় (+)' : 'Purchase (+)'}</span>` : (isPay ? `<span class="badge out">${isBn ? 'পরিশোধ (−)' : 'Payment (−)'}</span>` : `<span class="badge open">${isBn ? 'নগদ ক্রয়' : 'Cash Buy'}</span>`);

      return `<tr>
        <td>${fmtDT(l.timestamp)}</td>
        <td>${typeBadge}</td>
        <td>${esc(l.source || '')}</td>
        <td>${esc(l.note || '')}</td>
        <td class="num">${money(l.amount)}</td>
        <td class="num"><b>${money(l.balance)}</b></td>
      </tr>`;
    }).join('');
  }

  modal(`
    <div class="modal-h">
      <div>
        <h3>📋 ${isBn ? 'মহাজন খাতা বিবরণী — ' + esc(s.name) : 'Supplier Ledger Statement — ' + esc(s.name)}</h3>
        <div style="font-size:12px;color:var(--mut)">${s.company ? esc(s.company) + ' • ' : ''}${s.phone ? '📞 ' + esc(s.phone) : ''}</div>
      </div>
      <button class="modal-x" onclick="closeModal()">×</button>
    </div>
    <div class="modal-b" style="max-height:80vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;background:var(--card,#292524);padding:12px;border-radius:10px;margin-bottom:12px">
        <div>
          <span style="font-size:12px;color:var(--mut)">${isBn ? 'বর্তমান মোট দেনা:' : 'Outstanding Payable:'}</span>
          <b style="color:var(--red,#ef4444);font-size:18px;margin-left:8px">${money(s.total_payable || 0)}</b>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn sm grn" onclick="closeModal();openSupplierPayment(${s.id})">💳 ${isBn ? 'টাকা পরিশোধ' : 'Make Payment'}</button>
          <button class="btn sm" onclick="window.print()">🖨️ ${isBn ? 'প্রিন্ট' : 'Print'}</button>
        </div>
      </div>

      <div class="tblwrap">
        <table class="tbl">
          <tr>
            <th>${isBn ? 'তারিখ ও সময়' : 'Date & Time'}</th>
            <th>${isBn ? 'ধরন' : 'Type'}</th>
            <th>${isBn ? 'উৎস / ভাউচার' : 'Source'}</th>
            <th>${isBn ? 'বিবরণ' : 'Description'}</th>
            <th class="num">${isBn ? 'পরিমাণ (৳)' : 'Amount'}</th>
            <th class="num">${isBn ? 'চলতি দেনা (৳)' : 'Balance'}</th>
          </tr>
          ${renderLedgerRows(ledger)}
        </table>
      </div>
    </div>
  `);
}
