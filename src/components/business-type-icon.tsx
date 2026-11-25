import { Eye, Flower2, Hand, Scissors, Sparkles, Stethoscope, Store, type LucideIcon } from "lucide-react";
import type { BusinessTypeId } from "@/lib/business-types";

const ICONS: Record<BusinessTypeId, LucideIcon> = {
  BARBEARIA: Scissors,
  SALAO: Sparkles,
  UNHAS: Hand,
  SOBRANCELHA: Eye,
  ESTETICA: Flower2,
  SAUDE: Stethoscope,
  OUTRO: Store,
};

export function BusinessTypeIcon({ type, className = "h-5 w-5" }: { type: BusinessTypeId; className?: string }) {
  const Icon = ICONS[type];
  return <Icon className={className} />;
}
