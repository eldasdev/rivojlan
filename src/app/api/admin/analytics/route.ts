/**
 * GET /api/admin/analytics - Platform analytics (admin only)
 * Returns: totals, enrollments by day (last 30d), top courses, courses by status
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const days = Math.min(Math.max(Number(searchParams.get("days")) || 30, 7), 90);

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalCourses,
      totalEnrollments,
      coursesByStatus,
      enrollmentsByDay,
      topCourses,
      recentUsersCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.course.count(),
      prisma.enrollment.count(),
      prisma.course.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      prisma.$queryRaw<Array<{ date: unknown; count: bigint }>>`
        SELECT "enrolledAt"::date as date, COUNT(*) as count
        FROM "Enrollment"
        WHERE "enrolledAt" >= ${since}
        GROUP BY "enrolledAt"::date
        ORDER BY date ASC
      `.then((rows) =>
        rows.map((r) => ({
          date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date),
          count: Number(r.count),
        }))
      ),
      prisma.course.findMany({
        where: { status: "PUBLISHED" },
        take: 50,
        select: {
          id: true,
          title: true,
          slug: true,
          _count: { select: { enrollments: true, reviews: true } },
        },
      }).then((list) => list.sort((a, b) => b._count.enrollments - a._count.enrollments).slice(0, 10)),
      prisma.user.count({ where: { createdAt: { gte: since } } }),
    ]);

    const statusMap = Object.fromEntries(
      coursesByStatus.map((s) => [s.status, s._count.id])
    );

    return NextResponse.json({
      totals: {
        users: totalUsers,
        courses: totalCourses,
        enrollments: totalEnrollments,
      },
      coursesByStatus: {
        DRAFT: statusMap.DRAFT ?? 0,
        PENDING: statusMap.PENDING ?? 0,
        PUBLISHED: statusMap.PUBLISHED ?? 0,
        REJECTED: statusMap.REJECTED ?? 0,
      },
      enrollmentsByDay,
      topCourses,
      newUsersLastNDays: recentUsersCount,
    });
  } catch (e) {
    console.error("Analytics error:", e);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
