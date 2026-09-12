import * as React from "react";
import Image from "next/image";

import { cn } from "@/lib/cn";

/** Brand mark: the Münchner Kindl holding its nose. */
export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/coat-of-arms-header.png"
      alt=""
      width={222}
      height={256}
      sizes="32px"
      priority
      className={cn("h-8 w-auto", className)}
    />
  );
}
