const API_BASE_URL = 'http://localhost:8080/api/registros';

const ApiService = {
  async obterRegistros(dataExacta = '', diaSemana = '', inicio = '', fim = '') {
    const params = new URLSearchParams();
    if (dataExacta) params.append('dataExacta', dataExacta);
    if (diaSemana) params.append('diaSemana', diaSemana);
    if (inicio) params.append('inicio', inicio);
    if (fim) params.append('fim', fim);

    const res = await fetch(`${API_BASE_URL}?${params.toString()}`);
    if (!res.ok) throw new Error('Erro ao buscar registros.');
    return await res.json();
  },

  async interpretarTexto(texto, valorHora, dataReferencia) {
    const res = await fetch(`${API_BASE_URL}/interpretar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto, valorHora, dataReferencia })
    });
    if (!res.ok) throw new Error('Erro ao interpretar texto.');
    return await res.json();
  },

  async salvarLote(registros) {
    const res = await fetch(`${API_BASE_URL}/salvar-lote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registros)
    });
    if (!res.ok) throw new Error('Erro ao salvar lote no MySQL.');
    return await res.json();
  },

  async excluirRegistro(id) {
    const res = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erro ao excluir registro.');
  },

  async limparHistorico() {
    const res = await fetch(API_BASE_URL, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erro ao limpar histórico.');
  }
};