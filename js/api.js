// Detecta se está rodando localmente ou na nuvem (Vercel)
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:8080/api'
  : 'https://controle-horas-backend.onrender.com/api';

const ApiService = {
  getToken() { return localStorage.getItem('jwt_token'); },
  setToken(token) { localStorage.setItem('jwt_token', token); },
  clearToken() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('usuario_logado');
  },
  getUsuarioLogado() {
    try { return JSON.parse(localStorage.getItem('usuario_logado')); }
    catch { return null; }
  },
  setUsuarioLogado(usuario) {
    localStorage.setItem('usuario_logado', JSON.stringify(usuario));
  },

  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  },

  async login(email, senha) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || 'E-mail ou senha inválidos.');
    }
    return await res.json();
  },

  async registrar(nome, email, senha, telefone) {
    const res = await fetch(`${API_BASE_URL}/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha, telefone })
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || 'Erro ao criar conta.');
    }
    return await res.json();
  },

  async obterRegistros(dataExacta = '', diaSemana = '', inicio = '', fim = '') {
    const usuario = this.getUsuarioLogado();
    const params = new URLSearchParams();

    // Filtra obrigatoriamente pelo ID do usuário logado
    if (usuario && usuario.id) {
      params.append('usuarioId', usuario.id);
    }
    if (dataExacta) params.append('dataExacta', dataExacta);
    if (diaSemana) params.append('diaSemana', diaSemana);
    if (inicio) params.append('inicio', inicio);
    if (fim) params.append('fim', fim);

    const res = await fetch(`${API_BASE_URL}/registros?${params.toString()}`, {
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Erro ao buscar registros.');
    return await res.json();
  },

  async interpretarTexto(texto, valorHora, dataReferencia) {
    const res = await fetch(`${API_BASE_URL}/registros/interpretar`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ texto, valorHora, dataReferencia })
    });
    if (!res.ok) throw new Error('Erro ao interpretar texto.');
    return await res.json();
  },

  async salvarLote(registros) {
    const usuario = this.getUsuarioLogado();
    const payload = registros.map(r => ({
      ...r,
      usuario: usuario ? { id: usuario.id } : null
    }));

    const res = await fetch(`${API_BASE_URL}/registros/salvar-lote`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Erro ao salvar lote no MySQL.');
    return await res.json();
  },

  async excluirRegistro(id) {
    const res = await fetch(`${API_BASE_URL}/registros/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Erro ao excluir registro.');
  },

  async limparHistorico() {
    const res = await fetch(`${API_BASE_URL}/registros`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Erro ao limpar histórico.');
  }
};