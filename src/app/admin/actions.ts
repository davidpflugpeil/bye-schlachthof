"use server";

import { revalidatePath } from "next/cache";

import {
  deleteReport,
  hideReportsFromClient,
  setClientStatus,
  setReportStatus,
} from "@/lib/db";
import { endSession, isSignedIn, passwordMatches, startSession } from "@/lib/admin-auth";

export interface SignInState {
  /** German error message shown below the password field. */
  error?: string;
}

export async function signIn(_state: SignInState, form: FormData): Promise<SignInState> {
  const password = String(form.get("password") ?? "");

  if (!password) {
    return { error: "Bitte gib das Passwort ein." };
  }
  if (!passwordMatches(password)) {
    return { error: "Das Passwort stimmt nicht." };
  }

  await startSession();
  revalidatePath("/admin");
  return {};
}

export async function signOut(): Promise<void> {
  await endSession();
  revalidatePath("/admin");
}

export async function toggleVisibility(id: number, hide: boolean): Promise<void> {
  if (!(await isSignedIn())) return;
  setReportStatus(id, hide ? "hidden" : "visible");
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function removeReport(id: number): Promise<void> {
  if (!(await isSignedIn())) return;
  deleteReport(id);
  revalidatePath("/admin");
  revalidatePath("/");
}

/**
 * Locks one device out. With `withReports` everything it ever sent is hidden
 * in the same step — a flood is undone with one click instead of row by row.
 */
export async function revokeClient(id: number, withReports: boolean): Promise<void> {
  if (!(await isSignedIn())) return;
  setClientStatus(id, "revoked");
  if (withReports) hideReportsFromClient(id);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function restoreClient(id: number): Promise<void> {
  if (!(await isSignedIn())) return;
  setClientStatus(id, "active");
  revalidatePath("/admin");
}
