"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";

type User = {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  role: string;
  createdAt: string;
  _count: { coursesAuthored: number; enrollments: number };
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams();
      if (role) params.set("role", role);
      if (q) params.set("q", q);
      params.set("limit", "50");
      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();
      if (!cancelled) {
        setUsers(data.users ?? []);
        setTotal(data.total ?? 0);
      }
    })();
    return () => { cancelled = true; };
  }, [role, q]);

  useEffect(() => {
    setLoading(false);
  }, [users]);

  async function updateRole(userId: string, newRole: string) {
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
        toast.success("Role updated");
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Failed");
      }
    } catch {
      toast.error("Failed to update role");
    }
  }

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4">
      <h1 className="text-2xl font-semibold mb-6">User management</h1>
      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="search"
          placeholder="Search by email or name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 max-w-xs"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
        >
          <option value="">All roles</option>
          <option value="STUDENT">Student</option>
          <option value="AUTHOR">Author</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Courses / Enrollments</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <p className="font-medium">{u.name ?? u.email}</p>
                        <p className="text-sm text-slate-500">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="capitalize text-sm">{u.role.toLowerCase()}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {u._count.coursesAuthored} courses · {u._count.enrollments} enrollments
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          onChange={(e) => updateRole(u.id, e.target.value)}
                          className="text-sm px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                        >
                          <option value="STUDENT">Student</option>
                          <option value="AUTHOR">Author</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      <p className="text-sm text-slate-500 mt-4">Total: {total}</p>
    </div>
  );
}
