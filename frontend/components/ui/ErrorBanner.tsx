type Props = {
  message: string;
  onDismiss?: () => void;
};

export function ErrorBanner({ message, onDismiss }: Props) {
  return (
    <div className="border border-foreground/40 bg-foreground/5 rounded-md px-4 py-3 flex items-start gap-3">
      <span className="text-foreground text-sm flex-1">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-muted hover:text-foreground text-xs shrink-0"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
