"use client"; // Error boundaries must be Client Components

import { LoadError } from "@/components/ui/load-error";

/** Catches failures in the back-office frame itself (the dashboard layout loads
 * the user's roles for the sidebar), which the (dashboard)/error.tsx boundary
 * below it can't catch. */
export default function AdminError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-teal-50 via-cyan-50 to-teal-100 p-4">
      <div className="w-full max-w-md">
        <LoadError {...props} />
      </div>
    </div>
  );
}
