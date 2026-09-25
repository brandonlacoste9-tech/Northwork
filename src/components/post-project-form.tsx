"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { PROVINCES, REMOTE_IN_CANADA, SKILLS, type WorkLocation } from "@/lib/data";
import { createJob } from "@/lib/actions";
import { isSupabaseConfigured } from "@/lib/backend";
import { useMarketplace } from "@/lib/marketplace";
import { cn } from "cn";

type FieldKey = "title" | "description" | "budget" | "budgetMax" | "skills" | "location";

export function PostProjectForm() {
  const router = useRouter();
  const { addJob } = useMarketplace();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [budgetType, setBudgetType] = useState<"fixed" | "hourly">("fixed");
  const [duration, setDuration] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [location, setLocation] = useState<string>("");
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const configured = isSupabaseConfigured();
  function clearError(key: FieldKey) {
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function toggleSkill(skill: string) {
    setSkills((current) =>
      current.includes(skill)
        ? current.filter((item) => item !== skill)
        : [...current, skill],
    );
    clearError("skills");
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Partial<Record<FieldKey, string>> = {};
    const amount = Number(budget);
    const maxAmount = budgetMax.trim() === "" ? null : Number(budgetMax);

    if (!title.trim()) nextErrors.title = "Add a project title.";
    if (!description.trim()) nextErrors.description = "Describe the work.";
    if (!budget.trim()) nextErrors.budget = "Enter a budget in CAD.";
    else if (!Number.isFinite(amount) || amount <= 0) {
      nextErrors.budget = "Enter a budget greater than zero.";
    }
    if (maxAmount !== null && (!Number.isFinite(maxAmount) || maxAmount < amount)) {
      nextErrors.budgetMax = "The top of the range must be at least the minimum.";
    }
    if (skills.length === 0) nextErrors.skills = "Choose at least one skill.";
    if (!location) nextErrors.location = "Choose a province or remote in Canada.";

    setErrors(nextErrors);
    const firstInvalid = (
      ["title", "description", "budget", "budgetMax", "skills", "location"] as const
    ).find((key) => nextErrors[key]);
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    // Supabase configured: publish to the shared job board (requires login;
    // the server action redirects to /login otherwise).
    if (configured) {
      setSubmitting(true);
      try {
        const formData = new FormData();
        formData.set("title", title.trim());
        formData.set("description", description.trim());
        formData.set("budget", String(Math.round(amount)));
        if (maxAmount !== null) formData.set("budget_max", String(Math.round(maxAmount)));
        formData.set("budget_type", budgetType);
        if (duration.trim()) formData.set("duration", duration.trim());
        skills.forEach((skill) => formData.append("skills", skill));
        formData.set("location", location);
        await createJob(formData);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    addJob({
      title,
      description,
      budget: Math.round(amount),
      budgetMax: maxAmount === null ? undefined : Math.round(maxAmount),
      budgetType,
      duration: duration.trim(),
      skills,
      location: location as WorkLocation,
    });
    router.push("/jobs");
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6">
      {Object.values(errors).some(Boolean) ? (
        <p role="alert" className="text-sm text-destructive">
          Check the highlighted fields before posting.
        </p>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            clearError("title");
          }}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? "title-error" : undefined}
          className="h-10"
        />
        {errors.title ? (
          <p id="title-error" className="text-sm text-destructive">
            {errors.title}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
            clearError("description");
          }}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? "description-error" : undefined}
          rows={6}
          placeholder="What needs doing, who it is for, and any constraint that matters in Canada."
        />
        {errors.description ? (
          <p id="description-error" className="text-sm text-destructive">
            {errors.description}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="budget">Budget (CAD)</Label>
        <Input
          id="budget"
          inputMode="decimal"
          value={budget}
          onChange={(event) => {
            setBudget(event.target.value);
            clearError("budget");
          }}
          aria-invalid={Boolean(errors.budget)}
          aria-describedby={errors.budget ? "budget-error" : undefined}
          placeholder="12000"
          className="h-10"
        />
        {errors.budget ? (
          <p id="budget-error" className="text-sm text-destructive">
            {errors.budget}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Minimum in Canadian dollars. Add a top of range if the budget is a band.
          </p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="budgetMax">Budget top (CAD, optional)</Label>
          <Input
            id="budgetMax"
            inputMode="decimal"
            value={budgetMax}
            onChange={(event) => {
              setBudgetMax(event.target.value);
              clearError("budgetMax");
            }}
            aria-invalid={Boolean(errors.budgetMax)}
            placeholder="18000"
            className="h-10"
          />
          {errors.budgetMax ? (
            <p className="text-sm text-destructive">{errors.budgetMax}</p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="budget-type">Budget type</Label>
          <Select value={budgetType} onValueChange={(value) => setBudgetType(value as "fixed" | "hourly")}>
            <SelectTrigger id="budget-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Fixed</SelectItem>
              <SelectItem value="hourly">Hourly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="duration">Estimated duration (optional)</Label>
        <Input
          id="duration"
          value={duration}
          onChange={(event) => setDuration(event.target.value)}
          placeholder="About 6 weeks"
          className="h-10"
        />
      </div>
      <fieldset
        id="skills"
        tabIndex={-1}
        className="grid gap-2"
        aria-invalid={Boolean(errors.skills)}
        aria-describedby={errors.skills ? "skills-error" : undefined}
      >
        <legend className="text-sm font-medium">Skills</legend>
        <div className="flex flex-wrap gap-2">
          {SKILLS.map((skill) => {
            const selected = skills.includes(skill);
            return (
              <button
                key={skill}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleSkill(skill)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-muted",
                )}
              >
                {skill}
              </button>
            );
          })}
        </div>
        {errors.skills ? (
          <p id="skills-error" className="text-sm text-destructive">
            {errors.skills}
          </p>
        ) : null}
      </fieldset>
      <div className="grid gap-2">
        <Label htmlFor="location">Province or remote</Label>
        <Select
          value={location || undefined}
          onValueChange={(value) => {
            setLocation(value);
            clearError("location");
          }}
        >
          <SelectTrigger
            id="location"
            className="w-full"
            aria-invalid={Boolean(errors.location)}
            aria-describedby={errors.location ? "location-error" : undefined}
          >
            <SelectValue placeholder="Choose where the work happens" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={REMOTE_IN_CANADA}>{REMOTE_IN_CANADA}</SelectItem>
            {PROVINCES.map((province) => (
              <SelectItem key={province} value={province}>
                {province}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.location ? (
          <p id="location-error" className="text-sm text-destructive">
            {errors.location}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Remote means remote inside Canada.
          </p>
        )}
      </div>
      <Button type="submit" disabled={submitting} className="h-11 w-full px-5 sm:w-fit">
        {submitting ? "Posting…" : "Post project"}
      </Button>
    </form>
  );
}
