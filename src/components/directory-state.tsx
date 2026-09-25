import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function DirectoryLoading({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="grid gap-3">
        {["one", "two", "three"].map((key) => (
          <div key={key} className="h-32 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

export function DirectoryError({
  title,
  body,
  onRetry,
}: {
  title: string;
  body: string;
  onRetry: () => void;
}) {
  return (
    <Card role="alert">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{body}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" onClick={onRetry} className="h-10 px-4">
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

export function DirectoryEmpty({
  title,
  body,
  onClear,
}: {
  title: string;
  body: string;
  onClear: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{body}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          type="button"
          variant="outline"
          onClick={onClear}
          className="h-10 px-4"
        >
          Clear filters
        </Button>
      </CardContent>
    </Card>
  );
}
