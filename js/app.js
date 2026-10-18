(() => {
  const $ = id => document.getElementById(id);
  
  let pendingRecords = [];
  let records = [];

  function money(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function duration(mins) {
    const h = Math.floor(mins / 60), m = mins % 60;
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

  async function carregarHistorico() {
    const dataExacta = $('filtroDataExacta').value;
    const diaSemana = $('filtroDiaSemana').value;
    const inicio = $('filtroInicio').value;
    const fim = $('filtroFim').value;

    try {
      records = await ApiService.obterRegistros(dataExacta, diaSemana, inicio, fim);
      renderHistory();
    } catch (err) {
      showToast('⚠️ Erro ao conectar com o servidor Java.');
    }
  }

  $('btnFiltrarPeriodo').addEventListener('click', carregarHistorico);

  $('btnLimparFiltroPeriodo').addEventListener('click', () => {
    $('filtroDataExacta').value = '';$('filtroDiaSemana').value = '';
    $('filtroInicio').value = '';$('filtroFim').value = '';
    carregarHistorico();
  });

  // Mensagem de exemplo pronta com datas escritas no próprio texto
  $('messageInput').value = `Terça 15/10/2026

15:50h às 22:45h
*20 minutos janta*

Quarta 16/10/2026

50 peças a R$ 2,50

Quinta (17/10)

8:20h às 17:50h
*1h de almoço*`;

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
      $('previewRows').innerHTML = '<tr><td colspan="6">Nenhum registro válido identificado para revisão.</td></tr>';
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
    if (confirm(`Deseja excluir o registro #${id} da base de dados?`)) {
      try {
        await ApiService.excluirRegistro(id);
        await carregarHistorico();
        showToast('Registro excluído do MySQL.');
      } catch (err) {
        showToast('Erro ao excluir registro.');
      }
    }
  };

  // Event Listeners
  $('analyzeBtn').addEventListener('click', async () => {
    const texto = $('messageInput').value.trim();
    const valorHora = Number($('defaultRate').value);
    const dataRef = $('weekDate').value;

    if (!texto) { showToast('Cole a mensagem do WhatsApp primeiro.'); return; }

    try {
      const parsed = await ApiService.interpretarTexto(texto, valorHora, dataRef);
      renderPreview(parsed);
      showToast('Mensagem interpretada com sucesso!');
    } catch (err) {
      showToast('Erro ao interpretar mensagem no servidor.');
    }
  });

  $('clearInputBtn').addEventListener('click', () => {
    $('messageInput').value = '';$('previewPanel').classList.add('hidden');
  });

  $('cancelPreviewBtn').addEventListener('click', () => {$('previewPanel').classList.add('hidden');
  });

  $('saveBtn').addEventListener('click', async () => {
    if (!pendingRecords.length) return;
    try {
      await ApiService.salvarLote(pendingRecords);
      $('previewPanel').classList.add('hidden');
      await carregarHistorico();
      showToast(`${pendingRecords.length} registro(s) salvo(s) no MySQL!`);
    } catch (err) {
      showToast('Erro ao gravar registros no banco de dados.');
    }
  });

  $('btnFiltrarPeriodo').addEventListener('click', carregarHistorico);

  $('btnLimparFiltroPeriodo').addEventListener('click', () => {
    $('filtroInicio').value = '';$('filtroFim').value = '';
    carregarHistorico();
  });

  $('searchInput').addEventListener('input', renderHistory);

  $('clearHistoryBtn').addEventListener('click', async () => {
    if (!records.length) { showToast('O histórico já está vazio.'); return; }
    if (!confirm('Tem certeza que deseja apagar TODOS os registros do MySQL?')) return;
    try {
      await ApiService.limparHistorico();
      await carregarHistorico();
      showToast('Histórico limpo do MySQL.');
    } catch (err) {
      showToast('Erro ao limpar histórico.');
    }
  });

  $('exportBtn').addEventListener('click', () => {
    if (!records.length) { showToast('Não há registros para exportar.'); return; }
    const header = ['ID', 'Dia', 'Data', 'Modalidade', 'Entrada', 'Saida', 'Pecas', 'Bonus', 'Horas_liquidas', 'Valor_total', 'Observacoes'];
    const rows = records.map(r => [
      r.id, r.diaSemana, r.dataConcreta || '', r.modalidade || '', r.horaEntrada || '', r.horaSaida || '',
      r.quantidadePecas || 0, r.valorBonus || 0, r.tempoFormatado || '', r.valorTotal, r.observacao || ''
    ]);
    
    const csv = [header, ...rows].map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'controle-de-horas-periodo.csv'; a.click(); URL.revokeObjectURL(url);
  });

  // Exemplo preenchido com Horas, Peças e Bônus
  $('messageInput').value = `Terça

15:50h às 22:45h
*20 minutos janta*

Quarta

50 peças a R$ 2,50

Quinta

Bônus R$ 50,00 extra de produção`;

  carregarHistorico();
})();