import { Plane } from "lucide-react";

export function GenerateBar({
  disabledReason,
  loading,
  onGenerate,
}: {
  disabledReason: string | null;
  loading: boolean;
  onGenerate: () => void;
}) {
  const disabled = loading || !!disabledReason;
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t-2 border-ink bg-paper pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto w-full max-w-[480px] px-4 py-3">
        {disabledReason && (
          <p id="gen-reason" className="mb-2 text-sm text-ink-soft">
            {disabledReason}
          </p>
        )}
        <button
          type="button"
          disabled={disabled}
          aria-describedby={disabledReason ? "gen-reason" : undefined}
          onClick={onGenerate}
          className="label-mono relative min-h-11 w-full overflow-hidden bg-airmail-red text-xs font-bold text-white disabled:opacity-60"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              Boarding…
              <span aria-hidden className="relative block h-5 w-16 overflow-hidden">
                <Plane size={16} className="plane-taxi absolute left-0 top-0.5" />
              </span>
            </span>
          ) : (
            "Generate itinerary"
          )}
        </button>
      </div>
    </div>
  );
}
