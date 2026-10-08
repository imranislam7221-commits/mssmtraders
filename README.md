# 🔧 M/S S.M. Traders — POS & Inventory System

Desktop PC এবং Mobile Browser — দুটোতেই চলে (100% responsive)।
PC বন্ধ থাকলেও একই WiFi-তে মোবাইল থেকে বিল করা যায়।

## চালু করার নিয়ম

1. **`start.bat` ডাবল-ক্লিক করুন** (Node.js লাগবে, অন্য কিছু লাগবে না)
2. Browser এ খুলে যাবে: `http://localhost:3000`
3. মোবাইল থেকে খুলতে: server window-তে যে **Mobile (same WiFi)** address দেখায়, সেটা মোবাইল browser-এ খুলুন

## Login

| Role | Email | Password |
|---|---|---|
| 👑 Owner (সব এক্সেস) | `owner@shop.com` | `owner123` |
| 🧑‍💼 Manager (POS + Stock In) | `manager@shop.com` | `manager123` |

- Owner & Manager: same full access (owner@shop.com / owner123, manager@shop.com / manager123)

## Features

- **POS Billing** — searchable item dropdown, qty + price দিলেই subtotal → discount/VAT → net payable auto
- **Stock Ledger** — Opening / Stock In (+) / Stock Out (−) / Current, প্রতিটা movement time-stamped + user-সহ
- **Baki Management** — প্রতি customer-এর আলাদা ledger, dashboard-এ **সর্বমোট বাকি** widget, due collect + statement print
- **Invoice print** — 80mm thermal receipt (PC USB printer + mobile Bluetooth printer দুটোতেই কাজ করে)
- **SMS (MiMSMS API V2)** — Settings এ API key/panel email/sender ID দিলে bill হলেই SMS যাবে (`POST https://mimsms.com`)
- **WhatsApp** — customer profile-এ WhatsApp enabled থাকলে full statement WhatsApp-এ পাঠানোর বাটন
- **Audit** — প্রতিটা লেনদেনে `DD-MM-YYYY | HH:MM:SS` stamp + কোন user করলো

## Data

সব ডাটা থাকে `data/db.json` ফাইলে — backup নিতে চাইলে এই ফাইলটা কপি করে রাখুন।

> **Data reset:** নতুন দোকানে fresh শুরু করতে চাইলে `data/db.json` ডিলিট করে server restart দিন — seed data (দোকান settings + demo login) auto তৈরি হবে।

> নোট: এটা local demo-ready build। Cloud hosting (DigitalOcean/AWS) এ তুলতে একই ফোল্ডার deploy করলেই হবে, তখন multi-device real-time sync সব ডিভাইসে একসাথে কাজ করবে।
