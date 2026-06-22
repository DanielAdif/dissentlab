"use client";
import { useState } from "react";

export function ExportButton({ content, filename }: { content: string; filename: string }) {
  const [copied, setCopied] = useState(false);

  function copyToClipboard() {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadFile() {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={copyToClipboard}
        className="text-xs text-muted border border-border rounded px-3 py-1.5 hover:border-foreground/30 hover:text-foreground transition-colors"
      >
        {copied ? "Copied!" : "Copy Markdown"}
      </button>
      <button
        onClick={downloadFile}
        className="text-xs text-muted border border-border rounded px-3 py-1.5 hover:border-foreground/30 hover:text-foreground transition-colors"
      >
        Export .md
      </button>
    </div>
  );
}
