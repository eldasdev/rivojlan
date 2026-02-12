/**
 * GET /api/admin/settings/stripe - Get Stripe config (masked, admin only)
 * PATCH /api/admin/settings/stripe - Save Stripe config (admin only)
 * Body: { stripePublishableKey?, stripeSecretKey?, stripeWebhookSecret? }
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const KEYS = ["stripe_publishable_key", "stripe_secret_key", "stripe_webhook_secret"] as const;

function maskSecret(value: string | null): string {
  if (!value || value.length < 8) return "";
  return value.slice(0, 7) + "***" + value.slice(-4);
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const settings = await prisma.setting.findMany({
      where: { key: { in: [...KEYS] } },
    });
    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    return NextResponse.json({
      stripePublishableKey: map.stripe_publishable_key ?? "",
      stripeSecretKey: map.stripe_secret_key ? maskSecret(map.stripe_secret_key) : "",
      stripeWebhookSecret: map.stripe_webhook_secret ? maskSecret(map.stripe_webhook_secret) : "",
      configured: !!(map.stripe_secret_key && map.stripe_webhook_secret),
    });
  } catch (e) {
    console.error("Stripe settings GET:", e);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await request.json();
    const stripePublishableKey = typeof body.stripePublishableKey === "string" ? body.stripePublishableKey.trim() : undefined;
    const stripeSecretKey = typeof body.stripeSecretKey === "string" ? body.stripeSecretKey.trim() : undefined;
    const stripeWebhookSecret = typeof body.stripeWebhookSecret === "string" ? body.stripeWebhookSecret.trim() : undefined;

    async function setKey(key: string, value: string) {
      if (value === "") return;
      await prisma.setting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
    }

    if (stripePublishableKey !== undefined) await setKey("stripe_publishable_key", stripePublishableKey);
    if (stripeSecretKey !== undefined) await setKey("stripe_secret_key", stripeSecretKey);
    if (stripeWebhookSecret !== undefined) await setKey("stripe_webhook_secret", stripeWebhookSecret);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Stripe settings PATCH:", e);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
