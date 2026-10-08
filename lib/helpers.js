'use strict';
/* helpers: crypto, formatting, errors, http body utils */
const crypto = require('crypto');
/* ---------- utils ---------- */
const sha256 = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const uid = () => crypto.randomBytes(16).toString('hex');
const nowIso = () => new Date().toISOString();
const round2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
function fmtDT(iso) {
  const d = new Date(iso);
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


module.exports = { sha256, uid, nowIso, round2, fmtDT, ApiError, sendJson, readBody };
