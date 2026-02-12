"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BookOpen, Plus, Users, Star } from "lucide-react";

type Course = {
  id: string;
  title: string;
  slug: string;
  status: string;
  _count: { enrollments: number; reviews: number };
};

export default function AuthorDashboardPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/author/courses");
      const data = await res.json();
      if (!cancelled && res.ok) setCourses(data.courses ?? []);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setLoading(false);
  }, [courses]);

  const published = courses.filter((c) => c.status === "PUBLISHED");
  const draft = courses.filter((c) => c.status === "DRAFT");
  const pending = courses.filter((c) => c.status === "PENDING");

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Author dashboard</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your courses and view analytics.
          </p>
        </div>
        <Link href="/author/courses/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create course
          </Button>
        </Link>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{courses.length}</p>
                <p className="text-sm text-slate-500">Total courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {courses.reduce((s, c) => s + c._count.enrollments, 0)}
                </p>
                <p className="text-sm text-slate-500">Total enrollments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {courses.reduce((s, c) => s + c._count.reviews, 0)}
                </p>
                <p className="text-sm text-slate-500">Total reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : courses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              You haven&apos;t created any courses yet.
            </p>
            <Link href="/author/courses/new">
              <Button>Create your first course</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your courses</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
              {courses.map((c) => (
                <li key={c.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Link
                        href={`/author/courses/${c.slug}/edit`}
                        className="font-medium hover:text-indigo-600 dark:hover:text-indigo-400"
                      >
                        {c.title}
                      </Link>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {c._count.enrollments} enrollments · {c._count.reviews} reviews
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
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
                      <Link href={`/author/courses/${c.slug}/edit`}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
