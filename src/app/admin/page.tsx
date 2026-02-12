"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import {
  Users,
  BookOpen,
  UserPlus,
  Settings,
  CheckCircle,
  XCircle,
  Archive,
  Trash2,
  ExternalLink,
  LayoutDashboard,
  BarChart3,
  CreditCard,
  Activity,
  Plus,
  Shield,
  DollarSign,
  Banknote,
  TrendingUp,
} from "lucide-react";

type UserSummary = {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  role: string;
  createdAt: string;
  _count: { coursesAuthored: number; enrollments: number };
};

type CourseSummary = {
  id: string;
  title: string;
  slug: string;
  status: string;
  author: { id?: string; name: string | null; email: string };
  _count: { enrollments: number; reviews: number };
};

type RevenueByCourse = {
  courseId: string;
  title: string;
  slug: string;
  authorId: string;
  authorName: string;
  price: number;
  enrollments: number;
  revenue: number;
};
type RevenueByAuthor = {
  authorId: string;
  authorName: string;
  earnings: number;
  paidOut: number;
  pending: number;
};
type PayoutItem = {
  id: string;
  authorId: string;
  authorName: string;
  amount: number;
  note: string | null;
  status: string;
  paidAt: string;
};
type RevenueData = {
  revenueByCourse: RevenueByCourse[];
  revenueByAuthor: RevenueByAuthor[];
  totals: { platformRevenue: number; totalPaidOut: number; totalPending: number };
  recentPayouts: PayoutItem[];
};

type Section = "overview" | "users" | "courses" | "create" | "analytics" | "payments" | "activity" | "settings";

const SIDEBAR: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard className="h-5 w-5" /> },
  { id: "users", label: "Users", icon: <Users className="h-5 w-5" /> },
  { id: "courses", label: "Courses", icon: <BookOpen className="h-5 w-5" /> },
  { id: "create", label: "Create course", icon: <Plus className="h-5 w-5" /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-5 w-5" /> },
  { id: "payments", label: "Payments", icon: <CreditCard className="h-5 w-5" /> },
  { id: "activity", label: "Activity log", icon: <Activity className="h-5 w-5" /> },
  { id: "settings", label: "Settings", icon: <Settings className="h-5 w-5" /> },
];

export default function AdminDashboardPage() {
  const [section, setSection] = useState<Section>("overview");
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [stats, setStats] = useState({ users: 0, courses: 0, enrollments: 0 });
  const [analytics, setAnalytics] = useState<{
    totals: { users: number; courses: number; enrollments: number };
    coursesByStatus: { DRAFT: number; PENDING: number; PUBLISHED: number; REJECTED: number };
    enrollmentsByDay: Array<{ date: string; count: number }>;
    topCourses: Array<{ id: string; title: string; slug: string; _count: { enrollments: number; reviews: number } }>;
    newUsersLastNDays: number;
  } | null>(null);
  const [activities, setActivities] = useState<Array<{ type: string; date: string; message: string; meta?: Record<string, unknown> }>>([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    authorId: "",
    category: "",
  });
  const [creating, setCreating] = useState(false);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ authorId: "", amount: "", note: "" });
  const [recordingPayout, setRecordingPayout] = useState(false);
  const [stripeForm, setStripeForm] = useState({
    stripePublishableKey: "",
    stripeSecretKey: "",
    stripeWebhookSecret: "",
  });
  const [stripeConfig, setStripeConfig] = useState<{
    stripePublishableKey: string;
    stripeSecretKey: string;
    stripeWebhookSecret: string;
    configured: boolean;
  } | null>(null);
  const [stripeSaving, setStripeSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [uRes, cRes] = await Promise.all([
        fetch("/api/users?limit=100"),
        fetch("/api/admin/courses?limit=100"),
      ]);
      const uData = await uRes.json();
      const cData = await cRes.json();
      if (!cancelled) {
        setUsers(uData.users ?? []);
        setCourses(cData.courses ?? []);
        setStats({
          users: uData.total ?? 0,
          courses: cData.total ?? 0,
          enrollments: (cData.courses ?? []).reduce(
            (s: number, c: { _count: { enrollments: number } }) => s + (c._count?.enrollments ?? 0),
            0
          ),
        });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (section === "analytics") {
      let cancelled = false;
      fetch("/api/admin/analytics?days=30")
        .then((r) => r.json())
        .then((data) => { if (!cancelled) setAnalytics(data); })
        .catch(() => {});
      return () => { cancelled = true; };
    }
  }, [section]);

  useEffect(() => {
    if (section === "payments") {
      setRevenueLoading(true);
      fetch("/api/admin/revenue")
        .then((r) => r.json())
        .then((data) => {
          setRevenueData(data?.totals ? data : null);
        })
        .catch(() => setRevenueData(null))
        .finally(() => setRevenueLoading(false));
      fetch("/api/admin/settings/stripe")
        .then((r) => r.json())
        .then((data) => {
          if (data.error) return;
          setStripeConfig({
            stripePublishableKey: data.stripePublishableKey ?? "",
            stripeSecretKey: data.stripeSecretKey ?? "",
            stripeWebhookSecret: data.stripeWebhookSecret ?? "",
            configured: !!data.configured,
          });
          setStripeForm((f) => ({
            ...f,
            stripePublishableKey: data.stripePublishableKey ?? "",
          }));
        })
        .catch(() => setStripeConfig(null));
    }
  }, [section]);

  useEffect(() => {
    if (section === "activity") {
      let cancelled = false;
      fetch("/api/admin/activity?limit=50")
        .then((r) => r.json())
        .then((data) => { if (!cancelled) setActivities(data.activities ?? []); })
        .catch(() => {});
      return () => { cancelled = true; };
    }
  }, [section]);

  useEffect(() => { setLoading(false); }, [users, courses]);

  async function setCourseStatus(slug: string, status: "REJECTED" | "DRAFT" | "PUBLISHED") {
    try {
      const res = await fetch(`/api/courses/${slug}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        setCourses((prev) => prev.map((c) => (c.slug === slug ? { ...c, status: data.status } : c)));
        if (status === "PUBLISHED") toast.success("Course approved");
        if (status === "REJECTED") toast.success("Course denied");
        if (status === "DRAFT") toast.success("Course archived");
      } else toast.error("Failed");
    } catch { toast.error("Failed"); }
  }

  async function approveCourse(slug: string) {
    try {
      const res = await fetch(`/api/courses/${slug}/publish`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setCourses((prev) => prev.map((c) => (c.slug === slug ? { ...c, status: data.status } : c)));
        toast.success("Course approved");
      } else toast.error("Failed");
    } catch { toast.error("Failed"); }
  }

  async function deleteCourse(slug: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/courses/${slug}`, { method: "DELETE" });
      if (res.ok) {
        setCourses((prev) => prev.filter((c) => c.slug !== slug));
        toast.success("Course deleted");
      } else toast.error("Failed");
    } catch { toast.error("Failed"); }
  }

  async function updateUserRole(userId: string, role: string) {
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
        toast.success("Role updated");
      } else toast.error("Failed");
    } catch { toast.error("Failed"); }
  }

  async function handleCreateCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.title.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createForm.title.trim(),
          description: createForm.description || undefined,
          category: createForm.category || undefined,
          ...(createForm.authorId && { authorId: createForm.authorId }),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCourses((prev) => [data, ...prev]);
        setCreateForm({ title: "", description: "", authorId: "", category: "" });
        setSection("courses");
        toast.success("Course created and published");
      } else toast.error(data.error ?? "Failed");
    } catch { toast.error("Failed"); }
    finally { setCreating(false); }
  }

  function formatCurrency(n: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  }

  async function refetchRevenue() {
    try {
      const r = await fetch("/api/admin/revenue");
      const data = await r.json();
      setRevenueData(data);
    } catch { /* ignore */ }
  }

  async function handleRecordPayout(e: React.FormEvent) {
    e.preventDefault();
    const authorId = payoutForm.authorId.trim();
    const amount = parseFloat(payoutForm.amount);
    if (!authorId || isNaN(amount) || amount <= 0) {
      toast.error("Select an author and enter a valid amount.");
      return;
    }
    setRecordingPayout(true);
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorId,
          amount,
          note: payoutForm.note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPayoutModalOpen(false);
        setPayoutForm({ authorId: "", amount: "", note: "" });
        await refetchRevenue();
        toast.success(`Payout of ${formatCurrency(amount)} recorded`);
      } else toast.error(data.error ?? "Failed to record payout");
    } catch { toast.error("Failed to record payout"); }
    finally { setRecordingPayout(false); }
  }

  async function handleSaveStripe(e: React.FormEvent) {
    e.preventDefault();
    setStripeSaving(true);
    try {
      const body: Record<string, string> = {};
      if (stripeForm.stripePublishableKey.trim()) body.stripePublishableKey = stripeForm.stripePublishableKey.trim();
      if (stripeForm.stripeSecretKey.trim()) body.stripeSecretKey = stripeForm.stripeSecretKey.trim();
      if (stripeForm.stripeWebhookSecret.trim()) body.stripeWebhookSecret = stripeForm.stripeWebhookSecret.trim();
      const res = await fetch("/api/admin/settings/stripe", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        const r = await fetch("/api/admin/settings/stripe");
        const next = await r.json();
        if (!next.error) {
          setStripeConfig({
            stripePublishableKey: next.stripePublishableKey ?? "",
            stripeSecretKey: next.stripeSecretKey ?? "",
            stripeWebhookSecret: next.stripeWebhookSecret ?? "",
            configured: !!next.configured,
          });
          setStripeForm((f) => ({
            ...f,
            stripePublishableKey: next.stripePublishableKey ?? "",
            stripeSecretKey: "",
            stripeWebhookSecret: "",
          }));
        }
        toast.success("Stripe settings saved");
      } else toast.error(data.error ?? "Failed to save");
    } catch { toast.error("Failed to save"); }
    finally { setStripeSaving(false); }
  }

  const filteredUsers = users.filter(
    (u) =>
      !userFilter ||
      u.email.toLowerCase().includes(userFilter.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(userFilter.toLowerCase()))
  );
  const filteredCourses = courses.filter(
    (c) =>
      !courseFilter ||
      c.title.toLowerCase().includes(courseFilter.toLowerCase()) ||
      (c.author.email?.toLowerCase().includes(courseFilter.toLowerCase()))
  );
  const authors = users.filter((u) => u.role === "AUTHOR" || u.role === "ADMIN");

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <aside className="w-56 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          <span className="font-semibold text-slate-900 dark:text-slate-100">Admin</span>
        </div>
        <nav className="space-y-1" aria-label="Admin sections">
          {SIDEBAR.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm font-medium transition-colors ${
                section === item.id
                  ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-auto p-6 lg:p-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1">
          {SIDEBAR.find((s) => s.id === section)?.label ?? "Admin"}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">
          Manage everything on the platform from this dashboard.
        </p>

        {section === "overview" && (
          <>
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                      <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold">{stats.users}</p>
                      <p className="text-sm text-slate-500">Total users</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold">{stats.courses}</p>
                      <p className="text-sm text-slate-500">Total courses</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                      <UserPlus className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold">{stats.enrollments}</p>
                      <p className="text-sm text-slate-500">Total enrollments</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Recent users</CardTitle>
                  <button type="button" onClick={() => setSection("users")} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                    Manage all
                  </button>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                    {(loading ? [] : users).slice(0, 5).map((u) => (
                      <li key={u.id} className="py-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium">{u.name ?? u.email}</p>
                          <p className="text-sm text-slate-500">{u.email}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${u.role === "ADMIN" ? "bg-red-100 dark:bg-red-900/50 text-red-700" : u.role === "AUTHOR" ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700" : "bg-slate-100 dark:bg-slate-700 text-slate-600"}`}>
                          {u.role.toLowerCase()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Recent courses</CardTitle>
                  <button type="button" onClick={() => setSection("courses")} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                    Manage all
                  </button>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                    {(loading ? [] : courses).slice(0, 5).map((c) => (
                      <li key={c.id} className="py-3 flex items-center justify-between gap-4">
                        <Link href={`/courses/${c.slug}`} className="font-medium hover:text-indigo-600 dark:hover:text-indigo-400 truncate block">
                          {c.title}
                        </Link>
                        <span className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${c.status === "PUBLISHED" ? "bg-green-100 dark:bg-green-900/50 text-green-700" : c.status === "PENDING" ? "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700" : "bg-slate-100 dark:bg-slate-700 text-slate-600"}`}>
                          {c.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {section === "users" && (
          <Card>
            <CardHeader>
              <CardTitle>User management</CardTitle>
              <p className="text-sm text-slate-500 mt-1">Change roles and manage all users.</p>
              <input
                type="search"
                placeholder="Search by email or name..."
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="mt-3 w-full max-w-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              />
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Courses / Enrollments</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <p className="font-medium">{u.name ?? u.email}</p>
                        <p className="text-slate-500">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="capitalize text-slate-600 dark:text-slate-400">{u.role.toLowerCase()}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{u._count.coursesAuthored} courses · {u._count.enrollments} enrollments</td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          onChange={(e) => updateUserRole(u.id, e.target.value)}
                          className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
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
            </CardContent>
          </Card>
        )}

        {section === "courses" && (
          <Card>
            <CardHeader>
              <CardTitle>Course management</CardTitle>
              <p className="text-sm text-slate-500 mt-1">Approve, deny, archive, or delete courses.</p>
              <input
                type="search"
                placeholder="Search by title or author..."
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="mt-3 w-full max-w-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              />
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-sm">
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
                  {filteredCourses.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                          <Link href={`/courses/${c.slug}`} className="font-medium hover:text-indigo-600 dark:hover:text-indigo-400">
                            {c.title}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{c.author.name ?? c.author.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${c.status === "PUBLISHED" ? "bg-green-100 dark:bg-green-900/50 text-green-700" : c.status === "PENDING" ? "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700" : "bg-slate-100 dark:bg-slate-700 text-slate-600"}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{c._count.enrollments}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/courses/${c.slug}`} className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" title="View" aria-label="View">
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                          {c.status === "PENDING" && (
                            <>
                              <button type="button" onClick={() => approveCourse(c.slug)} className="p-2 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600" title="Approve" aria-label="Approve">
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button type="button" onClick={() => setCourseStatus(c.slug, "REJECTED")} className="p-2 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600" title="Deny" aria-label="Deny">
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {c.status === "PUBLISHED" && (
                            <button type="button" onClick={() => setCourseStatus(c.slug, "DRAFT")} className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" title="Archive" aria-label="Archive">
                              <Archive className="h-4 w-4" />
                            </button>
                          )}
                          <button type="button" onClick={() => deleteCourse(c.slug, c.title)} className="p-2 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600" title="Delete" aria-label="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {section === "create" && (
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>Create course</CardTitle>
              <p className="text-sm text-slate-500 mt-1">Create a new course (published by default). Optionally assign an author.</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateCourse} className="space-y-4">
                <Input label="Title" value={createForm.title} onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))} required placeholder="Course title" />
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description (optional)</label>
                  <textarea value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" rows={3} placeholder="Short description" />
                </div>
                <Input label="Category (optional)" value={createForm.category} onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Web Development" />
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assign to author (optional)</label>
                  <select value={createForm.authorId} onChange={(e) => setCreateForm((f) => ({ ...f, authorId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                    <option value="">— Created by admin —</option>
                    {authors.map((a) => (
                      <option key={a.id} value={a.id}>{a.name ?? a.email} ({a.role})</option>
                    ))}
                  </select>
                </div>
                <Button type="submit" loading={creating} disabled={!createForm.title.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create & publish course
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {section === "analytics" && (
          <div className="space-y-6">
            {analytics ? (
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-2xl font-semibold">{analytics.totals.users}</p>
                      <p className="text-sm text-slate-500">Total users</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-2xl font-semibold">{analytics.totals.courses}</p>
                      <p className="text-sm text-slate-500">Total courses</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-2xl font-semibold">{analytics.totals.enrollments}</p>
                      <p className="text-sm text-slate-500">Total enrollments</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-2xl font-semibold">{analytics.newUsersLastNDays}</p>
                      <p className="text-sm text-slate-500">New users (last 30 days)</p>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Courses by status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-slate-400" />
                        <span>Draft: {analytics.coursesByStatus.DRAFT}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-yellow-500" />
                        <span>Pending: {analytics.coursesByStatus.PENDING}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-500" />
                        <span>Published: {analytics.coursesByStatus.PUBLISHED}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500" />
                        <span>Rejected: {analytics.coursesByStatus.REJECTED}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Enrollments over time (last 30 days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-1 h-32">
                      {analytics.enrollmentsByDay.length ? (
                        analytics.enrollmentsByDay.map((d) => {
                          const max = Math.max(...analytics.enrollmentsByDay.map((x) => x.count), 1);
                          return (
                            <div key={d.date} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${d.count}`}>
                              <div className="w-full bg-indigo-500 rounded-t min-h-[4px]" style={{ height: `${(d.count / max) * 100}%` }} />
                              <span className="text-xs text-slate-500 truncate max-w-full">{d.date.slice(5)}</span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-slate-500 text-sm">No enrollments in the last 30 days.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Top courses by enrollments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                      {analytics.topCourses.map((c, i) => (
                        <li key={c.id} className="py-3 flex items-center justify-between">
                          <span className="font-medium">{i + 1}. <Link href={`/courses/${c.slug}`} className="hover:text-indigo-600 dark:hover:text-indigo-400">{c.title}</Link></span>
                          <span className="text-slate-500">{c._count.enrollments} enrollments · {c._count.reviews} reviews</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </>
            ) : (
              <p className="text-slate-500">Loading analytics...</p>
            )}
          </div>
        )}

        {section === "payments" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment management</CardTitle>
                <p className="text-sm text-slate-500 mt-1">Configure payments for paid courses.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <p className="font-medium text-slate-900 dark:text-slate-100">Stripe integration</p>
                  <p className="text-sm text-slate-500 mt-1">Connect Stripe to accept payments for paid courses. Enter your Stripe keys below; they are stored securely and used for checkout in the enrollment flow.</p>
                  <form onSubmit={handleSaveStripe} className="mt-4 space-y-4 max-w-xl">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Publishable key (optional, for Stripe.js on frontend)</label>
                      <Input
                        type="text"
                        placeholder="pk_live_... or pk_test_..."
                        value={stripeForm.stripePublishableKey}
                        onChange={(e) => setStripeForm((f) => ({ ...f, stripePublishableKey: e.target.value }))}
                        className="font-mono text-sm"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Secret key</label>
                      {stripeConfig?.stripeSecretKey && (
                        <p className="text-xs text-slate-500 mb-1">Current: {stripeConfig.stripeSecretKey}</p>
                      )}
                      <Input
                        type="password"
                        placeholder="sk_live_... or sk_test_..."
                        value={stripeForm.stripeSecretKey}
                        onChange={(e) => setStripeForm((f) => ({ ...f, stripeSecretKey: e.target.value }))}
                        className="font-mono text-sm"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Webhook secret</label>
                      {stripeConfig?.stripeWebhookSecret && (
                        <p className="text-xs text-slate-500 mb-1">Current: {stripeConfig.stripeWebhookSecret}</p>
                      )}
                      <Input
                        type="password"
                        placeholder="whsec_..."
                        value={stripeForm.stripeWebhookSecret}
                        onChange={(e) => setStripeForm((f) => ({ ...f, stripeWebhookSecret: e.target.value }))}
                        className="font-mono text-sm"
                        autoComplete="off"
                      />
                    </div>
                    <Button type="submit" disabled={stripeSaving}>
                      {stripeSaving ? "Saving…" : stripeConfig?.configured ? "Update Stripe settings" : "Connect Stripe"}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Revenue & payouts
                  </CardTitle>
                  <p className="text-sm text-slate-500 mt-1">View revenue by course and manage author payouts.</p>
                </div>
                <Button onClick={() => setPayoutModalOpen(true)} className="flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  Record payout
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {revenueLoading ? (
                  <p className="text-slate-500">Loading revenue data...</p>
                ) : revenueData?.totals ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                          <TrendingUp className="h-4 w-4" />
                          Platform revenue
                        </div>
                        <p className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
                          {formatCurrency(revenueData.totals.platformRevenue ?? 0)}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                          <Banknote className="h-4 w-4" />
                          Total paid out
                        </div>
                        <p className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
                          {formatCurrency(revenueData.totals.totalPaidOut ?? 0)}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-2 text-slate-500 text-sm">Pending payouts</div>
                        <p className="text-xl font-semibold text-amber-600 dark:text-amber-400 mt-1">
                          {formatCurrency(revenueData.totals.totalPending ?? 0)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Revenue by course</h3>
                      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                              <th className="text-left p-3 font-medium">Course</th>
                              <th className="text-left p-3 font-medium">Author</th>
                              <th className="text-right p-3 font-medium">Price</th>
                              <th className="text-right p-3 font-medium">Enrollments</th>
                              <th className="text-right p-3 font-medium">Revenue</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {(revenueData.revenueByCourse ?? []).length ? (revenueData.revenueByCourse ?? []).map((r) => (
                              <tr key={r.courseId}>
                                <td className="p-3">
                                  <Link href={`/courses/${r.slug}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                                    {r.title}
                                  </Link>
                                </td>
                                <td className="p-3 text-slate-600 dark:text-slate-400">{r.authorName}</td>
                                <td className="p-3 text-right">{formatCurrency(r.price)}</td>
                                <td className="p-3 text-right">{r.enrollments}</td>
                                <td className="p-3 text-right font-medium">{formatCurrency(r.revenue)}</td>
                              </tr>
                            )) : (
                              <tr><td colSpan={5} className="p-4 text-center text-slate-500">No paid course revenue yet.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Revenue by author</h3>
                      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                              <th className="text-left p-3 font-medium">Author</th>
                              <th className="text-right p-3 font-medium">Earnings</th>
                              <th className="text-right p-3 font-medium">Paid out</th>
                              <th className="text-right p-3 font-medium">Pending</th>
                              <th className="text-right p-3 font-medium">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {(revenueData.revenueByAuthor ?? []).length ? (revenueData.revenueByAuthor ?? []).map((a) => (
                              <tr key={a.authorId}>
                                <td className="p-3 font-medium">{a.authorName}</td>
                                <td className="p-3 text-right">{formatCurrency(a.earnings)}</td>
                                <td className="p-3 text-right text-slate-600 dark:text-slate-400">{formatCurrency(a.paidOut)}</td>
                                <td className="p-3 text-right text-amber-600 dark:text-amber-400">{formatCurrency(a.pending)}</td>
                                <td className="p-3 text-right">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setPayoutForm((f) => ({ ...f, authorId: a.authorId, amount: a.pending > 0 ? String(a.pending) : "" }));
                                      setPayoutModalOpen(true);
                                    }}
                                    disabled={a.pending <= 0}
                                  >
                                    Record payout
                                  </Button>
                                </td>
                              </tr>
                            )) : (
                              <tr><td colSpan={5} className="p-4 text-center text-slate-500">No author revenue yet.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Recent payouts</h3>
                      <ul className="divide-y divide-slate-200 dark:divide-slate-700 rounded-lg border border-slate-200 dark:border-slate-700">
                        {(revenueData.recentPayouts ?? []).length ? (revenueData.recentPayouts ?? []).map((p) => (
                          <li key={p.id} className="flex items-center justify-between p-3">
                            <div>
                              <span className="font-medium">{p.authorName}</span>
                              {p.note && <span className="text-slate-500 text-sm ml-2">— {p.note}</span>}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{formatCurrency(p.amount)}</span>
                              <span className="text-slate-500 text-xs">{new Date(p.paidAt).toLocaleDateString()}</span>
                            </div>
                          </li>
                        )) : (
                          <li className="p-4 text-center text-slate-500">No payouts recorded yet.</li>
                        )}
                      </ul>
                    </div>
                  </>
                ) : (
                  <p className="text-slate-500">Failed to load revenue data.</p>
                )}
              </CardContent>
            </Card>

            {payoutModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" aria-modal="true">
                <Card className="w-full max-w-md mx-4">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Record payout</CardTitle>
                    <button type="button" onClick={() => setPayoutModalOpen(false)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300" aria-label="Close">
                      <XCircle className="h-5 w-5" />
                    </button>
                  </CardHeader>
                  <form onSubmit={handleRecordPayout}>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Author</label>
                        <select
                          value={payoutForm.authorId}
                          onChange={(e) => setPayoutForm((f) => ({ ...f, authorId: e.target.value }))}
                          className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                          required
                        >
                          <option value="">Select author</option>
                          {(revenueData?.revenueByAuthor ?? []).map((a) => (
                            <option key={a.authorId} value={a.authorId}>{a.authorName} {a.pending > 0 ? `(${formatCurrency(a.pending)} pending)` : ""}</option>
                          ))}
                          {authors.filter((u) => !revenueData?.revenueByAuthor?.some((ra) => ra.authorId === u.id)).map((u) => (
                            <option key={u.id} value={u.id}>{u.name || u.email}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (USD)</label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          value={payoutForm.amount}
                          onChange={(e) => setPayoutForm((f) => ({ ...f, amount: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Note (optional)</label>
                        <Input
                          type="text"
                          placeholder="e.g. January 2025 payout"
                          value={payoutForm.note}
                          onChange={(e) => setPayoutForm((f) => ({ ...f, note: e.target.value }))}
                        />
                      </div>
                    </CardContent>
                    <div className="flex justify-end gap-2 px-6 pb-6">
                      <Button type="button" variant="outline" onClick={() => setPayoutModalOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={recordingPayout}>{recordingPayout ? "Recording…" : "Record payout"}</Button>
                    </div>
                  </form>
                </Card>
              </div>
            )}
          </div>
        )}

        {section === "activity" && (
          <Card>
            <CardHeader>
              <CardTitle>Activity log</CardTitle>
              <p className="text-sm text-slate-500 mt-1">Recent enrollments, new users, and reviews.</p>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                {activities.length ? activities.map((a, i) => (
                  <li key={`${a.type}-${a.date}-${i}`} className="py-3 flex items-start gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs ${
                      a.type === "enrollment" ? "bg-green-500" : a.type === "user_signup" ? "bg-indigo-500" : "bg-yellow-500"
                    }`}>
                      {a.type === "enrollment" ? <UserPlus className="h-4 w-4" /> : a.type === "user_signup" ? <Users className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-900 dark:text-slate-100">{a.message}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{new Date(a.date).toLocaleString()}</p>
                    </div>
                  </li>
                )) : (
                  <li className="py-6 text-center text-slate-500">No recent activity.</li>
                )}
              </ul>
            </CardContent>
          </Card>
        )}

        {section === "settings" && (
          <Card>
            <CardHeader>
              <CardTitle>Platform settings</CardTitle>
              <p className="text-sm text-slate-500 mt-1">Site-wide configuration.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="font-medium text-slate-900 dark:text-slate-100">Categories</p>
                <p className="text-sm text-slate-500 mt-1">Manage course categories (stored per course; add a Category model for a fixed list).</p>
              </div>
              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="font-medium text-slate-900 dark:text-slate-100">Site name & branding</p>
                <p className="text-sm text-slate-500 mt-1">Update site title and meta (edit in layout and metadata).</p>
              </div>
              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="font-medium text-slate-900 dark:text-slate-100">Email & notifications</p>
                <p className="text-sm text-slate-500 mt-1">Configure email provider (Resend, SendGrid) for password reset and notifications.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
