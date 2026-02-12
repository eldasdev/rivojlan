/**
 * GET /api/courses/[slug]/reviews - List reviews for course
 * POST /api/courses/[slug]/reviews - Add/update review (enrolled student)
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reviewSchema } from "@/lib/validations/course";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    const course = await prisma.course.findUnique({ where: { slug } });
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    const reviews = await prisma.review.findMany({
      where: { courseId: course.id },
      include: {
        user: { select: { id: true, name: true, username: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    const avg = reviews.length
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;
    return NextResponse.json({
      reviews,
      averageRating: Math.round(avg * 10) / 10,
      total: reviews.length,
    });
  } catch (e) {
    console.error("Reviews list error:", e);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { slug } = await params;
    const course = await prisma.course.findUnique({ where: { slug } });
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: course.id,
        },
      },
    });
    if (!enrollment) {
      return NextResponse.json(
        { error: "You must be enrolled to review" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { rating, comment } = parsed.data;

    const review = await prisma.review.upsert({
      where: {
        courseId_userId: { courseId: course.id, userId: session.user.id },
      },
      create: {
        courseId: course.id,
        userId: session.user.id,
        rating,
        comment: comment ?? null,
      },
      update: { rating, comment: comment ?? undefined },
      include: {
        user: { select: { id: true, name: true, username: true, image: true } },
      },
    });
    return NextResponse.json(review);
  } catch (e) {
    console.error("Review create/update error:", e);
    return NextResponse.json({ error: "Failed to save review" }, { status: 500 });
  }
}
