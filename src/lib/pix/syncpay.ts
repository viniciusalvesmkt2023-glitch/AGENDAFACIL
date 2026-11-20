// Integração Pix com a SyncPay.
// PENDENTE: completar com a documentação oficial da API da SyncPay
// (endpoint de criação de cobrança, formato da resposta, assinatura do webhook).
import type { PixProvider } from "./types";

export const syncPayProvider: PixProvider = {
  name: "SYNCPAY",
  async createCharge() {
    throw new Error("Integração Pix (SyncPay) ainda não foi concluída.");
  },
  async parseWebhook() {
    return null;
  },
};
