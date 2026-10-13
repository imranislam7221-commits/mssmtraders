/* ---------- invoices ---------- */
VIEWS.invoices = async function () {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const { invoices } = await api('/invoices');
  window.__invoices = invoices || [];

  const totalSales = round2((invoices || []).reduce((s, i) => s + (Number(i.total) || 0), 0));
  const totalPaid = round2((invoices || []).reduce((s, i) => s + (Number(i.paid) || 0), 0));
  const totalDue = round2((invoices || []).reduce((s, i) => s + ((i.net_due != null ? Number(i.net_due) : Number(i.due)) || 0), 0));
  const dueCount = (invoices || []).filter(i => ((i.net_due != null ? Number(i.net_due) : Number(i.due)) || 0) > 0).length;

  const rows = (invoices || []).map(i => {
    const mainDue = (i.net_due != null ? Number(i.net_due) : Number(i.due)) || 0;
    return `<tr>
      <td><b>${esc(i.invoice_no)}</b></td>
      <td>${esc(i.customer_name)}</td>
      <td class="num">${money(i.total)}</td>
      <td class="num" style="color:var(--green)">${money(i.paid)}</td>
      <td class="num ${mainDue > 0 ? 'dueX' : 'due0'}"><b>${money(mainDue)}</b></td>
      <td>${fmtDT(i.timestamp)}</td>
      <td>${esc(i.user_name)}</td>
      <td style="white-space:nowrap">
        <button class="btn sm pri" onclick="viewInvoice(${i.id})">${isBn ? 'দেখুন' : 'View'}</button>
        <button class="btn sm grn" onclick="printInvoice(${i.id})" title="${isBn ? 'প্রিন্ট' : 'Print'}">🖨️</button>
        ${isOwner() ? `<button class="btn sm dan" onclick="delInvoice(${i.id}, ${mainDue})" title="${isBn ? 'চালান মুছুন' : 'Delete'}">🗑️</button>` : ''}
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="8" class="empty">${isBn ? 'কোনো ইনভয়েস পাওয়া যায়নি' : 'No invoices found'}</td></tr>`;

  layout(`
    <div class="page-head">
      <div>
        <h1>${isBn ? 'বিক্রয় রসিদ ও মেমো তালিকা' : 'Invoices'}</h1>
        <div class="sub">${isBn ? 'সকল বিক্রয়ের বিস্তারিত তালিকা, মোট অনাদায়ি বাকি ও অডিট হিসাব' : 'All bills — immutable audit trail (who & when)'}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <input id="isearch2" placeholder="${isBn ? '🔍 ইনভয়েস বা কাস্টমার খুঁজুন…' : '🔍 Search invoice…'}" style="width:220px" oninput="filterInvoices(this.value)">
        <a class="btn pri" href="#/pos">${isBn ? '🧾 নতুন বিক্রয় (POS)' : '🧾 New Sale'}</a>
      </div>
    </div>

    <!-- Summary Statistics with prominent Remaining Due -->
    <div class="grid g3" style="margin-bottom:14px">
      <div class="stat due">
        <div class="lab">⚠️ ${isBn ? 'ইনভয়েসের মোট বাকি (Remaining Due)' : 'Total Remaining Due'}</div>
        <div class="val" id="inv-total-due">${money(totalDue)}</div>
        <div class="lab" style="margin-top:4px;color:#fff">${isBn ? (dueCount ? `${bnDigits(dueCount)} টি চালানে বাকি রয়েছে` : 'কোনো বাকি নেই') : `${dueCount} bills with due`}</div>
      </div>
      <div class="stat">
        <div class="lab">🧾 ${isBn ? 'মোট বিক্রয় বিল (Total Invoiced)' : 'Total Invoiced'}</div>
        <div class="val" id="inv-total-sales">${money(totalSales)}</div>
        <div class="lab" style="margin-top:4px">${isBn ? bnDigits(invoices.length) + ' টি মোট চালান' : invoices.length + ' total invoices'}</div>
      </div>
      <div class="stat brand">
        <div class="lab">💵 ${isBn ? 'মোট আদায়কৃত জমা (Total Collected)' : 'Total Collected'}</div>
        <div class="val" id="inv-total-paid" style="color:var(--green)">${money(totalPaid)}</div>
        <div class="lab" style="margin-top:4px">${isBn ? 'নগদ জমা প্রাপ্তি' : 'Cash received'}</div>
      </div>
    </div>

    <div class="card">
      <div class="tblwrap">
        <table class="tbl" id="itable">
          <thead>
            <tr>
              <th>${isBn ? 'মেমো / রসিদ নং' : 'Invoice'}</th>
              <th>${isBn ? 'কাস্টমার' : 'Customer'}</th>
              <th class="num">${isBn ? 'মোট বিল' : 'Total'}</th>
              <th class="num">${isBn ? 'জমা' : 'Paid'}</th>
              <th class="num">${isBn ? 'বাকি' : 'Due'}</th>
              <th>${isBn ? 'তারিখ ও সময়' : 'Date & Time'}</th>
              <th>${isBn ? 'বিক্রেতা' : 'By'}</th>
              <th>${isBn ? 'অ্যাকশন' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </div>`);
};

async function viewInvoice(id) {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const { invoice: inv, customer } = await api('/invoices/' + id);
  const extraPaid = Math.max(0, Math.round(((inv.paid || 0) - (inv.total || 0)) * 100) / 100);
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
        <div class="sumrow total"><span>${isBn ? 'চলতি বিল' : 'Current Bill'}</span><span>${money(inv.total)}</span></div>
        <div class="sumrow"><span>${isBn ? 'জমা' : 'Paid'}</span><span>${money(inv.paid)}</span></div>
        <div class="sumrow"><span>${isBn ? 'চলতি বাকি' : 'Bill Due'}</span><span>${money(inv.due)}</span></div>
        ${(inv.prev_due > 0) ? `<div class="sumrow"><span>${isBn ? 'পূর্বের বকেয়া' : 'Previous Due'}</span><span>${money(inv.prev_due)}</span></div>` : ''}
        ${(inv.prev_due > 0 && extraPaid > 0) ? `<div class="sumrow"><span>${isBn ? 'বকেয়া থেকে কর্তন' : 'Deducted from Due'}</span><span>− ${money(extraPaid)}</span></div>` : ''}
        <div class="sumrow duerow"><span>${isBn ? 'অবশিষ্ট সর্বমোট বাকি' : 'Net Due'}</span><span>${money(inv.net_due != null ? inv.net_due : inv.due)}</span></div>
      </div>
      <p style="margin-top:10px;font-size:12.5px;color:var(--mut)">
        🕒 ${esc(inv.time_display)} • 👤 ${esc(inv.user_name)}
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
  q = (q || '').trim().toLowerCase();
  const list = window.__invoices || [];
  let visSales = 0, visPaid = 0, visDue = 0, visDueCount = 0, visCount = 0;

  document.querySelectorAll("#itable tbody tr").forEach(function (tr) {
    const text = tr.textContent.toLowerCase();
    const match = !q || text.includes(q);
    tr.style.display = match ? "" : "none";
  });

  for (const inv of list) {
    const searchStr = (String(inv.invoice_no || '') + ' ' + String(inv.customer_name || '') + ' ' + String(inv.user_name || '')).toLowerCase();
    if (!q || searchStr.includes(q)) {
      const tot = Number(inv.total) || 0;
      const pd = Number(inv.paid) || 0;
      const du = Number(inv.net_due != null ? inv.net_due : inv.due) || 0;
      visSales = round2(visSales + tot);
      visPaid = round2(visPaid + pd);
      visDue = round2(visDue + du);
      if (du > 0) visDueCount++;
      visCount++;
    }
  }

  const tdEl = document.getElementById('inv-total-due');
  if (tdEl) tdEl.textContent = money(visDue);
  const tsEl = document.getElementById('inv-total-sales');
  if (tsEl) tsEl.textContent = money(visSales);
  const tpEl = document.getElementById('inv-total-paid');
  if (tpEl) tpEl.textContent = money(visPaid);
}
