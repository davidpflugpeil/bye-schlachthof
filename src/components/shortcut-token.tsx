"use client";

import * as React from "react";
import { KeyRound } from "lucide-react";

import { CLIENT_TOKEN_HEADER } from "@/lib/api-headers";
import { enroll } from "@/lib/client-token";
import { Button } from "./ui/button";
import { CopyButton } from "./copy-button";

type State = "idle" | "working" | "done" | "failed";

/**
 * Issues the token for one shortcut installation.
 *
 * The work happens here in the browser, because the Kurzbefehle app cannot
 * compute a hash. The shortcut only carries the finished token.
 */
export function ShortcutToken() {
  const [state, setState] = React.useState<State>("idle");
  const [token, setToken] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function create() {
    setState("working");
    setError(null);

    const result = await enroll("shortcut");
    if (!result.ok) {
      setError(result.message);
      setState("failed");
      return;
    }

    setToken(result.token);
    setState("done");
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
          <KeyRound className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-ink">Token für dieses Gerät</h3>
          <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-soft">
            Der Kurzbefehl braucht einen eigenen Schlüssel. Er gehört zu dieser Einrichtung, nicht
            zu dir – wir speichern dazu weder Namen noch Adresse noch E-Mail.
          </p>
        </div>
      </div>

      {state !== "done" && (
        <div className="mt-4">
          <Button
            onClick={create}
            loading={state === "working"}
            loadingText="Wird erstellt …"
            type="button"
          >
            Token erstellen
          </Button>
          <p className="mt-2 text-sm text-ink-soft">
            {state === "working"
              ? "Dein Gerät löst gerade eine kleine Rechenaufgabe. Das dauert einen Moment und hält automatisierte Massenanfragen fern."
              : "Dauert wenige Sekunden."}
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      {state === "done" && token && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-md border border-line bg-surface-muted px-3 py-2 text-sm break-all text-ink">
              {token}
            </code>
            <CopyButton value={token} label="Token kopieren" />
          </div>
          <p className="text-sm leading-relaxed text-ink-soft">
            Trage ihn im Kurzbefehl unter „Kopfzeilen“ als{" "}
            <code className="text-ink">{CLIENT_TOKEN_HEADER}</code> ein. Bewahre ihn auf – er wird
            kein zweites Mal angezeigt. Für ein weiteres Gerät erstellst du einfach einen neuen.
          </p>
        </div>
      )}
    </div>
  );
}
