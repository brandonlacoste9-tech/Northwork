"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { addPortfolioItem, deletePortfolioItem } from "@/lib/actions";
import type { PortfolioItem } from "@/lib/data";

export function PortfolioManager({ items }: { items: PortfolioItem[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = event.currentTarget;
    const result = await addPortfolioItem(new FormData(form));
    if (result?.error) setError(result.error);
    else {
      form.reset();
      router.refresh();
    }
    setPending(false);
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="font-heading text-xl">Work</CardTitle>
        <CardDescription>
          A few projects clients should see. Title required. Photo and link are optional.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {items.length > 0 ? (
          <ul className="grid gap-3">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.title}</p>
                  {item.url ? (
                    <p className="truncate text-xs text-muted-foreground">{item.url}</p>
                  ) : null}
                </div>
                <form action={deletePortfolioItem.bind(null, item.id)}>
                  <Button type="submit" variant="outline" className="h-9">
                    Remove
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No work yet. Add a project you finished in Canada.
          </p>
        )}
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="work-title">Title</Label>
            <Input id="work-title" name="title" required className="h-10" placeholder="Member portal" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="work-url">Link</Label>
            <Input
              id="work-url"
              name="url"
              inputMode="url"
              className="h-10"
              placeholder="https://"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="work-image">Image</Label>
            <Input id="work-image" name="image" type="file" accept="image/jpeg,image/png,image/webp" />
            <p className="text-xs text-muted-foreground">JPG, PNG, or WebP. 5 MB maximum.</p>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="h-10 px-4 sm:w-fit">
            {pending ? "Adding…" : "Add to work"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
