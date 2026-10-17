export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-4 border-2 border-dashed border-ink px-6 py-12 text-center">
      <svg aria-hidden width="96" height="96" viewBox="0 0 96 96" fill="none">
        <path d="M8 44 88 8 62 88 44 56 8 44Z" fill="#fff" stroke="#14213d" strokeWidth="3" strokeLinejoin="round" />
        <path d="M44 56 88 8" stroke="#14213d" strokeWidth="3" />
        <path d="M44 56v22l12-14" fill="#ffc93c" stroke="#14213d" strokeWidth="3" strokeLinejoin="round" />
      </svg>
      <p className="font-heading text-xl font-bold">{message}</p>
    </div>
  );
}
