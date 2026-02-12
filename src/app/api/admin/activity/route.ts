/**
 * GET /api/admin/activity - Recent activity feed (admin only)
 * Returns: recent enrollments, new users, new reviews (combined, sorted by date)
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
    const limit = Math.min(Number(searchParams.get("limit")) || 30, 100);

    const [enrollments, newUsers, reviews] = await Promise.all([
      prisma.enrollment.findMany({
        orderBy: { enrolledAt: "desc" },
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          course: { select: { id: true, title: true, slug: true } },
        },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
      prisma.review.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          user: { select: { name: true, email: true } },
          course: { select: { title: true, slug: true } },
        },
      }),
    ]);

    const activities: Array<{
      type: "enrollment" | "user_signup" | "review";
      date: string;
      id: string;
      message: string;
      meta?: Record<string, unknown>;
    }> = [];

    enrollments.forEach((e) => {
      activities.push({
        type: "enrollment",
        date: e.enrolledAt.toISOString(),
        id: e.id,
        message: `${e.user.name || e.user.email} enrolled in "${e.course.title}"`,
        meta: { userId: e.userId, courseId: e.course.id, courseSlug: e.course.slug },
      });
    });
    newUsers.forEach((u) => {
      activities.push({
        type: "user_signup",
        date: u.createdAt.toISOString(),
        id: u.id,
        message: `New user: ${u.name || u.email} (${u.role})`,
        meta: { email: u.email },
      });
    });
    reviews.forEach((r) => {
      activities.push({
        type: "review",
        date: r.createdAt.toISOString(),
        id: r.id,
        message: `${r.user.name || r.user.email} left a ${r.rating}-star review on "${r.course.title}"`,
        meta: { courseSlug: r.course.slug, rating: r.rating },
      });
    });

    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      activities: activities.slice(0, limit),
    });
  } catch (e) {
    console.error("Activity error:", e);
    return NextResponse.json({ error: "Failed to load activity" }, { status: 500 });
  }
}
