/**
 * POST /api/auth/register
 * Register new user (student or author). Admin is only via seed/approval.
 */
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { email, password, name, username, role } = parsed.data;

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, ...(username ? [{ username }] : [])],
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: existing.email === email ? "Email already in use" : "Username already in use" },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);
    const uniqueUsername = username || `user_${Date.now()}`;

    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        name,
        username: uniqueUsername,
        role: role === "AUTHOR" ? "AUTHOR" : "STUDENT",
      },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        role: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    console.error("Register error:", e);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
