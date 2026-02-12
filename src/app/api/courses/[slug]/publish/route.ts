/**
 * POST /api/courses/[slug]/publish - Set status to PENDING (author) or PUBLISHED (admin)
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ slug: string }> };

export async function POST(_request: Request, { params }: Params) {
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
    const isAuthor = course.authorId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const newStatus = isAdmin ? "PUBLISHED" : "PENDING";
    const updated = await prisma.course.update({
      where: { slug },
      data: {
        status: newStatus,
        ...(newStatus === "PUBLISHED" && { publishedAt: new Date() }),
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("Publish error:", e);
    return NextResponse.json({ error: "Failed to publish" }, { status: 500 });
  }
}
