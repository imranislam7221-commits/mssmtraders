'use strict';
/* Jaia Hardware POS — frontend SPA (vanilla JS) */

/* ---------- state + helpers ---------- */
const S = { token: localStorage.getItem('pos_token') || '', user: null, cart: [], posCustomer: null };
const $ = sel => document.querySelector(sel);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '৳ ' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const fmtDate = iso => { const d = new Date(iso); const p = x => String(x).padStart(2, '0'); return p(d.getDate()) + '-' + p(d.getMonth() + 1) + '-' + d.getFullYear(); };
const fmtDT = iso => { const d = new Date(iso); const p = x => String(x).padStart(2, '0'); return p(d.getDate()) + '-' + p(d.getMonth() + 1) + '-' + d.getFullYear() + ' | ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()); };
const isOwner = () => S.user && S.user.role === 'owner';
let toastTimer = null;
function toast(msg, isErr) { const t = $('#toast') || Object.assign(document.body.appendChild(document.createElement('div')), { id: 'toast' }); t.id = 'toast'; t.textContent = msg; t.className = isErr ? 'err' : ''; t.style.display = 'block'; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.style.display = 'none', 3200); }
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (S.token) headers['Authorization'] = 'Bearer ' + S.token;
  const res = await fetch('/api' + path, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  let data = {};
  try { data = await res.json(); } catch (e) {}
  if (res.status === 401 && S.token) { S.token = ''; S.user = null; localStorage.removeItem('pos_token'); location.hash = '#/login'; throw new Error(data.error || 'Session expired'); }
  if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
  return data;
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
  const rank = function (c) { const cat = (String(c.category || '') + ' ' + String(c.name || '')).toLowerCase(); if (cat.indexOf('rod') >= 0) return 0; if (cat.indexOf('cement') >= 0) return 1; return 2; };
  const ra = rank(a), rb = rank(b);
  if (ra !== rb) return ra - rb;
  const sa = a.size_mili == null ? null : +a.size_mili, sb = b.size_mili == null ? null : +b.size_mili;
  if (sa != null && sb != null && sa !== sb) return sa - sb;
  return String(a.name).localeCompare(String(b.name));
}
