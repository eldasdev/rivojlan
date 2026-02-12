/**
 * GET /api/admin/courses - List all courses (admin). Query: status, limit, offset
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { CourseStatus } from "@prisma/client";

const VALID_STATUSES: CourseStatus[] = ["DRAFT", "PENDING", "PUBLISHED", "REJECTED"];

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
    const offset = Number(searchParams.get("offset")) || 0;

    const status = statusParam && VALID_STATUSES.includes(statusParam as CourseStatus)
      ? (statusParam as CourseStatus)
      : undefined;
    const where = status ? { status } : {};
    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, email: true } },
          _count: { select: { enrollments: true, reviews: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.course.count({ where }),
    ]);
    return NextResponse.json({ courses, total });
  } catch (e) {
    console.error("Admin courses error:", e);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}
