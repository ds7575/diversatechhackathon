export function AirmailStripe({ height = 8, className = "" }: { height?: number; className?: string }) {
  return <div aria-hidden className={`airmail-stripe w-full ${className}`} style={{ height }} />;
}
