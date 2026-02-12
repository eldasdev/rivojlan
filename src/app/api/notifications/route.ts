/**
 * GET /api/notifications - List current user notifications
 * PATCH /api/notifications - Mark as read (body: { id?: string, markAll?: boolean })
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const where = { userId: session.user.id, ...(unreadOnly && { read: false }) };
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    const unreadCount = await prisma.notification.count({
      where: { userId: session.user.id, read: false },
    });
    return NextResponse.json({ notifications, unreadCount });
  } catch (e) {
    console.error("Notifications list error:", e);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const { id, markAll } = body as { id?: string; markAll?: boolean };

    if (markAll) {
      await prisma.notification.updateMany({
        where: { userId: session.user.id },
        data: { read: true },
      });
      return NextResponse.json({ success: true });
    }
    if (id && typeof id === "string") {
      await prisma.notification.updateMany({
        where: { id, userId: session.user.id },
        data: { read: true },
      });
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "id or markAll required" }, { status: 400 });
  } catch (e) {
    console.error("Notifications update error:", e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
