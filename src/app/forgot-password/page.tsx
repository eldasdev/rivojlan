"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSent(false);
    setResetLink(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      setSent(true);
      if (data.resetLink) setResetLink(data.resetLink);
      toast.success(data.message ?? "If an account exists, you will receive a reset link.");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto max-w-md py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Forgot password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" loading={loading}>
                Send reset link
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                If an account exists for that email, we sent a reset link. Check your inbox.
              </p>
              {resetLink && (
                <p className="text-sm break-all">
                  <span className="text-slate-600 dark:text-slate-400">Dev reset link: </span>
                  <a
                    href={resetLink}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {resetLink}
                  </a>
                </p>
              )}
            </div>
          )}
          <p className="text-center text-sm text-slate-600 dark:text-slate-400">
            <Link
              href="/login"
              className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Back to log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
