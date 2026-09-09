# ระบบบัญชีและหลังบ้าน — Sales / Purchase / HR & Payroll

Next.js 16 (App Router, TypeScript, Tailwind) + Supabase (Postgres, Auth)

## สถานะปัจจุบัน

✅ Database schema ครบสำหรับ 3 โมดูล: **ระบบขาย, ระบบจัดซื้อ, พนักงาน & เงินเดือน**
✅ Supabase client (browser / server / middleware) + TypeScript types จาก schema จริง
✅ Auth shell: หน้า login, middleware ป้องกันหน้าที่ต้อง login, sidebar navigation
🚧 หน้าจอ UI ของแต่ละโมดูล (CRUD จริง) — จะสร้างทีละส่วนในขั้นถัดไป

รายละเอียด schema ทั้งหมด: [`docs/DATABASE.md`](docs/DATABASE.md)
วิธี deploy ขึ้น Cloudflare: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

## เริ่มต้นใช้งาน

### 1. ติดตั้ง dependencies

```bash
npm install
```

### 2. ตั้งค่า Supabase

**ตัวเลือก A — รันบนเครื่อง (แนะนำสำหรับพัฒนา)**

ต้องมี [Docker](https://www.docker.com/) และ [Supabase CLI](https://supabase.com/docs/guides/local-development):

```bash
npx supabase start       # เปิด Postgres + Auth + Studio ในเครื่อง (ครั้งแรกจะดึง Docker image)
npx supabase db reset    # รัน migrations ทั้งหมดใน supabase/migrations/ + seed.sql
```

คำสั่ง `supabase start` จะพิมพ์ `API URL` และ `anon key` ออกมาให้คัดลอกไปใส่ `.env.local`

**ตัวเลือก B — ใช้โปรเจกต์ Supabase Cloud จริง**

1. สร้างโปรเจกต์ที่ [supabase.com](https://supabase.com)
2. `npx supabase link --project-ref <your-project-ref>`
3. `npx supabase db push` เพื่อรัน migrations ขึ้น cloud
4. คัดลอก URL/anon key จาก Project Settings → API

### 3. ตั้งค่า environment variables

```bash
cp .env.local.example .env.local
# แก้ค่าในไฟล์ .env.local ให้ตรงกับ Supabase project ของคุณ
```

### 4. สร้างผู้ใช้สำหรับ login

ไปที่ Supabase Studio (local: http://localhost:54323, cloud: dashboard) →
Authentication → Users → Add user แล้วสร้างอีเมล/รหัสผ่านสำหรับทดสอบ
(ถ้าต้องการผูกกับพนักงานคนใดคนหนึ่ง ให้ไปอัปเดต `employees.user_id`
ให้ตรงกับ user id ที่สร้าง)

### 5. รันโปรเจกต์

```bash
npm run dev
```

เปิด http://localhost:3000

## โครงสร้างโปรเจกต์

```
src/
  app/
    (dashboard)/        route group ที่มี sidebar (ต้อง login ก่อนถึงจะเข้าได้)
      page.tsx           หน้าแรก
      sales/page.tsx      โมดูลขาย (placeholder รอสร้าง UI)
      purchase/page.tsx   โมดูลจัดซื้อ (placeholder รอสร้าง UI)
      hr/page.tsx         โมดูล HR (placeholder รอสร้าง UI)
    login/               หน้า login (Supabase auth)
  components/layout/     sidebar, module placeholder
  lib/supabase/          Supabase client (browser/server/middleware)
  types/database.types.ts  TypeScript types generate จาก schema
supabase/
  migrations/            SQL migration ตามลำดับ 0001-0005
  seed.sql                ข้อมูลตัวอย่าง
docs/
  DATABASE.md             อธิบาย schema เป็นภาษาไทย
  DEPLOYMENT.md            วิธี deploy ขึ้น Cloudflare
```

## คำสั่งที่ใช้บ่อย

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | รันแบบ dev บนเครื่อง |
| `npm run build` | build production |
| `npm run lint` | ตรวจ ESLint |
| `npx tsc --noEmit` | ตรวจ TypeScript type ทั้งโปรเจกต์ |
| `npx supabase db reset` | รัน migrations ใหม่ทั้งหมด + seed (local) |
| `npx supabase db push` | รัน migrations ขึ้น Supabase cloud ที่ link ไว้ |
| `npx supabase gen types typescript --linked > src/types/database.types.ts` | สร้าง type ใหม่จาก database จริงหลัง schema เปลี่ยน |

## ขั้นตอนถัดไป

ตามที่ตกลงกันไว้ — Database ของทั้ง 3 ระบบเสร็จแล้ว ขั้นต่อไปคือสร้างหน้าจอ UI
ทีละโมดูล (CRUD จริง: ฟอร์มบันทึกออเดอร์, ใบขอซื้อ/ใบสั่งซื้อ, รันเงินเดือน ฯลฯ)
แจ้งได้เลยว่าอยากให้เริ่มจากโมดูลไหนก่อน
