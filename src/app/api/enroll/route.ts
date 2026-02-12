/**
 * POST /api/enroll - Enroll current user in a course (student)
 * Body: { courseId: string }
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "STUDENT" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only students can enroll in courses" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const courseId = body?.courseId;
    if (!courseId || typeof courseId !== "string") {
      return NextResponse.json(
        { error: "courseId is required" },
        { status: 400 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    if (course.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "Course is not available for enrollment" },
        { status: 400 }
      );
    }

    const existing = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId: session.user.id, courseId },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Already enrolled", enrollment: existing },
        { status: 409 }
      );
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        userId: session.user.id,
        courseId,
      },
      include: {
        course: {
          select: { id: true, title: true, slug: true },
        },
      },
    });

    // Notify author (optional: create notification)
    await prisma.notification.create({
      data: {
        userId: course.authorId,
        type: "enrollment",
        title: "New enrollment",
        message: `A student enrolled in "${course.title}".`,
        link: `/author/courses/${course.slug}`,
      },
    });

    return NextResponse.json(enrollment, { status: 201 });
  } catch (e) {
    console.error("Enroll error:", e);
    return NextResponse.json({ error: "Enrollment failed" }, { status: 500 });
  }
}
