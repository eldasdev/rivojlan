/**
 * GET /api/courses - List courses (filter by status, category, search)
 * POST /api/courses - Create course (author/admin only)
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { courseSchema } from "@/lib/validations/course";
import { slugify } from "@/lib/utils";
import type { CourseStatus } from "@prisma/client";

const VALID_STATUSES: CourseStatus[] = ["DRAFT", "PENDING", "PUBLISHED", "REJECTED"];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    const category = searchParams.get("category") ?? "";
    const statusParam = searchParams.get("status") ?? "PUBLISHED";
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);
    const offset = Number(searchParams.get("offset")) || 0;

    const where: {
      status?: CourseStatus;
      category?: string;
      OR?: Array<{ title?: { contains: string, mode: "insensitive" }, slug?: { contains: string, mode: "insensitive" } }>;
    } = {};
    if (statusParam && VALID_STATUSES.includes(statusParam as CourseStatus)) {
      where.status = statusParam as CourseStatus;
    }
    if (category) where.category = category;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
      ];
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, username: true, image: true } },
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
    console.error("Courses list error:", e);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = session.user.role;
    if (role !== "AUTHOR" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const authorId =
      role === "ADMIN" && typeof (body as { authorId?: string }).authorId === "string" && (body as { authorId: string }).authorId
        ? (body as { authorId: string }).authorId
        : session.user.id;
    const parsed = courseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const slug = slugify(data.title);
    const existingSlug = await prisma.course.findUnique({ where: { slug } });
    const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

    const course = await prisma.course.create({
      data: {
        title: data.title,
        slug: finalSlug,
        description: data.description ?? null,
        longDescription: data.longDescription ?? null,
        thumbnail: data.thumbnail || null,
        isPaid: data.isPaid ?? false,
        price: data.price ?? null,
        category: data.category ?? null,
        level: data.level ?? null,
        duration: data.duration ?? null,
        status: role === "ADMIN" ? "PUBLISHED" : "DRAFT",
        authorId,
      },
      include: {
        author: { select: { id: true, name: true, username: true } },
      },
    });

    return NextResponse.json(course, { status: 201 });
  } catch (e) {
    console.error("Course create error:", e);
    return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
  }
}
