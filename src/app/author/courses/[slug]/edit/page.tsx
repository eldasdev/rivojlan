"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import {
  ChevronLeft,
  Plus,
  Send,
  X,
  FileText,
  Video,
  MessageSquare,
  ClipboardList,
  Trash2,
} from "lucide-react";
import { MODULE_TYPES, type ModuleType } from "@/lib/validations/course";

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
  description: string | null;
  status: string;
  modules: Module[];
};

const TYPE_LABELS: Record<ModuleType, string> = {
  lesson: "Lesson",
  quiz: "Quiz",
  video: "Video",
  feedback: "Feedback",
};

const TYPE_ICONS: Record<ModuleType, React.ReactNode> = {
  lesson: <FileText className="h-4 w-4" />,
  quiz: <ClipboardList className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  feedback: <MessageSquare className="h-4 w-4" />,
};

export default function EditCoursePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newModuleType, setNewModuleType] = useState<ModuleType>("lesson");
  const [addingModule, setAddingModule] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editContent, setEditContent] = useState<Record<string, unknown>>({});
  const [savingContent, setSavingContent] = useState(false);

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
    setLoading(false);
  }, [course]);

  useEffect(() => {
    if (editingModule) {
      const c = (editingModule.content as Record<string, unknown>) ?? {};
      const rawType = (c.type as string) ?? "lesson";
      // Old modules may have type "text" — treat as "lesson" so the form always shows
      const type = MODULE_TYPES.includes(rawType as ModuleType) ? rawType : "lesson";
      setEditContent({ ...c, type });
    } else {
      setEditContent({});
    }
  }, [editingModule]);

  async function handlePublish() {
    if (!course) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/courses/${slug}/publish`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setCourse((c) => (c ? { ...c, status: data.status } : null));
        toast.success(
          data.status === "PUBLISHED"
            ? "Course published!"
            : "Course submitted for review."
        );
      } else {
        toast.error("Failed to publish");
      }
    } catch {
      toast.error("Failed to publish");
    } finally {
      setPublishing(false);
    }
  }

  async function handleAddModule(e: React.FormEvent) {
    e.preventDefault();
    if (!newModuleTitle.trim()) return;
    setAddingModule(true);
    try {
      const res = await fetch(`/api/courses/${slug}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newModuleTitle.trim(),
          type: newModuleType,
          order: course?.modules?.length ?? 0,
        }),
      });
      const data = await res.json();
      if (res.ok && course) {
        setCourse((c) =>
          c ? { ...c, modules: [...(c.modules || []), data] } : null
        );
        setNewModuleTitle("");
        toast.success("Module added. Edit content below.");
      } else {
        toast.error("Failed to add module");
      }
    } catch {
      toast.error("Failed to add module");
    } finally {
      setAddingModule(false);
    }
  }

  async function handleSaveContent() {
    if (!editingModule) return;
    setSavingContent(true);
    try {
      const res = await fetch(`/api/modules/${editingModule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      if (res.ok && course) {
        const updated = await res.json();
        setCourse((c) =>
          c
            ? {
                ...c,
                modules: (c.modules || []).map((m) =>
                  m.id === editingModule.id ? { ...m, content: updated.content } : m
                ),
              }
            : null
        );
        setEditingModule(null);
        toast.success("Content saved");
      } else {
        toast.error("Failed to save");
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSavingContent(false);
    }
  }

  function addQuizQuestion() {
    setEditContent((prev) => {
      const questions = (prev.questions as Array<{ question: string; options: string[]; correctIndex: number }>) ?? [];
      return {
        ...prev,
        questions: [...questions, { question: "", options: ["", ""], correctIndex: 0 }],
      };
    });
  }

  function updateQuizQuestion(
    index: number,
    field: "question" | "options" | "correctIndex",
    value: string | string[] | number
  ) {
    setEditContent((prev) => {
      const questions = [...((prev.questions as Array<{ question: string; options: string[]; correctIndex: number }>) ?? [])];
      if (!questions[index]) return prev;
      if (field === "question") questions[index] = { ...questions[index], question: value as string };
      else if (field === "options") questions[index] = { ...questions[index], options: value as string[] };
      else if (field === "correctIndex") questions[index] = { ...questions[index], correctIndex: value as number };
      return { ...prev, questions };
    });
  }

  function removeQuizQuestion(index: number) {
    setEditContent((prev) => {
      const questions = [...((prev.questions as Array<unknown>) ?? [])];
      questions.splice(index, 1);
      return { ...prev, questions };
    });
  }

  function addLessonPart() {
    setEditContent((prev) => {
      const parts = [...((prev.parts as Array<{ title: string; type: string; body?: string; videoUrl?: string }>) ?? [])];
      parts.push({ title: "", type: "text", body: "" });
      return { ...prev, parts };
    });
  }

  function updateLessonPart(
    index: number,
    field: string,
    value: string
  ) {
    setEditContent((prev) => {
      const parts = [...((prev.parts as Array<Record<string, string>>) ?? [])];
      if (!parts[index]) return prev;
      parts[index] = { ...parts[index], [field]: value };
      return { ...prev, parts };
    });
  }

  function removeLessonPart(index: number) {
    setEditContent((prev) => {
      const parts = [...((prev.parts as Array<unknown>) ?? [])];
      parts.splice(index, 1);
      return { ...prev, parts };
    });
  }

  if (!course) {
    return (
      <div className="container mx-auto max-w-4xl py-12 px-4">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  const sortedModules = [...(course.modules || [])].sort((a, b) => a.order - b.order);
  // Normalize so "text" or unknown types from old modules show the lesson editor
  const contentType: ModuleType = MODULE_TYPES.includes(editContent.type as ModuleType)
    ? (editContent.type as ModuleType)
    : "lesson";

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <Link
        href="/author"
        className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-6"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to dashboard
      </Link>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{course.title}</h1>
          <p className="text-sm text-slate-500">
            Status: <span className="capitalize">{course.status.toLowerCase()}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/courses/${course.slug}`}>
            <Button variant="outline">View course</Button>
          </Link>
          {(course.status === "DRAFT" || course.status === "PENDING") && (
            <Button onClick={handlePublish} loading={publishing}>
              <Send className="h-4 w-4 mr-2" />
              {course.status === "DRAFT" ? "Submit for review" : "Publish (admin)"}
            </Button>
          )}
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Modules</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Choose the type of content (lesson, quiz, video, feedback) when adding. Then edit each module to add content.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAddModule} className="flex flex-wrap gap-2 items-end">
            <select
              value={newModuleType}
              onChange={(e) => setNewModuleType(e.target.value as ModuleType)}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 min-w-[140px]"
              aria-label="Module type"
            >
              {MODULE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <Input
              placeholder="New module title"
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
            <Button type="submit" loading={addingModule} disabled={!newModuleTitle.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </form>
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {sortedModules.map((mod, i) => {
              const type = (mod.content as { type?: string })?.type ?? "lesson";
              const typeLabel = TYPE_LABELS[type as ModuleType] ?? type;
              return (
                <li
                  key={mod.id}
                  className="py-3 flex items-center justify-between gap-4 flex-wrap"
                >
                  <span className="font-medium">
                    {i + 1}. {mod.title}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
                      title={`Type: ${typeLabel}`}
                    >
                      {TYPE_ICONS[type as ModuleType]}
                      {typeLabel}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingModule(mod)}
                    >
                      Edit content
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {/* Edit content modal */}
      {editingModule && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-content-title"
        >
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
              <h2 id="edit-content-title" className="text-lg font-semibold">
                Edit: {editingModule.title}
              </h2>
              <button
                type="button"
                onClick={() => setEditingModule(null)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {contentType === "lesson" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Lesson text
                    </label>
                    <textarea
                      value={(editContent.text as string) ?? ""}
                      onChange={(e) => setEditContent((p) => ({ ...p, text: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 min-h-[120px]"
                      placeholder="Main lesson content (markdown or plain text)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Video URL (optional)
                    </label>
                    <input
                      type="url"
                      value={(editContent.videoUrl as string) ?? ""}
                      onChange={(e) => setEditContent((p) => ({ ...p, videoUrl: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      placeholder="https://www.youtube.com/watch?v=... or Vimeo link"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Module parts (optional)
                      </label>
                      <Button type="button" variant="ghost" size="sm" onClick={addLessonPart}>
                        <Plus className="h-4 w-4 mr-1" /> Add part
                      </Button>
                    </div>
                    <ul className="space-y-3">
                      {((editContent.parts as Array<{ title: string; type: string; body?: string; videoUrl?: string }>) ?? []).map((part, idx) => (
                        <li key={idx} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                          <div className="flex gap-2 items-center">
                            <input
                              value={part.title}
                              onChange={(e) => updateLessonPart(idx, "title", e.target.value)}
                              placeholder="Part title"
                              className="flex-1 px-2 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
                            />
                            <select
                              value={part.type}
                              onChange={(e) => updateLessonPart(idx, "type", e.target.value)}
                              className="px-2 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
                            >
                              <option value="text">Text</option>
                              <option value="video">Video</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => removeLessonPart(idx)}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                              aria-label="Remove part"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          {part.type === "text" ? (
                            <textarea
                              value={part.body ?? ""}
                              onChange={(e) => updateLessonPart(idx, "body", e.target.value)}
                              placeholder="Content"
                              className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm min-h-[80px]"
                            />
                          ) : (
                            <input
                              type="url"
                              value={part.videoUrl ?? ""}
                              onChange={(e) => updateLessonPart(idx, "videoUrl", e.target.value)}
                              placeholder="Video URL"
                              className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
                            />
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
              {contentType === "quiz" && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Questions
                      </label>
                      <Button type="button" variant="ghost" size="sm" onClick={addQuizQuestion}>
                        <Plus className="h-4 w-4 mr-1" /> Add question
                      </Button>
                    </div>
                    <ul className="space-y-4">
                      {((editContent.questions as Array<{ question: string; options: string[]; correctIndex: number }>) ?? []).map((q, idx) => (
                        <li key={idx} className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                          <input
                            value={q.question}
                            onChange={(e) => updateQuizQuestion(idx, "question", e.target.value)}
                            placeholder="Question text"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                          />
                          <p className="text-xs text-slate-500">Options (one per line or comma-separated)</p>
                          <textarea
                            value={(q.options ?? []).join("\n")}
                            onChange={(e) => {
                              const opts = e.target.value.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
                              updateQuizQuestion(idx, "options", opts.length ? opts : [""]);
                            }}
                            placeholder="Option A\nOption B\nOption C"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm min-h-[60px]"
                          />
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-slate-600 dark:text-slate-400">Correct option index (0-based):</label>
                            <input
                              type="number"
                              min={0}
                              value={q.correctIndex}
                              onChange={(e) => updateQuizQuestion(idx, "correctIndex", parseInt(e.target.value, 10) || 0)}
                              className="w-16 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                            />
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeQuizQuestion(idx)} className="text-red-500">
                            <Trash2 className="h-4 w-4 mr-1" /> Remove
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
              {contentType === "video" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Video URL
                    </label>
                    <input
                      type="url"
                      value={(editContent.videoUrl as string) ?? ""}
                      onChange={(e) => setEditContent((p) => ({ ...p, videoUrl: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Paste a YouTube or Vimeo link. Upload will be available in a future update.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Caption (optional)
                    </label>
                    <input
                      type="text"
                      value={(editContent.caption as string) ?? ""}
                      onChange={(e) => setEditContent((p) => ({ ...p, caption: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      placeholder="Short caption for the video"
                    />
                  </div>
                </>
              )}
              {contentType === "feedback" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Prompt / question for students
                    </label>
                    <textarea
                      value={(editContent.prompt as string) ?? ""}
                      onChange={(e) => setEditContent((p) => ({ ...p, prompt: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 min-h-[100px]"
                      placeholder="e.g. What was the main takeaway from this section?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Description (optional)
                    </label>
                    <input
                      type="text"
                      value={(editContent.description as string) ?? ""}
                      onChange={(e) => setEditContent((p) => ({ ...p, description: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      placeholder="Brief description of this feedback step"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingModule(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveContent} loading={savingContent}>
                Save content
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
