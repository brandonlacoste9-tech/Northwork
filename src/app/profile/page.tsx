import type { Metadata } from "next";
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
import { upsertProfile } from "@/lib/actions";
import { isSupabaseConfigured, type ProfileRow } from "@/lib/backend";
import { PROVINCES } from "@/lib/data";
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

export default async function ProfilePage() {
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

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-sm font-medium text-primary">northernwork.com</p>
      <h1 className="mt-2 font-heading text-4xl tracking-tight">
        My freelancer profile
      </h1>
      <p className="mt-3 text-muted-foreground">
        This is what clients see in the talent directory. Rates in CAD, work
        in Canada.
      </p>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Profile details</CardTitle>
          <CardDescription>
            Signed in as {user.email}. Saving publishes your profile to the
            talent directory.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={upsertProfile} className="grid gap-5">
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
            <Button type="submit" className="h-11 px-5 sm:w-fit">
              Save profile
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
