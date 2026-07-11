import { AsciiSpinner } from "@/components/ui/ascii-morph";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <AsciiSpinner className="h-10 w-10 text-2xl" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
