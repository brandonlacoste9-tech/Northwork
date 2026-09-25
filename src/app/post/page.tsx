import type { Metadata } from "next";
import { PostProjectForm } from "@/components/post-project-form";

export const metadata: Metadata = {
  title: "Post a project",
  description:
    "Post a freelance project on Northernwork with a CAD budget and a Canadian province, or mark it remote inside Canada.",
};

export default function PostPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-sm font-medium text-primary">northernwork.com</p>
      <h1 className="mt-2 font-heading text-4xl tracking-tight">
        Post a project
      </h1>
      <p className="mt-3 text-muted-foreground">
        Describe the work, set a budget in CAD, and say whether it is tied to
        a province or remote inside Canada. Posting adds the brief to the job
        board in this browser. It is not sent to a server.
      </p>
      <div className="mt-8">
        <PostProjectForm />
      </div>
    </main>
  );
}
