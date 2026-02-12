/**
 * POST /api/admin/payouts - Record a payout to an author (admin only)
 * Body: { authorId: string, amount: number, note?: string }
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await request.json();
    const authorId = body?.authorId;
    const amount = typeof body?.amount === "number" ? body.amount : parseFloat(body?.amount);
    const note = typeof body?.note === "string" ? body.note : undefined;

    if (!authorId || typeof authorId !== "string") {
      return NextResponse.json({ error: "authorId is required" }, { status: 400 });
    }
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
    }

    const author = await prisma.user.findUnique({
      where: { id: authorId },
      select: { id: true, name: true, email: true },
    });
    if (!author) {
      return NextResponse.json({ error: "Author not found" }, { status: 404 });
    }

    if (typeof (prisma as { payout?: unknown }).payout === "undefined") {
      console.error("Prisma client missing Payout model. Run: npx prisma generate");
      return NextResponse.json(
        { error: "Server misconfiguration: run 'npx prisma generate' and restart the dev server." },
        { status: 500 }
      );
    }

    const payout = await prisma.payout.create({
      data: {
        authorId,
        amount,
        note: note ?? null,
        status: "completed",
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      id: payout.id,
      authorId: payout.authorId,
      authorName: payout.author.name ?? payout.author.email,
      amount: Number(payout.amount),
      note: payout.note,
      status: payout.status,
      paidAt: payout.paidAt.toISOString(),
    }, { status: 201 });
  } catch (e) {
    console.error("Payout error:", e);
    return NextResponse.json({ error: "Failed to record payout" }, { status: 500 });
  }
}
