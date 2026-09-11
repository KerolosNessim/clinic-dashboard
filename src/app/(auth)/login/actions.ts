"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn } from "@/auth";

const loginSchema = z.object({
  phone: z.string().regex(/^01[0125][0-9]{8}$/),
  password: z.string().min(6),
});

export async function loginAction(values: unknown) {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "بيانات غير صحيحة" };
  }

  try {
    await signIn("credentials", {
      phone: parsed.data.phone,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "رقم الهاتف أو كلمة المرور غير صحيحة" };
    }
    throw error;
  }

  redirect("/");
}
