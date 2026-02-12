"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import {
  BookOpen,
  CheckCircle,
  XCircle,
  Archive,
  Trash2,
  ExternalLink,
} from "lucide-react";

type Course = {
  id: string;
  title: string;
  slug: string;
  status: string;
  author: { id: string; name: string | null; email: string };
  _count: { enrollments: number; reviews: number };
};

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      params.set("limit", "50");
      const res = await fetch(`/api/admin/courses?${params}`);
      const data = await res.json();
      if (!cancelled) {
        setCourses(data.courses ?? []);
        setTotal(data.total ?? 0);
      }
    })();
    return () => { cancelled = true; };
  }, [status]);

  useEffect(() => {
    setLoading(false);
  }, [courses]);

  async function approveCourse(slug: string) {
    try {
      const res = await fetch(`/api/courses/${slug}/publish`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setCourses((prev) =>
          prev.map((c) => (c.slug === slug ? { ...c, status: data.status } : c))
        );
        toast.success("Course approved");
      } else {
        toast.error("Failed to approve");
      }
    } catch {
      toast.error("Failed to approve");
    }
  }

  async function setCourseStatus(slug: string, status: "REJECTED" | "DRAFT") {
    try {
      const res = await fetch(`/api/courses/${slug}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        setCourses((prev) =>
          prev.map((c) => (c.slug === slug ? { ...c, status: data.status } : c))
        );
        if (status === "REJECTED") toast.success("Course denied");
        if (status === "DRAFT") toast.success("Course archived");
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function deleteCourse(slug: string, title: string) {
    if (!confirm(`Delete course "${title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/courses/${slug}`, { method: "DELETE" });
      if (res.ok) {
        setCourses((prev) => prev.filter((c) => c.slug !== slug));
        setTotal((t) => Math.max(0, t - 1));
        toast.success("Course deleted");
      } else {
        toast.error("Failed to delete");
      }
    } catch {
      toast.error("Failed to delete");
    }
  }

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4">
      <h1 className="text-2xl font-semibold mb-6">Course moderation</h1>
      <div className="flex flex-wrap gap-4 mb-6">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING">Pending</option>
          <option value="PUBLISHED">Published</option>
          <option value="REJECTED">Rejected</option>
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
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium">Author</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Enrollments</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {courses.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <BookOpen className="h-4 w-4" aria-hidden />
                          </div>
                          <Link
                            href={`/courses/${c.slug}`}
                            className="font-medium hover:text-indigo-600 dark:hover:text-indigo-400"
                          >
                            {c.title}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {c.author.name ?? c.author.email}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            c.status === "PUBLISHED"
                              ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
                              : c.status === "PENDING"
                                ? "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300"
                                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{c._count.enrollments}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/courses/${c.slug}`}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                            title="View"
                            aria-label="View course"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                          {c.status === "PENDING" && (
                            <>
                              <button
                                type="button"
                                onClick={() => approveCourse(c.slug)}
                                className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400"
                                title="Approve"
                                aria-label="Approve"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setCourseStatus(c.slug, "REJECTED")}
                                className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                                title="Deny"
                                aria-label="Deny"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {c.status === "PUBLISHED" && (
                            <button
                              type="button"
                              onClick={() => setCourseStatus(c.slug, "DRAFT")}
                              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                              title="Archive"
                              aria-label="Archive"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteCourse(c.slug, c.title)}
                            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                            title="Delete"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
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
