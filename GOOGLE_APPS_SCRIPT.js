/**
 * ==============================================================================
 * মেসার্স এম.এস ট্রেডার্স — Google Sheet & Google Drive Auto-Sync Webhook Script
 * ==============================================================================
 * 
 * ব্যবহারের নিয়ম (৩ মিনিটে সেটআপ):
 * ১. আপনার Gmail দিয়ে drive.google.com এ যান এবং একটি নতুন Google Sheet খুলুন (নাম দিন: "MS Traders Backup")।
 * ২. শিটের উপরের মেনু থেকে: Extensions (এক্সটেনশন) > Apps Script এ ক্লিক করুন।
 * ৩. আগের সব কোড মুছে এই সম্পূর্ণ কোডটি পেস্ট করুন এবং Save (Ctrl+S) দিন।
 * ৪. উপরের ডানপাশে Deploy > New deployment সিলেক্ট করুন:
 *    - Select type: "Web app" (গিয়ার আইকনে ক্লিক করে)
 *    - Description: "MS Traders POS Sync"
 *    - Execute as: "Me (আপনার জিমেইল)"
 *    - Who has access: "Anyone" (যাতে আপনার POS সফটওয়্যার থেকে ডাটা ঢুকতে পারে)
 * ৫. "Deploy" চাপুন এবং Google একাউন্টে Allow/Authorize পারমিশন দিন।
 * ৬. আপনি একটি "Web app URL" পাবেন (যেমন: https://script.google.com/macros/s/.../exec)।
 * ৭. এই URL টি কপি করে আপনার POS সফটওয়্যারের Settings > "গুগল শিট / ড্রাইভ ওয়েবহুক লিঙ্ক" এ পেস্ট করে সেভ করুন!
 * ==============================================================================
 */

function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);

    // ১. গুগল ড্রাইভে সম্পূর্ণ ডাটাবেজ ব্যাকআপ ফাইল সেভ
    saveBackupToGoogleDrive(data.full_db_json || rawData);

    // ২. গুগল শিটের আলাদা আলাদা ট্যাবে ডাটা আপডেট
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (data.invoices && Array.isArray(data.invoices)) {
      updateInvoicesSheet(ss, data.invoices);
    }
    if (data.expenses && Array.isArray(data.expenses)) {
      updateExpensesSheet(ss, data.expenses);
    }
    if (data.customers && Array.isArray(data.customers)) {
      updateCustomersSheet(ss, data.customers);
    }
    if (data.products && Array.isArray(data.products)) {
      updateProductsSheet(ss, data.products);
    }

    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      message: 'গুগল শিট ও গুগল ড্রাইভে ব্যাকআপ সফল হয়েছে',
      updated_at: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || '';

    // নতুন ডিভাইসে ডাটা রিস্টোর করার জন্য কল
    if (action === 'pull_backup') {
      var jsonContent = getBackupFromGoogleDrive();
      if (!jsonContent) {
        return ContentService.createTextOutput(JSON.stringify({
          ok: false,
          error: 'গুগল ড্রাইভে কোনো ব্যাকআপ ফাইল পাওয়া যায়নি'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify({
        ok: true,
        full_db_json: jsonContent
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'active',
      shop: 'মেসার্স এম.এস ট্রেডার্স',
      message: 'গুগল সিঙ্ক ওয়েবহুক সচল আছে ✅'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ---------------- Google Drive Helpers ----------------
function saveBackupToGoogleDrive(jsonString) {
  var fileName = 'MS_Traders_Backup.json';
  var files = DriveApp.getFilesByName(fileName);
  if (files.hasNext()) {
    var file = files.next();
    file.setContent(jsonString);
  } else {
    DriveApp.createFile(fileName, jsonString, MimeType.PLAIN_TEXT);
  }
}

function getBackupFromGoogleDrive() {
  var fileName = 'MS_Traders_Backup.json';
  var files = DriveApp.getFilesByName(fileName);
  if (files.hasNext()) {
    var file = files.next();
    return file.getBlob().getDataAsString();
  }
  return null;
}

// ---------------- Google Sheets Tab Helpers ----------------
function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#1e3a8a").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function updateInvoicesSheet(ss, invoices) {
  var headers = ['ইনভয়েস নং', 'তারিখ', 'কাস্টমার নাম', 'মোবাইল', 'মোট বিল (৳)', 'জমা/নগদ (৳)', 'বাকি (৳)', 'অবস্থা', 'ইউজার'];
  var sheet = getOrCreateSheet(ss, 'বিক্রয় রশিদ', headers);
  sheet.clearContents();
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#1e3a8a").setFontColor("#ffffff");

  var rows = invoices.map(function(i) {
    return [
      i.id,
      i.date || i.timestamp || '',
      i.customer_name || 'সাধারণ ক্রেতা',
      i.customer_phone || '',
      i.grand_total || i.subtotal || 0,
      i.paid_amount || 0,
      i.due_amount || 0,
      i.status || 'PAID',
      i.user_name || ''
    ];
  });
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function updateExpensesSheet(ss, expenses) {
  var headers = ['খরচ আইডি', 'তারিখ', 'খাত', 'প্রাপক', 'পরিমাণ (৳)', 'পেমেন্ট মাধ্যম', 'নোট', 'ইউজার'];
  var sheet = getOrCreateSheet(ss, 'খরচের হিসাব', headers);
  sheet.clearContents();
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#991b1b").setFontColor("#ffffff");

  var rows = expenses.map(function(e) {
    return [
      e.id,
      e.date || e.timestamp || '',
      e.category || '',
      e.paid_to || '',
      e.amount || 0,
      e.payment_method || 'নগদ',
      e.note || '',
      e.user_name || ''
    ];
  });
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function updateCustomersSheet(ss, customers) {
  var headers = ['কাস্টমার আইডি', 'নাম', 'মোবাইল', 'ঠিকানা', 'বর্তমান বাকি (৳)'];
  var sheet = getOrCreateSheet(ss, 'কাস্টমার ও বাকি', headers);
  sheet.clearContents();
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0f766e").setFontColor("#ffffff");

  var rows = customers.map(function(c) {
    return [
      c.id,
      c.name || '',
      c.phone || '',
      c.address || '',
      c.total_due || 0
    ];
  });
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function updateProductsSheet(ss, products) {
  var headers = ['পণ্য আইডি', 'নাম', 'ক্যাটাগরি', 'বর্তমান স্টক', 'একক', 'ক্রয় মূল্য (৳)', 'বিক্রয় মূল্য (৳)'];
  var sheet = getOrCreateSheet(ss, 'পণ্য ও স্টক', headers);
  sheet.clearContents();
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0369a1").setFontColor("#ffffff");

  var rows = products.map(function(p) {
    return [
      p.id,
      p.name || '',
      p.category || '',
      p.current_stock || 0,
      p.unit || '',
      p.purchase_price || 0,
      p.selling_price || 0
    ];
  });
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}
