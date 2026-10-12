/* ---------- invoices ---------- */
VIEWS.invoices = async function () {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
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
    <td style="white-space:nowrap">
      <button class="btn sm pri" onclick="viewInvoice(${i.id})">${isBn ? 'দেখুন' : 'View'}</button>
      <button class="btn sm grn" onclick="printInvoice(${i.id})" title="${isBn ? 'প্রিন্ট' : 'Print'}">🖨️</button>
      ${isOwner() ? `<button class="btn sm dan" onclick="delInvoice(${i.id}, ${i.due})" title="${isBn ? 'চালান মুছুন' : 'Delete'}">🗑️</button>` : ''}
    </td>
  </tr>`).join('') || `<tr><td colspan="9" class="empty">${isBn ? 'কোনো ইনভয়েস পাওয়া যায়নি' : 'No invoices found'}</td></tr>`;

  layout(`
    <div class="page-head">
      <div>
        <h1>${isBn ? 'বিক্রয় রসিদ ও মেমো তালিকা' : 'Invoices'}</h1>
        <div class="sub">${isBn ? 'সকল বিক্রয়ের বিস্তারিত তালিকা ও অডিট হিসাব' : 'All bills — immutable audit trail (who & when)'}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <input id="isearch2" placeholder="${isBn ? '🔍 ইনভয়েস খুঁজুন…' : '🔍 Search invoice…'}" style="width:220px" oninput="filterInvoices(this.value)">
        <a class="btn pri" href="#/pos">${isBn ? '🧾 নতুন বিক্রয় (POS)' : '🧾 New Sale'}</a>
      </div>
    </div>
    <div class="card">
      <div class="tblwrap">
        <table class="tbl" id="itable">
          <tr>
            <th>${isBn ? 'মেমো / রসিদ নং' : 'Invoice'}</th>
            <th>${isBn ? 'কাস্টমার' : 'Customer'}</th>
            <th class="num">${isBn ? 'মোট বিল' : 'Total'}</th>
            <th class="num">${isBn ? 'জমা' : 'Paid'}</th>
            <th class="num">${isBn ? 'বাকি' : 'Due'}</th>
            <th>${isBn ? 'এসএমএস স্ট্যাটাস' : 'SMS'}</th>
            <th>${isBn ? 'তারিখ ও সময়' : 'Date & Time'}</th>
            <th>${isBn ? 'বিক্রেতা' : 'By'}</th>
            <th>${isBn ? 'অ্যাকশন' : 'Actions'}</th>
          </tr>
          ${rows}
        </table>
      </div>
    </div>`);
};

async function viewInvoice(id) {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const { invoice: inv, customer } = await api('/invoices/' + id);
  const items = inv.items.map(i => {
    const rawName = i.name || '';
    const iName = isBn ? (I18N_BN[rawName] || t(rawName) || rawName) : rawName;
    const iUnit = isBn ? bnUnit(i.unit) : (i.unit || '');
    return `
    <tr>
      <td>${esc(iName)}</td>
      <td class="num">${isBn ? bnDigits(i.qty) : i.qty} ${esc(iUnit)}</td>
      <td class="num">${money(i.price)}</td>
      <td class="num">${money(i.amount)}</td>
    </tr>`;
  }).join('');

  modal(`
    <div class="modal-h">
      <h3>${esc(inv.invoice_no)} — ${esc(inv.customer_name)}</h3>
      <button class="modal-x" onclick="closeModal()">×</button>
    </div>
    <div class="modal-b">
      <div class="tblwrap">
        <table class="tbl">
          <tr>
            <th>${isBn ? 'মালের নাম' : 'Item'}</th>
            <th class="num">${isBn ? 'পরিমাণ' : 'Qty'}</th>
            <th class="num">${isBn ? 'দর' : 'Price'}</th>
            <th class="num">${isBn ? 'মোট টাকা' : 'Amount'}</th>
          </tr>
          ${items}
        </table>
      </div>
      <div style="margin-top:10px">
        <div class="sumrow"><span>${isBn ? 'সাবটোটাল' : 'Subtotal'}</span><span>${money(inv.subtotal)}</span></div>
        ${inv.discount > 0 ? `<div class="sumrow"><span>${isBn ? 'ছাড়' : 'Discount'}</span><span>− ${money(inv.discount)}</span></div>` : ''}
        ${inv.labor_cost > 0 ? `<div class="sumrow"><span>${isBn ? 'লেবার / লোড খরচ' : 'Labor / Loading'}</span><span>+ ${money(inv.labor_cost)}</span></div>` : ''}
        ${inv.vat > 0 ? `<div class="sumrow"><span>${isBn ? 'ভ্যাট' : 'VAT'} (${isBn ? bnDigits(inv.vat_percent) : inv.vat_percent}%)</span><span>+ ${money(inv.vat)}</span></div>` : ''}
        <div class="sumrow total"><span>${isBn ? 'সর্বমোট' : 'Total'}</span><span>${money(inv.total)}</span></div>
        <div class="sumrow"><span>${isBn ? 'জমা' : 'Paid'}</span><span>${money(inv.paid)}</span></div>
        <div class="sumrow duerow"><span>${isBn ? 'বকেয়া / বাকি' : 'Due'}</span><span>${money(inv.due)}</span></div>
      </div>
      <p style="margin-top:10px;font-size:12.5px;color:var(--mut)">
        🕒 ${esc(inv.time_display)} • 👤 ${esc(inv.user_name)} • 📱 SMS: ${esc(inv.sms_status || '—')}
        ${inv.note ? '<br>📝 ' + esc(inv.note) : ''}
      </p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
        <button class="btn grn" onclick="printInvoice(${inv.id})">🖨️ ${isBn ? 'মেমো প্রিন্ট প্রিভিউ' : 'Print Receipt'}</button>
        <button class="btn" onclick="resendSms(${inv.id})">📱 ${isBn ? 'এসএমএস পাঠান' : 'Resend SMS'}</button>
        ${isOwner() ? `<button class="btn dan" onclick="delInvoice(${inv.id}, ${inv.due})">🗑️ ${isBn ? 'চালান বাতিল / মুছুন' : 'Delete Invoice'}</button>` : ''}
      </div>
    </div>`, true);
}

async function resendSms(id) {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const d = await api('/invoices/' + id);
  const inv = d.invoice, customer = d.customer;
  if (!customer || !customer.phone) {
    toast(isBn ? 'এই কাস্টমারের কোনো মোবাইল নম্বর নেই' : 'No phone number on this customer', true);
    return;
  }
  let s = { settings: {} };
  try { s = await api('/settings'); } catch (e) {}
  const tpl = s.settings.sms_template || 'Dear {name}, Total Bill: {total} tk. Paid: {paid} tk. Due: {due} tk. Thank you, {shop}.';
  const pre = tpl.split('{name}').join(customer.name)
                 .split('{total}').join(String(inv.total))
                 .split('{paid}').join(String(inv.paid))
                 .split('{due}').join(String(inv.due))
                 .split('{shop}').join(s.settings.shop_name || '');

  modal(`
    <div class="modal-h">
      <h3>📱 ${isBn ? 'এসএমএস পাঠান' : 'Send SMS'} — ${esc(customer.phone)}</h3>
      <button class="modal-x" onclick="closeModal()">×</button>
    </div>
    <div class="modal-b">
      <label>${isBn ? 'এসএমএস বার্তা' : 'SMS Message'}</label>
      <textarea id="smsmsg" rows="4">${esc(pre)}</textarea>
      <p style="font-size:12px;color:var(--mut);margin-top:6px">
        ${isBn ? 'প্রয়োজনে বার্তা পরিবর্তন করে পাঠাতে পারেন।' : 'Auto-filled from template — edit if needed, then send.'}
      </p>
      <br>
      <button class="btn pri blk" id="smssend">📤 ${isBn ? 'পাঠান' : 'Send'}</button>
    </div>`);

  $('#smssend').addEventListener('click', async function () {
    try {
      const r = await api('/invoices/' + id + '/sms', { method: 'POST', body: { message: $('#smsmsg').value } });
      toast('SMS: ' + r.sms_status);
      closeModal();
    } catch (e) {
      toast(e.message, true);
    }
  });
}

async function delInvoice(id, due) {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const msg = due > 0
    ? (isBn ? `এই চালানে বকেয়া বাকি রয়েছে (${money(due)})। আপনি কি নিশ্চিত এই চালানটি বাতিল/মুছে ফেলতে চান? (স্টক, জমা ও কাস্টমার বাকি হিসাব স্বয়ংক্রিয়ভাবে সমন্বয় হবে)` : `This invoice has due of ${money(due)}. Delete anyway? (Stock, cash & customer balance will auto-reverse)`)
    : (isBn ? 'এই চালানটি মুছবেন? স্টক ও কাস্টমার লেজার স্বয়ংক্রিয়ভাবে পূর্বের অবস্থায় ফিরে যাবে।' : 'Delete this invoice? Stock & customer ledger will be auto-reversed.');
  askConfirm(msg, async function () {
    try {
      await api('/invoices/' + id, { method: 'DELETE' });
      toast(isBn ? 'চালান মুছে ফেলা হয়েছে এবং স্টক ও বাকি সমন্বয় করা হয়েছে' : 'Invoice deleted & reversed');
      closeModal();
      router();
    } catch (e) {
      toast(e.message, true);
    }
  });
}

function filterInvoices(q) {
  q = q.toLowerCase();
  document.querySelectorAll("#itable tr").forEach(function (tr, i) {
    if (i === 0) return;
    tr.style.display = tr.textContent.toLowerCase().includes(q) ? "" : "none";
  });
}
