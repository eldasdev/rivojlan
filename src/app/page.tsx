import Link from "next/link";
import { BookOpen, Search, Award, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-indigo-800 dark:from-indigo-800 dark:to-indigo-950 text-white py-24 px-4">
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Learn new skills with online courses
          </h1>
          <p className="text-lg text-indigo-100 mb-8 max-w-2xl mx-auto">
            Browse courses, enroll for free or paid, track your progress, and earn certificates.
          </p>
          <div className="flex flex-wrap gap-4 justify-center items-center">
            <Link
              href="/courses"
              className="inline-flex items-center justify-center font-medium rounded-lg px-6 py-3 text-lg bg-white text-indigo-600 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600 border border-indigo-500/30 shadow-sm transition-colors"
              aria-label="Browse courses"
            >
              Browse courses
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center font-medium rounded-lg px-6 py-3 text-lg border-2 border-white text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600 transition-colors"
              aria-label="Sign up free"
            >
              Sign up free
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-2xl font-semibold text-center mb-12">
            Why CourseHub?
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 mb-4">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-2">Quality courses</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Learn from structured modules with videos, quizzes, and assignments.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 mb-4">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-2">Easy search</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Find courses by title, category, or author.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 mb-4">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-2">Track progress</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Mark modules complete and see your completion percentage.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 mb-4">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-2">Community</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Rate and review courses. Authors get feedback and analytics.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 px-4 bg-slate-100 dark:bg-slate-900/50">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-semibold mb-4">Ready to start?</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Create a free account and browse courses, or log in if you already have one.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/login">
              <Button variant="outline">Log in</Button>
            </Link>
            <Link href="/register">
              <Button>Sign up</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
