/** Cartão fidelidade do cliente (página do agendamento). */
export function LoyaltyCard({
  business,
  goal,
  count,
  next,
  rewards,
  stampMonths,
}: {
  business: string;
  goal: number;
  count: number;
  next: string;
  rewards: { id: string; label: string; expiresAt: Date | null }[];
  stampMonths: number | null;
}) {
  const ready = rewards.length > 0;
  const cols = goal <= 6 ? goal : Math.ceil(goal / 2);
  const until = (d: Date | null) => (d ? ` (vale até ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(d)})` : "");
  return (
    <div className={`hb-loyal ${ready ? "ready" : ""}`} data-testid="loyalty-card">
      <div className="hb-loyal-top">
        <div>
          <b>Cartão fidelidade</b>
          <small>{business}</small>
        </div>
        <small>
          {count}/{goal}
        </small>
      </div>
      <div className="hb-stamps" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: goal }, (_, i) => (
          <span key={i} className={`${i < count ? "on" : ""} ${i === goal - 1 ? "gift" : ""}`} style={{ animationDelay: `${i * 0.04}s` }}>
            {i === goal - 1 ? "🎁" : i < count ? "✓" : ""}
          </span>
        ))}
      </div>
      <p>
        {ready ? `🎉 Você tem: ${rewards[0].label}${until(rewards[0].expiresAt)}. Avise no atendimento!` : `Faltam ${goal - count} para ${next}`}
        <small>{ready ? "É só agendar e usar." : stampMonths ? `Os selos valem ${stampMonths} meses.` : "Cada atendimento concluído vale 1 selo."}</small>
      </p>
    </div>
  );
}
