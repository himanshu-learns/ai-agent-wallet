
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;

        if (data.session) {
          router.replace("/");
          router.refresh();
        } else {
          setMessage("Account created. Please check your email to confirm your account.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.replace("/");
        router.refresh();
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Authentication failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <h1 className="text-2xl font-bold">AI Agent Wallet</h1>
        <p className="mt-2 text-sm text-slate-400">
          {isSignup
            ? "Create your account to manage AI agent payments."
            : "Sign in to manage your AI agents."}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="text-sm text-slate-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-slate-400"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-slate-400"
              placeholder="At least 6 characters"
            />
          </div>

          {message && (
            <p className="rounded-lg bg-slate-800 p-3 text-sm text-slate-300">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-slate-950 disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : isSignup
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setIsSignup(!isSignup);
            setMessage("");
          }}
          className="mt-6 w-full text-sm text-slate-400 hover:text-white"
        >
          {isSignup
            ? "Already have an account? Sign in"
            : "New here? Create an account"}
        </button>
      </div>
    </main>
  );
}
