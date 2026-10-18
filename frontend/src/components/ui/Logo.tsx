import Image from "next/image";

/** Decorative: pages name themselves via their headings. */
export function Logo({ size }: { size: "lg" | "sm" }) {
  const cls =
    size === "lg" ? "h-11 w-11 min-[380px]:h-[52px] min-[380px]:w-[52px]" : "h-7 w-7";
  return (
    <Image
      src="/logo.svg"
      alt=""
      width={size === "lg" ? 52 : 28}
      height={size === "lg" ? 52 : 28}
      unoptimized
      className={`logo shrink-0 ${cls}`}
    />
  );
}
