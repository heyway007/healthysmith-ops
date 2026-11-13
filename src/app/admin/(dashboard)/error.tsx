"use client"; // Error boundaries must be Client Components

import { LoadError } from "@/components/ui/load-error";

/** A back-office page failed to load; the sidebar and header stay in place. */
export default function DashboardError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <LoadError {...props} />;
}
