'use strict';
/**
 * মেসার্স এম.এস ট্রেডার্স — GitHub Database Auto-Sync Module
 * স্বয়ংক্রিয়ভাবে ডাটাবেজের প্রতিটা পরিবর্তন গিটহাবে ব্যাকআপ করে।
 * Render স্লিপ/রিস্টার্ট হলেও কোনো ডাটা মুছবে না।
 */
const https = require('https');
const path = require('path');
const fs = require('fs');

const GITHUB_REPO = process.env.GITHUB_REPO || 'imranislam7221-commits/mssmtraders';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const TARGET_PATH = 'data/db.json';

function getGithubToken() {
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim()) {
    return process.env.GITHUB_TOKEN.trim();
  }
  const tokenFile = path.join(__dirname, '..', 'data', '.gh_token');
  if (fs.existsSync(tokenFile)) {
    try {
      return fs.readFileSync(tokenFile, 'utf8').trim();
    } catch (_) {}
  }
  return '';
}

let _ghSyncTimer = null;
let _isSyncing = false;

function ghApiRequest(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path: endpoint,
      method,
      headers: {
        'User-Agent': 'MST-POS-AutoSync/1.0',
        'Authorization': 'token ' + getGithubToken(),
        'Accept': 'application/vnd.github.v3+json',
        ...(postData ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) } : {})
      }
    }, res => {
      let out = '';
      res.on('data', chunk => out += chunk);
      res.on('end', () => {
        let json = {};
        try { json = JSON.parse(out); } catch (_) {}
        resolve({ status: res.statusCode, data: json });
      });
    });
    req.on('error', reject);
    req.setTimeout(25000, () => {
      req.destroy();
      reject(new Error('GitHub API timeout (25s)'));
    });
    if (postData) req.write(postData);
    req.end();
  });
}

/**
 * Perform sync of data/db.json to GitHub
 */
async function syncToGithubNow(dbData) {
  const token = getGithubToken();
  if (!token || !GITHUB_REPO) {
    console.warn('[GitHubSync] Missing GITHUB_TOKEN or GITHUB_REPO, skipping.');
    return { ok: false, reason: 'unconfigured' };
  }
  if (_isSyncing) {
    console.log('[GitHubSync] Another sync is already in progress, will retry shortly.');
    return { ok: false, reason: 'busy' };
  }
  _isSyncing = true;
  try {
    const localContent = JSON.stringify(dbData, null, 2);
    const localBase64 = Buffer.from(localContent, 'utf8').toString('base64');

    // 1. Get current remote file metadata (to get latest SHA and avoid duplicate commits)
    const getRes = await ghApiRequest('GET', `/repos/${GITHUB_REPO}/contents/${TARGET_PATH}?ref=${GITHUB_BRANCH}`);
    let remoteSha = null;
    if (getRes.status === 200 && getRes.data && getRes.data.sha) {
      remoteSha = getRes.data.sha;
      // Compare content: if already identical, skip commit
      if (getRes.data.content) {
        const cleanRemote = getRes.data.content.replace(/\r?\n/g, '');
        const cleanLocal = localBase64.replace(/\r?\n/g, '');
        if (cleanRemote === cleanLocal) {
          console.log('[GitHubSync] Remote db.json is already identical to local. No commit needed.');
          _isSyncing = false;
          return { ok: true, skipped: true };
        }
      }
    }

    // 2. Commit update to GitHub with [skip render] [skip ci]
    const body = {
      message: 'chore(data): auto-sync database [skip render] [skip ci]',
      content: localBase64,
      branch: GITHUB_BRANCH
    };
    if (remoteSha) body.sha = remoteSha;

    const putRes = await ghApiRequest('PUT', `/repos/${GITHUB_REPO}/contents/${TARGET_PATH}`, body);
    if (putRes.status === 200 || putRes.status === 201) {
      console.log(`[GitHubSync] ✅ Successfully committed database to GitHub ${GITHUB_BRANCH} branch (Commit: ${putRes.data?.commit?.sha?.slice(0, 7)})!`);
      _isSyncing = false;
      return { ok: true, commit: putRes.data?.commit?.sha };
    } else {
      console.error('[GitHubSync] Failed to commit to GitHub:', putRes.status, putRes.data?.message);
      _isSyncing = false;
      return { ok: false, error: putRes.data?.message };
    }
  } catch (err) {
    console.error('[GitHubSync Exception]', err.message);
    _isSyncing = false;
    return { ok: false, error: err.message };
  }
}

/**
 * Debounced trigger (wait 4 seconds of idle time after last db save)
 */
function triggerSyncToGithub(getDbFn) {
  if (_ghSyncTimer) clearTimeout(_ghSyncTimer);
  _ghSyncTimer = setTimeout(() => {
    try {
      const db = typeof getDbFn === 'function' ? getDbFn() : require('./db').db;
      if (db) syncToGithubNow(db);
    } catch (e) {
      console.error('[GitHubSync trigger error]', e.message);
    }
  }, 4000);
}

module.exports = {
  syncToGithubNow,
  triggerSyncToGithub,
  ghApiRequest
};
