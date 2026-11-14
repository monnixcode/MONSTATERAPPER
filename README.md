<p align="center">
  <img src="public/logo.png" alt="Mon HipHop" width="120">
</p>

<h1 align="center">Mon HipHop</h1>

<p align="center">
  เว็บไซต์ค่ายเพลง · ศิลปิน ผลงาน วิดีโอ และหลังบ้านสำหรับศิลปิน<br>
  <sub>Static site + Supabase + Cloudflare Pages Functions — ไม่ต้องใช้ build step</sub>
</p>

<p align="center">
  <img alt="Hosting" src="https://img.shields.io/badge/hosting-Cloudflare%20Pages-F38020?logo=cloudflare&logoColor=white">
  <img alt="Backend" src="https://img.shields.io/badge/backend-Supabase-3ECF8E?logo=supabase&logoColor=white">
  <img alt="Stack" src="https://img.shields.io/badge/stack-HTML%20%C2%B7%20CSS%20%C2%B7%20vanilla%20JS-d4a64a">
  <img alt="Build" src="https://img.shields.io/badge/build%20step-none-2ea44f">
</p>

---

## สารบัญ

- [ฟีเจอร์](#ฟีเจอร์)
- [โครงสร้างโปรเจกต์](#โครงสร้างโปรเจกต์)
- [เริ่มต้นอย่างรวดเร็ว](#เริ่มต้นอย่างรวดเร็ว)
- [ตั้งค่า Supabase](#ตั้งค่า-supabase)
- [Deploy บน Cloudflare Pages](#deploy-บน-cloudflare-pages)
- [แชร์โปรไฟล์และวิดีโอ](#แชร์โปรไฟล์และวิดีโอ)
- [หน้าหลังบ้าน (Admin)](#หน้าหลังบ้าน-admin)
- [Deploy บน GitHub Pages (ทางเลือก)](#deploy-บน-github-pages-ทางเลือก)
- [ปัญหาที่พบบ่อย](#ปัญหาที่พบบ่อย)
- [ความปลอดภัย](#ความปลอดภัย)

---

## ฟีเจอร์

| ส่วน | สิ่งที่ทำได้ |
|---|---|
| **หน้าศิลปิน** | รายชื่อศิลปิน, โปรไฟล์ `/a/<username>` พร้อมรูป Cover, รูปโปรไฟล์, Bio, เพลง และวิดีโอ |
| **ผลงาน** | ซิงเกิล / EP / อัลบั้ม พร้อมปกและลิงก์ฟังบนแพลตฟอร์มต่าง ๆ |
| **เพลเยอร์** | แถบเล่นเพลงแบบ Spotify: คิว, shuffle, repeat, ควบคุมจาก lock screen ได้ |
| **วิดีโอเพลง** | อัปโหลดไฟล์ MP4 / WebM / MOV (≤ 50 MB) หรือวางลิงก์ YouTube |
| **แชร์** | Facebook, X, LINE, WhatsApp, Telegram, Threads, Reddit, Instagram, TikTok, Email พร้อมการ์ดพรีวิวที่มีรูปและชื่อ |
| **Dashboard ศิลปิน** | สมัคร / เข้าสู่ระบบ แก้โปรไฟล์ เพลง และวิดีโอของตัวเองได้ |
| **หลังบ้านแอดมิน** | จัดการทุกส่วน, ข้อความติดต่อ, ข่าว, และ **Activity log** ว่าใครแก้อะไรเมื่อไหร่ |
| **SEO** | `sitemap.xml`, `robots.txt`, canonical URL และ Open Graph ในหน้าสาธารณะทั้งหมด |

## โครงสร้างโปรเจกต์

```
MONSTATERAPPER/
├── public/                  ← ไฟล์ที่เผยแพร่ทั้งหมด (Cloudflare build output)
│   ├── index.html, artists.html, releases.html, videos.html, news.html, ...
│   ├── artist.html          ← เทมเพลตโปรไฟล์ศิลปิน (ใช้กับ /a/<name>)
│   ├── account.html         ← Dashboard ศิลปิน
│   ├── panel-x7k2.html      ← หน้าแอดมิน (ไม่ลิงก์จากเว็บ, noindex)
│   ├── assets/
│   │   ├── css/             ← site.css · account.css · admin.css
│   │   └── js/              ← config.js · app.js · auth.js · admin.js
│   ├── images/              ← รูปศิลปิน / ปกเพลง
│   ├── logo.png · 404.html · _headers · robots.txt · sitemap.xml
│
├── functions/               ← Cloudflare Pages Functions (ทำงานบนเซิร์ฟเวอร์ ไม่ถูกเผยแพร่เป็นไฟล์)
│   ├── a/[handle].js        ← พรีวิวการแชร์โปรไฟล์ศิลปิน
│   └── v/[id].js            ← พรีวิวการแชร์วิดีโอ
│
├── supabase/
│   ├── ALL-IN-ONE.sql       ← รันไฟล์นี้ไฟล์เดียวใน SQL Editor
│   └── parts/               ← แยกตามส่วนไว้อ้างอิง (ไม่ต้องรัน)
│
├── scripts/gen-share-pages.mjs   ← สร้างหน้าพรีวิวแบบ static (ใช้เฉพาะ GitHub Pages)
├── .github/workflows/            ← workflow ของ GitHub Pages (ทางเลือก)
├── wrangler.toml            ← ตั้งค่า Cloudflare Pages
└── CNAME                    ← โดเมนสำหรับ GitHub Pages
```

> **หลักการ:** ทุกอย่างใน `public/` เป็นเว็บ static ล้วน ๆ ส่วนที่ต้องทำงานฝั่งเซิร์ฟเวอร์ (พรีวิวการแชร์) อยู่ใน `functions/` และข้อมูลทั้งหมดอยู่ใน Supabase

## เริ่มต้นอย่างรวดเร็ว

1. **ตั้งค่า Supabase** — ดูหัวข้อ [ตั้งค่า Supabase](#ตั้งค่า-supabase)
2. **แก้ค่าเชื่อมต่อ** ในไฟล์ `public/assets/js/config.js`

   ```js
   const SUPABASE_URL      = "https://xxxxxxxx.supabase.co";
   const SUPABASE_ANON_KEY = "eyJhbGciOi...";   // anon/public key เท่านั้น ห้ามใส่ service_role key
   ```

3. **ทดสอบบนเครื่อง** — ไม่ต้องติดตั้งอะไร เปิด `public/index.html` ผ่าน local server ก็ได้ เช่น
   `npx serve public` หรือ `python3 -m http.server --directory public`
4. **Deploy** — ทำตามหัวข้อ [Deploy บน Cloudflare Pages](#deploy-บน-cloudflare-pages)

## ตั้งค่า Supabase

1. สร้างโปรเจกต์ที่ [supabase.com](https://supabase.com) → **SQL Editor → New query**
2. เปิดไฟล์ `supabase/ALL-IN-ONE.sql` วางทั้งไฟล์ แล้วกด **Run**
   - ทำงานเป็น transaction เดียว ถ้าพังจะไม่มีอะไรเปลี่ยน
   - รันซ้ำได้โดยไม่ทำข้อมูลเสียหาย
3. **เปลี่ยนอีเมลแอดมิน** — ค้นหา `REGISTER ADMIN EMAIL` ในไฟล์ แล้วแก้เป็นอีเมลของคุณก่อนรัน
4. ไปที่ **Authentication → Users → Add user** สร้างผู้ใช้ด้วยอีเมลเดียวกันและตั้งรหัสผ่าน
5. (แนะนำ) ตั้ง **Authentication → URL Configuration** ให้ Site URL เป็นโดเมนจริงของเว็บ เพื่อให้ลิงก์ยืนยันอีเมลและรีเซ็ตรหัสผ่านทำงาน

> **เพิ่มเติม:** ถ้าเป็น Storage bucket `media` ไฟล์ทั้งหมดจะถูกเก็บที่นั่น จำกัดขนาด 50 MB ต่อไฟล์ตามแพ็กเกจฟรี

## Deploy บน Cloudflare Pages

**วิธีที่แนะนำ** — เชื่อม GitHub repo กับ Cloudflare โดยตรง ทุกครั้งที่ push จะ deploy ให้อัตโนมัติ

1. **Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git**
2. เลือก repo นี้ แล้วตั้งค่า:

   | ช่อง | ค่า |
   |---|---|
   | Production branch | `main` |
   | Framework preset | None |
   | Build command | *(เว้นว่าง)* |
   | Build output directory | `public` |
   | Root directory | `/` (ค่าเริ่มต้น) |

3. กด **Save and Deploy** รอประมาณ 1 นาที จะได้ URL แบบ `monhiphop.pages.dev`
4. **ผูกโดเมนจริง:** Pages project → **Custom domains → Set up a custom domain** แล้วทำตามที่ Cloudflare แนะนำ

> `functions/` ที่อยู่ที่รากโปรเจกต์จะถูกเปิดใช้งานอัตโนมัติ ไม่ต้องตั้งค่าเพิ่ม ส่วน `wrangler.toml` เป็นการบันทึกค่าเดียวกันไว้ในโค้ด ถ้า Dashboard ตั้ง Build output directory เป็น `public` แล้วก็พอ

**ตรวจสอบหลัง deploy**
- เปิด `/a/<username>` ของศิลปินที่มีอยู่ → ควรเห็นโปรไฟล์
- วาง URL ของโปรไฟล์ลงในช่องแชท (เช่น LINE หรือ Facebook Sharing Debugger) → ควรเห็นการ์ดพรีวิวพร้อมรูปและชื่อศิลปิน

## แชร์โปรไฟล์และวิดีโอ

| ประเภท | URL | รูปที่แสดงในพรีวิว |
|---|---|---|
| โปรไฟล์ศิลปิน | `/a/<username>` | รูป Cover → รูปโปรไฟล์ → `logo.png` |
| วิดีโอ | `/v/<id>` | Thumbnail ที่อัปโหลด → Thumbnail ของ YouTube → รูปศิลปิน → `logo.png` |

- บน Cloudflare Pages พรีวิวสร้าง **แบบสดทุกครั้ง** จากข้อมูลล่าสุดใน Supabase
- ถ้าเปลี่ยนรูปแล้วยังเห็นของเก่าในแชท ให้ล้างแคชที่ [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) หรือ LINE Page Cache Remover

## หน้าหลังบ้าน (Admin)

- เข้าที่ **`/panel-x7k2.html`** (ไม่มีลิงก์จากหน้าเว็บ) ล็อกอินด้วยอีเมลแอดมิน
- เมนูด้านซ้าย: **Content** (Artists, Releases, Videos, News) · **Inbox** (Messages) · **System** (Settings, Logs)
- ศิลปินที่สมัครเองสามารถแก้ได้เฉพาะโปรไฟล์ เพลง และวิดีโอของตัวเองผ่านหน้า `account.html`
- **Logs** บันทึกทุกการเพิ่ม แก้ ลบ สมัคร และเข้าสู่ระบบ พร้อมลบข้อมูลเก่าได้

> เปลี่ยนชื่อไฟล์ `panel-x7k2.html` ได้ถ้าต้องการ แต่อย่าลืมแก้ลิงก์ในไฟล์ที่อ้างถึง (ตรวจด้วยการค้นหาชื่อไฟล์ใน repo)

## Deploy บน GitHub Pages (ทางเลือก)

GitHub Pages ใช้ Cloudflare Functions ไม่ได้ แต่ workflow ในโปรเจกต์จะสร้างหน้าพรีวิวแบบ static ให้ศิลปินและวิดีโอทุกรายการแทน

1. **Settings → Pages → Build and deployment → Source = GitHub Actions**
2. ตั้งค่าโดเมนในไฟล์ `public/CNAME`
3. Push ไป `main` หรือกด **Run workflow** — workflow จะสร้างหน้าพรีวิวและ deploy โฟลเดอร์ `public/` ทุกชั่วโมงอัตโนมัติ
4. ศิลปินหรือวิดีโอใหม่จะมีพรีวิวภายในประมาณ 1 ชั่วโมง ระหว่างนั้นลิงก์ยังเปิดได้ผ่าน `404.html` ซึ่งพาไปหน้าโปรไฟล์จริง

## ปัญหาที่พบบ่อย

| อาการ | สาเหตุและวิธีแก้ |
|---|---|
| หน้าขาว / ข้อมูลไม่ขึ้น | ตรวจว่า `SUPABASE_URL` และ `SUPABASE_ANON_KEY` ใน `config.js` ถูกต้อง |
| สมัครแล้วขึ้น "ตั้งค่าระบบสมัครยังไม่เสร็จ" | ยังไม่ได้รัน `supabase/ALL-IN-ONE.sql` |
| ล็อกอินแอดมินไม่ได้ | อีเมลในไฟล์ SQL ไม่ตรงกับผู้ใช้ที่สร้างใน Authentication |
| เห็น "Access denied" ในหลังบ้าน | บัญชีนั้นไม่อยู่ในตาราง `admins` |
| อัปโหลดวิดีโอไม่ได้ | ไฟล์เกิน 50 MB (ใช้ลิงก์ YouTube แทน) หรือรูปแบบไม่รองรับ |
| `/a/<name>` ขึ้นหน้า 404 | ชื่อผู้ใช้ไม่ตรงกับโปรไฟล์ใน Supabase |
| พรีวิวไม่ขึ้นบน GitHub Pages | ยังไม่ได้ตั้ง Source = GitHub Actions หรือรอ workflow รอบถัดไป |

## ความปลอดภัย

- **Anon key ใน `config.js` เปิดเผยได้** — ออกแบบมาให้ใช้ในเบราว์เซอร์ ความปลอดภัยอยู่ที่ Row Level Security (RLS) ใน SQL
- **ห้ามใส่ `service_role` key** ในโค้ดหรือ repo เด็ดขาด
- ไฟล์ SQL มีอีเมลแอดมิน — ถ้า repo เป็น public ให้แก้อีเมลเป็นค่าตัวอย่างก่อน commit และรันอีเมลจริงใน SQL Editor เท่านั้น
- Activity log บันทึกชื่อผู้ส่งข้อความติดต่อเท่านั้น ไม่เก็บเนื้อความและอีเมล
- `public/_headers` ตั้ง security header ให้ทั้งเว็บ (nosniff, X-Frame-Options, Referrer-Policy) และปิดการจัดทำดัชนีหน้าแอดมิน

---

<p align="center"><sub>Mon HipHop · สร้างด้วย HTML, CSS, JavaScript และ Supabase</sub></p>
