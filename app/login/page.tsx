"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { login } from "@/lib/pb";
import { Button } from "@/components/ui/Button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(identity, password);
      router.push(searchParams.get("from") ?? "/");
      router.refresh();
    } catch {
      setError("Incorrect username/email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm border border-line rounded p-6 bg-white">
      <p className="font-display text-2xl text-ink-900">Kabatu</p>
      <p className="font-display text-2xl text-gold-500 -mt-1 mb-6">Farm</p>

      <label className="block text-xs text-ink-500 mb-1">Username or email</label>
      <input
        type="text"
        autoComplete="username"
        required
        value={identity}
        onChange={(e) => setIdentity(e.target.value)}
        className="w-full mb-4 text-sm px-3 py-2 rounded border border-line focus:outline-none focus:border-gold-500"
      />

      <label className="block text-xs text-ink-500 mb-1">Password</label>
      <input
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full mb-4 text-sm px-3 py-2 rounded border border-line focus:outline-none focus:border-gold-500"
      />

      {error && <p className="text-xs text-danger mb-4">{error}</p>}

      <Button type="submit" disabled={loading} variant="primary" className="w-full">
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-parchment-50 px-4">
      {/* useSearchParams() requires a Suspense boundary for static prerendering */}
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
