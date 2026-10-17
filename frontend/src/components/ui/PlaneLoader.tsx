import { Check, Plane } from "lucide-react";

export type LoaderStatus = "processing" | "ready" | "failed";

export function PlaneLoader({
  status,
  onRetry,
}: {
  status: LoaderStatus;
  onRetry?: () => void;
}) {
  return (
    <div aria-live="polite" className="inline-flex min-h-11 items-center gap-2">
      {status === "processing" && (
        <>
          <span aria-hidden className="relative block h-10 w-32">
            <svg viewBox="0 0 120 40" className="absolute inset-0 h-full w-full">
              <path
                d="M4 36 Q 60 -14 116 36"
                fill="none"
                stroke="var(--airmail-blue)"
                strokeWidth="2"
                strokeDasharray="2 6"
                strokeLinecap="round"
              />
            </svg>
            <Plane size={16} className="plane-fly absolute left-0 top-0 text-airmail-blue" />
          </span>
          <span className="label-mono text-xs">Researching</span>
        </>
      )}
      {status === "ready" && (
        <span className="label-mono inline-flex items-center gap-1.5 text-xs font-bold text-ink">
          <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full bg-mint text-ink">
            <Check size={14} />
          </span>
          Landed
        </span>
      )}
      {status === "failed" && (
        <button
          type="button"
          onClick={onRetry}
          className="label-mono min-h-11 rounded-full bg-airmail-red px-4 text-xs font-bold text-white"
        >
          Delayed, Retry
        </button>
      )}
    </div>
  );
}
