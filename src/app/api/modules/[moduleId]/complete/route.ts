/**
 * POST /api/modules/[moduleId]/complete - Mark module as complete for current user (updates enrollment progress)
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ moduleId: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { moduleId } = await params;

    const module_ = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });
    if (!module_) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: module_.courseId,
        },
      },
    });
    if (!enrollment) {
      return NextResponse.json(
        { error: "You must be enrolled to complete modules" },
        { status: 403 }
      );
    }

    await prisma.moduleCompletion.upsert({
      where: {
        userId_moduleId: {
          userId: session.user.id,
          moduleId,
        },
      },
      create: {
        userId: session.user.id,
        moduleId,
      },
      update: {},
    });

    const courseModuleIds = await prisma.module.findMany({
      where: { courseId: module_.courseId },
      select: { id: true },
    });
    const totalModules = courseModuleIds.length;
    const completedCount = await prisma.moduleCompletion.count({
      where: {
        userId: session.user.id,
        moduleId: { in: courseModuleIds.map((m) => m.id) },
      },
    });
    const progress = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;
    const completedAt = progress >= 100 ? new Date() : null;

    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { progress, completedAt },
    });

    return NextResponse.json({ progress, completed: progress >= 100 });
  } catch (e) {
    console.error("Complete module error:", e);
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
  }
}
