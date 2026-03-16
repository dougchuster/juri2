export type DemoRole = "ADMIN" | "ADVOGADO" | "ASSISTENTE";

export interface DemoFuncionario {
  name: string;
  email: string;
  password: string;
  role: DemoRole;
  perfilProfissional: string;
  cargo: string;
  nivel: string | null;
  criarAdvogado: boolean;
  oab: string | null;
  seccional: string | null;
  especialidades: string | null;
}

const DEFAULT_PASSWORD = process.env.FUNCIONARIOS_DEMO_PASSWORD || "Demo@123456";
const DEFAULT_SECCIONAL = (process.env.FUNCIONARIOS_DEMO_SECCIONAL || "DF").toUpperCase();

export function buildDemoFuncionarios(): DemoFuncionario[] {
  return [
    {
      name: "S\u00e1via Coimbra",
      email: "savia.coimbra.demo@escritorio.local",
      password: DEFAULT_PASSWORD,
      role: "ADMIN",
      perfilProfissional: "ADVOGADO",
      cargo: "Advogada",
      nivel: "Especialista",
      criarAdvogado: true,
      oab: "90001",
      seccional: DEFAULT_SECCIONAL,
      especialidades: "Direito Civil",
    },
    {
      name: "Paula Matos",
      email: "paula.matos.demo@escritorio.local",
      password: DEFAULT_PASSWORD,
      role: "ADMIN",
      perfilProfissional: "ADVOGADO",
      cargo: "Advogada",
      nivel: "Especialista",
      criarAdvogado: true,
      oab: "90002",
      seccional: DEFAULT_SECCIONAL,
      especialidades: "Direito Previdenciario",
    },
    {
      name: "Amanda Silva",
      email: "amanda.silva.demo@escritorio.local",
      password: DEFAULT_PASSWORD,
      role: "ADVOGADO",
      perfilProfissional: "ADVOGADO",
      cargo: "Advogada",
      nivel: null,
      criarAdvogado: true,
      oab: "90003",
      seccional: DEFAULT_SECCIONAL,
      especialidades: null,
    },
    {
      name: "Ismael",
      email: "ismael.estagio.demo@escritorio.local",
      password: DEFAULT_PASSWORD,
      role: "ASSISTENTE",
      perfilProfissional: "ESTAGIARIO_JURIDICO",
      cargo: "Estagiario Juridico",
      nivel: "Estagio",
      criarAdvogado: false,
      oab: null,
      seccional: null,
      especialidades: null,
    },
  ];
}
