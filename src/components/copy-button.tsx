"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "./ui/button";
import { useToast } from "./ui/toast";

export function CopyButton({ value, label = "Kopieren" }: { value: string; label?: string }) {
  const { show } = useToast();
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      show("Kopieren hat nicht geklappt. Markiere die Adresse und kopiere sie von Hand.", "error");
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={copy} type="button">
      {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {copied ? "Kopiert" : label}
    </Button>
  );
}
