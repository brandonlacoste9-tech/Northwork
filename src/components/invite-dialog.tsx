"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/components/locale-provider";
import { inviteFreelancer } from "@/lib/actions";

export type InviteJob = { id: string; title: string };

export function InviteDialog({
  freelancerId,
  freelancerName,
  configured = false,
  signedIn = false,
  jobs = [],
}: {
  freelancerId?: string;
  freelancerName: string;
  configured?: boolean;
  signedIn?: boolean;
  jobs?: InviteJob[];
}) {
  const t = useT();
  const router = useRouter();
  const first = freelancerName.split(" ")[0];
  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState(jobs[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setSent(false);
      setError(null);
      setNote("");
      setPending(false);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured) {
      if (!note.trim()) {
        setError(t("invite.placeholder"));
        return;
      }
      setSent(true);
      return;
    }
    if (!freelancerId || !jobId) return;
    setPending(true);
    setError(null);
    const result = await inviteFreelancer(freelancerId, jobId, note);
    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    if (result?.conversationId) {
      router.push(`/messages/${result.conversationId}`);
      router.refresh();
    }
    setPending(false);
  }

  if (configured && !signedIn) {
    return (
      <Button asChild className="h-11 w-full px-4 sm:w-auto">
        <Link href={`/login?next=/talent/${freelancerId ?? ""}`}>{t("invite.signIn")}</Link>
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="h-11 w-full px-4 sm:w-auto">{t("invite.button", { name: first })}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {sent ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("invite.previewTitle")}</DialogTitle>
              <DialogDescription>{t("invite.previewBody", { name: freelancerName })}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                {t("invite.done")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>{t("invite.title", { name: freelancerName })}</DialogTitle>
              <DialogDescription>
                {configured ? t("invite.help") : t("invite.previewBody", { name: freelancerName })}
              </DialogDescription>
            </DialogHeader>
            {configured && jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("invite.none")}{" "}
                <Link href="/post" className="font-medium text-primary hover:underline">
                  {t("invite.post")}
                </Link>
              </p>
            ) : null}
            {configured && jobs.length > 0 ? (
              <div className="grid gap-2">
                <Label htmlFor="invite-job">{t("invite.project")}</Label>
                <Select value={jobId} onValueChange={setJobId}>
                  <SelectTrigger id="invite-job" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {configured && jobs.length === 0 ? null : (
              <div className="grid gap-2">
                <Label htmlFor="invite-note">{t("invite.note")}</Label>
                <Textarea
                  id="invite-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  required
                  rows={4}
                  placeholder={t("invite.placeholder")}
                />
              </div>
            )}
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="submit"
                className="h-10 px-4"
                disabled={pending || (configured && jobs.length === 0)}
              >
                {pending ? t("invite.sending") : t("invite.send")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
