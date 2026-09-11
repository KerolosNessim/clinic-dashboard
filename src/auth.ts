import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// How often an active session's isActive/role/branches are re-checked against the DB.
const REVALIDATE_INTERVAL_MS = 60_000;

const credentialsSchema = z.object({
  phone: z.string().regex(/^01[0125][0-9]{8}$/),
  password: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Credentials-only auth uses JWT sessions — Auth.js does not persist
  // Credentials sign-ins through a database adapter, and our User table
  // (phone/password, no email/Account/Session models) isn't shaped like
  // the schema @auth/prisma-adapter expects, so no adapter is attached here.
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        phone: {},
        password: {},
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { phone: parsed.data.phone },
          include: { branches: { select: { branchId: true } } },
        });

        if (!user || !user.isActive) return null;

        const isValidPassword = await bcrypt.compare(parsed.data.password, user.password);
        if (!isValidPassword) return null;

        return {
          id: user.id,
          name: user.name,
          role: user.role,
          branches: user.branches.map((b) => b.branchId),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.branches = user.branches;
        token.checkedAt = Date.now();
        return token;
      }

      // Without this, isActive/role/branches were only ever checked at sign-in — a
      // deactivated account (or a role/branch change) kept full access for the entire
      // session lifetime (up to 30 days) until the cookie happened to expire. Re-check
      // against the DB periodically (throttled, not on every request) and end the
      // session immediately if the account was deactivated or no longer exists.
      const lastChecked = token.checkedAt ?? 0;
      if (Date.now() - lastChecked > REVALIDATE_INTERVAL_MS) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          include: { branches: { select: { branchId: true } } },
        });
        if (!dbUser || !dbUser.isActive) {
          return null;
        }
        token.role = dbUser.role;
        token.branches = dbUser.branches.map((b) => b.branchId);
        token.checkedAt = Date.now();
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.branches = token.branches;
      return session;
    },
  },
});
