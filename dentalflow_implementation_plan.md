# DentaFlow — خطة التنفيذ الكاملة
## نظام إدارة عيادات أسنان متعددة الفروع

---

## الـ Stack النهائي

| الطبقة | الأداة | السبب |
|--------|--------|-------|
| Framework | Next.js 16 + TypeScript | App Router + Server Actions + Vercel hosting |
| ORM | Prisma | Schema معقد + DX ممتاز + Claude Code يكتبه بسهولة |
| Database | PostgreSQL عبر Supabase | مجاني + مُدار + بدون VPS |
| Auth | NextAuth.js v5 (Auth.js) | Custom roles معقدة + control كامل |
| UI | Tailwind CSS + shadcn/ui | Design System المتفق عليه |
| Font | Cairo (Google Fonts) | RTL عربي — 400/500/600/700/800 |
| Hosting | Vercel | مجاني + مدمج مع Next.js |
| Storage | Supabase Storage | الأشعة والصور والمرفقات |
| Validation | Zod + React Hook Form | Type-safe forms |
| Charts | Recharts | تقارير + Dashboard |
| PDF Export | @react-pdf/renderer | تصدير الفواتير والتقارير |

---

## قبل ما تبدأ — إعداد الحسابات

### ١. Supabase
- اعمل حساب على supabase.com
- أنشئ Project جديد باسم `dentaflow`
- احتفظ بـ:
  - `DATABASE_URL` (من Settings → Database → Connection string → URI)
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

### ٢. Vercel
- اعمل حساب على vercel.com
- مش هتحتاجه دلوقتي — بس اعمل الحساب جاهز

### ٣. GitHub
- أنشئ repo باسم `dentaflow` (Private)

---

## المرحلة صفر — إعداد المشروع
### الهدف: مشروع شغال على localhost مع كل الأدوات متثبتة

---

### الأمر ١ — إنشاء المشروع (Claude Code)

```
أنشئ مشروع Next.js 16 باسم dentaflow بالإعدادات دي:

npx create-next-app@latest dentaflow \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --eslint

بعد الإنشاء ثبّت الـ packages دي:

npm install prisma @prisma/client
npm install next-auth@beta @auth/prisma-adapter
npm install @supabase/supabase-js
npm install zod react-hook-form @hookform/resolvers
npm install recharts
npm install @react-pdf/renderer
npm install date-fns
npm install lucide-react
npm install clsx tailwind-merge class-variance-authority

npm install -D prisma

npx shadcn@latest init
(اختار: Default style, Slate base color, CSS variables: yes)

بعدين ثبّت shadcn components:
npx shadcn@latest add button input label card table badge
npx shadcn@latest add dialog sheet alert tabs select
npx shadcn@latest add form checkbox switch avatar
npx shadcn@latest add dropdown-menu separator skeleton toast
npx shadcn@latest add calendar date-picker popover
```

---

### الأمر ٢ — إعداد الـ Config الأساسي (Claude Code)

```
أعدّ الملفات الأساسية لمشروع DentaFlow:

١. في tailwind.config.ts:
   - أضف Cairo font
   - direction: rtl
   - extend الألوان بالـ design tokens:
     primary: sky-500 #0ea5e9
     accent: teal-500 #14b8a6

٢. في app/globals.css:
   @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');
   
   :root { direction: rtl; font-family: 'Cairo', sans-serif; }
   
   أضف CSS variables للألوان من Design System:
   --color-primary: #0ea5e9
   --color-accent: #14b8a6
   [إلخ من Design System المتفق عليه]

٣. أنشئ ملف .env.local:
   DATABASE_URL="[من Supabase]"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="[generated secret - استخدم: openssl rand -base64 32]"
   NEXT_PUBLIC_SUPABASE_URL="[من Supabase]"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="[من Supabase]"
   SUPABASE_SERVICE_ROLE_KEY="[من Supabase]"

٤. أنشئ ملف .env.example بنفس الـ keys بدون values

٥. أضف .env.local لـ .gitignore
```

---

### الأمر ٣ — Prisma Schema الكامل (Claude Code)

```
أنشئ Prisma Schema كامل في prisma/schema.prisma لنظام DentaFlow.

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

المطلوب إنشاء الـ Models دي بكل علاقاتها:

// ── الأدوار ──
enum Role {
  SUPER_ADMIN
  DOCTOR
  STAFF
}

// ── حالات السن ──
enum ToothCondition {
  HEALTHY
  FILLED
  EXTRACTED
  NEEDS_TREATMENT
  CROWN
}

// ── حالات الموعد ──
enum AppointmentStatus {
  CONFIRMED
  ATTENDED
  NO_SHOW
  CANCELLED
}

// ── نوع الموعد ──
enum AppointmentType {
  CHECKUP
  FOLLOWUP
  EMERGENCY
}

// ── حالة خطة العلاج ──
enum PlanStatus {
  PROPOSED
  APPROVED
  IN_PROGRESS
  COMPLETED
}

// ── حالة الفاتورة ──
enum InvoiceStatus {
  PAID
  PARTIAL
  OVERDUE
}

// ── طريقة الدفع ──
enum PaymentMethod {
  CASH
  CARD
  INSTALLMENT
  WALLET
}

// ── نوع حركة المخزون ──
enum StockMovementType {
  ADD
  CONSUME
  TRANSFER_IN
  TRANSFER_OUT
}

// ── نوع احتساب المستحقات ──
enum EarningType {
  PERCENTAGE
  FIXED
  MIXED
}

// ── حالة طلب المراجعة ──
enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
}

// ── فئة المصروف ──
enum ExpenseCategory {
  RENT
  UTILITIES
  SALARIES
  MAINTENANCE
  MARKETING
  OTHER
}

// ── فئة المخزون ──
enum InventoryCategory {
  MATERIALS
  TOOLS
  DEVICES
}

Model: User
- id, name, phone (unique), password (hashed), role, isActive
- createdAt, updatedAt
- العلاقات: branches (UserBranch[]), doctorProfile, appointments (created), 
  visits (as doctor), weeklyAvailability, earningRule, earningRecords,
  stockMovements, approvalRequests (requested+resolved), expenses, auditLogs

Model: DoctorProfile
- id, userId (unique), specialty, licenseNumber, qualification
- yearsOfExperience (optional), nationalId, whatsapp (optional)
- العلاقة: user

Model: Branch
- id, name, address, city, phones (String[]), workingHours (Json)
- email (optional), isActive, createdAt, updatedAt
- العلاقات: users (UserBranch[]), appointments, visits, inventory,
  expenses, invoices, stockTransfersFrom, stockTransfersTo

Model: UserBranch (many-to-many junction)
- userId, branchId, assignedAt
- العلاقات: user, branch

Model: Patient
- id, fullName, birthDate, gender, phone, nationalId
- address (optional), city (optional), job (optional), maritalStatus (optional)
- emergencyName, emergencyPhone
- referralSource (optional), registrationBranchId
- createdAt, updatedAt
- العلاقات: medicalHistory, toothRecords, visits, appointments,
  treatmentPlans, invoices, registrationBranch

Model: MedicalHistory
- id, patientId (unique)
- allergies (String[], default [])
- chronicDiseases (String[], default [])
- isPregnant (optional Boolean)
- currentMedications (optional String)
- updatedAt

Model: ToothRecord
- id, patientId, toothNumber (Int 1-32)
- condition (ToothCondition, default HEALTHY)
- notes (optional)
- updatedBy, updatedAt
- العلاقة: patient, updatedByUser

Model: Visit
- id, patientId, doctorId, branchId
- appointmentId (optional, unique)
- dateTime, diagnosis, procedure
- affectedTeeth (Int[], default [])
- sessionCost (Decimal)
- doctorNotes (optional), nextStep (optional)
- recallDate (optional DateTime)
- treatmentPlanId (optional)
- createdAt
- العلاقات: patient, doctor, branch, appointment, treatmentPlan, invoices

Model: TreatmentPlan
- id, patientId, doctorId
- description, targetTeeth (Int[])
- estimatedCost (Decimal)
- status (PlanStatus, default PROPOSED)
- patientConsent (Boolean, default false)
- createdAt, updatedAt
- العلاقات: patient, doctor, sessions, visits, invoices

Model: TreatmentSession
- id, planId, sessionNumber (Int)
- description, expectedDate (optional DateTime)
- status (String, default "PLANNED")
- العلاقة: plan

Model: WeeklyAvailability
- id, doctorId, weekStart, weekEnd
- dayOfWeek (Int 0-6), branchId
- startTime, endTime (String "HH:MM")
- updatedBy, updatedAt
- العلاقات: doctor, branch

Model: Appointment
- id, patientId, doctorId, branchId
- dateTime, durationMinutes (Int, default 30)
- type (AppointmentType, default CHECKUP)
- status (AppointmentStatus, default CONFIRMED)
- notes (optional), createdBy
- createdAt, updatedAt
- العلاقات: patient, doctor, branch, createdByUser, visit

Model: InventoryItem
- id, name, category (InventoryCategory), unit, branchId
- quantity (Decimal, default 0)
- reorderPoint (Decimal, default 0)
- purchasePrice (Decimal)
- expiryDate (optional DateTime)
- supplier (optional), supplierPhone (optional)
- createdAt, updatedAt
- العلاقات: branch, movements

Model: StockMovement
- id, itemId, type (StockMovementType)
- quantity (Decimal)
- fromBranchId (optional), toBranchId (optional)
- reason (optional), referenceId (optional)
- performedBy, createdAt
- العلاقات: item, fromBranch, toBranch, performedByUser

Model: Invoice
- id, patientId, branchId
- visitId (optional), planId (optional)
- items (Json) // [{name, price, quantity}]
- subtotal (Decimal), discount (Decimal, default 0)
- total (Decimal)
- status (InvoiceStatus, default PARTIAL)
- isLocked (Boolean, default true)
- sequenceNumber (String, unique) // format: "2026-0001"
- createdAt, updatedAt
- العلاقات: patient, branch, visit, plan, payments, refunds, approvalRequests

Model: Payment
- id, invoiceId, method (PaymentMethod)
- amount (Decimal), reference (optional)
- proofImageUrl (optional)
- installmentNumber (optional Int)
- recordedBy, createdAt
- العلاقات: invoice, recordedByUser, refunds

Model: Refund
- id, invoiceId, paymentId (optional)
- amount (Decimal), reason
- method (PaymentMethod)
- approvedBy, createdAt
- العلاقات: invoice, payment, approvedByUser

Model: ApprovalRequest
- id, type (String) // "EDIT_PAYMENT" | "DELETE_PAYMENT" | "UNLOCK_INVOICE"
- entityType (String), entityId (String)
- requestedBy, reason
- status (ApprovalStatus, default PENDING)
- adminNote (optional)
- resolvedBy (optional), resolvedAt (optional DateTime)
- createdAt
- العلاقات: requestedByUser, resolvedByUser

Model: Expense
- id, branchId, category (ExpenseCategory)
- description, amount (Decimal), date
- isRecurring (Boolean, default false)
- recordedBy, createdAt
- العلاقات: branch, recordedByUser

Model: EarningRule
- id, userId, type (EarningType)
- percentage (optional Decimal)
- fixedAmount (optional Decimal)
- isUnifiedRate (Boolean, default true)
- procedureRates (Json, optional) // [{procedure, percentage}]
- effectiveFrom (DateTime)
- effectiveTo (optional DateTime)
- previousRuleId (optional, self-relation)
- createdAt
- العلاقات: user, previousRule, nextRule

Model: EarningRecord
- id, userId
- periodStart, periodEnd (DateTime)
- totalAmount (Decimal)
- details (Json) // [{visitId, amount, ruleId, procedure}]
- isPaid (Boolean, default false)
- createdAt
- العلاقة: user

Model: AuditLog
- id, userId (optional)
- action (String)
- entityType (String), entityId (String)
- oldValue (Json, optional), newValue (Json, optional)
- ipAddress (optional), createdAt
- العلاقة: user

بعد كتابة الـ Schema:
npx prisma generate
npx prisma db push
```

---

### الأمر ٤ — Seed Data (Claude Code)

```
أنشئ prisma/seed.ts ببيانات تجريبية لـ DentaFlow:

١. Super Admin:
   - الاسم: "أدمن النظام"
   - الهاتف: "01000000000"
   - كلمة المرور: "admin123" (hashed)
   - الدور: SUPER_ADMIN

٢. فرعان:
   - "فرع المعادي" — القاهرة
   - "فرع مدينة نصر" — القاهرة

٣. طبيبان:
   - "د. خالد رضا" — تقويم — مرتبط بالفرعين
   - "د. منى علي" — علاج جذور — مرتبطة بفرع المعادي

٤. موظفان:
   - "محمد أحمد" — STAFF — فرع المعادي
   - "سارة محمود" — STAFF — مدينة نصر

٥. 5 مرضى بملفات طبية وبيانات تجريبية

٦. أضف في package.json:
   "prisma": { "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts" }

ثم شغّل: npx prisma db seed
```

---

## المرحلة الأولى — Authentication + Roles
### الهدف: نظام دخول كامل مع صلاحيات صحيحة

---

### الأمر ٥ — NextAuth Setup (Claude Code)

```
أنشئ نظام Authentication كامل باستخدام NextAuth.js v5 لـ DentaFlow.

١. أنشئ auth.ts في الـ root:
   - استخدم Credentials provider (login برقم الهاتف + كلمة المرور)
   - استخدم @auth/prisma-adapter
   - في الـ authorize function:
     * ابحث عن الـ user بالـ phone
     * تحقق من الـ password باستخدام bcrypt
     * ارجع بيانات الـ user + role + branches
   - في الـ callbacks:
     * jwt: أضف role + userId + branches للـ token
     * session: أضف role + userId + branches للـ session

٢. أنشئ app/api/auth/[...nextauth]/route.ts

٣. أنشئ middleware.ts في الـ root:
   - احمي كل routes ما عدا /login و /api/auth
   - لو مفيش session → redirect لـ /login
   - لو في session → السماح بالمرور

٤. أنشئ lib/auth-utils.ts:
   
   // جيب الـ user الحالي مع كل بياناته
   async function getCurrentUser(session)
   
   // تحقق إن الـ STAFF يقدر يوصل للمريض ده
   // (المريض لازم يكون عنده زيارة في فرع الموظف)
   async function canStaffAccessPatient(staffId, patientId): Promise<boolean>
   
   // تحقق إن المستخدم يقدر يوصل للفرع ده
   async function canAccessBranch(userId, role, branchId): Promise<boolean>
   
   // Helper: هل الـ user SUPER_ADMIN؟
   function isSuperAdmin(role): boolean
   
   // Helper: هل الـ user DOCTOR؟
   function isDoctor(role): boolean

٥. أنشئ lib/prisma.ts (Prisma Client singleton للـ development)

٦. أضف bcryptjs: npm install bcryptjs @types/bcryptjs
```

---

### الأمر ٦ — صفحة Login (Claude Code)

```
أنشئ صفحة Login كاملة لـ DentaFlow في app/(auth)/login/page.tsx

التصميم: Split Layout 1440×900px

النصف الأيمن — Brand Panel (خلفية sky-500 #0ea5e9):
- دائرتان شفافتان للعمق البصري
- Logo: مربع 44×44 rounded + "DentaFlow" Cairo ExtraBold
- عنوان: "إدارة عيادتك بكفاءة واحترافية" — 28px Bold أبيض
- وصف: 14px Regular أبيض 75% opacity
- 4 مميزات بأيقونات lucide-react:
  Calendar "إدارة المواعيد عبر الفروع"
  Users "ملفات طبية شاملة لكل مريض"
  BarChart3 "تقارير مالية تفصيلية"
  Shield "صلاحيات متعددة وآمنة"

النصف الأيسر — Form Panel (خلفية white):
محتوى مركزي 400px باستخدام shadcn/ui + react-hook-form + zod:
- عنوان "تسجيل الدخول" 24px/700 slate-900
- وصف 14px slate-500
- Input "رقم الهاتف" — Label فوقه — placeholder "01XXXXXXXXX"
- Input "كلمة المرور" — Label + "نسيت كلمة المرور؟" sky-500 على نفس السطر
  + زر إظهار/إخفاء
- Checkbox "تذكّرني لمدة 30 يوماً"
- Button Primary full-width "الدخول إلى لوحة التحكم"
- Divider + سطر الدعم

3 حالات:
- Default: الحالة العادية
- Error: Alert أحمر + حدود حمراء على الحقول
- Loading: Button disabled + spinner

بعد Login ناجح → redirect حسب الـ role:
- SUPER_ADMIN → /dashboard
- DOCTOR → /dashboard
- STAFF → /dashboard

الـ Validation بـ Zod:
- phone: regex مصري (01XXXXXXXXX)
- password: min 6 characters

قواعد:
- RTL بالكامل — Cairo font
- shadcn/ui components فقط
- ألوان من Design System
- لا shadows على Cards
- Server Action للـ login (مش API route)
```

---

### الأمر ٧ — Layout الرئيسي + Sidebar (Claude Code)

```
أنشئ الـ Layout الرئيسي لـ DentaFlow في app/(dashboard)/layout.tsx

الـ Layout:
- Sidebar (240px — يمين — ثابت)
- Main Content (flex-1 — يسار — slate-50 bg)

Sidebar Component (components/layout/sidebar.tsx):
Header (64px):
  Logo: مربع 28×28 sky-500 radius-7 + "DentaFlow" 14px/700

Navigation (حسب الـ role):
كل المستخدمين يشوفوا:
  - الرئيسية (LayoutDashboard icon)
  - المواعيد (Calendar icon) + Badge عدد مواعيد اليوم
  - المرضى (Users icon)

DOCTOR + SUPER_ADMIN يشوفوا أيضاً:
  - الأطباء (Stethoscope icon)

SUPER_ADMIN فقط:
  - المخزون (Package icon) + Badge تنبيه نقص
  - الفواتير (Receipt icon)
  - التقارير (BarChart3 icon)
  - الإعدادات (Settings icon)

Active State: sky-100 bg + sky-700 text + 600 weight + border-right 2px sky-500
Hover State: slate-50 bg
Default: transparent + slate-600 text + 500 weight

Footer (72px — border-top slate-200):
  Avatar 36px + اسم المستخدم 13px/600 + الدور 11px slate-500
  + LogOut icon — margin-left auto
  (LogOut يعمل signOut من NextAuth)

Page Header Component (components/layout/page-header.tsx):
Props: title, subtitle?, action? (زر + CTA)
يتستخدم في كل صفحة بنفس الـ pattern

أنشئ كمان:
- components/layout/breadcrumb.tsx
- hooks/use-current-user.ts (يجيب بيانات الـ session)
- hooks/use-branch.ts (الفرع النشط)
```

---

## المرحلة الثانية — Dashboard الرئيسي
### الهدف: أول شاشة حقيقية بعد الـ Login

---

### الأمر ٨ — Dashboard Page (Claude Code)

```
أنشئ Dashboard الرئيسي في app/(dashboard)/dashboard/page.tsx

المحتوى (Server Component + Client Components):

١. Page Header:
   "مرحباً، [اسم المستخدم]" — تاريخ اليوم بالعربي

٢. Metric Cards (4 cards — grid 4 cols):
كل card: white bg + border slate-200 + radius 12px + padding 20px

البيانات من الـ database (Server Actions):
- مواعيد اليوم → count من Appointment (حسب الـ role والفرع)
- إيرادات الشهر → sum من Payment (SUPER_ADMIN فقط)
- مرضى جدد هذا الأسبوع → count من Patient
- طلبات مراجعة معلّقة → count من ApprovalRequest (PENDING)

كل card:
  Overline label + رقم Display 36px/800 + delta row

٣. Alerts Section:
- تنبيهات المخزون (صنف وصل حد إعادة الطلب) — SUPER_ADMIN فقط
- طلبات المراجعة المعلّقة — SUPER_ADMIN فقط
- مواعيد المتابعة القريبة (recallDate خلال 7 أيام)

٤. Appointments Table:
جدول مواعيد اليوم (Client Component):
Columns: المريض | الوقت | الطبيب | الإجراء | الحالة | —
Badges ملونة حسب الـ status
زر عرض تفاصيل (Sheet)

Server Actions المطلوبة في lib/actions/dashboard.ts:
- getTodayStats(userId, role, branchIds)
- getTodayAppointments(userId, role, branchIds)
- getPendingAlerts(userId, role)

قواعد:
- SUPER_ADMIN يشوف كل الفروع
- DOCTOR يشوف مواعيده هو بس
- STAFF يشوف مواعيد فرعه بس
- F-Pattern: المعلومة الأهم أعلى يمين
```

---

## المرحلة الثالثة — المرضى + الملف الطبي
### الهدف: أهم شاشة في المشروع

---

### الأمر ٩ — شاشة المرضى (Claude Code)

```
أنشئ شاشة المرضى الكاملة في app/(dashboard)/patients/

الملفات:
- page.tsx (قائمة المرضى)
- [id]/page.tsx (ملف المريض الكامل)
- components/patient-table.tsx
- components/patient-form.tsx (إضافة/تعديل مريض)
- components/patient-sheet.tsx (معاينة سريعة)

١. قائمة المرضى (page.tsx):
Page Header: "المرضى" + Button "+ مريض جديد"

Search + Filters:
- Search Input (400px) — ابحث بالاسم أو الهاتف أو رقم الملف
- Select الفرع (للـ SUPER_ADMIN فقط)
- Select الطبيب
- Date Picker "آخر زيارة"
- Button Ghost "مسح الفلتر"

DataTable (shadcn/ui Table):
Columns: المريض (Avatar + الاسم + رقم الملف) | الهاتف | الفرع | آخر زيارة | الطبيب | مصدر الترشيح | إجراءات
5 نتائج افتراضية + Pagination

قيود الـ Access:
- STAFF: يشوف مرضى فرعه فقط (بناءً على visits)
- DOCTOR: يشوف مرضى زاروا فروعه
- SUPER_ADMIN: يشوف الكل

Empty State:
ti-users icon 48px + "لا يوجد مرضى" + "ابدأ بإضافة أول مريض"

Patient Form Dialog:
حقول: الاسم | تاريخ الميلاد | النوع | الهاتف | الرقم القومي
العنوان | المدينة | المهنة | الحالة الاجتماعية
جهة الطوارئ (الاسم + الهاتف)
مصدر الترشيح (Select)

Validation بـ Zod.

Server Actions في lib/actions/patients.ts:
- getPatients(filters, userId, role, branchIds)
- createPatient(data)
- updatePatient(id, data)
- getPatientById(id, userId, role)

٢. ملف المريض الكامل ([id]/page.tsx):
Sticky Patient Header (زي Design System)
Sticky Tabs: المعلومات | التاريخ الطبي | مخطط الأسنان | الزيارات | خطة العلاج | الفواتير
```

---

### الأمر ١٠ — مخطط الأسنان (Claude Code)

```
أنشئ Dental Chart تفاعلي في components/dental-chart/

الملفات:
- dental-chart.tsx (الـ Component الرئيسي)
- tooth.tsx (كل سن لوحده)
- tooth-detail-panel.tsx (تفاصيل السن المحدد)
- use-dental-chart.ts (hook للـ state management)

الـ Chart:
- صفوف 2: الفك العلوي (16 سن) + الفك السفلي (16 سن)
- ترقيم FDI: 11-18 (يمين فوق) | 21-28 (يسار فوق) | 31-38 (يسار تحت) | 41-48 (يمين تحت)
- كل سن: مربع 52×64px radius-8 — border 1px
- ألوان الحالات (بالضبط من Design System):
  HEALTHY → slate-100 bg + slate-200 border
  FILLED → sky-100 bg + sky-300 border
  EXTRACTED → slate-50 bg + slate-200 border-dashed opacity-50
  NEEDS_TREATMENT → red-100 bg + red-300 border
  CROWN → teal-100 bg + teal-300 border

عند الضغط على سن:
- يتحدد (selected state: ring-2 ring-sky-500)
- يظهر Detail Panel على اليمين

Detail Panel:
- رقم السن + حالته (Badge ملون)
- Divider
- Select "الحالة" (تغيير حالة السن)
- Textarea "ملاحظات"
- Button "حفظ التغييرات"

Legend: كل حالة + لونها

Legend بالعربي:
سليم | محشو | مخلوع | يحتاج علاج | تركيبة

Server Actions في lib/actions/dental-chart.ts:
- getToothRecords(patientId)
- updateToothRecord(patientId, toothNumber, condition, notes, userId)
- بعد التحديث: أنشئ AuditLog تلقائياً

قواعد الصلاحيات:
- DOCTOR + STAFF: تعديل كامل
- SUPER_ADMIN: تعديل كامل
- العرض: لكل من عنده access للمريض
```

---

## المرحلة الرابعة — المواعيد
### الهدف: Calendar + Booking System

---

### الأمر ١١ — شاشة المواعيد (Claude Code)

```
أنشئ شاشة المواعيد في app/(dashboard)/appointments/

الملفات:
- page.tsx
- components/appointments-calendar.tsx (Weekly View)
- components/appointments-table.tsx
- components/booking-dialog.tsx (حجز موعد جديد)
- components/appointment-sheet.tsx (تفاصيل موعد)

١. Calendar View (Weekly):
- 7 أعمدة أيام + عمود الوقت
- slots كل 30 دقيقة (8ص → 8م)
- Appointment blocks: sky-100 bg + sky-500 border-right 3px
- Doctor color coding: د.خالد → sky، د.منى → teal
- TODAY column: sky-50 bg

٢. Table View:
نفس الجدول من Dashboard بس أكثر تفصيلاً مع Filters:
Select الطبيب | Select الفرع | Select الحالة | Date Range

٣. Booking Dialog (shadcn/ui Dialog):
- Search مريض (autocomplete من الـ DB)
- Select طبيب
- Select فرع
- Date + Time Picker
- Radio "نوع الزيارة": كشف أول | متابعة | طوارئ
- Select "المدة": 30 | 45 | 60 دقيقة
- Textarea "ملاحظة"
- Footer: إلغاء + تأكيد الحجز

Conflict Detection:
قبل الحجز تأكد إن الطبيب مش عنده موعد تاني في نفس الوقت
(في نفس أي فرع) — لو في تعارض أظهر Error واضح

Server Actions في lib/actions/appointments.ts:
- getWeeklyAppointments(weekStart, userId, role, branchIds)
- getTodayAppointments(userId, role, branchIds)
- createAppointment(data, createdBy) — مع Conflict Detection
- updateAppointmentStatus(id, status)
- cancelAppointment(id, reason)
- checkConflict(doctorId, dateTime, duration, excludeId?)

جدولة الطبيب (WeeklyAvailability):
- صفحة منفصلة للـ SUPER_ADMIN + DOCTOR لضبط الجدول الأسبوعي
- كل أسبوع: الطبيب يحدد أيه الفروع اللي هيكون فيها وساعات العمل
```

---

## المرحلة الخامسة — الفواتير والمالي
### الهدف: نظام مالي محكم مع Approval Workflow

---

### الأمر ١٢ — الفواتير + المدفوعات (Claude Code)

```
أنشئ نظام الفواتير الكامل في app/(dashboard)/invoices/

الملفات:
- page.tsx (SUPER_ADMIN فقط)
- [id]/page.tsx (تفاصيل فاتورة)
- components/invoice-table.tsx
- components/invoice-sheet.tsx (Side panel)
- components/payment-dialog.tsx (تسجيل دفعة)
- components/approval-request-dialog.tsx (طلب مراجعة)

١. قائمة الفواتير:
Summary Cards (3):
- إجمالي المدفوع (emerald)
- متأخر السداد (red) + عدد الفواتير
- تقسيط جارٍ (amber) + عدد العملاء

Filters: الحالة | الفرع | طريقة الدفع | Date Range

Table: المريض | المبلغ | الطريقة | الحالة | الفرع | التاريخ | إجراءات

٢. Invoice Sheet (Side Panel):
- رقم الفاتورة + التاريخ + حالة Badge
- بنود الفاتورة (items من الـ JSON)
- الإجمالي + الخصم + المبلغ النهائي
- سجل الدفعات (Timeline)
- Button "تسجيل دفعة" (STAFF يقدر)
- Button "طلب مراجعة" (STAFF — لو في مشكلة)

٣. Payment Dialog (STAFF):
- طريقة الدفع (Radio/Select)
- المبلغ
- رقم مرجعي (للكارت أو المحفظة)
- رفع صورة إثبات التحويل (للمحفظة الإلكترونية)
- رقم القسط (لو تقسيط)

٤. Approval Request Dialog (STAFF):
- اختار الدفعة اللي عايز تعدلها/تحذفها
- سبب التعديل (مطلوب)
- Submit → ينشئ ApprovalRequest بحالة PENDING
- الـ SUPER_ADMIN يشوف الطلب ويعتمده أو يرفضه

٥. Approval Requests Page (SUPER_ADMIN):
قائمة كل الطلبات المعلّقة مع:
- من طلب + السبب + الدفعة المتعلقة
- Button "اعتماد" (ينفذ التعديل + يغلق الطلب)
- Button "رفض" (مع note إلزامي)

قاعدة ذهبية: الفاتورة بعد الإصدار isLocked=true
أي تعديل يمر عبر ApprovalRequest فقط.

Server Actions في lib/actions/invoices.ts:
- getInvoices(filters, userId, role)
- getInvoiceById(id)
- createInvoice(visitId/planId, branchId, items)
- recordPayment(invoiceId, paymentData, recordedBy)
- submitApprovalRequest(type, entityId, reason, requestedBy)
- processApprovalRequest(requestId, status, adminNote, adminId)
- calculateInvoiceStatus(invoiceId) // يحسب تلقائياً
```

---

### الأمر ١٣ — المصروفات + المستحقات (Claude Code)

```
أنشئ صفحتين في app/(dashboard)/

١. المصروفات (expenses/page.tsx) — SUPER_ADMIN فقط:
- Filter: الفرع | الفئة | الفترة
- Table: الفئة | الوصف | المبلغ | الفرع | التاريخ | متكرر؟
- Button "+ مصروف جديد"
- Form Dialog: الفئة | الوصف | المبلغ | الفرع | التاريخ | هل متكرر شهرياً؟
- Summary: إجمالي المصروفات لكل فرع

٢. المستحقات (earnings/page.tsx):
SUPER_ADMIN: يشوف مستحقات كل الأطباء والموظفين
DOCTOR/STAFF: يشوف مستحقاته هو بس

Filter: الشخص | الفترة | حالة الصرف

Table: الاسم | الدور | الفترة | الإجمالي | التفاصيل | حالة الصرف
تفاصيل: modal بيوضح كل زيارة ونصيب الطبيب منها

Button "احتساب المستحقات" — يشغّل Server Action:
يجيب كل الـ Visits للفترة المحددة
يطبّق الـ EarningRule السارية وقت كل زيارة
يحسب المبلغ ويحفظه في EarningRecord

Earning Rules Settings (في الإعدادات):
- لكل طبيب أو موظف: نوع الاحتساب + القيمة + تاريخ البداية
- الـ Rate History يتحفظ تلقائياً (previousRuleId)

Server Actions في lib/actions/earnings.ts:
- calculateEarnings(userId, periodStart, periodEnd)
- getEarningHistory(userId, role, requesterId)
- setEarningRule(userId, ruleData, adminId)
```

---

## المرحلة السادسة — المخزون + التقارير
### الهدف: استكمال النظام بالكامل

---

### الأمر ١٤ — المخزون (Claude Code)

```
أنشئ نظام المخزون في app/(dashboard)/inventory/ — SUPER_ADMIN فقط

١. قائمة المخزون (page.tsx):
Alert بارز لو فيه أصناف وصلت حد إعادة الطلب

Filter: الفرع | الفئة | "تنبيهات فقط"

Table: الصنف | الفئة | الكمية | الحد الأدنى | المورد | الصلاحية | إجراءات
Progress bar على كل صف يوضح مستوى المخزون:
  - أخضر: الكمية فوق الـ reorderPoint
  - أحمر: الكمية في حدود أو تحت الـ reorderPoint

٢. إضافة/تعديل صنف (Dialog):
الاسم | الفئة | الوحدة | الفرع | الكمية الحالية | حد إعادة الطلب
سعر الشراء | تاريخ الصلاحية (optional) | المورد | هاتف المورد

٣. تسجيل حركة (Dialog):
نوع الحركة: إضافة | صرف | تحويل
الكمية | السبب
لو تحويل: من فرع + إلى فرع

٤. صفحة التحويلات (transfers/page.tsx):
قائمة كل طلبات التحويل بين الفروع مع حالتها

Server Actions في lib/actions/inventory.ts:
- getInventoryItems(branchId?, filters?)
- getLowStockAlerts()
- createInventoryItem(data)
- recordStockMovement(data, performedBy)
- getLowStockItems() // للتنبيهات في Dashboard
```

---

### الأمر ١٥ — التقارير (Claude Code)

```
أنشئ شاشة التقارير في app/(dashboard)/reports/ — SUPER_ADMIN فقط

Tabs: مالي | تشغيلي | مقارنة الفروع

١. التقرير المالي:
Date Range Picker + Button تصدير PDF

KPIs (بدون cards — أرقام كبيرة مباشرة):
- إجمالي الإيرادات (sky-500)
- صافي الربح = الإيرادات - المصروفات - مستحقات الأطباء (emerald-500)
- إجمالي المصروفات (slate-600)

Bar Chart (Recharts): إيرادات شهرية 12 شهر — sky-500 bars
Donut Chart (Recharts): مصادر الترشيح — ألوان Design System

Branch Summary Table: الفرع | الإيرادات | المصروفات | المستحقات | صافي الربح

٢. التقرير التشغيلي:
- عدد المرضى الجدد (Line Chart)
- معدل الحضور/الغياب (Bar Chart)
- الإجراءات الأكثر تكراراً (Horizontal Bar)
- المرضى المستحقين للمتابعة

٣. مقارنة الفروع:
جدول جنبي: كل فرع في عمود — نفس المقاييس

PDF Export:
استخدم @react-pdf/renderer
- فاتورة مريض: بيانات المريض + بنود + المدفوع
- تقرير مالي: الأرقام والجداول

Server Actions في lib/actions/reports.ts:
- getFinancialReport(dateRange, branchId?)
- getOperationalReport(dateRange, branchId?)
- getBranchComparison(dateRange)
- getRecallPatients() // مرضى المتابعة
```

---

## المرحلة السابعة — الإعدادات + اللمسات النهائية

---

### الأمر ١٦ — الإعدادات (Claude Code)

```
أنشئ شاشة الإعدادات في app/(dashboard)/settings/ — SUPER_ADMIN فقط

Settings Layout: Nav يسار (200px) + Content يمين

Tabs Navigation:
- المستخدمون (Active)
- الفروع
- الأطباء والمستحقات
- الخدمات والأسعار
- الإشعارات

١. المستخدمون:
Table: المستخدم | الدور | الفروع | آخر دخول | الحالة | إجراءات
Toggle لتفعيل/تعطيل الحساب
Add User Dialog: الاسم | الهاتف | كلمة المرور | الدور | الفروع

٢. الفروع:
Table: الاسم | المدينة | الهاتف | الحالة
Add/Edit Branch Dialog: كل بيانات الفرع + ساعات العمل

٣. الأطباء والمستحقات:
لكل طبيب: نوع الاحتساب + القيمة
Button "تحديث القاعدة" → ينشئ EarningRule جديد مع previousRuleId
Rate History: جدول التغييرات السابقة

٤. الخدمات والأسعار:
قائمة الإجراءات مع أسعارها الافتراضية (تتيح تعبئة الفواتير بسرعة)

Server Actions في lib/actions/settings.ts:
- createUser(data, hashedPassword)
- toggleUserStatus(userId, isActive)
- updateBranch(branchId, data)
- setEarningRule(userId, data)
```

---

### الأمر ١٧ — Deploy على Vercel (Claude Code)

```
جهّز المشروع للـ Deploy على Vercel:

١. تأكد من ملف .env.local مكتمل بكل الـ environment variables

٢. أنشئ vercel.json لو محتاج custom config

٣. في package.json تأكد من:
   "build": "prisma generate && next build"

٤. على Vercel Dashboard:
   - Import GitHub repo
   - أضف كل الـ Environment Variables من .env.local
   - اضبط NEXTAUTH_URL على الـ domain الفعلي
   - Deploy

٥. بعد الـ deploy شغّل:
   vercel env pull .env.local // لمزامنة الـ env variables
   npx prisma db push // لو احتجت update في الـ schema

٦. اختبر:
   - Login بحساب الـ Admin
   - تأكد إن الـ Roles شغالة صح
   - جرب كل الـ user flows الأساسية
```

---

## ترتيب الأوامر في Claude Code

```
أمر ١  → إنشاء المشروع + تثبيت الـ packages
أمر ٢  → إعداد Tailwind + RTL + env
أمر ٣  → Prisma Schema الكامل
أمر ٤  → Seed Data
أمر ٥  → NextAuth Setup
أمر ٦  → صفحة Login
أمر ٧  → Layout + Sidebar
أمر ٨  → Dashboard
أمر ٩  → شاشة المرضى
أمر ١٠ → Dental Chart
أمر ١١ → المواعيد
أمر ١٢ → الفواتير + Approval Workflow
أمر ١٣ → المصروفات + المستحقات
أمر ١٤ → المخزون
أمر ١٥ → التقارير
أمر ١٦ → الإعدادات
أمر ١٧ → Deploy
```

---

## قواعد ثابتة لكل أمر في Claude Code

```
١. RTL بالكامل في كل component — direction: rtl
٢. Cairo font — 400/500/600/700/800 فقط
٣. shadcn/ui components — لا تعيد اختراع الـ wheel
٤. Zod validation على كل form
٥. Server Actions بدل API routes (Next.js 16)
٦. Error handling واضح في كل Server Action
٧. Loading states + Skeleton على كل async component
٨. Empty states لكل قائمة أو جدول
٩. Audit Log بعد كل عملية حساسة (تعديل ملف طبي / دفعة)
١٠. لا ألوان خارج Design System
١١. Server-side validation للـ roles — مش client فقط
١٢. TypeScript strict mode — لا any
```

---

## ملاحظات مهمة

- **كل أمر مستقل** — لو في مشكلة في أمر معين، قدر تبدأ منه من جديد
- **اختبر بعد كل أمر** قبل ما تروح للتالي
- **Visual Edits** بعد كل مرحلة لتحسين التفاصيل البصرية
- **الـ Seed Data** مهمة جداً — هتساعدك تشوف كل حاجة شغالة

---

*DentaFlow Implementation Plan v1.0 — أغسطس 2026*
*مبني على SRS v2.0 + Design System + Stack: Next.js 16 + Prisma + Supabase + NextAuth*
