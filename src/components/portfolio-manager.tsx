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
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/components/locale-provider";
import {
  addPortfolioItem,
  deletePortfolioItem,
  movePortfolioItem,
  updatePortfolioItem,
} from "@/lib/actions";
import type { PortfolioItem } from "@/lib/data";

async function compressImage(file: File) {
  try {
    if (!file.type.startsWith("image/") || file.size < 250_000) return file;
    const bitmap = await createImageBitmap(file);
    const max = 1600;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", 0.82);
    });
    bitmap.close();
    if (!blob) return file;
    return new File([blob], "work.webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

async function withCompressedImages(formData: FormData) {
  const next = new FormData();
  for (const [key, value] of formData.entries()) {
    if (key === "images" && value instanceof File && value.size > 0) {
      next.append(key, await compressImage(value));
    } else if (key !== "images") {
      next.append(key, value);
    }
  }
  return next;
}

function ProjectForm({
  item,
  onDone,
}: {
  item?: PortfolioItem;
  onDone: () => void;
}) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const images = item?.images?.length ? item.images : item?.imageUrl ? [item.imageUrl] : [];

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = event.currentTarget;
    const body = await withCompressedImages(new FormData(form));
    const result = item
      ? await updatePortfolioItem(item.id, body)
      : await addPortfolioItem(body);
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    form.reset();
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor={item ? `title-${item.id}` : "work-title"}>{t("profile.workTitle")}</Label>
        <Input
          id={item ? `title-${item.id}` : "work-title"}
          name="title"
          required
          maxLength={120}
          defaultValue={item?.title ?? ""}
          className="h-10"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={item ? `desc-${item.id}` : "work-desc"}>{t("profile.workDescription")}</Label>
        <Textarea
          id={item ? `desc-${item.id}` : "work-desc"}
          name="description"
          maxLength={800}
          rows={3}
          defaultValue={item?.summary ?? ""}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={item ? `url-${item.id}` : "work-url"}>{t("profile.workLink")}</Label>
        <Input
          id={item ? `url-${item.id}` : "work-url"}
          name="url"
          inputMode="url"
          defaultValue={item?.url ?? ""}
          placeholder="https://"
          className="h-10"
        />
      </div>
      {images.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2">
          {images.map((url) => (
            <li key={url} className="grid gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="aspect-[4/3] w-full rounded-md object-cover" />
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input type="checkbox" name="drop" value={url} />
                {t("profile.workRemovePhoto")}
              </label>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor={item ? `images-${item.id}` : "work-images"}>{t("profile.workImages")}</Label>
        <Input
          id={item ? `images-${item.id}` : "work-images"}
          name="images"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
        />
        <p className="text-xs text-muted-foreground">{t("profile.workImageHint")}</p>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending} className="h-10 px-4">
          {pending
            ? item
              ? t("profile.workSaving")
              : t("profile.workAdding")
            : item
              ? t("profile.workSave")
              : t("profile.workAdd")}
        </Button>
        {item ? (
          <Button type="button" variant="ghost" className="h-10" onClick={onDone}>
            {t("profile.workClose")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function PortfolioManager({ items }: { items: PortfolioItem[] }) {
  const t = useT();
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);

  function refresh() {
    setEditing(null);
    router.refresh();
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="font-heading text-xl">{t("profile.work")}</CardTitle>
        <CardDescription>{t("profile.workHelp")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {items.length > 0 ? (
          <ul className="grid gap-4">
            {items.map((item, index) => (
              <li key={item.id} className="rounded-xl border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.title}</p>
                    {item.summary ? (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.summary}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    <form action={movePortfolioItem.bind(null, item.id, "up")}>
                      <Button type="submit" variant="outline" className="h-9 px-2" disabled={index === 0}>
                        {t("profile.workUp")}
                      </Button>
                    </form>
                    <form action={movePortfolioItem.bind(null, item.id, "down")}>
                      <Button
                        type="submit"
                        variant="outline"
                        className="h-9 px-2"
                        disabled={index === items.length - 1}
                      >
                        {t("profile.workDown")}
                      </Button>
                    </form>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 px-2"
                      onClick={() => setEditing(editing === item.id ? null : item.id)}
                    >
                      {t("profile.workEdit")}
                    </Button>
                    <form action={deletePortfolioItem.bind(null, item.id)}>
                      <Button type="submit" variant="ghost" className="h-9 px-2 text-destructive">
                        {t("profile.workDelete")}
                      </Button>
                    </form>
                  </div>
                </div>
                {editing === item.id ? (
                  <div className="mt-4">
                    <ProjectForm item={item} onDone={refresh} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t("profile.workEmpty")}</p>
        )}
        <ProjectForm onDone={refresh} />
      </CardContent>
    </Card>
  );
}
