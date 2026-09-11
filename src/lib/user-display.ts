import { Role } from "@/generated/prisma/client";

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "أدمن",
  DOCTOR: "طبيب",
  STAFF: "موظف",
};

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]).join("");
}
