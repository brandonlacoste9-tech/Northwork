"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type InviteFields = {
  name: string;
  email: string;
  note: string;
};

const emptyFields: InviteFields = { name: "", email: "", note: "" };

export function InviteDialog({ freelancerName }: { freelancerName: string }) {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<InviteFields>(emptyFields);
  const [errors, setErrors] = useState<Partial<InviteFields>>({});
  const [sent, setSent] = useState(false);

  function update(key: keyof InviteFields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Partial<InviteFields> = {};
    if (!fields.name.trim()) nextErrors.name = "Enter your name.";
    if (!fields.email.trim()) nextErrors.email = "Enter your email.";
    if (!fields.note.trim()) nextErrors.note = "Add a note about the work.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSent(true);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setSent(false);
      setFields(emptyFields);
      setErrors({});
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="h-11 px-4">Invite {freelancerName.split(" ")[0]}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {sent ? (
          <>
            <DialogHeader>
              <DialogTitle>Invite noted</DialogTitle>
              <DialogDescription>
                {freelancerName} is marked as invited on this device. Northernwork
                does not send email in this preview, and nothing leaves your
                browser.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={onSubmit} noValidate className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Invite {freelancerName}</DialogTitle>
              <DialogDescription>
                Tell them about the work. This confirmation stays on your device.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="invite-name">Your name</Label>
              <Input
                id="invite-name"
                value={fields.name}
                onChange={(event) => update("name", event.target.value)}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "invite-name-error" : undefined}
                autoComplete="name"
                className="h-10"
              />
              {errors.name ? (
                <p id="invite-name-error" className="text-sm text-destructive">
                  {errors.name}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invite-email">Work email</Label>
              <Input
                id="invite-email"
                type="email"
                value={fields.email}
                onChange={(event) => update("email", event.target.value)}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "invite-email-error" : undefined}
                autoComplete="email"
                className="h-10"
              />
              {errors.email ? (
                <p id="invite-email-error" className="text-sm text-destructive">
                  {errors.email}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invite-note">Note</Label>
              <Textarea
                id="invite-note"
                value={fields.note}
                onChange={(event) => update("note", event.target.value)}
                aria-invalid={Boolean(errors.note)}
                aria-describedby={errors.note ? "invite-note-error" : undefined}
                rows={4}
                placeholder="City, budget in CAD, and what you need done."
              />
              {errors.note ? (
                <p id="invite-note-error" className="text-sm text-destructive">
                  {errors.note}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="submit" className="h-10 px-4">
                Send invite
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
