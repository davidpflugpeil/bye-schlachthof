"use client";

import * as React from "react";
import { useActionState } from "react";
import { Lock } from "lucide-react";

import { signIn, type SignInState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { inputClasses, FormField } from "@/components/ui/form-field";
import { Card } from "@/components/ui/card";

export function LoginForm() {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, {});

  return (
    <Card className="mx-auto w-full max-w-sm" shadow="card">
      <div className="flex flex-col items-center text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Lock className="size-5" aria-hidden />
        </span>
        <h1 className="mt-3.5 text-xl font-bold text-ink">Verwaltung</h1>
        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-soft">
          Dieser Bereich ist nur für die Betreuung des Projekts.
        </p>
      </div>

      <form action={action} className="mt-6 space-y-4">
        <FormField label="Passwort" error={state.error}>
          {(fieldProps) => (
            <input
              {...fieldProps}
              type="password"
              name="password"
              autoComplete="current-password"
              required
              className={inputClasses}
            />
          )}
        </FormField>

        <Button type="submit" size="lg" fullWidth loading={pending} loadingText="Wird geprüft …">
          Anmelden
        </Button>
      </form>
    </Card>
  );
}
