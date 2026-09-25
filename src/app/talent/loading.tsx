import { DirectoryLoading } from "@/components/directory-state";

export default function TalentLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <DirectoryLoading label="Loading talent across Canada…" />
    </main>
  );
}
