type Props = {
  message: string;
  onDismiss?: () => void;
};

export function ErrorBanner({ message, onDismiss }: Props) {
  return (
    <div className="bg-surface-raised border border-border rounded-lg px-4 py-3 flex items-start gap-3">
      <span className="text-foreground text-[13px] flex-1">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-muted hover:text-foreground text-[12px] shrink-0 transition-colors"
        >
          ×
        </button>
      )}
    </div>
  );
}
