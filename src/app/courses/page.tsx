"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Search, BookOpen } from "lucide-react";

type Course = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  category: string | null;
  status: string;
  author: { id: string; name: string | null; username: string | null };
  _count: { enrollments: number; reviews: number };
};

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const query = params.get("q") ?? "";
    setSearchInput(query);
    setQ(query);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchCourses() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        params.set("status", "PUBLISHED");
        const res = await fetch(`/api/courses?${params}`);
        const data = await res.json();
        if (!cancelled) {
          setCourses(data.courses ?? []);
          setTotal(data.total ?? 0);
        }
      } catch {
        if (!cancelled) setCourses([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchCourses();
    return () => { cancelled = true; };
  }, [q]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQ(searchInput);
    const url = new URL(window.location.href);
    if (searchInput) url.searchParams.set("q", searchInput);
    else url.searchParams.delete("q");
    window.history.pushState({}, "", url.toString());
  }

  return (
    <div className="container mx-auto max-w-6xl py-8 px-4">
      <h1 className="text-2xl font-semibold mb-6">Courses</h1>
      <form onSubmit={handleSearch} className="flex gap-2 mb-8 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by title..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {loading ? (
        <p className="text-slate-500">Loading courses...</p>
      ) : courses.length === 0 ? (
        <p className="text-slate-600 dark:text-slate-400">No courses found.</p>
      ) : (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            {total} course{total !== 1 ? "s" : ""} found
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Link key={course.id} href={`/courses/${course.slug}`}>
                <Card className="h-full hover:shadow-md transition-shadow overflow-hidden">
                  <div className="aspect-video bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookOpen className="h-12 w-12 text-slate-400" />
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h2 className="font-semibold text-lg line-clamp-2">{course.title}</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {course.author.name ?? course.author.username ?? "Author"}
                    </p>
                    <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                      {course.description ?? "No description."}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs text-slate-500">
                      <span>{course._count.enrollments} enrolled</span>
                      <span>{course._count.reviews} reviews</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
