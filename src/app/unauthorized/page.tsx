import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ShieldX } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="container mx-auto max-w-md py-24 px-4 text-center">
      <ShieldX className="h-16 w-16 text-red-500 mx-auto mb-4" aria-hidden />
      <h1 className="text-2xl font-semibold mb-2">Access denied</h1>
      <p className="text-slate-600 dark:text-slate-400 mb-6">
        You don&apos;t have permission to view this page.
      </p>
      <Link href="/">
        <Button>Go home</Button>
      </Link>
    </div>
  );
}
