/**
 * POST /api/auth/forgot-password
 * Create a reset token and return reset link (for local dev; in prod send email).
 */
import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations/auth";

const RESET_EXPIRY_HOURS = 1;
const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { email } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't leak existence: same response
      return NextResponse.json({
        message: "If an account exists, you will receive a reset link.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + RESET_EXPIRY_HOURS * 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    const resetLink = `${baseUrl}/reset-password?token=${token}`;
    // In production: send email with resetLink (e.g. Resend, SendGrid)
    return NextResponse.json({
      message: "If an account exists, you will receive a reset link.",
      // For local dev only: expose link (remove in production)
      ...(process.env.NODE_ENV === "development" && { resetLink }),
    });
  } catch (e) {
    console.error("Forgot password error:", e);
    return NextResponse.json(
      { error: "Request failed" },
      { status: 500 }
    );
  }
}
