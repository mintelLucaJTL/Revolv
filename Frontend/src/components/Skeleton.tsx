import type { HTMLAttributes } from "react";

/** Layout placeholder for loading states. Size and shape come from className. */
export default function Skeleton({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={`animate-pulse rounded bg-slate-200 dark:bg-slate-700 ${className}`}
      aria-hidden="true"
    />
  );
}
