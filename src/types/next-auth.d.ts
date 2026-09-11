import { Role } from "@/generated/prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: Role;
    branches: string[];
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      branches: string[];
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    branches: string[];
    /** Timestamp (ms) of the last DB re-validation of isActive/role/branches — see auth.ts. */
    checkedAt?: number;
  }
}
