"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { BookOpen, TrendingUp } from "lucide-react";

type Enrollment = {
  id: string;
  progress: number;
  completedAt: string | null;
  course: {
    id: string;
    title: string;
    slug: string;
    thumbnail: string | null;
    category: string | null;
    author: { name: string | null; username: string | null };
  };
};

export default function StudentDashboardPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/enrollments");
      const data = await res.json();
      if (!cancelled && res.ok) setEnrollments(data.enrollments ?? []);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setLoading(false);
  }, [enrollments]);

  const inProgress = enrollments.filter((e) => e.progress < 100);
  const completed = enrollments.filter((e) => e.progress >= 100);

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4">
      <h1 className="text-2xl font-semibold mb-2">My learning</h1>
      <p className="text-slate-600 dark:text-slate-400 mb-8">
        Continue your courses and track progress.
      </p>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : enrollments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              You haven&apos;t enrolled in any courses yet.
            </p>
            <Link
              href="/courses"
              className="inline-block px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Browse courses
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {inProgress.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                In progress
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {inProgress.map((e) => (
                  <Link key={e.id} href={`/courses/${e.course.slug}/learn`}>
                    <Card className="h-full hover:shadow-md transition-shadow overflow-hidden">
                      <div className="flex">
                        <div className="w-24 h-24 flex-shrink-0 bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                          {e.course.thumbnail ? (
                            <img
                              src={e.course.thumbnail}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <BookOpen className="h-8 w-8 text-slate-400" />
                          )}
                        </div>
                        <CardContent className="p-4 flex-1 min-w-0">
                          <h3 className="font-semibold line-clamp-2">{e.course.title}</h3>
                          <p className="text-sm text-slate-500 mt-1">
                            {e.course.author.name ?? e.course.author.username}
                          </p>
                          <div className="mt-2">
                            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 rounded-full transition-all"
                                style={{ width: `${e.progress}%` }}
                              />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{e.progress}% complete</p>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {completed.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Completed</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {completed.map((e) => (
                  <Link key={e.id} href={`/courses/${e.course.slug}/learn`}>
                    <Card className="h-full hover:shadow-md transition-shadow overflow-hidden">
                      <div className="flex">
                        <div className="w-24 h-24 flex-shrink-0 bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                          {e.course.thumbnail ? (
                            <img
                              src={e.course.thumbnail}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <BookOpen className="h-8 w-8 text-slate-400" />
                          )}
                        </div>
                        <CardContent className="p-4 flex-1 min-w-0">
                          <h3 className="font-semibold line-clamp-2">{e.course.title}</h3>
                          <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-1">
                            100% complete ✓
                          </p>
                        </CardContent>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
          <div className="pt-4">
            <Link
              href="/courses"
              className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
            >
              Browse more courses →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
