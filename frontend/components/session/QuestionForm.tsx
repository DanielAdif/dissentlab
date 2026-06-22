"use client";

export function QuestionForm({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Ask a difficult question and watch the council debate it…"
      rows={3}
      className="w-full bg-card border border-border rounded-md px-4 py-3 text-foreground placeholder:text-muted resize-none focus:outline-none focus:border-accent text-base"
    />
  );
}
