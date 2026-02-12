"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { User } from "lucide-react";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name ?? "");
      setUsername((session.user as { username?: string }).username ?? "");
    }
  }, [session]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // Profile update API could be added (PATCH /api/users/me)
      toast.success("Profile updated (demo: no API yet)");
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading" || !session?.user) {
    return (
      <div className="container mx-auto max-w-md py-12 px-4">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  const user = session.user as { username?: string; role?: string };

  return (
    <div className="container mx-auto max-w-md py-8 px-4">
      <h1 className="text-2xl font-semibold mb-6">Profile</h1>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-6">
            {session.user.image ? (
              <img
                src={session.user.image}
                alt=""
                className="h-16 w-16 rounded-full"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                <User className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
            )}
            <div>
              <p className="font-medium">{session.user.name ?? session.user.email}</p>
              <p className="text-sm text-slate-500">{session.user.email}</p>
              <p className="text-xs text-slate-400 capitalize">{user.role?.toLowerCase()}</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Display name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Button type="submit" loading={saving}>
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
