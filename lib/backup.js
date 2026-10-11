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
  DB.db.stock_ledger = target.stock_ledger || [];
  DB.db.cash_ledger = target.cash_ledger || [];
  DB.db.sessions = Object.assign({}, target.sessions || {}, currentSessions);

  DB.save();
  return { ok: true, message: 'ডাটা সফলভাবে রিস্টোর হয়েছে' };
}

function syncToGoogle(webhookUrl, customPayload) {
  return new Promise((resolve, reject) => {
    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      return reject(new Error('সঠিক গুগল ওয়েবহুক URL প্রদান করুন'));
    }

    const payload = customPayload || {
      action: 'sync_all',
      timestamp: new Date().toISOString(),
      shop_name: (DB.db.settings && DB.db.settings.shop_name) || 'মেসার্স এম.এস ট্রেডার্স',
      products: DB.db.products || [],
      customers: DB.db.customers || [],
      invoices: DB.db.invoices || [],
      expenses: DB.db.expenses || [],
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
        return sendWebhookRequest(res.headers.location, postData, resolve, reject, hops + 1);
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

module.exports = {
  exportDatabase,
  restoreDatabase,
  syncToGoogle,
  pullFromGoogle
};
