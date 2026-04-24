import { getLaunchState } from "@/lib/launch-state";

const toneMap = {
  internal_review: "border-flare/30 bg-flare/8 text-flare",
  launch_prep: "border-white/12 bg-white/[0.04] text-white",
  private_beta: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  public_beta: "border-aurora/30 bg-aurora/10 text-aurora",
  full_launch: "border-bloom/30 bg-bloom/10 text-bloom",
} as const;

export function LaunchStatusBanner() {
  const launchState = getLaunchState();

  return (
    <div className={`border-b ${toneMap[launchState.mode]}`}>
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-current/25 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
            {launchState.label}
          </span>
          <p className="max-w-3xl text-sm leading-6 text-current/90">{launchState.publicMessage}</p>
        </div>
      </div>
    </div>
  );
}
