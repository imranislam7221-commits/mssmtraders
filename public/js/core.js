'use strict';
/* Jaia Hardware POS — frontend SPA (vanilla JS) */

window.LANG = localStorage.getItem('pos_lang') || 'bn';
function bnDigits(x) { return String(x == null ? '' : x).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[+d]); }
function toAsciiDigits(x) {
  const bn = '০১২৩৪৫৬৭৮৯';
  return String(x == null ? '' : x).replace(/[০-৯]/g, d => bn.indexOf(d));
}
function round2(n) { return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100; }
window.bnDigits = bnDigits;
window.toAsciiDigits = toAsciiDigits;
window.round2 = round2;

/* ---------- state + helpers ---------- */
const S = { token: localStorage.getItem('pos_token') || '', user: null, cart: [], posCustomer: null };
window.S = S;
const $ = sel => document.querySelector(sel);
window.$ = $;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
window.esc = esc;
const money = n => {
  const val = Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  return '৳ ' + (isBn ? bnDigits(val) : val);
};
window.money = money;
const fmtDate = iso => {
  const d = new Date(iso);
  const p = x => String(x).padStart(2, '0');
  const str = p(d.getDate()) + '-' + p(d.getMonth() + 1) + '-' + d.getFullYear();
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  return isBn ? bnDigits(str) : str;
};
const fmtDT = iso => {
  const d = new Date(iso);
  const p = x => String(x).padStart(2, '0');
  const str = p(d.getDate()) + '-' + p(d.getMonth() + 1) + '-' + d.getFullYear() + ' | ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  return isBn ? bnDigits(str) : str;
};
const isOwner = () => S.user && S.user.role === 'owner';
let toastTimer = null;
function toast(msg, isErr) { const t = $('#toast') || Object.assign(document.body.appendChild(document.createElement('div')), { id: 'toast' }); t.id = 'toast'; t.textContent = msg; t.className = isErr ? 'err' : ''; t.style.display = 'block'; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.style.display = 'none', 3200); }
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (S.token) headers['Authorization'] = 'Bearer ' + S.token;
  try {
    const res = await fetch('/api' + path, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
    let data = {};
    try { data = await res.json(); } catch (e) {}
    if (res.status === 401 && S.token) { S.token = ''; S.user = null; localStorage.removeItem('pos_token'); location.hash = '#/login'; throw new Error(data.error || 'Session expired'); }
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    if (!opts.method || opts.method === 'GET') {
      try { localStorage.setItem('mst_cache_' + path, JSON.stringify(data)); } catch (_) {}
    }
    return data;
  } catch (err) {
    if (!opts.method || opts.method === 'GET') {
      const cached = localStorage.getItem('mst_cache_' + path);
      if (cached) {
        try { return JSON.parse(cached); } catch (_) {}
      }
    }
    throw err;
  }
}
function modal(html, wide) {
  const root = $('#modal-root');
  root.innerHTML = '<div class="modal-back" onclick="if(event.target===this)closeModal()"><div class="modal' + (wide ? ' wide' : '') + '">' + html + '</div></div>';
  if (window.applyLang) applyLang();
}
function closeModal() { $('#modal-root').innerHTML = ''; }

function askConfirm(msg, onYes) {
  modal('<div class="modal-h"><h3>⚠️ ' + t('Confirm') + '</h3><button class="modal-x" onclick="closeModal()">×</button></div><div class="modal-b"><p style="font-size:14.5px;line-height:1.6">' + esc(t(msg)) + '</p><div style="display:flex;gap:8px;margin-top:14px"><button class="btn dan blk" id="cfmyes" style="flex:1.2">🗑️ ' + t('Yes, Delete') + '</button><button class="btn blk" onclick="closeModal()" style="flex:1">' + t('Cancel') + '</button></div></div>');
  $('#cfmyes').addEventListener('click', function () { closeModal(); onYes(); });
}

function prodSort(a, b) {
  const getRank = function (c) {
    const s = (String(c.category || '') + ' ' + String(c.name || '')).toLowerCase();
    // 1. Cement (সবার উপরে)
    if (s.includes('cement') || s.includes('সিমেন্ট') || s.includes('সি প্লাস') || s.includes('c-plus') || s.includes('হোলসিম')) return 0;
    // 2. Rod (রড)
    if (s.includes('rod') || s.includes('রড') || s.includes('বিএসআরএম') || s.includes('bsrm') || s.includes('বার')) return 1;
    // 3. Sand / Balu (বালি / বালু)
    if (s.includes('balu') || s.includes('bali') || s.includes('বালু') || s.includes('বালি') || s.includes('sand')) return 2;
    // 4. Khua (খোয়া / চিপস)
    if (s.includes('khua') || s.includes('khoa') || s.includes('খোয়া') || s.includes('খোয়া') || s.includes('chips')) return 3;
    // 5. Eaat / It (ইট)
    if (s.includes('ইট') || s.includes('brick') || s.includes('eat') || s.includes('eaat')) return 4;
    // 6. Others (অন্যান্য)
    return 5;
  };
  const ra = getRank(a), rb = getRank(b);
  if (ra !== rb) return ra - rb;
  const sa = a.size_mili == null ? null : +a.size_mili, sb = b.size_mili == null ? null : +b.size_mili;
  if (sa != null && sb != null && sa !== sb) return sa - sb;
  return String(a.name || '').localeCompare(String(b.name || ''));
}

function downloadCsv(filename, headers, rows) {
  const escapeCsv = function (val) {
    if (val == null) return '""';
    const s = String(val).replace(/"/g, '""');
    return '"' + s + '"';
  };
  const bom = '\uFEFF';
  let csv = bom + headers.map(escapeCsv).join(',') + '\r\n';
  rows.forEach(function (r) {
    csv += r.map(escapeCsv).join(',') + '\r\n';
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : filename + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Auto-select text on click/focus for number inputs so typing replaces existing content immediately
document.addEventListener('focusin', function (e) {
  if (e.target && e.target.tagName === 'INPUT' && (e.target.type === 'number' || e.target.type === 'text') && e.target.value) {
    if (e.target.type === 'number' || ['fpaid', 'fdiscount', 'flabor', 'fvat', 'pqty', 'pprice'].includes(e.target.id)) {
      setTimeout(() => {
        try { e.target.select(); } catch (err) {}
      }, 20);
    }
  }
});

/* ---------- Offline Invoices Queue & Auto Background Sync ---------- */
window.MST_OFFLINE = {
  getQueue() {
    try { return JSON.parse(localStorage.getItem('mst_offline_queue') || '[]'); }
    catch (_) { return []; }
  },
  saveQueue(q) {
    try { localStorage.setItem('mst_offline_queue', JSON.stringify(q)); }
    catch (_) {}
    this.updateStatus();
  },
  addInvoice(body, localInv) {
    const q = this.getQueue();
    q.push({
      id: localInv.id,
      created_at: new Date().toISOString(),
      body,
      invoice: localInv
    });
    this.saveQueue(q);
    return localInv;
  },
  _isSyncing: false,
  async syncNow() {
    if (this._isSyncing || !navigator.onLine) return;
    const q = this.getQueue();
    if (!q.length) {
      this.updateStatus();
      return;
    }
    this._isSyncing = true;
    this.updateStatus();
    console.log('[OfflineSync] Attempting to sync ' + q.length + ' queued invoices...');
    const remaining = [];
    let syncedCount = 0;
    for (const item of q) {
      try {
        await api('/invoices', { method: 'POST', body: item.body });
        syncedCount++;
      } catch (err) {
        if (!navigator.onLine || err.message.includes('fetch') || err.message.includes('Network') || err.message.includes('অফলাইন') || err.message.includes('503')) {
          remaining.push(item);
        } else {
          console.error('[OfflineSync Item Error]', err.message);
          remaining.push(item);
        }
      }
    }
    this._isSyncing = false;
    this.saveQueue(remaining);
    if (syncedCount > 0) {
      toast('✅ ' + syncedCount + 'টি অফলাইন মেমো সফলভাবে ক্লাউড ও গুগল শিটে সিঙ্ক হয়েছে!');
      if (window.router) {
        try { window.router(); } catch (_) {}
      }
    }
  },
  updateStatus() {
    const badge = $('#offline-sync-badge');
    if (!badge) return;
    const q = this.getQueue();
    if (!navigator.onLine) {
      badge.style.display = 'inline-flex';
      badge.style.background = '#fef2f2';
      badge.style.color = '#991b1b';
      badge.style.border = '1px solid #fecaca';
      badge.innerHTML = '📴 অফলাইন ' + (q.length ? `(${q.length}টি পেন্ডিং)` : '');
    } else if (q.length > 0) {
      badge.style.display = 'inline-flex';
      badge.style.background = '#fefce8';
      badge.style.color = '#854d0e';
      badge.style.border = '1px solid #fde047';
      badge.innerHTML = `🟡 সিঙ্ক হচ্ছে... (${q.length}টি মেমো)`;
    } else {
      badge.style.display = 'none';
    }
  }
};

window.addEventListener('online', () => {
  toast('🌐 ইন্টারনেট ফিরে এসেছে! অফলাইন ডাটা সিঙ্ক হচ্ছে...');
  window.MST_OFFLINE.updateStatus();
  window.MST_OFFLINE.syncNow();
});
window.addEventListener('offline', () => {
  toast('📴 ইন্টারনেট নেই — অফলাইন মোডে স্বয়ংক্রিয় সেভ হচ্ছে।', true);
  window.MST_OFFLINE.updateStatus();
});
setInterval(() => {
  if (navigator.onLine && window.MST_OFFLINE.getQueue().length > 0) {
    window.MST_OFFLINE.syncNow();
  }
}, 15000);


