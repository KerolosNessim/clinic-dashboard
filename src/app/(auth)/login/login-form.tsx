"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircleIcon, ArrowUpLeft, Eye, EyeOff, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { loginAction } from "./actions";

const loginSchema = z.object({
  phone: z
    .string()
    .regex(/^01[0125][0-9]{8}$/, "أدخل رقم هاتف مصري صحيح (01XXXXXXXXX)"),
  password: z.string().min(6, "كلمة المرور يجب ألا تقل عن 6 أحرف"),
  remember: z.boolean(),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: "", password: "", remember: false },
  });

  function onSubmit(values: LoginValues) {
    setServerError(null);
    startTransition(async () => {
      const result = await loginAction(values);
      if (result?.error) {
        setServerError(result.error);
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {serverError && (
          <Alert variant="destructive" className="bg-red-50 text-red-700 text-start ">
            <AlertCircleIcon className="size-4 text-red-700" />
            <AlertTitle>{serverError}</AlertTitle>
          </Alert>
        )}

        <Controller
          name="phone"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="phone">رقم الهاتف</FieldLabel>
              <InputGroup className="h-11">
                <InputGroupInput
                  dir="ltr"
                  {...field}
                  id="phone"
                  inputMode="numeric"
                  placeholder="01XXXXXXXXX"
                  aria-invalid={fieldState.invalid}
                  disabled={isPending}
                />
                <InputGroupAddon className="me-2" align="inline-end">
                  <Phone className="size-4 text-sky-500" />
                </InputGroupAddon>
              </InputGroup>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="password">كلمة المرور</FieldLabel>
              <InputGroup className="h-11">
                <InputGroupInput
                  {...field}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  aria-invalid={fieldState.invalid}
                  disabled={isPending}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    className="cursor-pointer bg-transparent hover:bg-transparent focus:bg-transparent active:bg-transparent"
                    type="button"
                    size="icon-sm"
                    aria-label={
                      showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
                    }
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4 text-sky-500" />
                    ) : (
                      <Eye className="size-4 text-sky-500" />
                    )}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="flex items-center justify-between">

          <Controller
            name="remember"
            control={form.control}
            render={({ field }) => (
              <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isPending}
                  className="size-4 border-sky-500 text-sky-500 focus:ring-sky-500"
                />
                <span>تذكّرني لمدة 30 يوماً</span>
              </label>
            )}
          />
                    <a
            href="#"
            className="text-[13px] font-medium text-primary hover:underline"
          >
            نسيت كلمة المرور؟
          </a>
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="h-11 w-full gap-2 text-[15px] font-semibold justify-between rounded-lg! "
        >
          <span className="ps-2">
          الدخول إلى لوحة التحكم
          </span>
          <span className="size-7 bg-white flex items-center justify-center rounded-sm text-blue-500" >
          {isPending ? <Spinner /> : <ArrowUpLeft data-icon="inline-start" />}
          </span>
        </Button>
      </FieldGroup>
    </form>
  );
}
