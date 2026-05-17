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
      : "/play";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";
  const title = isSignup ? "NEW PLAYER" : "CONTINUE";
  const cta = isSignup ? "▶ CREATE ACCOUNT" : "▶ LOG IN";

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
            DEVRACE
          </Link>
          <h1 className="font-pixel text-lg mt-5">{title}</h1>
          <p className="text-sm text-zinc-400 mt-3">
            {isSignup ? "Save your runs and hit the leaderboard." : "Pick up where you left off."}
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="border-2 border-zinc-800 bg-zinc-900 p-6 space-y-4"
        >
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
