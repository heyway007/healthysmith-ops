# Deploy ขึ้น Cloudflare

โปรเจกต์นี้ใช้ Next.js 16 (App Router) ซึ่ง ณ ปัจจุบัน (2026) Cloudflare
แนะนำให้ deploy ขึ้น **Cloudflare Workers** ผ่านเครื่องมือชื่อ **vinext**
(ตัวที่เคยแนะนำก่อนหน้านี้คือ `@cloudflare/next-on-pages` และ OpenNext
ถือว่าเลิกเป็นค่าเริ่มต้นแล้ว แต่ยังใช้ได้ถ้าโปรเจกต์ติด compatibility gap)

อ้างอิง: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/

> vinext ยังอยู่ในสถานะ **beta** ให้รัน compatibility check ก่อนทุกครั้งที่จะ
> ใช้งานจริงกับโปรดักชัน

## ขั้นตอน (ทำตอนพร้อม deploy จริง หลังสร้าง UI เสร็จแล้ว)

```bash
# 1. เช็คความเข้ากันได้ก่อน
npx vinext check

# 2. ติดตั้ง vinext เข้าโปรเจกต์ (ไม่ทำลายของเดิม next dev ยังใช้ได้ตามปกติ)
npx vinext init
# ตอนถูกถามให้เลือก deployment target เป็น Cloudflare Workers

# 3. รันดูผลลัพธ์บนเครื่องผ่าน vinext ก่อน
npm run dev:vinext

# 4. build
npm run build:vinext

# 5. deploy ขึ้น Cloudflare Workers
npx @vinext/cloudflare deploy
```

หลัง deploy แล้วตั้งค่า environment variables บน Cloudflare dashboard
(Workers & Pages → โปรเจกต์นี้ → Settings → Variables) ให้ตรงกับ
`.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (ตั้งเป็น secret เข้ารหัส ไม่ใช่ plain variable)

## ทางเลือกอื่น

ถ้า vinext ติดปัญหา compatibility กับโค้ดที่เขียนภายหลัง (เช่นใช้ library
ที่พึ่ง Node API บางตัวที่ยังไม่รองรับ) ให้ดู `@opennextjs/cloudflare`
แทน — ใช้งานได้เต็มรูปแบบกว่าในแง่ Node.js runtime compatibility
รายละเอียด: https://opennext.js.org/cloudflare

ไม่แนะนำ `@cloudflare/next-on-pages` แล้วสำหรับโปรเจกต์ใหม่ (รองรับแค่
Edge runtime และ Cloudflare เลิกผลักดันเป็นค่าเริ่มต้น)
