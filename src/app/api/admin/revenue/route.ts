/**
 * GET /api/admin/revenue - Revenue by course, by author, and payout summary (admin only)
 * Uses: paid courses, enrollment count, price × enrollments = revenue; Payout records for paid-out amounts.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (typeof (prisma as { payout?: unknown }).payout === "undefined") {
      console.error("Prisma client missing Payout model. Run: npx prisma generate");
      return NextResponse.json(
        { error: "Server misconfiguration: run 'npx prisma generate' and restart the dev server." },
        { status: 500 }
      );
    }

    const courses = await prisma.course.findMany({
      where: { isPaid: true, status: "PUBLISHED", price: { not: null } },
      include: {
        author: { select: { id: true, name: true, email: true } },
        _count: { select: { enrollments: true } },
      },
    });

    const revenueByCourse = courses.map((c) => {
      const price = Number(c.price ?? 0);
      const enrollments = c._count.enrollments;
      const revenue = price * enrollments;
      return {
        courseId: c.id,
        title: c.title,
        slug: c.slug,
        authorId: c.authorId,
        authorName: c.author.name ?? c.author.email,
        price,
        enrollments,
        revenue,
      };
    });

    const authorIds = [...new Set(revenueByCourse.map((r) => r.authorId))];
    const payouts = await prisma.payout.findMany({
      where: { authorId: { in: authorIds } },
      orderBy: { paidAt: "desc" },
    });

    const earningsByAuthor: Record<
      string,
      { authorId: string; authorName: string; earnings: number; paidOut: number; pending: number }
    > = {};
    revenueByCourse.forEach((r) => {
      if (!earningsByAuthor[r.authorId]) {
        earningsByAuthor[r.authorId] = {
          authorId: r.authorId,
          authorName: r.authorName,
          earnings: 0,
          paidOut: 0,
          pending: 0,
        };
      }
      earningsByAuthor[r.authorId].earnings += r.revenue;
    });
    payouts.forEach((p) => {
      const amt = Number(p.amount);
      if (earningsByAuthor[p.authorId]) {
        earningsByAuthor[p.authorId].paidOut += amt;
      }
    });
    Object.values(earningsByAuthor).forEach((a) => {
      a.pending = Math.max(0, a.earnings - a.paidOut);
    });

    const revenueByAuthor = Object.values(earningsByAuthor).sort(
      (a, b) => b.earnings - a.earnings
    );

    const platformRevenue = revenueByCourse.reduce((s, r) => s + r.revenue, 0);
    const totalPaidOut = payouts.reduce((s, p) => s + Number(p.amount), 0);
    const totalPending = revenueByAuthor.reduce((s, a) => s + a.pending, 0);

    const recentPayouts = await prisma.payout.findMany({
      take: 20,
      orderBy: { paidAt: "desc" },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      revenueByCourse,
      revenueByAuthor,
      totals: {
        platformRevenue,
        totalPaidOut,
        totalPending,
      },
      recentPayouts: recentPayouts.map((p) => ({
        id: p.id,
        authorId: p.authorId,
        authorName: p.author.name ?? p.author.email,
        amount: Number(p.amount),
        note: p.note,
        status: p.status,
        paidAt: p.paidAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("Revenue error:", e);
    return NextResponse.json({ error: "Failed to load revenue" }, { status: 500 });
  }
}
