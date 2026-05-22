"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signUp } from "@/lib/auth-client";

type Props = { mode: "login" | "signup" };

export default function AuthForm({ mode }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const destination =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/home";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";
  const title = isSignup ? "NEW PLAYER" : "CONTINUE";
  const cta = isSignup ? "▶ CREATE ACCOUNT" : "▶ LOG IN";

  const onGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      await signIn.social({ provider: "google", callbackURL: destination });
    } catch {
      setError("Google sign-in failed. Try again.");
      setBusy(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (isSignup) {
        const fallback = email.split("@")[0];
        const res = await signUp.email({
          email,
          password,
          name: name.trim() || fallback,
        });
        if (res.error) {
          setError(res.error.message ?? "Could not create account.");
          setBusy(false);
          return;
        }
      } else {
        const res = await signIn.email({ email, password });
        if (res.error) {
          setError(res.error.message ?? "Wrong email or password.");
          setBusy(false);
          return;
        }
      }
      router.push(destination);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen text-zinc-100 grid place-items-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link
            href="/home"
            className="inline-block font-pixel text-xs text-indigo-400 tracking-widest"
          >
            BUGRUSH
          </Link>
          <h1 className="font-pixel text-lg mt-5">{title}</h1>
          <p className="text-sm text-zinc-400 mt-3">
            {isSignup ? "Save your runs and hit the leaderboard." : "Pick up where you left off."}
          </p>
        </div>

        <div className="border-2 border-zinc-800 bg-zinc-900 p-6 space-y-4">
          <button
            type="button"
            onClick={onGoogle}
            disabled={busy}
            className="btn-press w-full py-3 flex items-center justify-center gap-3 font-pixel text-[10px] border-2 border-zinc-700 bg-zinc-950 text-zinc-100 hover:border-zinc-500 disabled:opacity-50 transition"
          >
            <GoogleMark />
            CONTINUE WITH GOOGLE
          </button>

          <div className="flex items-center gap-3">
            <span className="flex-1 h-0.5 bg-zinc-800" />
            <span className="font-pixel text-[9px] text-zinc-600">OR</span>
            <span className="flex-1 h-0.5 bg-zinc-800" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
          {isSignup && (
            <Field
              label="Display name"
              value={name}
              onChange={setName}
              type="text"
              placeholder="optional"
            />
          )}
          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            type="email"
            required
            autoComplete="email"
          />
          <Field
            label="Password"
            value={password}
            onChange={setPassword}
            type="password"
            required
            minLength={8}
            autoComplete={isSignup ? "new-password" : "current-password"}
          />

          {error && (
            <p className="text-xs text-fuchsia-400 font-mono">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className={`btn-press w-full py-3 font-pixel text-xs border-2 border-zinc-950 ${
              busy
                ? "bg-zinc-800 text-zinc-500"
                : "bg-indigo-500 text-zinc-950"
            }`}
          >
            {busy ? "···" : cta}
          </button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-500 mt-6 font-pixel">
          {isSignup ? (
            <>HAVE AN ACCOUNT? <Link href="/login" className="text-indigo-400 hover:text-indigo-300">LOG IN</Link></>
          ) : (
            <>NEW HERE? <Link href="/signup" className="text-indigo-400 hover:text-indigo-300">SIGN UP</Link></>
          )}
        </p>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function Field({
  label, value, onChange, type, placeholder, required, minLength, autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="block font-pixel text-[10px] text-zinc-400 mb-2">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className="w-full px-3 py-2 bg-zinc-950 border-2 border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition font-mono"
      />
    </label>
  );
}
