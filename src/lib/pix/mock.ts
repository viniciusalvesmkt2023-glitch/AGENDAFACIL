// Provedor Pix de TESTE — usado só em desenvolvimento (PIX_PROVIDER=mock).
// Gera um código fictício e permite simular o pagamento.
import type { PixProvider } from "./types";

export const mockPixProvider: PixProvider = {
  name: "MOCK",
  async createCharge(input) {
    const externalId = `mock_${input.reference}`;
    return {
      externalId,
      copyPaste: `00020126580014BR.GOV.BCB.PIX0136teste-${input.reference}5204000053039865406${(input.amountCents / 100).toFixed(2)}5802BR6304ABCD`,
      expiresAt: new Date(Date.now() + input.expiresInMinutes * 60_000),
    };
  },
  async parseWebhook(rawBody) {
    const data = JSON.parse(rawBody) as { externalId?: string; status?: string };
    if (!data.externalId) return null;
    return { externalId: data.externalId, status: data.status === "PAID" ? "PAID" : "PENDING" };
  },
};
