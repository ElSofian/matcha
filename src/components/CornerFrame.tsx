import type { ReactNode } from "react";

export default function CornerFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`corner-frame ${className}`}>
      <span className="corner-tr" aria-hidden="true" />
      <span className="corner-bl" aria-hidden="true" />
      {children}
    </div>
  );
}
