/**
 * NextAuth.js v5 (beta) configuration
 * Supports: Credentials (email/password) + Google OAuth
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role?: UserRole;
    username?: string | null;
  }
  interface Session {
    user: User & {
      id: string;
      role: UserRole;
      username?: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    username?: string | null;
  }
}

// Auth.js v5 requires AUTH_SECRET (or NEXTAUTH_SECRET for compatibility).
// In dev only, fallback so the app runs; in production you must set AUTH_SECRET.
const secret =
  process.env.AUTH_SECRET ??
  process.env.NEXTAUTH_SECRET ??
  (process.env.NODE_ENV === "development"
    ? "dev-secret-change-in-production"
    : undefined);
if (!secret && process.env.NODE_ENV === "production") {
  console.warn("AUTH_SECRET or NEXTAUTH_SECRET is not set. Auth will not work in production.");
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret,
  trustHost: true, // Required for dev (localhost) and Vercel
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30 days
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user || !user.password) return null;
        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          username: user.username,
        };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true, // link same email across providers
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: UserRole }).role ?? "STUDENT";
        token.username = (user as { username?: string | null }).username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.username = token.username as string | null | undefined;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Optionally sync role from OAuth (e.g. first sign-in = STUDENT)
      if (user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "STUDENT" },
        }).catch(() => {});
      }
    },
  },
});

/** Role-based redirect after login */
export function getRedirectByRole(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "AUTHOR":
      return "/author";
    case "STUDENT":
    default:
      return "/dashboard";
  }
}
