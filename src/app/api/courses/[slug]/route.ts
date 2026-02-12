/**
 * GET /api/courses/[slug] - Get single course (public if published)
 * PATCH /api/courses/[slug] - Update course (author/admin)
 * DELETE /api/courses/[slug] - Delete course (author/admin)
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { courseSchema } from "@/lib/validations/course";
import { slugify } from "@/lib/utils";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    const course = await prisma.course.findUnique({
      where: { slug },
      include: {
        author: { select: { id: true, name: true, username: true, image: true } },
        modules: { orderBy: { order: "asc" } },
        _count: { select: { enrollments: true, reviews: true } },
      },
    });
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    const session = await auth();
    const isOwner =
      session?.user?.id === course.authorId ||
      session?.user?.role === "ADMIN";
    if (course.status !== "PUBLISHED" && !isOwner) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    return NextResponse.json(course);
  } catch (e) {
    console.error("Course get error:", e);
    return NextResponse.json({ error: "Failed to fetch course" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
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
    const isOwner =
      course.authorId === session.user.id || session.user.role === "ADMIN";
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = courseSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const updatePayload: Record<string, unknown> = {
      ...(data.title && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.longDescription !== undefined && { longDescription: data.longDescription }),
      ...(data.thumbnail !== undefined && { thumbnail: data.thumbnail || null }),
      ...(data.isPaid !== undefined && { isPaid: data.isPaid }),
      ...(data.price !== undefined && { price: data.price }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.level !== undefined && { level: data.level }),
      ...(data.duration !== undefined && { duration: data.duration }),
    };
    if (data.title && data.title !== course.title) {
      const newSlug = slugify(data.title);
      const existing = await prisma.course.findUnique({ where: { slug: newSlug } });
      updatePayload.slug = existing ? `${newSlug}-${Date.now()}` : newSlug;
    }

    const updated = await prisma.course.update({
      where: { slug },
      data: updatePayload as never,
      include: {
        author: { select: { id: true, name: true, username: true } },
        modules: { orderBy: { order: "asc" } },
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("Course update error:", e);
    return NextResponse.json({ error: "Failed to update course" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
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
    const isOwner =
      course.authorId === session.user.id || session.user.role === "ADMIN";
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await prisma.course.delete({ where: { slug } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Course delete error:", e);
    return NextResponse.json({ error: "Failed to delete course" }, { status: 500 });
  }
}
