"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type DownloadStatus = "idle" | "downloading" | "completed" | "error";

export function ModelSetupCard() {
  const [status, setStatus] = useState<DownloadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function startDownload() {
    setStatus("downloading");
    const es = new EventSource("/api/models/download/progress");
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setProgress(data.progress ?? 0);
      setMessage(data.message ?? "");
      if (data.status === "completed" || data.status === "already_downloaded") {
        setStatus("completed");
        es.close();
      }
      if (data.status === "error") {
        setStatus("error");
        setMessage(data.message);
        es.close();
      }
    };
    es.onerror = () => {
      setStatus("error");
      setMessage("Download connection failed. Check your internet connection.");
      es.close();
    };
  }

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center p-6 z-50">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">No model configured</h1>
          <p className="text-muted text-sm mt-2">
            DissentLab needs an AI model to run debates. Choose an option:
          </p>
        </div>

        {status === "idle" && (
          <div className="space-y-3">
            <button
              onClick={startDownload}
              className="w-full py-3 rounded-md bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
            >
              Download Qwen3-0.6B (~400MB)
            </button>
            <p className="text-xs text-muted text-center">CPU-only · No internet needed after download · No web research</p>
            <div className="border-t border-border pt-3">
              <button
                onClick={() => router.push("/settings/models")}
                className="w-full py-3 rounded-md border border-border text-foreground text-sm hover:border-foreground/40 transition-colors"
              >
                Configure a provider API key instead
              </button>
            </div>
          </div>
        )}

        {status === "downloading" && (
          <div className="space-y-3">
            <div className="h-2 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-muted">{message || "Downloading…"}</p>
          </div>
        )}

        {status === "completed" && (
          <div className="space-y-3">
            <p className="text-optimist text-sm">Model ready. You can now start a debate.</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 rounded-md bg-accent text-white font-medium"
            >
              Continue
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-3">
            <p className="text-pessimist text-sm">{message}</p>
            <button onClick={() => setStatus("idle")} className="text-sm text-accent underline">
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
