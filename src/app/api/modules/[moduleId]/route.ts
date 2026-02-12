/**
 * GET /api/modules/[moduleId] - Get single module (author/admin of course)
 * PATCH /api/modules/[moduleId] - Update module title and content (author/admin)
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { moduleSchema } from "@/lib/validations/course";

type Params = { params: Promise<{ moduleId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { moduleId } = await params;
    const module_ = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: { select: { authorId: true } } },
    });
    if (!module_) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }
    const isOwner =
      module_.course.authorId === session.user.id || session.user.role === "ADMIN";
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { course, ...rest } = module_;
    return NextResponse.json(rest);
  } catch (e) {
    console.error("Module get error:", e);
    return NextResponse.json({ error: "Failed to fetch module" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { moduleId } = await params;
    const module_ = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: { select: { authorId: true } } },
    });
    if (!module_) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }
    const isOwner =
      module_.course.authorId === session.user.id || session.user.role === "ADMIN";
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await request.json();
    const parsed = moduleSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const updatePayload: { title?: string; content?: object; order?: number; duration?: number } = {};
    if (data.title !== undefined) updatePayload.title = data.title;
    if (data.content !== undefined) updatePayload.content = data.content as object;
    if (data.order !== undefined) updatePayload.order = data.order;
    if (data.duration !== undefined) updatePayload.duration = data.duration ?? undefined;
    const updated = await prisma.module.update({
      where: { id: moduleId },
      data: updatePayload,
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("Module update error:", e);
    return NextResponse.json({ error: "Failed to update module" }, { status: 500 });
  }
}
