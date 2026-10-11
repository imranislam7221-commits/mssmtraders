/* ---------- printing (memo-pad style matching physical printed pad) ---------- */
async function settingsSafe() {
  try { return (await api('/settings')).settings; }
  catch (e) {}
  return {
    shop_name: 'মেসার্স এম.এস ট্রেডার্স',
    shop_phone: '01956-226465',
    memo_logo: 'MST',
    memo_title_line: 'মেসার্স এম.এস ট্রেডার্স',
    memo_pro_line: 'প্রোঃ মুনজুর আহমেদ',
    memo_trade_line: 'এখানে রড, সিমেন্ট, ইট, বালি, খোয়া জাতীয় নির্মাণ সামগ্রী সুলভ মূল্যে বিক্রয় করা হয়।',
    memo_address_line: 'সোসাইটি পুরাতন মার্কেট, পুরাতন বাজার, দর্শনা, চুয়াডাঙ্গা।',
    memo_mobile_line: 'মোবাইল: 01956-226465, 01748-152036',
    memo_footer_note: 'এম.এস ট্রেডার্স এর মাল ক্রয় করার জন্য আপনাকে ধন্যবাদ'
  };
}

const MEMO_DEF = {
  logo: 'MST',
  title_line: 'মেসার্স এম.এস ট্রেডার্স',
  pro_line: 'প্রোঃ মুনজুর আহমেদ',
  trade_line: 'এখানে রড, সিমেন্ট, ইট, বালি, খোয়া জাতীয় নির্মাণ সামগ্রী সুলভ মূল্যে বিক্রয় করা হয়।',
  address_line: 'সোসাইটি পুরাতন মার্কেট, পুরাতন বাজার, দর্শনা, চুয়াডাঙ্গা।',
  mobile_line: 'মোবাইল: 01956-226465, 01748-152036',
  footer_note: 'এম.এস ট্রেডার্স এর মাল ক্রয় করার জন্য আপনাকে ধন্যবাদ'
};

function memoSummaryLines(s) {
  const g = (k, d) => (String(s && s[k] != null ? s[k] : '').trim() || d || '');
  return {
    logo: g('memo_logo', MEMO_DEF.logo),
    title_line: g('memo_title_line', MEMO_DEF.title_line),
    pro_line: g('memo_pro_line', MEMO_DEF.pro_line),
    trade_line: g('memo_trade_line', MEMO_DEF.trade_line),
    address_line: g('memo_address_line', MEMO_DEF.address_line),
    mobile_line: g('memo_mobile_line', MEMO_DEF.mobile_line),
    footer_note: g('memo_footer_note', MEMO_DEF.footer_note),
    header: (s && s.receipt_header) || '',
    footer: (s && s.receipt_footer) || ''
  };
}

function ml(s) { return esc(s).split('\n').map(t => t.trim()).filter(Boolean).join('<br>'); }

function padBn(n) {
  return bnDigits(n);
}

function buildInvoiceMemoHtml(inv, customer, s) {
  const m = memoSummaryLines(s);

  // Render items rows
  const rows = inv.items.map((it, idx) => {
    const rawName = it.name || '';
    const itName = (typeof I18N_BN !== 'undefined' && I18N_BN[rawName]) || (typeof t === 'function' && t(rawName)) || rawName;
    const itUnit = (typeof bnUnit === 'function' && bnUnit(it.unit)) || it.unit || '';
    return `
    <tr>
      <td class="c">${padBn(idx + 1)}</td>
      <td class="item-name">${esc(itName)}</td>
      <td class="c">${bnDigits(it.qty)} ${esc(itUnit)}</td>
      <td class="r">${bnDigits(it.price)}</td>
      <td class="r">${bnDigits(it.amount)}</td>
    </tr>`;
  }).join('');

  // Pad table with empty rows to match authentic 10-12 row memo pad
  const minRows = Math.max(8, Math.min(12, 12 - (inv.discount > 0 ? 1 : 0) - (inv.vat > 0 ? 1 : 0)));
  const emptyCount = Math.max(0, minRows - inv.items.length);
  let emptyRowsHtml = '';
  for (let i = 0; i < emptyCount; i++) {
    const rowNo = padBn(inv.items.length + i + 1);
    emptyRowsHtml += `<tr><td class="c">${rowNo}</td><td>&nbsp;</td><td></td><td></td><td></td></tr>`;
  }

  const totalWords = banglaMoneyWords(inv.total) + ' টাকা মাত্র।';
  const cleanInvNo = bnDigits(String(inv.invoice_no || '').replace(/^INV-?/i, ''));

  return `
  <div class="receipt memo">
    <div class="memo-hd-wrap">
      <div class="hd-title-flex">
        <div class="logo-box"><span>${esc(m.logo)}</span></div>
        <div class="bn-title">${esc(m.title_line)}</div>
      </div>
      <div class="pro-pill-wrap"><span class="pro-pill">${esc(m.pro_line)}</span></div>
      <div class="trade-line">${esc(m.trade_line)}</div>
      <div class="addr-line">${esc(m.address_line)}</div>
      <div class="mob-banner">${esc(m.mobile_line)}</div>
      ${m.header ? '<div class="extra-line">' + ml(m.header) + '</div>' : ''}
    </div>

    <div class="cust-info">
      <div class="cust-info-flex">
        <div class="cust-col-left">
          <div class="c-row">
            <span class="c-lbl">নাম</span>
            <span class="c-dots">${esc(inv.customer_name || 'নগদ কাস্টমার')}</span>
          </div>
          <div class="c-row" style="margin-top:4px">
            <span class="c-lbl">ঠিকানা</span>
            <span class="c-dots">${customer && customer.address ? esc(customer.address) : ''}</span>
          </div>
          <div class="c-row" style="margin-top:4px">
            <span class="c-lbl">মোবাইল</span>
            <span class="c-dots" style="font-family:'Segoe UI',Arial,sans-serif;letter-spacing:0.5px">${customer && customer.phone ? esc(customer.phone) : ''}</span>
          </div>
        </div>

        <div class="cust-col-right">
          <div class="c-row">
            <span class="c-lbl">তারিখ</span>
            <span class="c-dots date-dots">${bnDigits(inv.time_display ? inv.time_display.split(' | ')[0] : fmtDate(inv.timestamp))}</span>
          </div>
          <div class="c-row" style="margin-top:4px">
            <span class="c-lbl">মেমো নং</span>
            <span class="c-dots inv-dots">${cleanInvNo}</span>
          </div>
        </div>
      </div>
    </div>

    <table class="memo-items">
      <thead>
        <tr>
          <th style="width:9%">নং</th>
          <th style="width:41%">মালের বিবরণ</th>
          <th style="width:18%">পরিমাণ</th>
          <th style="width:14%">দর</th>
          <th style="width:18%">টাকা</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        ${emptyRowsHtml}
        ${inv.discount > 0 ? `
        <tr class="sub-disc">
          <td colspan="3" class="blank-tot"></td>
          <td class="r-bold">সাবটোটাল-</td>
          <td class="r">${bnDigits(inv.subtotal)}</td>
        </tr>
        <tr class="sub-disc">
          <td colspan="3" class="blank-tot"></td>
          <td class="r-bold">ছাড়-</td>
          <td class="r">− ${bnDigits(inv.discount)}</td>
        </tr>` : ''}
        ${inv.vat > 0 ? `
        <tr class="sub-vat">
          <td colspan="3" class="blank-tot"></td>
          <td class="r-bold">ভ্যাট (${bnDigits(inv.vat_percent)}%)-</td>
          <td class="r">${bnDigits(inv.vat)}</td>
        </tr>` : ''}
        <tr class="tot-row">
          <td colspan="3" class="blank-tot"></td>
          <td class="mt-label">মোট-</td>
          <td class="mt-val">${bnDigits(inv.total)}</td>
        </tr>
      </tbody>
    </table>

    <div class="kothay-box">
      <span class="kothay-lbl">কথায়</span>
      <span class="kothay-dots">${esc(totalWords)}</span>
    </div>

    ${(() => {
      const prevDue = inv.prev_due != null ? inv.prev_due : (customer ? Math.max(0, round2((customer.total_due || 0) - (inv.due || 0))) : 0);
      const netDue = inv.net_due != null ? inv.net_due : (customer ? (customer.total_due || 0) : (inv.due || 0));
      return `
    <table class="pay-strip">
      <tr>
        <td>বর্তমান বিল: <b>${bnDigits(inv.total)}</b> ৳</td>
        <td>জমা: <b>${bnDigits(inv.paid)}</b> ৳</td>
        <td>চলতি বাকি: <b class="${inv.due > 0 ? 'due-text' : ''}">${bnDigits(inv.due)}</b> ৳</td>
      </tr>
      ${(customer && (prevDue > 0 || netDue > inv.due)) ? `
      <tr class="prev-due-row">
        <td>পূর্বের বকেয়া: <b>${bnDigits(prevDue)}</b> ৳</td>
        <td colspan="2" style="text-align:right">সর্বমোট বাকি: <b class="due-text" style="font-size:12px">${bnDigits(netDue)}</b> ৳</td>
      </tr>` : ''}
    </table>`;
    })()}

    ${inv.note ? '<div class="extra-line" style="margin-top:3px">নোট: ' + esc(inv.note) + '</div>' : ''}
    ${m.footer ? '<div class="extra-line">' + ml(m.footer) + '</div>' : ''}

    <div class="memo-footer-flex">
      <div class="sign-block">
        <div class="dots-line">.......................................</div>
        <div class="sign-lbl">ক্রেতার স্বাক্ষর</div>
      </div>
      <div class="thanks-block">
        <span class="thanks-pill">${esc(m.footer_note)}</span>
      </div>
      <div class="sign-block">
        <div class="dots-line">.......................................</div>
        <div class="sign-lbl">বিক্রেতার স্বাক্ষর</div>
      </div>
    </div>
  </div>`;
}

function buildStatementMemoHtml(c, ledger, s, rng) {
  const m = memoSummaryLines(s);
  const rows = ledger.map(l => `
    <tr>
      <td>${bnDigits(l.time_display ? l.time_display.split(' | ')[0] : fmtDate(l.timestamp))}</td>
      <td class="c">${l.transaction_type === 'CREDIT' ? 'জমা' : 'বিল'}</td>
      <td class="r">${bnDigits(l.amount)}</td>
      <td class="r"><b>${bnDigits(l.balance)}</b></td>
    </tr>`).join('');

  return `
  <div class="receipt memo">
    <div class="memo-hd-wrap">
      <div class="hd-title-flex">
        <div class="logo-box"><span>${esc(m.logo)}</span></div>
        <div class="bn-title">${esc(m.title_line)}</div>
      </div>
      <div class="pro-pill-wrap"><span class="pro-pill">কাস্টমার হিসাব খাতা (লেজার)</span></div>
      <div class="mob-banner">${esc(m.mobile_line)}</div>
    </div>

    <div class="cust-info">
      <div class="c-row">
        <span class="c-lbl">নাম</span>
        <span class="c-dots">${esc(c.name)}${c.phone ? ' • ' + esc(c.phone) : ''}</span>
        <span class="c-lbl" style="margin-left:14px">সময়</span>
        <span class="c-dots" style="max-width:140px">${esc(rng)}</span>
      </div>
      ${c.address ? `<div class="c-row" style="margin-top:4px"><span class="c-lbl">ঠিকানা</span><span class="c-dots">${esc(c.address)}</span></div>` : ''}
    </div>

    <table class="memo-items" style="margin-top:6px">
      <thead>
        <tr>
          <th style="width:28%">তারিখ</th>
          <th style="width:20%">ধরন</th>
          <th style="width:26%">টাকা</th>
          <th style="width:26%">ব্যালেন্স</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="tot-row">
          <td colspan="2" class="blank-tot"></td>
          <td class="mt-label">মোট বাকি-</td>
          <td class="mt-val">${bnDigits(c.total_due)} ৳</td>
        </tr>
      </tbody>
    </table>

    <div class="kothay-box" style="margin-top:6px">
      <span class="kothay-lbl">কথায়</span>
      <span class="kothay-dots">মোট বাকি ${banglaMoneyWords(c.total_due)} টাকা মাত্র।</span>
    </div>

    <div class="memo-footer-flex" style="margin-top:18px">
      <div class="sign-block">
        <div class="dots-line">.......................................</div>
        <div class="sign-lbl">ক্রেতার স্বাক্ষর</div>
      </div>
      <div class="thanks-block">
        <span class="thanks-pill">${esc(m.footer_note)}</span>
      </div>
      <div class="sign-block">
        <div class="dots-line">.......................................</div>
        <div class="sign-lbl">বিক্রেতার স্বাক্ষর</div>
      </div>
    </div>
  </div>`;
}

function showPrintPreviewModal(html, title, onPrint) {
  modal(`
    <div class="modal-h">
      <h3>🖨️ ${esc(title || 'মেমো প্রিন্ট প্রিভিউ')}</h3>
      <div style="display:flex;gap:6px;align-items:center">
        <button class="btn grn sm" id="modal-print-btn">🖨️ প্রিন্ট করুন</button>
        <button class="modal-x" onclick="closeModal()">×</button>
      </div>
    </div>
    <div class="modal-b" style="background:#f8fafc;padding:12px;overflow-y:auto;max-height:82vh">
      <div class="memo-screen-wrapper">
        ${html}
      </div>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:14px">
        <button class="btn grn" style="padding:10px 24px;font-size:14px" id="modal-print-btn-bottom">🖨️ প্রিন্ট দিন (Print)</button>
        <button class="btn" style="padding:10px 18px" onclick="closeModal()">✕ বন্ধ করুন</button>
      </div>
    </div>
  `, true);

  const doTrigger = () => {
    if (onPrint) onPrint();
    window.print();
  };
  const b1 = $('#modal-print-btn'), b2 = $('#modal-print-btn-bottom');
  if (b1) b1.onclick = doTrigger;
  if (b2) b2.onclick = doTrigger;
}

async function printInvoice(id) {
  try {
    const { invoice: inv, customer } = await api('/invoices/' + id);
    const s = await settingsSafe();
    const memoHtml = buildInvoiceMemoHtml(inv, customer, s);
    const pa = $('#print-area');
    if (pa) pa.innerHTML = memoHtml;

    showPrintPreviewModal(memoHtml, `মেমো প্রিভিউ — ${inv.invoice_no}`, () => {
      if (pa) pa.innerHTML = memoHtml;
    });
  } catch (e) {
    toast('প্রিন্ট প্রিভিউ লোড হতে সমস্যা: ' + e.message, true);
  }
}

async function printStatement(id, fromDate, toDate) {
  try {
    const from = fromDate !== undefined ? fromDate : (($('#cfrom') || {}).value || '');
    const to = toDate !== undefined ? toDate : (($('#cto') || {}).value || '');
    const qs = (from || to) ? '?' + new URLSearchParams({ from, to }) : '';
    const { customer: c, ledger } = await api('/customers/' + id + '/ledger' + qs);
    const s = await settingsSafe();
    const rng = (from || to) ? (bnDigits(from || 'শুরু') + ' থেকে ' + bnDigits(to || 'আজ')) : 'সব লেনদেন';
    const stmtHtml = buildStatementMemoHtml(c, ledger, s, rng);
    const pa = $('#print-area');
    if (pa) pa.innerHTML = stmtHtml;

    showPrintPreviewModal(stmtHtml, `লেজার প্রিভিউ — ${c.name}`, () => {
      if (pa) pa.innerHTML = stmtHtml;
    });
  } catch (e) {
    toast('লেজার প্রিন্ট প্রিভিউ সমস্যা: ' + e.message, true);
  }
}

function buildPaymentReceiptHtml(pay, c, s) {
  const m = memoSummaryLines(s);
  const isPaidInFull = (pay.balance || 0) <= 0;
  const prevDue = pay.prev_due != null ? pay.prev_due : ((pay.balance || 0) + (pay.amount || 0));
  const cleanRcptNo = bnDigits(String(pay.id || '').replace(/^MR-?/i, ''));
  const dateStr = bnDigits(pay.time_display ? pay.time_display.split(' | ')[0] : fmtDate(pay.timestamp));
  const timeStr = pay.time_display && pay.time_display.includes(' | ') ? pay.time_display.split(' | ')[1] : '';

  return `
  <div class="receipt memo">
    <div class="memo-hd-wrap">
      <div class="hd-title-flex">
        <div class="logo-box"><span>${esc(m.logo)}</span></div>
        <div class="bn-title">${esc(m.title_line)}</div>
      </div>
      <div class="pro-pill-wrap"><span class="pro-pill">${esc(m.pro_line)}</span></div>
      <div class="trade-line">${esc(m.trade_line)}</div>
      <div class="addr-line">${esc(m.address_line)}</div>
      <div class="mob-banner">${esc(m.mobile_line)}</div>
      <div style="margin: 6px 0 2px 0;">
        <span style="display:inline-block;background:#0b4ea2;color:#fff;font-weight:700;font-size:13px;padding:3px 18px;border-radius:14px;letter-spacing:0.5px">
          💵 টাকা জমার রসিদ (MONEY RECEIPT)
        </span>
      </div>
    </div>

    <div class="cust-info" style="margin-top:8px">
      <div class="cust-info-flex">
        <div class="cust-col-left">
          <div class="c-row">
            <span class="c-lbl">নাম</span>
            <span class="c-dots">${esc(c.name || 'সম্মানিত কাস্টমার')}</span>
          </div>
          <div class="c-row" style="margin-top:4px">
            <span class="c-lbl">ঠিকানা</span>
            <span class="c-dots">${esc(c.address || '—')}</span>
          </div>
          <div class="c-row" style="margin-top:4px">
            <span class="c-lbl">মোবাইল</span>
            <span class="c-dots" style="font-family:'Segoe UI',Arial,sans-serif;letter-spacing:0.5px">${esc(c.phone || '—')}</span>
          </div>
        </div>

        <div class="cust-col-right">
          <div class="c-row">
            <span class="c-lbl">তারিখ</span>
            <span class="c-dots date-dots">${dateStr}</span>
          </div>
          <div class="c-row" style="margin-top:4px">
            <span class="c-lbl">রসিদ নং</span>
            <span class="c-dots inv-dots">${cleanRcptNo ? 'MR-' + cleanRcptNo : '—'}</span>
          </div>
          ${timeStr ? `
          <div class="c-row" style="margin-top:4px">
            <span class="c-lbl">সময়</span>
            <span class="c-dots" style="font-family:'Segoe UI',Arial,sans-serif;font-size:11px">${timeStr}</span>
          </div>` : ''}
        </div>
      </div>
    </div>

    <table class="memo-items" style="margin-top:10px">
      <thead>
        <tr>
          <th style="width:12%">নং</th>
          <th style="width:58%">বিবরণ</th>
          <th style="width:30%">টাকা (৳)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="c">১</td>
          <td>পূর্বের মোট বকেয়া (Previous Due)</td>
          <td class="r">${bnDigits(prevDue)} ৳</td>
        </tr>
        <tr style="background:#f0fdf4">
          <td class="c"><b>২</b></td>
          <td><b>আজকের জমা গ্রহণ (Cash Received)</b>${pay.note ? ' <small style="color:#0b4ea2">(' + esc(pay.note) + ')</small>' : ''}</td>
          <td class="r" style="color:#15803d;font-weight:800;font-size:13.5px"><b>${bnDigits(pay.amount)} ৳</b></td>
        </tr>
        <tr>
          <td class="c">৩</td>
          <td><b>অবশিষ্ট বর্তমান বাকি (Remaining Due)</b></td>
          <td class="r" style="font-weight:800;font-size:13.5px;color:${isPaidInFull ? '#15803d' : '#b91c1c'}">
            <b>${isPaidInFull ? '০ ৳ (পরিশোধ)' : bnDigits(pay.balance) + ' ৳'}</b>
          </td>
        </tr>
      </tbody>
    </table>

    ${isPaidInFull ? `
    <div style="margin:12px auto;text-align:center;padding:10px 14px;border:2px dashed #15803d;background:#f0fdf4;border-radius:8px">
      <div style="font-size:16px;font-weight:800;color:#15803d;letter-spacing:0.5px">
        ✅ সম্পূর্ণ বাকি পরিশোধিত (ALL DUE PAID)
      </div>
      <div style="font-size:11.5px;color:#166534;margin-top:3px;font-weight:600">
        মেসার্স এম.এস ট্রেডার্স-এ আপনার সকল পূর্বের দেনা সম্পূর্ণ পরিশোধ হয়েছে।
      </div>
    </div>` : ''}

    <div class="kothay-box" style="margin-top:8px">
      <span class="kothay-lbl">কথায়</span>
      <span class="kothay-dots">জমা গ্রহণ ${banglaMoneyWords(pay.amount)} টাকা মাত্র।</span>
    </div>

    <div class="memo-footer-flex" style="margin-top:24px">
      <div class="sign-block">
        <div class="dots-line">.......................................</div>
        <div class="sign-lbl">টাকা প্রদানকারীর স্বাক্ষর</div>
      </div>
      <div class="thanks-block">
        <span class="thanks-pill">${esc(m.footer_note)}</span>
      </div>
      <div class="sign-block">
        <div class="dots-line">.......................................</div>
        <div class="sign-lbl">আদায়কারীর স্বাক্ষর</div>
      </div>
    </div>
  </div>`;
}

async function printPaymentReceipt(pay, c) {
  try {
    const s = await settingsSafe();
    const html = buildPaymentReceiptHtml(pay, c, s);
    const pa = $('#print-area');
    if (pa) pa.innerHTML = html;
    showPrintPreviewModal(html, `জমা রসিদ — ${c.name} (৳${pay.amount})`, () => {
      if (pa) pa.innerHTML = html;
    });
  } catch (e) {
    toast('রসিদ প্রিভিউ লোড হতে সমস্যা: ' + e.message, true);
  }
}

