(() => {
  const $ = id => document.getElementById(id);
  
  let pendingRecords = [];
  let records = [];

  function money(value) {
    return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function duration(mins) {
    const h = Math.floor((mins || 0) / 60), m = (mins || 0) % 60;
    return `${h}h ${String(m).padStart(2, '0')}min`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function renderBadge(modalidade) {
    if (modalidade === 'PRODUCAO') return '<span class="badge-mod badge-prod">Por Peça</span>';
    if (modalidade === 'BONUS') return '<span class="badge-mod badge-bonus">Bônus Extra</span>';
    return '<span class="badge-mod badge-hora">Por Hora</span>';
  }

  function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.add('hidden'), 3000);
  }

  // --- NAVEGAÇÃO DE TELA E AUTENTICAÇÃO ---
  function verificarAutenticacao() {
    const usuario = ApiService.getUsuarioLogado();

    if (usuario) {
      $('authScreen').classList.add('hidden');
      $('appScreen').classList.remove('hidden');$('userInfoDisplay').innerHTML = `👤 <strong>${escapeHtml(usuario.nome)}</strong>`;
      carregarHistorico();
    } else {
      $('appScreen').classList.add('hidden');$('authScreen').classList.remove('hidden');
    }
  }

  $('logoutBtn').addEventListener('click', () => {
    ApiService.clearToken();
    verificarAutenticacao();
    showToast('Sua sessão foi encerrada.');
  });

  $('switchToRegister').addEventListener('click', () => {
    $('loginForm').classList.add('hidden');$('registerForm').classList.remove('hidden');
  });

  $('switchToLogin').addEventListener('click', () => {
    $('registerForm').classList.add('hidden');$('loginForm').classList.remove('hidden');
  });

  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = await ApiService.login($('loginEmail').value, $('loginSenha').value);
      ApiService.setToken(data.token);
      ApiService.setUsuarioLogado(data.usuario);
      verificarAutenticacao();
      showToast(`Bem-vindo, ${data.usuario.nome}!`);
    } catch (err) {
      showToast(`⚠️ ${err.message}`);
    }
  });

  $('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await ApiService.registrar($('regNome').value, $('regEmail').value, $('regSenha').value, $('regTelefone').value);
      showToast('Conta criada com sucesso! Faça login.');
      $('switchToLogin').click();
    } catch (err) {
      showToast(`⚠️ ${err.message}`);
    }
  });

  // --- CARREGAR E RENDERIZAR REGISTROS DO USUÁRIO ---
  async function carregarHistorico() {
    try {
      records = await ApiService.obterRegistros(
        $('filtroDataExacta').value,
        $('filtroDiaSemana').value,
        $('filtroInicio').value,
        $('filtroFim').value
      );
      renderHistory();
    } catch (err) {
      showToast('⚠️ Erro ao buscar registros.');
    }
  }

  function renderSummary() {
    const totalMins = records.reduce((sum, r) => sum + (r.totalMinutos || 0), 0);
    const totalPayVal = records.reduce((sum, r) => sum + parseFloat(r.valorTotal || 0), 0);

    $('totalHours').textContent = duration(totalMins);
    $('totalPay').textContent = money(totalPayVal);$('totalDays').textContent = records.length;
  }

  function renderPreview(parsedRecords) {
    pendingRecords = parsedRecords;
    $('previewPanel').classList.remove('hidden');

    if (!pendingRecords.length) {
      $('previewRows').innerHTML = '<tr><td colspan="6">Nenhum registro válido identificado.</td></tr>';
      $('saveBtn').disabled = true;
      $('previewHours').textContent = duration(0);
      $('previewPay').textContent = money(0); } else {$('saveBtn').disabled = false;
      $('previewRows').innerHTML = pendingRecords.map(r => `
        <tr>
          <td>
            <span class="day-label">${escapeHtml(r.diaSemana)}</span>
            ${r.dataConcreta ? `<span class="subtext">${r.dataConcreta.split('-').reverse().join('/')}</span>` : ''}
          </td>
          <td>${renderBadge(r.modalidade)}</td>
          <td>${r.horaEntrada ? `${r.horaEntrada}–${r.horaSaida}` : (r.quantidadePecas ? `${r.quantidadePecas} un` : 'Bônus')}</td>
          <td class="duration">${r.tempoFormatado}</td>
          <td class="money">${money(r.valorTotal)}</td>
          <td>${r.observacao ? `<span class="subtext">${escapeHtml(r.observacao)}</span>` : '<span class="subtext">—</span>'}</td>
        </tr>
      `).join('');

      const totalMins = pendingRecords.reduce((sum, r) => sum + (r.totalMinutos || 0), 0);
      const totalPayVal = pendingRecords.reduce((sum, r) => sum + (r.valorTotal || 0), 0);

      $('previewHours').textContent = duration(totalMins);$('previewPay').textContent = money(totalPayVal);
    }
    
    $('previewPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderHistory() {
    const query = ($('searchInput').value || '').toLowerCase().trim();
    const filtered = records.filter(r => 
      [r.diaSemana, r.dataConcreta || '', r.observacao || '', r.modalidade || ''].join(' ').toLowerCase().includes(query)
    );

    $('historyEmpty').classList.toggle('hidden', filtered.length > 0);$('historyTableWrap').classList.toggle('hidden', filtered.length === 0);

    $('historyRows').innerHTML = filtered.map(r => `
      <tr>
        <td>#${r.id}</td>
        <td>
          <span class="day-label">${escapeHtml(r.diaSemana)}</span>
          ${r.dataConcreta ? `<span class="subtext">${r.dataConcreta.split('-').reverse().join('/')}</span>` : ''}
        </td>
        <td>${renderBadge(r.modalidade)}</td>
        <td>${r.horaEntrada ? `${r.horaEntrada}–${r.horaSaida}` : (r.quantidadePecas ? `${r.quantidadePecas} un a${money(r.valorUnitarioPeca)}` : 'Valor extra')}</td>
        <td class="duration">${r.tempoFormatado || '0h 00min'}</td>
        <td class="money">${money(parseFloat(r.valorTotal || 0))}</td>
        <td>${r.observacao ? `<span class="subtext">${escapeHtml(r.observacao)}</span>` : '<span class="subtext">—</span>'}</td>
        <td>
          <button class="btn btn-danger-quiet btn-small" onclick="excluirReg(${r.id})">Excluir</button>
        </td>
      </tr>
    `).join('');

    renderSummary();
  }

  window.excluirReg = async (id) => {
    if (confirm(`Deseja excluir o registro #${id}?`)) {
      try {
        await ApiService.excluirRegistro(id);
        await carregarHistorico();
        showToast('Registro excluído.');
      } catch (err) {
        showToast('Erro ao excluir registro.');
      }
    }
  };

  // Event Listeners
  $('analyzeBtn').addEventListener('click', async () => {
    const texto = $('messageInput').value.trim();
    if (!texto) { showToast('Cole a mensagem primeiro.'); return; }
    try {
      const parsed = await ApiService.interpretarTexto(texto, Number($('defaultRate').value),$('weekDate').value);
      renderPreview(parsed);
    } catch (err) {
      showToast('Erro ao interpretar mensagem.');
    }
  });

  $('clearInputBtn').addEventListener('click', () => {
    $('messageInput').value = '';$('previewPanel').classList.add('hidden');
  });

  $('cancelPreviewBtn').addEventListener('click', () =>$('previewPanel').classList.add('hidden'));

  $('saveBtn').addEventListener('click', async () => {
    if (!pendingRecords.length) return;
    try {
      await ApiService.salvarLote(pendingRecords);
      $('previewPanel').classList.add('hidden');
      await carregarHistorico();
      showToast(`${pendingRecords.length} registro(s) salvo(s)!`);
    } catch (err) {
      showToast('Erro ao gravar registros.');
    }
  });

  $('btnFiltrarPeriodo').addEventListener('click', carregarHistorico);

  $('btnLimparFiltroPeriodo').addEventListener('click', () => {
    $('filtroDataExacta').value = '';$('filtroDiaSemana').value = '';
    $('filtroInicio').value = '';$('filtroFim').value = '';
    carregarHistorico();
  });

  $('searchInput').addEventListener('input', renderHistory);

  $('clearHistoryBtn').addEventListener('click', async () => {
    if (!records.length) return;
    if (!confirm('Deseja apagar os registros desta conta?')) return;
    try {
      await ApiService.limparHistorico();
      await carregarHistorico();
      showToast('Histórico limpo.');
    } catch (err) {
      showToast('Erro ao limpar histórico.');
    }
  });

  // Inicialização
  verificarAutenticacao();
})();