import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PostProjectForm } from "@/components/post-project-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/backend";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Post a project",
  description:
    "Post a freelance project on Northernwork with a CAD budget and a Canadian province, or mark it remote inside Canada.",
};

export default async function PostPage() {
  const configured = isSupabaseConfigured();

  // Posting to the shared board requires an account.
  if (configured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-sm font-medium text-primary">northernwork.com</p>
      <h1 className="mt-2 font-heading text-4xl tracking-tight">
        Post a project
      </h1>
      <p className="mt-3 text-muted-foreground">
        {configured
          ? "Describe the work, set a budget in CAD, and say whether it is tied to a province or remote inside Canada. Posting publishes the brief to the job board for everyone."
          : "Describe the work, set a budget in CAD, and say whether it is tied to a province or remote inside Canada. Posting adds the brief to the job board in this browser. It is not sent to a server."}
      </p>
      {configured ? null : (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="font-heading text-xl">
              Want this to go live?
            </CardTitle>
            <CardDescription>
              Connect a Supabase project (see the README) to publish projects
              to a shared board with accounts instead of this browser.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="h-10">
              <Link href="/login">Log in</Link>
            </Button>
          </CardContent>
        </Card>
      )}
      <div className="mt-8">
        <PostProjectForm />
      </div>
    </main>
  );
}
