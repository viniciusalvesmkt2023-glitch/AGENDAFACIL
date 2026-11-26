import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/**
 * Botão laranja de destaque: pílula com brilho girando na borda, luz em volta e seta que troca ao passar o mouse.
 */
export function Cta({ href, size, className = "", children }: { href: string; size?: "sm"; className?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={`lp-cta ${size ?? ""} ${className}`}>
      <span className="lp-cta-tx">{children}</span>
      <span className="lp-cta-ar" aria-hidden="true">
        <ArrowUpRight />
        <ArrowUpRight />
      </span>
    </Link>
  );
}
