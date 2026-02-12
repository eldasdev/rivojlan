/**
 * POST /api/courses/[slug]/modules - Add module to course (author/admin)
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { moduleSchema } from "@/lib/validations/course";

type Params = { params: Promise<{ slug: string }> };

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
    const isOwner =
      course.authorId === session.user.id || session.user.role === "ADMIN";
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = moduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const type = data.type ?? "lesson";
    const defaultContent: Record<string, unknown> = data.content as Record<string, unknown> ?? {};
    if (!defaultContent.type) defaultContent.type = type;
    if (type === "lesson" && defaultContent.text === undefined) defaultContent.text = "";
    if (type === "lesson" && defaultContent.parts === undefined) defaultContent.parts = [];
    if (type === "quiz" && defaultContent.questions === undefined) defaultContent.questions = [];
    if (type === "video" && defaultContent.videoUrl === undefined) defaultContent.videoUrl = "";
    if (type === "feedback" && defaultContent.prompt === undefined) defaultContent.prompt = "";
    const module_ = await prisma.module.create({
      data: {
        courseId: course.id,
        title: data.title,
        content: defaultContent,
        order: data.order,
        duration: data.duration ?? undefined,
      },
    });
    return NextResponse.json(module_, { status: 201 });
  } catch (e) {
    console.error("Module create error:", e);
    return NextResponse.json({ error: "Failed to create module" }, { status: 500 });
  }
}
