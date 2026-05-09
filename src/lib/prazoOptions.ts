export const PRAZO_TIPO_OPTIONS = [
  { value: "audiencia", label: "Audiência" },
  { value: "prazo_processual", label: "Prazo processual" },
  { value: "reuniao", label: "Reunião" },
  { value: "outro", label: "Outro" },
] as const;

export const PRAZO_PRIORIDADE_OPTIONS = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Média" },
  { value: "baixa", label: "Baixa" },
] as const;

const PRAZO_TIPO_LABELS: Record<string, string> = {
  audiencia: "Audiência",
  contestacao: "Prazo processual",
  peticao: "Prazo processual",
  prazo_processual: "Prazo processual",
  recurso: "Prazo processual",
  reuniao: "Reunião",
  outro: "Outro",
};

export const normalizePrazoTipo = (tipo: string | null | undefined) => {
  if (!tipo) return "outro";
  if (tipo === "contestacao" || tipo === "peticao" || tipo === "recurso") {
    return "prazo_processual";
  }

  return tipo;
};

export const getPrazoTipoLabel = (tipo: string | null | undefined) => {
  if (!tipo) return PRAZO_TIPO_LABELS.outro;
  return PRAZO_TIPO_LABELS[tipo] || PRAZO_TIPO_LABELS[normalizePrazoTipo(tipo)] || tipo;
};

export const getPrazoPrioridadeLabel = (prioridade: string | null | undefined) => {
  switch (prioridade) {
    case "alta":
      return "Alta";
    case "media":
      return "Média";
    case "baixa":
      return "Baixa";
    default:
      return "Média";
  }
};
