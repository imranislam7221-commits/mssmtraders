/* ---------- printing (80mm thermal / A4 / mobile bluetooth) — shop memo-pad style ---------- */
async function settingsSafe() { try { return (await api('/settings')).settings; } catch (e) {} return { shop_name: 'M/S S.M. Traders', shop_phone: '', shop_address: '', memo_logo: '', memo_title_line: '', memo_trade_line: '', memo_address_line: '', memo_mobile_line: '', memo_footer_note: '', receipt_header: '', receipt_footer: '' }; }

const MEMO_DEF = { logo: 'MST', title_line: 'মেসার্স এস.এম ট্রেডার্স', pro_line: 'প্রো: মুনজুর আহমেদ', footer_note: 'এম.এস ট্রেডার্স এর মাল কেনার জন্য আপনাকে ধন্যবাদ' };
function memoSummaryLines(s) {
  const g = (k, d) => (String(s[k] != null ? s[k] : '').trim() || d || '');
  return { logo: g('memo_logo', MEMO_DEF.logo), title_line: g('memo_title_line', MEMO_DEF.title_line), pro_line: g('memo_pro_line', MEMO_DEF.pro_line), trade_line: g('memo_trade_line', ''), address_line: g('memo_address_line', ''), mobile_line: g('memo_mobile_line', ''), footer_note: g('memo_footer_note', MEMO_DEF.footer_note), header: s.receipt_header || '', footer: s.receipt_footer || '' };
}

function ml(s) { return esc(s).split('\n').map(t => t.trim()).filter(Boolean).join('<br>'); }

async function printInvoice(id) {
  const { invoice: inv, customer } = await api('/invoices/' + id);
  const s = await settingsSafe();
  const m = memoSummaryLines(s);
  const invNo = String(inv.invoice_no || '').replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[+d]);
  const rows = inv.items.map(function (i, idx) {
    const no = String(idx + 1).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[+d]);
    return '<tr><td>' + no + '</td><td>' + esc(i.name) + '</td><td>' + i.qty + '</td><td>' + i.price + '</td><td>' + i.amount + '</td></tr>';
  }).join('');
  const totalWords = ('মোট ' + banglaMoneyWords(inv.total) + ' টাকা মাত্র।');
  $('#print-area').innerHTML = `<div class="receipt memo">
    <table class="hd-title"><tr>
      <td class="logo"><span>${esc(m.logo)}</span></td>
      <td class="bn-title">${esc(m.title_line)}</td>
    </tr></table>
    <div class="pro-pill">${esc(m.pro_line)}</div>
    ${m.trade_line ? '<div class="trade-line">' + esc(m.trade_line) + '</div>' : ''}
    ${m.address_line ? '<div class="addr-line">' + esc(m.address_line) + '</div>' : ''}
    ${m.mobile_line ? '<div class="mob-banner">' + esc(m.mobile_line) + '</div>' : ''}
    ${m.header ? '<div class="extra-line">' + ml(m.header) + '</div>' : ''}
    <table class="cust-lines">
      <tr><td>নাম</td><td class="fill">${esc(inv.customer_name)}</td><td>তারিখ</td><td class="fill">${esc(inv.time_display)}</td></tr>
      <tr><td>ঠিকানা</td><td class="fill" colspan="3">${customer ? esc(customer.address || customer.phone || '') : ''}</td></tr>
    </table>
    <hr>
    <table class="memo-items">
      <tr><th>নং</th><th>মালের বিবরণ</th><th>পরিমাণ</th><th>দর</th><th>টাকা</th></tr>
      ${rows}
      <tr class="tot"><td colspan="3"></td><td class="mt">মোট-</td><td>${inv.total}</td></tr>
    </table>
    <div class="kothay">কথায় &nbsp;${esc(totalWords.replace('কথায় — ', ''))}</div>
    <table class="pay-rows"><tr><td>মোট বিল</td><td>${inv.total}</td><td>জমা</td><td>${inv.paid}</td><td>বাকি</td><td>${inv.due}</td></tr></table>
    ${inv.note ? '<div class="extra-line">' + esc(inv.note) + '</div>' : ''}
    <div class="thanks-pill">${esc(m.footer_note)}</div>
    ${m.footer ? '<div class="extra-line">' + ml(m.footer) + '</div>' : ''}
    <table class="sign-row"><tr><td>ক্রেতার স্বাক্ষর</td><td></td><td>বিক্রেতার স্বাক্ষর</td></tr></table>
    <div class="tech-line">Ph: ${esc(s.shop_phone || '—')}</div>
  </div>`;
  if (window.applyLang) applyLang();
  window.print();
}

async function printStatement(id) {
  const { customer: c, ledger } = await api('/customers/' + id + '/ledger');
  const s = await settingsSafe();
  const m = memoSummaryLines(s);
  const from = ($('#cfrom') || {}).value || '', to = ($('#cto') || {}).value || '';
  const rng = (from || to) ? ((from || 'শুরু') + ' থেকে ' + (to || 'আজ')) : 'সব লেনদেন';
  const rows = ledger.map(function (l) {
    return '<tr><td>' + esc(l.time_display || fmtDT(l.timestamp)) + '</td><td>' + (l.transaction_type === 'CREDIT' ? 'জমা' : 'বিল') + '</td><td class="r">' + l.amount + '</td><td class="r">' + l.balance + '</td></tr>';
  }).join('');
  $('#print-area').innerHTML = `<div class="receipt memo">
    <table class="hd-title"><tr>
      <td class="logo"><span>${esc(m.logo)}</span></td>
      <td class="bn-title">মেসার্স এস.এম ট্রেডার্স</td>
    </tr></table>
    <div class="pro-pill">কাস্টমার লেজার (স্টেটমেন্ট)</div>
    ${m.mobile_line ? '<div class="mob-banner">' + esc(m.mobile_line) + '</div>' : ''}
    <table class="cust-lines"><tr><td>নাম</td><td class="fill">${esc(c.name)}${c.phone ? ' • ' + esc(c.phone) : ''}</td><td>সময়</td><td class="fill">${esc(rng)}</td></tr></table>
    <hr>
    <table class="memo-items"><tr><th>তারিখ</th><th>ধরন</th><th class="r">টাকা</th><th class="r">ব্যালেন্স</th></tr>${rows}</table>
    <hr>
    <table class="memo-items"><tr class="tot"><td class="mt">মোট বাকি-</td><td>${c.total_due} টাকা</td></tr></table>
    ${'কথায় — মোট বাকি ' + banglaMoneyWords(c.total_due) + ' টাকা মাত্র।'}
    <div class="thanks-pill">${esc(m.footer_note)}</div>
    <table class="sign-row"><tr><td>ক্রেতার স্বাক্ষর</td><td></td><td>বিক্রেতার স্বাক্ষর</td></tr></table>
  </div>`;
  if (window.applyLang) applyLang();
  window.print();
}
