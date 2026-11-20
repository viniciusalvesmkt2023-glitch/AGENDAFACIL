export type PixChargeInput = {
  amountCents: number;
  description: string;
  /** Nosso ID interno do pagamento (vai como referência externa no provedor). */
  reference: string;
  customer: { name: string; email: string; taxId: string; phone?: string | null };
  /** Minutos até o QR code expirar. */
  expiresInMinutes: number;
};

export type PixCharge = {
  externalId: string;
  copyPaste: string;
  /** Imagem do QR code (data URL base64) ou URL; se ausente, geramos a partir do copia-e-cola. */
  qrCode?: string | null;
  expiresAt: Date;
};

export type PixWebhookResult = { externalId: string; status: "PAID" | "EXPIRED" | "FAILED" | "PENDING" } | null;

export interface PixProvider {
  name: string;
  createCharge(input: PixChargeInput): Promise<PixCharge>;
  /** Consulta o status (usado como reserva caso o webhook atrase). */
  getStatus?(externalId: string): Promise<"PAID" | "EXPIRED" | "FAILED" | "PENDING">;
  /** Valida a autenticidade do webhook e extrai o resultado. Retorna null se inválido ou irrelevante. */
  parseWebhook(rawBody: string, headers: Headers): Promise<PixWebhookResult>;
}
