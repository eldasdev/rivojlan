/**
 * GET /api/author/courses - List courses by current author (all statuses)
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { CourseStatus } from "@prisma/client";

const VALID_STATUSES: CourseStatus[] = ["DRAFT", "PENDING", "PUBLISHED", "REJECTED"];

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "AUTHOR" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
    const offset = Number(searchParams.get("offset")) || 0;

    const where: { authorId: string; status?: CourseStatus } = {
      authorId: session.user.id,
    };
    if (statusParam && VALID_STATUSES.includes(statusParam as CourseStatus)) {
      where.status = statusParam as CourseStatus;
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        include: {
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
    console.error("Author courses error:", e);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}
