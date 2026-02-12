"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { CheckCircle, Circle, PlayCircle, ChevronRight } from "lucide-react";

type Module = {
  id: string;
  title: string;
  order: number;
  content: unknown;
};

type Course = {
  id: string;
  title: string;
  slug: string;
  modules: Module[];
};

export default function CourseLearnPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { data: session, status } = useSession();
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<{ progress: number } | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [marking, setMarking] = useState(false);

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
    if (status !== "authenticated" || !session?.user?.id || !course) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/enrollments");
      const data = await res.json();
      if (!cancelled && res.ok) {
        const list = data.enrollments ?? [];
        const en = list.find((e: { course: { id: string } }) => e.course.id === course.id);
        if (en) setEnrollment({ progress: en.progress });
        else router.replace(`/courses/${slug}`);
      }
    })();
    return () => { cancelled = true; };
  }, [status, session?.user?.id, course?.id, slug, router]);

  async function markComplete(moduleId: string) {
    setMarking(true);
    try {
      const res = await fetch(`/api/modules/${moduleId}/complete`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setCompletedIds((prev) => new Set(prev).add(moduleId));
        setEnrollment((e) => (e ? { progress: data.progress ?? e.progress } : { progress: data.progress }));
        toast.success(data.completed ? "Course completed!" : "Module marked complete.");
      } else {
        toast.error(data.error ?? "Failed");
      }
    } catch {
      toast.error("Failed to update progress");
    } finally {
      setMarking(false);
    }
  }

  if (status === "unauthenticated") {
    router.replace(`/login?callbackUrl=${encodeURIComponent(`/courses/${slug}/learn`)}`);
    return null;
  }
  if (!course || status === "loading") {
    return (
      <div className="container mx-auto max-w-4xl py-12 px-4">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  const sortedModules = [...course.modules].sort((a, b) => a.order - b.order);
  const content = selectedModule?.content as {
    type?: string;
    text?: string;
    videoUrl?: string;
    parts?: Array<{ title: string; type: string; body?: string; videoUrl?: string }>;
    prompt?: string;
    description?: string;
    caption?: string;
    questions?: Array<{ question: string; options: string[]; correctIndex: number }>;
  } | undefined;

  // Normalize so "text" (old modules) is treated as "lesson" and video block can show
  const rawType = content?.type ?? "lesson";
  const contentType =
    rawType === "lesson" || rawType === "quiz" || rawType === "video" || rawType === "feedback"
      ? rawType
      : "lesson";

  function embedUrl(url: string): string {
    const u = (url || "").trim();
    if (!u) return "";
    try {
      // Already embed
      if (u.includes("youtube.com/embed/")) {
        const id = u.split("youtube.com/embed/")[1]?.split("?")[0]?.split("/")[0];
        return id ? `https://www.youtube.com/embed/${id}` : u;
      }
      // watch?v= or youtu.be/
      if (u.includes("youtube.com") || u.includes("youtu.be")) {
        const parsed = new URL(u);
        const id =
          parsed.hostname === "youtu.be"
            ? parsed.pathname.slice(1).split("/")[0]
            : parsed.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}` : u;
      }
      if (u.includes("vimeo.com")) {
        const id = u.split("vimeo.com/")[1]?.split("?")[0]?.split("/")[0];
        return id ? `https://player.vimeo.com/video/${id}` : u;
      }
    } catch {}
    return u;
  }

  const videoUrl = content?.videoUrl ? String(content.videoUrl).trim() : "";
  const hasVideo = !!videoUrl;
  const embedSrc = hasVideo ? embedUrl(videoUrl) : "";

  return (
    <div className="container mx-auto max-w-6xl py-8 px-4">
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/dashboard" className="hover:text-indigo-600 dark:hover:text-indigo-400">
          Dashboard
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/courses/${course.slug}`} className="hover:text-indigo-600 dark:hover:text-indigo-400">
          {course.title}
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedModule ? selectedModule.title : "Select a module"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedModule ? (
                <p className="text-slate-500">
                  Choose a module from the list to start learning.
                </p>
              ) : (
                <>
                  {(contentType === "lesson" || contentType === "video") && hasVideo && (
                    <div className="space-y-2">
                      <div className="aspect-video w-full rounded-lg overflow-hidden bg-slate-900 shadow-lg">
                        {embedSrc ? (
                          <iframe
                            src={embedSrc}
                            title={selectedModule.title}
                            className="w-full h-full min-h-[240px]"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                          />
                        ) : (
                          <div className="w-full h-full min-h-[240px] flex items-center justify-center text-slate-500">
                            <p>Invalid video URL. Use a YouTube or Vimeo link.</p>
                          </div>
                        )}
                      </div>
                      {content.caption && (
                        <p className="text-sm text-slate-500 mt-1 px-1">{content.caption}</p>
                      )}
                    </div>
                  )}
                  {contentType === "lesson" && content?.text && (
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="whitespace-pre-wrap">{String(content.text)}</p>
                    </div>
                  )}
                  {contentType === "lesson" && Array.isArray(content?.parts) && content.parts.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100">Parts</h4>
                      {content.parts.map((part, i) => (
                        <div key={i} className="border-l-2 border-indigo-500 pl-4 space-y-2">
                          <h5 className="font-medium">{part.title || `Part ${i + 1}`}</h5>
                          {part.type === "text" && part.body && (
                            <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-400">{part.body}</p>
                          )}
                          {part.type === "video" && part.videoUrl && (
                            <div className="aspect-video rounded-lg overflow-hidden bg-slate-900 max-w-xl">
                              <iframe
                                src={embedUrl(part.videoUrl)}
                                title={part.title}
                                className="w-full h-full"
                                allowFullScreen
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {contentType === "feedback" && (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-2">
                      {content?.description && (
                        <p className="text-sm text-slate-500">{content.description}</p>
                      )}
                      {content?.prompt && (
                        <p className="font-medium text-slate-900 dark:text-slate-100">{content.prompt}</p>
                      )}
                      {!content?.prompt && !content?.description && (
                        <p className="text-slate-500">No feedback prompt for this module.</p>
                      )}
                    </div>
                  )}
                  {contentType === "quiz" && Array.isArray(content?.questions) && content.questions.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100">Quiz</h4>
                      <ul className="space-y-4">
                        {content.questions.map((q, i) => (
                          <li key={i} className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                            <p className="font-medium mb-2">{i + 1}. {q.question}</p>
                            <ul className="list-disc list-inside text-slate-600 dark:text-slate-400">
                              {q.options.map((opt, j) => (
                                <li key={j}>{opt}{j === q.correctIndex ? " ✓" : ""}</li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>
                      <p className="text-sm text-slate-500">Review the questions above, then mark as complete when ready.</p>
                    </div>
                  )}
                  {(!content || (contentType === "lesson" && !content.text && !content.videoUrl && (!content.parts || content.parts.length === 0))) &&
                    contentType !== "feedback" && contentType !== "quiz" && (
                    <p className="text-slate-500">No content for this module yet.</p>
                  )}
                  <Button
                    onClick={() => markComplete(selectedModule.id)}
                    disabled={marking || completedIds.has(selectedModule.id)}
                    loading={marking}
                  >
                    {completedIds.has(selectedModule.id) ? (
                      <>Complete <CheckCircle className="inline h-4 w-4 ml-1" /></>
                    ) : (
                      "Mark as complete"
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Curriculum</CardTitle>
              {enrollment && (
                <div className="mt-2">
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all"
                      style={{ width: `${enrollment.progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{enrollment.progress}% complete</p>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {sortedModules.map((mod) => (
                  <li key={mod.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedModule(mod)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                        selectedModule?.id === mod.id
                          ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {completedIds.has(mod.id) ? (
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-slate-400 flex-shrink-0" />
                      )}
                      <span className="flex-1 truncate">{mod.title}</span>
                      <PlayCircle className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
