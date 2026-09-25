"use client";

import { useState } from "react";
import { PersonAvatar } from "@/components/person-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadAvatar } from "@/lib/actions";

export function AvatarUploader({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  const [preview, setPreview] = useState(avatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await uploadAvatar(new FormData(event.currentTarget));
    if (result?.error) {
      setError(result.error);
    } else if (result?.url) {
      setPreview(result.url);
    }
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <PersonAvatar name={name} src={preview} className="size-16 text-lg" />
      <div className="min-w-0 flex-1">
        <Label htmlFor="avatar">Profile photo</Label>
        <Input
          id="avatar"
          name="avatar"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="mt-2"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setPreview(URL.createObjectURL(file));
          }}
        />
        <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, or WebP. 5 MB maximum.</p>
        {error ? (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} className="mt-3 h-10 px-4">
          {pending ? "Uploading…" : "Upload photo"}
        </Button>
      </div>
    </form>
  );
}
