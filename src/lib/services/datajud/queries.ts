export const qNumeroProcesso = (numeroProcesso: string) => ({
  query: { match: { numeroProcesso } },
  size: 1,
});

export const qMovimentosJanela = (dataInicio: string, dataFim: string) => ({
  query: {
    bool: {
      filter: [{ range: { "movimentos.dataHora": { gte: dataInicio, lte: dataFim } } }],
    },
  },
  size: 100,
});
