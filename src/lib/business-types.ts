// Tipos de estabelecimento: usados no cadastro para sugerir serviços e ajustar textos.

export type SuggestedService = { name: string; durationMinutes: number; priceCents: number; selected: boolean };

export type BusinessTypeInfo = {
  id: BusinessTypeId;
  label: string;
  description: string;
  /** Como chamar quem atende (ex.: "barbeiro") */
  professional: string;
  /** Palavra usada para sugerir links alternativos (ex.: barbearia-do-joao) */
  slugWord: string;
  services: SuggestedService[];
};

export const BUSINESS_TYPE_IDS = ["BARBEARIA", "SALAO", "UNHAS", "SOBRANCELHA", "ESTETICA", "SAUDE", "OUTRO"] as const;
export type BusinessTypeId = (typeof BUSINESS_TYPE_IDS)[number];

const s = (name: string, durationMinutes: number, reais: number, selected = false): SuggestedService => ({
  name,
  durationMinutes,
  priceCents: reais * 100,
  selected,
});

export const BUSINESS_TYPES: Record<BusinessTypeId, BusinessTypeInfo> = {
  BARBEARIA: {
    id: "BARBEARIA",
    label: "Barbearia",
    description: "Corte, barba e acabamento",
    professional: "barbeiro",
    slugWord: "barbearia",
    services: [
      s("Corte masculino", 30, 40, true),
      s("Barba", 30, 30, true),
      s("Corte + barba", 60, 60, true),
      s("Pezinho", 15, 15),
      s("Sobrancelha", 15, 15),
      s("Corte infantil", 30, 35),
      s("Platinado", 120, 120),
    ],
  },
  SALAO: {
    id: "SALAO",
    label: "Salão de beleza",
    description: "Cabelo, química e penteados",
    professional: "profissional",
    slugWord: "salao",
    services: [
      s("Corte feminino", 60, 80, true),
      s("Escova", 45, 50, true),
      s("Hidratação", 60, 70, true),
      s("Coloração", 120, 150),
      s("Mechas", 180, 250),
      s("Progressiva", 180, 200),
      s("Penteado", 60, 120),
      s("Corte masculino", 30, 40),
    ],
  },
  UNHAS: {
    id: "UNHAS",
    label: "Manicure e pedicure",
    description: "Unhas, alongamento e esmaltação",
    professional: "manicure",
    slugWord: "studio",
    services: [
      s("Manicure", 45, 30, true),
      s("Pedicure", 45, 35, true),
      s("Pé e mão", 90, 60, true),
      s("Esmaltação em gel", 60, 70),
      s("Alongamento em gel", 120, 150),
      s("Manutenção do alongamento", 90, 100),
    ],
  },
  SOBRANCELHA: {
    id: "SOBRANCELHA",
    label: "Sobrancelhas e cílios",
    description: "Design, henna e extensão de cílios",
    professional: "designer",
    slugWord: "studio",
    services: [
      s("Design de sobrancelha", 30, 40, true),
      s("Design com henna", 45, 55, true),
      s("Extensão de cílios", 120, 150, true),
      s("Manutenção de cílios", 90, 90),
      s("Lash lifting", 60, 100),
      s("Brow lamination", 60, 110),
    ],
  },
  ESTETICA: {
    id: "ESTETICA",
    label: "Estética e spa",
    description: "Pele, massagem e depilação",
    professional: "esteticista",
    slugWord: "estetica",
    services: [
      s("Limpeza de pele", 60, 120, true),
      s("Massagem relaxante", 60, 120, true),
      s("Drenagem linfática", 60, 110, true),
      s("Depilação", 45, 60),
      s("Peeling", 45, 150),
    ],
  },
  SAUDE: {
    id: "SAUDE",
    label: "Clínica e saúde",
    description: "Consultas, sessões e terapias",
    professional: "profissional",
    slugWord: "clinica",
    services: [
      s("Consulta", 60, 150, true),
      s("Retorno", 30, 80, true),
      s("Avaliação", 40, 100),
      s("Sessão de fisioterapia", 50, 100),
      s("Sessão de terapia", 50, 150),
    ],
  },
  OUTRO: {
    id: "OUTRO",
    label: "Outro tipo",
    description: "Qualquer serviço com horário marcado",
    professional: "profissional",
    slugWord: "studio",
    services: [s("Atendimento", 60, 100, true), s("Avaliação", 30, 50)],
  },
};

export const BUSINESS_TYPE_LIST = BUSINESS_TYPE_IDS.map((id) => BUSINESS_TYPES[id]);

export function isBusinessType(v: unknown): v is BusinessTypeId {
  return typeof v === "string" && (BUSINESS_TYPE_IDS as readonly string[]).includes(v);
}

export function businessTypeInfo(v: string | null | undefined): BusinessTypeInfo {
  return isBusinessType(v) ? BUSINESS_TYPES[v] : BUSINESS_TYPES.OUTRO;
}
