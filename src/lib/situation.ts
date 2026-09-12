import type { Situation } from "./types";
import { reportNoun } from "./format";

export type SituationLevel = "calm" | "isolated" | "noticeable" | "widespread";

export interface SituationAssessment {
  level: SituationLevel;
  /** German headline for display. */
  headline: string;
  /** German supporting sentence. */
  detail: string;
  /** 0–1, drives the meter in the status card. */
  fill: number;
  dotColor: string;
  barColor: string;
}

/**
 * Condenses the numbers from the last few hours into one plain statement.
 * Deliberately factual — this app documents, it does not warn.
 */
export function assessSituation(situation: Situation): SituationAssessment {
  const count = situation.reports2h;
  const average = situation.averageSeverity2h ?? 0;

  if (count === 0) {
    return {
      level: "calm",
      headline: "Derzeit keine aktuellen Meldungen",
      detail:
        situation.reports24h > 0
          ? `In den letzten 24 Stunden ${
              situation.reports24h === 1
                ? "gab es eine Meldung"
                : `gab es ${situation.reports24h} Meldungen`
            }.`
          : "In den letzten 24 Stunden wurde nichts gemeldet.",
      fill: 0.06,
      dotColor: "bg-sage",
      barColor: "bg-sage",
    };
  }

  const headline = `${count} ${reportNoun(count)} in den letzten 2 Stunden`;

  if (count <= 2 && average < 3.5) {
    return {
      level: "isolated",
      headline,
      detail: "Vereinzelte Wahrnehmungen in der Nachbarschaft.",
      fill: 0.3,
      dotColor: "bg-sev-2",
      barColor: "bg-sev-2",
    };
  }

  if (count <= 5 && average < 4) {
    return {
      level: "noticeable",
      headline,
      detail: "Mehrere Personen nehmen den Geruch gerade wahr.",
      fill: 0.6,
      dotColor: "bg-sev-3",
      barColor: "bg-sev-3",
    };
  }

  return {
    level: "widespread",
    headline,
    detail: "Aktuell wird verbreitet und überwiegend starker Geruch gemeldet.",
    fill: 0.82,
    dotColor: "bg-sev-4",
    barColor: "bg-sev-4",
  };
}
