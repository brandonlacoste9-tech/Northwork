import { DirectoryLoading } from "@/components/directory-state";

export default function MessagesLoading() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <DirectoryLoading label="Loading your messages…" />
    </main>
  );
}
