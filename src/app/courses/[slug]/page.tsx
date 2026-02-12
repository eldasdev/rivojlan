"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { BookOpen, User, Star, PlayCircle } from "lucide-react";

type CourseDetail = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  longDescription: string | null;
  thumbnail: string | null;
  category: string | null;
  level: string | null;
  duration: number | null;
  isPaid: boolean;
  price: unknown;
  status: string;
  author: { id: string; name: string | null; username: string | null; image: string | null };
  modules: { id: string; title: string; order: number }[];
  _count: { enrollments: number; reviews: number };
};

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  user: { name: string | null; username: string | null };
  createdAt: string;
};

export default function CourseDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { data: session, status } = useSession();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [reviews, setReviews] = useState<{ reviews: Review[]; averageRating: number; total: number } | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/courses/${slug}`);
      const data = await res.json();
      if (!cancelled && res.ok) setCourse(data);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/courses/${slug}/reviews`);
      const data = await res.json();
      if (!cancelled && res.ok) setReviews(data);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (!session?.user?.id || !course) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/enrollments");
      const data = await res.json();
      if (!cancelled && res.ok) {
        const list = data.enrollments ?? [];
        setEnrolled(list.some((e: { course: { id: string } }) => e.course.id === course.id));
      }
    })();
    return () => { cancelled = true; };
  }, [session?.user?.id, course?.id]);

  async function handleEnroll() {
    if (!course) return;
    setEnrolling(true);
    try {
      const res = await fetch("/api/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setEnrolled(true);
        toast.success("Enrolled successfully!");
      } else {
        toast.error(data.error ?? "Enrollment failed");
      }
    } catch {
      toast.error("Enrollment failed");
    } finally {
      setEnrolling(false);
    }
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!slug || rating < 1) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/courses/${slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        setReviews((prev) =>
          prev
            ? {
                ...prev,
                reviews: [data, ...prev.reviews],
                total: prev.total + 1,
                averageRating:
                  (prev.averageRating * prev.total + rating) / (prev.total + 1),
              }
            : { reviews: [data], averageRating: rating, total: 1 }
        );
        setRating(0);
        setComment("");
        toast.success("Review submitted");
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Failed to submit review");
      }
    } catch {
      toast.error("Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  }

  if (!course) {
    return (
      <div className="container mx-auto max-w-4xl py-12 px-4">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  const isOwner =
    session?.user?.id === course.author.id || session?.user?.role === "ADMIN";

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="aspect-video rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700">
            {course.thumbnail ? (
              <img
                src={course.thumbnail}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="h-16 w-16 text-slate-400" />
              </div>
            )}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{course.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-600 dark:text-slate-400">
                {course.description ?? "No description."}
              </p>
              {course.longDescription && (
                <div
                  className="prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: course.longDescription }}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Curriculum</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {course.modules
                  .sort((a, b) => a.order - b.order)
                  .map((mod, i) => (
                    <li
                      key={mod.id}
                      className="flex items-center gap-2 text-slate-700 dark:text-slate-300"
                    >
                      <PlayCircle className="h-4 w-4 text-slate-400" />
                      <span>
                        {i + 1}. {mod.title}
                      </span>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>

          {reviews && (
            <Card>
              <CardHeader>
                <CardTitle>Reviews</CardTitle>
                <p className="text-sm text-slate-500">
                  Average: {reviews.averageRating.toFixed(1)} ({reviews.total} reviews)
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {session?.user && enrolled && (
                  <form onSubmit={handleSubmitReview} className="space-y-2 pb-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRating(r)}
                          className="p-1"
                          aria-label={`Rate ${r} stars`}
                        >
                          <Star
                            className={`h-6 w-6 ${
                              r <= rating
                                ? "text-yellow-500 fill-yellow-500"
                                : "text-slate-300 dark:text-slate-600"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Your review (optional)"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      rows={2}
                    />
                    <Button type="submit" size="sm" loading={submittingReview} disabled={rating < 1}>
                      Submit review
                    </Button>
                  </form>
                )}
                <ul className="space-y-3">
                  {reviews.reviews.map((r) => (
                    <li key={r.id} className="border-b border-slate-100 dark:border-slate-700 pb-3 last:border-0">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span>{r.rating}</span>
                        <span className="text-sm text-slate-500">
                          {r.user.name ?? r.user.username ?? "User"} · {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {r.comment && <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{r.comment}</p>}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              {course.isPaid && course.price != null && (
                <p className="text-2xl font-semibold">
                  ${Number(course.price).toFixed(2)}
                </p>
              )}
              {!course.isPaid && (
                <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                  Free
                </p>
              )}
              {session?.user ? (
                enrolled ? (
                  <Link href={`/courses/${course.slug}/learn`}>
                    <Button className="w-full">Go to course</Button>
                  </Link>
                ) : (
                  <Button
                    className="w-full"
                    onClick={handleEnroll}
                    loading={enrolling}
                    disabled={session.user.role !== "STUDENT" && session.user.role !== "ADMIN"}
                  >
                    Enroll now
                  </Button>
                )
              ) : (
                <Link href="/login">
                  <Button className="w-full">Log in to enroll</Button>
                </Link>
              )}
              {isOwner && (
                <Link href={`/author/courses/${course.slug}/edit`}>
                  <Button variant="outline" className="w-full">
                    Edit course
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {course.author.image ? (
                  <img
                    src={course.author.image}
                    alt=""
                    className="h-10 w-10 rounded-full"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                    <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{course.author.name ?? course.author.username ?? "Author"}</p>
                  <p className="text-sm text-slate-500">Instructor</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
            {course.category && <p>Category: {course.category}</p>}
            {course.level && <p>Level: {course.level}</p>}
            {course.duration != null && <p>Duration: ~{course.duration} hours</p>}
            <p>{course._count.enrollments} students enrolled</p>
          </div>
        </div>
      </div>
    </div>
  );
}
