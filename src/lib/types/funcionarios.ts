export interface FuncionarioPerfil {
    userId: string;
    /**
     * "Perfil" (area de atuacao) e separado do role de acesso.
     * Ex.: ADVOGADO pode ter acesso ADMIN, mas manter perfilProfissional=ADVOGADO.
     */
    perfilProfissional: string | null;
    telefone: string | null;
    celular: string | null;
    whatsapp: string | null;
    endereco: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    estado: string | null;
    cep: string | null;
    cpf: string | null;
    rg: string | null;
    dataNascimento: string | null;
    estadoCivil: string | null;
    nacionalidade: string | null;
    naturalidade: string | null;
    cargo: string | null;
    nivel: string | null;
    departamento: string | null;
    gestorDireto: string | null;
    unidade: string | null;
    matricula: string | null;
    dataAdmissao: string | null;
    dataDesligamento: string | null;
    regimeContratacao: string | null;
    turnoTrabalho: string | null;
    cargaHorariaSemanal: string | null;
    escolaridade: string | null;
    bio: string | null;
    linkedin: string | null;
    instagram: string | null;
    banco: string | null;
    agencia: string | null;
    conta: string | null;
    chavePix: string | null;
    contatoEmergenciaNome: string | null;
    contatoEmergenciaParentesco: string | null;
    contatoEmergenciaTelefone: string | null;
    pis: string | null;
    ctps: string | null;
    cnh: string | null;
    passaporte: string | null;
    idiomas: string[];
    hardSkills: string[];
    softSkills: string[];
    certificacoes: string[];
    tagsInternas: string[];
    observacoes: string | null;
    createdAt: string;
    updatedAt: string;
}
