import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AvatarUploader } from "@/components/avatar-uploader";
import { PortfolioManager } from "@/components/portfolio-manager";
import { upsertProfile } from "@/lib/actions";
import { isSupabaseConfigured, type ProfileRow } from "@/lib/backend";
import { PROVINCES, type PortfolioItem } from "@/lib/data";
import { translate, type MessageKey } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "My profile",
  description: "Create or edit your Northernwork freelancer profile.",
};

const AVAILABILITY = [
  "Available this week",
  "Booking in two weeks",
  "Limited",
] as const;

const LINK_HOSTS = new Set(["behance.net", "github.com", "linkedin.com", "instagram.com"]);

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; site?: string }>;
}) {
  // Profiles only exist with the backend. In preview mode there is
  // nothing to edit, so send people back to the talent directory.
  if (!isSupabaseConfigured()) redirect("/talent");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const profile = data as ProfileRow | null;
  const locale = await getLocale();
  const t = (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars);
  const query = await searchParams;
  const linkHost = query.site && LINK_HOSTS.has(query.site) ? query.site : "";
  const linkError =
    query.error === "host" && linkHost
      ? t("profile.linkHost", { host: linkHost })
      : query.error === "invalid" || query.error === "host"
        ? t("profile.linkInvalid")
        : null;
  const { data: workRows } = await supabase
    .from("portfolio_items")
    .select("id, title, description, image_url, image_urls, url, position")
    .eq("freelancer_id", user.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  const work: PortfolioItem[] = ((workRows ?? []) as {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
    image_urls: string[] | null;
    url: string | null;
  }[]).map((item) => {
    const images = (item.image_urls ?? []).filter(Boolean);
    const cover = images[0] ?? item.image_url;
    return {
      id: item.id,
      title: item.title,
      summary: item.description,
      imageUrl: cover,
      images: images.length > 0 ? images : cover ? [cover] : [],
      url: item.url,
    };
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-sm font-medium text-primary">northernwork.ca</p>
      <h1 className="mt-2 font-heading text-4xl tracking-tight">
        My freelancer profile
      </h1>
      <p className="mt-3 text-muted-foreground">
        This is what clients see in the talent directory. Rates in CAD, work
        in Canada.
      </p>
      <p className="mt-4">
        <Link href="/settings/payouts" className="font-medium text-primary hover:underline">
          Set up CAD payouts
        </Link>
      </p>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Photo</CardTitle>
          <CardDescription>
            Shown on your talent card and profile. Initials stay until a photo is saved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarUploader
            name={profile?.display_name?.trim() || "You"}
            avatarUrl={profile?.avatar_url ?? null}
          />
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Profile details</CardTitle>
          <CardDescription>
            Signed in as {user.email}. Saving publishes your profile to the
            talent directory.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={upsertProfile} className="grid gap-5">
            {linkError ? (
              <p role="alert" className="text-sm text-destructive">
                {linkError}
              </p>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="display_name">Name</Label>
              <Input
                id="display_name"
                name="display_name"
                required
                defaultValue={profile?.display_name ?? ""}
                placeholder="Amélie Gagnon"
                className="h-10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                required
                defaultValue={profile?.title ?? ""}
                placeholder="Product designer"
                className="h-10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                rows={5}
                defaultValue={profile?.bio ?? ""}
                placeholder="What you do, who you do it for, and how you work."
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  required
                  defaultValue={profile?.city ?? ""}
                  placeholder="Montréal"
                  className="h-10"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="province">Province</Label>
                <Select
                  name="province"
                  defaultValue={profile?.province ?? undefined}
                  required
                >
                  <SelectTrigger id="province" className="h-10 w-full">
                    <SelectValue placeholder="Choose a province" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVINCES.map((province) => (
                      <SelectItem key={province} value={province}>
                        {province}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="hourly_rate_cad">Hourly rate (CAD)</Label>
                <Input
                  id="hourly_rate_cad"
                  name="hourly_rate_cad"
                  inputMode="decimal"
                  required
                  defaultValue={profile?.hourly_rate_cad ?? ""}
                  placeholder="145"
                  className="h-10"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="availability">Availability</Label>
                <Select
                  name="availability"
                  defaultValue={
                    profile?.availability ?? "Available this week"
                  }
                >
                  <SelectTrigger id="availability" className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABILITY.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="skills">Skills (comma-separated)</Label>
              <Input
                id="skills"
                name="skills"
                defaultValue={(profile?.skills ?? []).join(", ")}
                placeholder="Product design, UX research, Accessibility"
                className="h-10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="languages">Languages (comma-separated)</Label>
              <Input
                id="languages"
                name="languages"
                defaultValue={(profile?.languages ?? ["English"]).join(", ")}
                placeholder="English, French"
                className="h-10"
              />
            </div>
            <fieldset className="grid gap-4">
              <legend className="text-sm font-medium">{t("profile.links")}</legend>
              {(
                [
                  ["website", "profile.website", "https://"],
                  ["behance", "profile.behance", "https://www.behance.net/"],
                  ["github", "profile.github", "https://github.com/"],
                  ["linkedin", "profile.linkedin", "https://www.linkedin.com/in/"],
                  ["instagram", "profile.instagram", "https://www.instagram.com/"],
                ] as const
              ).map(([name, label, placeholder]) => (
                <div key={name} className="grid gap-2">
                  <Label htmlFor={name}>{t(label)}</Label>
                  <Input
                    id={name}
                    name={name}
                    inputMode="url"
                    defaultValue={profile?.[name] ?? ""}
                    placeholder={placeholder}
                    className="h-10"
                  />
                </div>
              ))}
            </fieldset>
            <Button type="submit" className="h-11 px-5 sm:w-fit">
              Save profile
            </Button>
          </form>
        </CardContent>
      </Card>
      {profile?.is_sample ? null : <PortfolioManager items={work} />}
    </main>
  );
}
