import Image from "next/image";

/**
 * Healthy Smith logo. `mark` is the face only (for small spots like headers and
 * the sidebar); `full` includes the company name beneath it (for login pages).
 * The artwork is black on transparent, so it is shown on a white tile where the
 * surrounding background is dark or tinted.
 */
export function BrandLogo({
  variant = "mark",
  size = 40,
  className = "",
}: {
  variant?: "mark" | "full";
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={variant === "full" ? "/logo.png" : "/logo-mark.png"}
      alt="Healthy Smith"
      width={size}
      height={size}
      priority
      className={`shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
