import * as React from "react";
import {
  CalendarDays,
  Clock,
  Compass,
  Gauge,
  MapPin,
  Sprout,
  Wind,
  type LucideIcon,
} from "lucide-react";

import type { Takeaway } from "@/lib/analytics";
import { Card } from "@/components/ui/card";

const ICONS: Record<Takeaway["kind"], LucideIcon> = {
  time: Clock,
  wind: Wind,
  strength: Gauge,
  sector: Compass,
  weekday: CalendarDays,
  street: MapPin,
  sparse: Sprout,
};

/** The page's summary: a handful of plain German findings, numbers in bold. */
export function Takeaways({ takeaways }: { takeaways: Takeaway[] }) {
  if (takeaways.length === 0) return null;

  return (
    <Card tone="brand" shadow="none" className="mt-6">
      <h2 className="text-base font-bold text-ink sm:text-lg">Das zeigen die Meldungen</h2>
      <ul className="mt-4 grid gap-x-8 gap-y-4 md:grid-cols-2">
        {takeaways.map((takeaway) => {
          const Icon = ICONS[takeaway.kind];
          return (
            <li key={takeaway.kind} className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-brand shadow-soft">
                <Icon className="size-[1.125rem]" aria-hidden />
              </span>
              <p className="pt-1.5 text-[0.9375rem] leading-relaxed text-ink-soft sm:text-base">
                {takeaway.parts.map((part, index) =>
                  typeof part === "string" ? (
                    <React.Fragment key={index}>{part}</React.Fragment>
                  ) : (
                    <strong key={index} className="font-semibold text-ink">
                      {part.strong}
                    </strong>
                  ),
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
