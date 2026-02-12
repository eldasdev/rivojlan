/**
 * PATCH /api/courses/[slug]/status - Set course status (admin only)
 * Body: { status: "REJECTED" | "DRAFT" }
 * Use for: Deny (REJECTED), Archive (DRAFT = unpublish)
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { CourseStatus } from "@prisma/client";

const ALLOWED_STATUSES: CourseStatus[] = ["REJECTED", "DRAFT", "PUBLISHED"];

type Params = { params: Promise<{ slug: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { slug } = await params;
    const course = await prisma.course.findUnique({ where: { slug } });
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    const body = await request.json();
    const newStatus = body?.status;
    if (!newStatus || !ALLOWED_STATUSES.includes(newStatus as CourseStatus)) {
      return NextResponse.json(
        { error: "status must be one of REJECTED, DRAFT, PUBLISHED" },
        { status: 400 }
      );
    }
    const updated = await prisma.course.update({
      where: { slug },
      data: { status: newStatus as CourseStatus },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("Course status update error:", e);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
