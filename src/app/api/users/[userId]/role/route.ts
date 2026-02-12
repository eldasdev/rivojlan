/**
 * PATCH /api/users/[userId]/role - Update user role (admin only)
 * Body: { role: "STUDENT" | "AUTHOR" | "ADMIN" }
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ userId: string }> };

const ROLES = ["STUDENT", "AUTHOR", "ADMIN"] as const;

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { userId } = await params;
    const body = await request.json();
    const role = body?.role;
    if (!role || !ROLES.includes(role)) {
      return NextResponse.json(
        { error: "role must be one of STUDENT, AUTHOR, ADMIN" },
        { status: 400 }
      );
    }
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });
    return NextResponse.json(user);
  } catch (e) {
    console.error("Role update error:", e);
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }
}
