'use strict';
const https = require('https');
const http = require('http');
const { URL } = require('url');
const DB = require('./db');

function exportDatabase() {
  // Deep copy db
  const data = JSON.parse(JSON.stringify(DB.db));
  return {
    version: '1.0',
    exported_at: new Date().toISOString(),
    shop_name: (data.settings && data.settings.shop_name) || 'মেসার্স এম.এস ট্রেডার্স',
    db: data
  };
}

function restoreDatabase(importedData) {
  if (!importedData) throw new Error('কোনো ব্যাকআপ ডাটা পাওয়া যায়নি');
  const target = importedData.db || importedData;
  if (!target.products || !target.customers || !target.invoices) {
    throw new Error('অবৈধ ব্যাকআপ ফাইল — প্রয়োজনীয় টেবিল অনুপস্থিত');
  }

  // Preserve existing active sessions so user is not forcibly logged out
  const currentSessions = DB.db.sessions || {};

  DB.db.settings = target.settings || DB.db.settings;
  DB.db.users = target.users || DB.db.users;
  DB.db.products = target.products || [];
  DB.db.customers = target.customers || [];
  DB.db.invoices = target.invoices || [];
  DB.db.expenses = target.expenses || [];
  DB.db.incomes = target.incomes || [];
  DB.db.stock_ledger = target.stock_ledger || [];
  DB.db.cash_ledger = target.cash_ledger || [];
  DB.db.sessions = Object.assign({}, target.sessions || {}, currentSessions);

  if (typeof DB.saveDb === 'function') DB.saveDb();
  else if (typeof DB.save === 'function') DB.save();
  return { ok: true, message: 'ডাটা সফলভাবে রিস্টোর হয়েছে' };
}

function syncToGoogle(webhookUrl, customPayload) {
  return new Promise((resolve, reject) => {
    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      return reject(new Error('সঠিক গুগল ওয়েবহুক URL প্রদান করুন'));
    }

    const customersList = DB.db.customers || [];
    const formattedInvoices = (DB.db.invoices || []).map(inv => {
      const cust = inv.customer_id ? customersList.find(c => c.id === inv.customer_id) : null;
      const effectiveDue = (inv.net_due !== undefined && inv.net_due !== null) ? inv.net_due : (inv.due || 0);
      return {
        id: inv.invoice_no || ('INV-' + inv.id),
        invoice_no: inv.invoice_no || ('INV-' + inv.id),
        date: inv.time_display ? inv.time_display.split(' | ')[0] : (inv.date || inv.timestamp || ''),
        customer_name: inv.customer_name || (cust ? cust.name : 'নগদ কাস্টমার'),
        customer_phone: (cust && cust.phone) || '',
        grand_total: inv.total != null ? inv.total : (inv.grand_total || 0),
        total: inv.total != null ? inv.total : (inv.grand_total || 0),
        subtotal: inv.subtotal != null ? inv.subtotal : (inv.total || 0),
        paid_amount: inv.paid != null ? inv.paid : (inv.paid_amount || 0),
        paid: inv.paid != null ? inv.paid : (inv.paid_amount || 0),
        due_amount: effectiveDue,
        due: effectiveDue,
        status: (effectiveDue > 0) ? ('বাকি (' + effectiveDue + ' ৳)') : 'পরিশোধিত (PAID)',
        user_name: inv.user_name || ''
      };
    });

    const payload = customPayload || {
      action: 'sync_all',
      timestamp: new Date().toISOString(),
      shop_name: (DB.db.settings && DB.db.settings.shop_name) || 'মেসার্স এম.এস ট্রেডার্স',
      products: DB.db.products || [],
      customers: customersList,
      invoices: formattedInvoices,
      expenses: DB.db.expenses || [],
      incomes: DB.db.incomes || [],
      cash_ledger: DB.db.cash_ledger || [],
      stock_ledger: DB.db.stock_ledger || [],
      full_db_json: JSON.stringify(DB.db)
    };

    const postData = JSON.stringify(payload);
    sendWebhookRequest(webhookUrl, postData, resolve, reject);
  });
}

function pullFromGoogle(webhookUrl) {
  return new Promise((resolve, reject) => {
    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      return reject(new Error('সঠিক গুগল ওয়েবহুক URL প্রদান করুন'));
    }

    const pullUrl = webhookUrl + (webhookUrl.includes('?') ? '&' : '?') + 'action=pull_backup';
    fetchUrl(pullUrl, (err, body) => {
      if (err) return reject(err);
      try {
        const json = JSON.parse(body);
        if (json.full_db_json) {
          const parsed = JSON.parse(json.full_db_json);
          restoreDatabase({ db: parsed });
          return resolve({ ok: true, message: 'গুগল ড্রাইভ থেকে সফলভাবে ডাটা রিস্টোর হয়েছে' });
        } else if (json.products && json.invoices) {
          restoreDatabase({ db: json });
          return resolve({ ok: true, message: 'গুগল শিট থেকে সফলভাবে ডাটা রিস্টোর হয়েছে' });
        } else {
          return reject(new Error(json.error || 'গুগল ড্রাইভে কোনো ব্যাকআপ ডাটা খুঁজে পাওয়া যায়নি'));
        }
      } catch (ex) {
        reject(new Error('গুগল থেকে প্রাপ্ত ডাটা পার্স করা সম্ভব হয়নি: ' + ex.message));
      }
    });
  });
}

// Follow Google Apps Script 302 redirects automatically
function sendWebhookRequest(targetUrl, postData, resolve, reject, hops = 0) {
  if (hops > 5) return reject(new Error('Too many redirects'));
  try {
    const u = new URL(targetUrl);
    const client = u.protocol === 'https:' ? https : http;
    const req = client.request(u, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location, (err, data) => {
          if (err) return reject(err);
          try {
            resolve(JSON.parse(data));
          } catch (_) {
            resolve({ ok: true, raw: data });
          }
        });
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (_) {
          resolve({ ok: true, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(25000, () => {
      req.destroy();
      reject(new Error('গুগল সার্ভার রেসপন্স দিতে দেরি করছে (টাইমআউট)'));
    });
    req.write(postData);
    req.end();
  } catch (err) {
    reject(err);
  }
}

function fetchUrl(targetUrl, cb, hops = 0) {
  if (hops > 5) return cb(new Error('Too many redirects'));
  try {
    const u = new URL(targetUrl);
    const client = u.protocol === 'https:' ? https : http;
    client.get(u, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location, cb, hops + 1);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => cb(null, data));
    }).on('error', cb);
  } catch (err) {
    cb(err);
  }
}

const CLOUD_URL = process.env.CLOUD_SYNC_URL || 'https://mssmtraders-pos.onrender.com';

function pushToCloud(email, password) {
  return new Promise((resolve, reject) => {
    const userEmail = email || 'mssmtradersdokan@gmail.com';
    const userPass = password || 'Smtradersdokan';

    const loginPayload = JSON.stringify({ email: userEmail, password: userPass });
    const loginUrl = new URL(CLOUD_URL + '/api/login');
    const client = loginUrl.protocol === 'https:' ? https : http;

    const req = client.request(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginPayload)
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const resJson = JSON.parse(data);
          if (!resJson.token) return reject(new Error(resJson.error || 'ক্লাউড লগইন ব্যর্থ হয়েছে'));
          
          const backupPayload = JSON.stringify(exportDatabase());
          const restoreUrl = new URL(CLOUD_URL + '/api/backup/restore');
          const pushReq = client.request(restoreUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + resJson.token,
              'Content-Length': Buffer.byteLength(backupPayload)
            }
          }, pushRes => {
            let pData = '';
            pushRes.on('data', c => pData += c);
            pushRes.on('end', () => {
              try {
                const pJson = JSON.parse(pData);
                if (pushRes.statusCode === 200 && pJson.ok) {
                  resolve({ ok: true, message: 'অনলাইন ক্লাউডে সফলভাবে সমস্ত ডাটা সিঙ্ক হয়েছে ✅' });
                } else {
                  reject(new Error(pJson.error || 'ক্লাউড পুশ ব্যর্থ হয়েছে'));
                }
              } catch (ex) {
                reject(new Error('ক্লাউড রেসপন্স পার্স করা যায়নি'));
              }
            });
          });
          pushReq.on('error', reject);
          pushReq.write(backupPayload);
          pushReq.end();
        } catch (ex) {
          reject(new Error('লগইন রেসপন্স অবৈধ: ' + ex.message));
        }
      });
    });
    req.on('error', reject);
    req.write(loginPayload);
    req.end();
  });
}

function pullFromCloud(email, password) {
  return new Promise((resolve, reject) => {
    const userEmail = email || 'mssmtradersdokan@gmail.com';
    const userPass = password || 'Smtradersdokan';

    const loginPayload = JSON.stringify({ email: userEmail, password: userPass });
    const loginUrl = new URL(CLOUD_URL + '/api/login');
    const client = loginUrl.protocol === 'https:' ? https : http;

    const req = client.request(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginPayload)
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const resJson = JSON.parse(data);
          if (!resJson.token) return reject(new Error(resJson.error || 'ক্লাউড লগইন ব্যর্থ হয়েছে'));
          
          const exportUrl = new URL(CLOUD_URL + '/api/backup/export');
          const pullReq = client.request(exportUrl, {
            method: 'GET',
            headers: {
              'Authorization': 'Bearer ' + resJson.token
            }
          }, pullRes => {
            let pData = '';
            pullRes.on('data', c => pData += c);
            pullRes.on('end', () => {
              try {
                const cloudDb = JSON.parse(pData);
                restoreDatabase(cloudDb);
                resolve({ ok: true, message: 'অনলাইন ক্লাউড থেকে সফলভাবে সমস্ত ডাটা রিস্টোর হয়েছে ✅' });
              } catch (ex) {
                reject(new Error('ক্লাউড ডাটা পার্স করা যায়নি'));
              }
            });
          });
          pullReq.on('error', reject);
          pullReq.end();
        } catch (ex) {
          reject(new Error('লগইন রেসপন্স অবৈধ: ' + ex.message));
        }
      });
    });
    req.on('error', reject);
    req.write(loginPayload);
    req.end();
  });
}

module.exports = {
  exportDatabase,
  restoreDatabase,
  syncToGoogle,
  pullFromGoogle,
  pushToCloud,
  pullFromCloud
};
