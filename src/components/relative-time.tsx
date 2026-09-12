"use client";

import * as React from "react";

import { relativeTime } from "@/lib/format";

/**
 * Relative timestamp that refreshes roughly every minute.
 * The server already renders the matching German text, so there is no
 * empty first paint.
 */
export function RelativeTime({
  timestamp,
  className,
}: {
  timestamp: string;
  className?: string;
}) {
  const [text, setText] = React.useState(() => relativeTime(timestamp));

  React.useEffect(() => {
    setText(relativeTime(timestamp));
    const timer = window.setInterval(() => setText(relativeTime(timestamp)), 45_000);
    return () => window.clearInterval(timer);
  }, [timestamp]);

  return (
    <time dateTime={timestamp} className={className} suppressHydrationWarning>
      {text}
    </time>
  );
}
