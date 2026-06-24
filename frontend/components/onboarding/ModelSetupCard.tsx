"use client";
import { useRouter } from "next/navigation";

export function ModelSetupCard() {
  const router = useRouter();

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center p-6 z-50">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">No model configured</h1>
          <p className="text-muted text-sm mt-2">
            Add an API key or configure Ollama to start running debates.
          </p>
        </div>
        <button
          onClick={() => router.push("/settings/models")}
          className="w-full py-3 rounded-md bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors"
        >
          Go to Model Settings
        </button>
      </div>
    </div>
  );
}
