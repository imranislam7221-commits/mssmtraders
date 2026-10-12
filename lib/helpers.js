'use strict';
/* helpers: crypto, formatting, errors, http body utils */
const crypto = require('crypto');
/* ---------- utils ---------- */
const sha256 = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const uid = () => crypto.randomBytes(16).toString('hex');
const nowIso = () => new Date().toISOString();
const round2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
function getDhakaDate(iso) {
  const d = iso ? new Date(iso) : new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utc + (6 * 3600000));
}
function dhakaDateStr(iso) {
  return getDhakaDate(iso).toISOString().slice(0, 10);
}
function fmtDT(iso) {
  const d = getDhakaDate(iso);
  const p = n => String(n).padStart(2, '0');
  return p(d.getDate()) + '-' + p(d.getMonth() + 1) + '-' + d.getFullYear() + ' | ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}
class ApiError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 2e6) { reject(new ApiError(413, 'Body too large')); req.destroy(); } });
    req.on('end', () => { if (!data) return resolve({}); try { resolve(JSON.parse(data)); } catch (e) { reject(new ApiError(400, 'Invalid JSON body')); } });
    req.on('error', reject);
  });
}


function prodSort(a, b) {
  const getRank = function (c) {
    const s = (String(c.category || '') + ' ' + String(c.name || '')).toLowerCase();
    if (s.includes('cement') || s.includes('সিমেন্ট') || s.includes('সি প্লাস') || s.includes('c-plus') || s.includes('হোলসিম')) return 0;
    if (s.includes('rod') || s.includes('রড') || s.includes('বিএসআরএম') || s.includes('bsrm') || s.includes('বার')) return 1;
    if (s.includes('balu') || s.includes('bali') || s.includes('বালু') || s.includes('বালি') || s.includes('sand')) return 2;
    if (s.includes('khua') || s.includes('khoa') || s.includes('খোয়া') || s.includes('খোয়া') || s.includes('chips')) return 3;
    if (s.includes('ইট') || s.includes('brick') || s.includes('eat') || s.includes('eaat')) return 4;
    return 5;
  };
  const ra = getRank(a), rb = getRank(b);
  if (ra !== rb) return ra - rb;
  const sa = a.size_mili == null ? null : +a.size_mili, sb = b.size_mili == null ? null : +b.size_mili;
  if (sa != null && sb != null && sa !== sb) return sa - sb;
  return String(a.name || '').localeCompare(String(b.name || ''));
}

function toAsciiDigits(s) {
  if (!s) return '';
  const bn = '০১২৩৪৫৬৭৮৯';
  return String(s).replace(/[০-৯]/g, d => bn.indexOf(d));
}

module.exports = { sha256, uid, nowIso, round2, fmtDT, ApiError, sendJson, readBody, prodSort, getDhakaDate, dhakaDateStr, toAsciiDigits };
