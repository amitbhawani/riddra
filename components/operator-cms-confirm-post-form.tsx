"use client";

type OperatorCmsConfirmPostFormProps = {
  action: string;
  label: string;
  fields?: Record<string, string | null | undefined>;
  confirmMessage?: string;
  tone?: "primary" | "secondary" | "danger";
  compact?: boolean;
};

function getToneClasses(tone: NonNullable<OperatorCmsConfirmPostFormProps["tone"]>) {
  switch (tone) {
    case "primary":
      return "bg-aurora text-ink hover:bg-[#75f0d3]";
    case "danger":
      return "border border-rose-500/25 bg-rose-500/10 text-rose-100 hover:bg-rose-500/16";
    case "secondary":
    default:
      return "border border-white/15 bg-white/5 text-white hover:bg-white/10";
  }
}

export function OperatorCmsConfirmPostForm({
  action,
  label,
  fields,
  confirmMessage,
  tone = "secondary",
  compact = false,
}: OperatorCmsConfirmPostFormProps) {
  return (
    <form
      action={action}
      method="post"
      onSubmit={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {Object.entries(fields ?? {}).map(([key, value]) =>
        value ? <input key={key} type="hidden" name={key} value={value} /> : null,
      )}
      <button
        className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition ${getToneClasses(
          tone,
        )} ${compact ? "text-xs uppercase tracking-[0.14em]" : ""}`}
        type="submit"
      >
        {label}
      </button>
    </form>
  );
}
