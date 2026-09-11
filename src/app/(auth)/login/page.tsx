import type { Metadata } from "next";
import { Calendar, BarChart3, Lock, Users } from "lucide-react";
import { LoginForm } from "./login-form";
import { LogoMark } from "./logo-mark";

export const metadata: Metadata = {
  title: "تسجيل الدخول — DentaFlow",
};

const FEATURES = [
  { icon: Calendar, label: "إدارة المواعيد عبر الفروع" },
  { icon: Users, label: "ملفات طبية شاملة لكل مريض" },
  { icon: BarChart3, label: "تقارير مالية تفصيلية" },
  { icon: Lock, label: "صلاحيات متعددة وآمنة" },
];

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full flex-col-reverse lg:flex-row">
      {/* Brand panel */}
      <div className="relative hidden w-full overflow-hidden bg-primary px-8 py-10 lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:px-14 lg:py-12">
        <div className="pointer-events-none absolute -top-40 -right-20 size-80 rounded-full bg-[rgba(2,132,199,0.4)]" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 size-96 rounded-full bg-[rgba(2,132,199,0.25)]" />

        <div className="relative z-10 flex items-center gap-2">
          <div className="flex size-11 items-center justify-center rounded-xl  bg-white">
            <LogoMark className="size-[22px] text-sky-500" />
          </div>
          <p className="text-2xl font-extrabold text-white">DentaFlow</p>
        </div>

        <div className="relative z-10 flex flex-col  gap-8 ">
          <div className="flex flex-col  gap-3">
            <h1 className="text-[28px] leading-[1.4] font-bold text-white">
              إدارة عيادتك بكفاءة واحترافية
            </h1>
            <p className="max-w-[90%]  leading-[1.8] text-white">
              منصة متكاملة لإدارة مواعيد المرضى، الملفات الطبية، المخزون والتقارير المالية لعيادات
              الأسنان.
            </p>
          </div>

          <ul className="flex flex-col  gap-4">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-white">
                  <Icon className="size-6 text-sky-500" strokeWidth={1.8} />
                </span>
                <span className=" text-white">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div />
      </div>

      {/* Form panel */}
      <div className="relative flex w-full flex-1 flex-col items-center justify-center bg-background px-6 py-16">
        <div className="flex w-full max-w-[400px] flex-col gap-6">
          <div className="text-right">
            <h2 className="text-[28px] font-bold text-foreground">تسجيل الدخول</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              أدخل بياناتك للوصول إلى لوحة التحكم
            </p>
          </div>

          <LoginForm />

          {/* <div className="relative flex items-center justify-center py-1">
            <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
            <span className="relative bg-background px-3 text-xs text-muted-foreground">
              هل تحتاج مساعدة؟
            </span>
          </div>

          <p className="text-center text-[13px] text-muted-foreground">
            تواصل مع الدعم الفني على{" "}
            <a href="mailto:support@dentaflow.com" className="font-medium text-primary">
              support@dentaflow.com
            </a>
          </p> */}
        </div>

        <p className="absolute bottom-10 text-xs text-muted-foreground">
          DentaFlow © 2026 — جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
}
