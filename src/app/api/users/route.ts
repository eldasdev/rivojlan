/**
 * GET /api/users - List users (admin only). Query: role, q, limit, offset
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

const VALID_ROLES: UserRole[] = ["STUDENT", "AUTHOR", "ADMIN"];

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const roleParam = searchParams.get("role") ?? undefined;
    const q = searchParams.get("q") ?? "";
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);
    const offset = Number(searchParams.get("offset")) || 0;

    const where: {
      role?: UserRole;
      OR?: Array<{ email?: { contains: string, mode: "insensitive" }, name?: { contains: string, mode: "insensitive" } }>;
    } = {};
    if (roleParam && VALID_ROLES.includes(roleParam as UserRole)) {
      where.role = roleParam as UserRole;
    }
    if (q) {
      where.OR = [
        { email: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          role: true,
          image: true,
          createdAt: true,
          _count: { select: { coursesAuthored: true, enrollments: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where }),
    ]);
    return NextResponse.json({ users, total });
  } catch (e) {
    console.error("Users list error:", e);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
