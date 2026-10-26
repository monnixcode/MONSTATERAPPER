# Mon HipHop

เว็บไซต์ค่ายเพลง (HTML/CSS/JS ล้วน ไม่มี build step) + หลังบ้านบน Supabase

```
public/            ← โฟลเดอร์ที่ถูก deploy (Cloudflare Pages ใช้โฟลเดอร์นี้)
  index.html artists.html releases.html news.html about.html contact.html
  panel-x7k2.html  ← หลังบ้าน (ไม่มีลิงก์จากหน้าเว็บ พิมพ์ URL เข้าเอง)
  assets/js/config.js  ← ใส่ Supabase URL + anon key ที่นี่
supabase/schema.sql    ← ตาราง + สิทธิ์ (RLS) + Storage bucket
```

เมนูใช้ soft navigation: ทุกหน้าเป็นไฟล์ HTML แยกจริง (เปิดตรง/แชร์ลิงก์/SEO ได้) แต่เมื่อกดเมนู JS จะสลับเฉพาะเนื้อหา ทำให้เพลเยอร์ด้านล่างเล่นเพลงต่อเนื่องข้ามหน้าได้ ถ้า JS ใช้ไม่ได้จะกลับไปเป็นลิงก์ปกติ
> ต้องเปิดผ่าน http(s) เช่น `python3 -m http.server -d public` — soft navigation ไม่ทำงานเมื่อเปิดไฟล์ตรงแบบ `file://`

## 1) ตั้งค่า Supabase
1. สร้างโปรเจกต์ → SQL Editor → วาง `supabase/schema.sql` **แก้อีเมลแอดมินบรรทัดสุดท้ายในหน้า SQL Editor เท่านั้น อย่า commit อีเมลจริงลง repo** → Run
2. Authentication → Users → Add user (อีเมลเดียวกัน) แล้วปิด Sign ups (Sign In / Providers)
3. Project Settings → API → คัดลอก URL + `anon` key ไปใส่ใน `public/assets/js/config.js`
   (ห้ามใส่ `service_role` key ในโค้ดเด็ดขาด)

> **ติดตั้งไว้แล้วก่อนหน้านี้?** รัน `supabase/002_play_counts.sql` เพิ่มอีกไฟล์เดียวเพื่อเปิดระบบนับยอดฟัง
> เพลงนับเป็น 1 ครั้งเมื่อฟังถึง 30 วินาที (หรือครึ่งเพลงถ้าเพลงสั้น) และนับได้ 1 ครั้ง/ผู้เข้าชม/เพลง/วัน เพลงยอดฟังสูงสุดจะขึ้นบนสุดทั้งหน้า Home และ Releases
> หมายเหตุ: การนับฝั่งเว็บสาธารณะกันการปั๊มยอดได้ระดับพื้นฐานเท่านั้น (ไม่ใช่ระบบกันโกงเต็มรูปแบบ)

## 2) ขึ้น GitHub
```bash
git init && git add . && git commit -m "Mon HipHop site"
git branch -M main
git remote add origin https://github.com/<user>/monhiphop.git
git push -u origin main
```
แนะนำให้ตั้ง repo เป็น **Private** เพราะชื่อไฟล์หลังบ้านจะไม่ถูกเปิดเผย (Cloudflare Pages ใช้กับ private repo ได้)

## 3) Deploy บน Cloudflare Pages
1. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git → เลือก repo
2. Framework preset: **None** · Build command: *(เว้นว่าง)* · Build output directory: **public**
3. Deploy → ได้ URL `*.pages.dev`
4. Pages project → Custom domains → Set up a domain → ใส่โดเมน (ถ้าโดเมนอยู่ใน Cloudflare จะสร้าง DNS ให้อัตโนมัติ)
5. Supabase → Authentication → URL Configuration → ใส่ Site URL เป็นโดเมนจริง
6. แก้โดเมนใน `public/sitemap.xml`, `public/robots.txt` และ meta `canonical`/`og:` ในแต่ละหน้า หากไม่ใช่ `monhiphop.new.tg`

หลังจากนี้ทุกครั้งที่ `git push` Cloudflare จะ deploy ให้อัตโนมัติ ส่วนเนื้อหา (เพลง/ข่าว/ศิลปิน) แก้ผ่านหลังบ้านได้เลยโดยไม่ต้อง push

## หมายเหตุ
- ไฟล์ต่อไฟล์ใน Storage แพ็กเกจฟรีสูงสุด 50 MB · รูปที่อัปโหลดจะถูกย่อ (สูงสุด 1600px, WebP) อัตโนมัติ
- ถ้ายังไม่ใส่คีย์ เว็บจะโชว์ศิลปิน 3 คนเดิมจาก `config.js`
