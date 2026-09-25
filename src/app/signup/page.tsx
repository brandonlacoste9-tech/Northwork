"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/components/locale-provider";
import { isSupabaseConfigured } from "@/lib/backend";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const t = useT();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-2xl">{t("login.preview")}</CardTitle>
            <CardDescription>
              This copy of Northernwork is running on sample data. Connect a
              Supabase project to enable accounts — see the README.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-3xl">{t("signup.title")}</CardTitle>
          <CardDescription>
            One account for hiring and for getting hired. Rates in CAD, work
            in Canada.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <GoogleSignInButton />
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">{t("login.email")}</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">{t("login.password")}</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-10"
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={loading} className="h-11">
              {loading ? "Creating account…" : t("signup.submit")}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground">{t("signup.confirm")}</p>
          <p className="mt-4 text-sm text-muted-foreground">
            {t("signup.switch")}{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
