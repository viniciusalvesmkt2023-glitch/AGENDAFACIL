export type PixChargeInput = {
  amountCents: number;
  description: string;
  /** Nosso ID interno do pagamento (vai como referência externa no provedor). */
  reference: string;
  customer: { name: string; email: string; taxId: string; phone: string };
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

export type PixStatus = "PAID" | "EXPIRED" | "FAILED" | "PENDING" | "REFUNDED";

export type PixWebhookResult = { externalId: string; status: PixStatus } | null;

export interface PixProvider {
  name: string;
  /** Cobrança avulsa (SyncPay/teste). A Asaas usa assinatura e não implementa. */
  createCharge?(input: PixChargeInput): Promise<PixCharge>;
  /** Busca o código Pix de uma cobrança já existente (ex.: renovação gerada pela Asaas). */
  getPixCode?(externalId: string): Promise<{ copyPaste: string; qrCode: string | null; expiresAt: Date }>;
  /** Consulta o status (usado como reserva caso o webhook atrase). */
  getStatus?(externalId: string): Promise<PixStatus>;
  /** Valida a autenticidade do webhook e extrai o resultado. Retorna null se inválido ou irrelevante. */
  parseWebhook?(rawBody: string, headers: Headers): Promise<PixWebhookResult>;
}
