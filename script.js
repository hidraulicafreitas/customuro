document.addEventListener('DOMContentLoaded', () => {
    const descricaoInput = document.getElementById('descricao');
    const valorInput = document.getElementById('valor');
    const dataVencimentoInput = document.getElementById('dataVencimento');
    const adicionarCustoBtn = document.getElementById('adicionarCusto');
    const listaCustosUl = document.getElementById('listaCustos');
    const listaAVencerUl = document.getElementById('listaAVencer');

    // NOVOS ELEMENTOS PARA OS TOTAIS
    const totalGeralCustoSpan = document.getElementById('totalGeralCusto');
    const totalAteMomentoCustoSpan = document.getElementById('totalAteMomentoCusto');
    const totalAVencerCustoSpan = document.getElementById('totalAVencerCusto');
    // NOVOS ELEMENTOS PARA RESPONSABILIDADE INDIVIDUAL
    const totalJossiasSpan = document.getElementById('totalJossias');
    const totalSilvanaSpan = document.getElementById('totalSilvana');


    const gerarPdfBtn = document.getElementById('gerarPdf');
    const graficoCustosCanvas = document.getElementById('graficoCustos');

    const historicoView = document.getElementById('historicoView');
    const aVencerView = document.getElementById('aVencerView');
    const showHistoricoBtn = document.getElementById('showHistoricoBtn');
    const showAVencerBtn = document.getElementById('showAVencerBtn');

    let custos = JSON.parse(localStorage.getItem('custosMuro')) || [];
    let chart;

    // Define a data de hoje como padrão no campo de data de vencimento
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    dataVencimentoInput.value = `${year}-${month}-${day}`;

    // Função para formatar valores em moeda BRL
    const formatCurrency = (value) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // Função auxiliar para criar um item de lista
    const createListItem = (custo, originalIndex, isUpcoming = false) => {
        const li = document.createElement('li');
        const dueDateText = new Date(custo.dataVencimento).toLocaleDateString('pt-BR');
        const launchDateText = new Date(custo.dataLancamento).toLocaleDateString('pt-BR') + ' ' + new Date(custo.dataLancamento).toLocaleTimeString('pt-BR');

        let buttonsHtml = `<button class="delete-btn" data-index="${originalIndex}">🗑️</button>`;
        if (isUpcoming) {
            buttonsHtml += ` <button class="mark-paid-btn" data-index="${originalIndex}">✅ Pago!</button>`;
        }

        li.innerHTML = `
            <div class="item-info">
                <span>${custo.descricao}</span>
                <br>
                <small>Vencimento: ${dueDateText} ${isUpcoming ? '🗓️' : ''}</small>
                <br>
                <small>Lançado em: ${launchDateText}</small>
            </div>
            <div class="item-value">${formatCurrency(custo.valor)}</div>
            <div class="item-actions">
                ${buttonsHtml}
            </div>
        `;
        return li;
    };

    // Função para renderizar os custos e atualizar os totais
    const renderCustos = () => {
        listaCustosUl.innerHTML = '';
        listaAVencerUl.innerHTML = '';
        let totalGeral = 0;
        let totalAteMomento = 0;
        let totalAVencer = 0;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // Ordena os custos pela data de vencimento para exibição nas listas
        const custosOrdenadosParaListas = [...custos].sort((a, b) => new Date(a.dataVencimento) - new Date(b.dataVencimento));

        custosOrdenadosParaListas.forEach((custo) => {
            totalGeral += custo.valor;

            const dataVencimento = new Date(custo.dataVencimento);
            dataVencimento.setHours(0, 0, 0, 0);

            const originalIndex = custos.findIndex(item =>
                item.descricao === custo.descricao &&
                item.valor === custo.valor &&
                item.dataLancamento === custo.dataLancamento &&
                item.dataVencimento === custo.dataVencimento
            );

            if (dataVencimento >= todayStart) {
                listaAVencerUl.appendChild(createListItem(custo, originalIndex, true));
                totalAVencer += custo.valor;
            } else {
                listaCustosUl.appendChild(createListItem(custo, originalIndex, false));
                totalAteMomento += custo.valor;
            }
        });

        // ATUALIZA OS SPANS COM OS NOVOS VALORES
        totalGeralCustoSpan.textContent = formatCurrency(totalGeral);
        totalAteMomentoCustoSpan.textContent = formatCurrency(totalAteMomento);
        totalAVencerCustoSpan.textContent = formatCurrency(totalAVencer);

        // CÁLCULO E ATUALIZAÇÃO DOS TOTAIS POR PESSOA
        const totalPorPessoa = totalGeral / 2;
        totalJossiasSpan.textContent = formatCurrency(totalPorPessoa);
        totalSilvanaSpan.textContent = formatCurrency(totalPorPessoa);


        updateChart();
        localStorage.setItem('custosMuro', JSON.stringify(custos));
    };

    // Função para adicionar um novo custo
    adicionarCustoBtn.addEventListener('click', () => {
        const descricao = descricaoInput.value.trim();
        const valor = parseFloat(valorInput.value);
        const dataVencimento = dataVencimentoInput.value;

        if (descricao && !isNaN(valor) && valor > 0 && dataVencimento) {
            custos.push({
                descricao: descricao,
                valor: valor,
                dataLancamento: new Date().toISOString(),
                dataVencimento: new Date(dataVencimento + 'T00:00:00').toISOString()
            });
            descricaoInput.value = '';
            valorInput.value = '';
            dataVencimentoInput.value = `${year}-${month}-${day}`;
            renderCustos();
            if (aVencerView.classList.contains('hidden')) {
                showHistorico();
            } else {
                showAVencer();
            }
        } else {
            alert('Por favor, preencha a descrição, um valor válido e a data de vencimento para o custo. 🤔');
        }
    });

    // Função para tratar cliques nos botões de deletar e marcar como pago
    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('delete-btn')) {
            const indexToDelete = parseInt(event.target.dataset.index);

            if (confirm('Tem certeza que deseja excluir este item? 😢')) {
                custos.splice(indexToDelete, 1);
                renderCustos();
                if (aVencerView.classList.contains('hidden')) {
                    showHistorico();
                } else {
                    showAVencer();
                }
            }
        } else if (event.target.classList.contains('mark-paid-btn')) {
            const indexToMarkPaid = parseInt(event.target.dataset.index);
            if (confirm('Marcar este pagamento como pago? Ele será movido para o histórico. ✅')) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                yesterday.setHours(23, 59, 59, 999);
                custos[indexToMarkPaid].dataVencimento = yesterday.toISOString();

                renderCustos();
                showHistorico();
            }
        }
    });

    // Funções para alternar entre histórico e a vencer
    const showHistorico = () => {
        historicoView.classList.remove('hidden');
        aVencerView.classList.add('hidden');
        showHistoricoBtn.classList.add('active');
        showAVencerBtn.classList.remove('active');
    };

    const showAVencer = () => {
        historicoView.classList.add('hidden');
        aVencerView.classList.remove('hidden');
        showHistoricoBtn.classList.remove('active');
        showAVencerBtn.classList.add('active');
    };

    showHistoricoBtn.addEventListener('click', showHistorico);
    showAVencerBtn.addEventListener('click', showAVencer);


    // Função para atualizar o gráfico
    const updateChart = () => {
        const custosParaGrafico = [...custos].sort((a, b) => new Date(a.dataLancamento) - new Date(b.dataLancamento));

        const datasLancamento = custosParaGrafico.map(custo => new Date(custo.dataLancamento).toLocaleDateString('pt-BR'));
        const valores = custosParaGrafico.map(custo => custo.valor);

        let acumulado = 0;
        const valoresAcumulados = valores.map(valor => {
            acumulado += valor;
            return acumulado;
        });

        if (chart) {
            chart.destroy();
        }

        const plugin = {
            id: 'customCanvasBackgroundColor',
            beforeDraw: (chartInstance, args, options) => {
                const {ctx} = chartInstance;
                ctx.save();
                ctx.globalCompositeOperation = 'destination-over';
                ctx.fillStyle = options.color || '#999';
                ctx.fillRect(0, 0, chartInstance.width, chartInstance.height);
                ctx.restore();
            }
        };

        chart = new Chart(graficoCustosCanvas, {
            type: 'line',
            data: {
                labels: datasLancamento,
                datasets: [{
                    label: 'Valor Total Investido (Acumulado)',
                    data: valoresAcumulados,
                    backgroundColor: 'rgba(75, 192, 192, 0.4)',
                    borderColor: '#4bc0c0',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: {
                            color: '#e0e0e0'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.08)'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#e0e0e0',
                            callback: function(value) {
                                return formatCurrency(value);
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.08)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#e0e0e0'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + formatCurrency(context.raw);
                            }
                        }
                    },
                    customCanvasBackgroundColor: {
                        color: 'black'
                    }
                }
            },
            plugins: [plugin]
        });
    };

    // Função para gerar PDF
    gerarPdfBtn.addEventListener('click', () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        let yPos = 20;

        doc.setFontSize(22);
        doc.setTextColor(50, 50, 200);
        doc.text("CONTROLE DE CUSTOS MURO", 105, yPos, { align: 'center' });
        yPos += 15;

        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`Relatorio Gerado em: ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR')}`, 105, yPos, { align: 'center' });
        yPos += 20;

        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);

        let totalPdf = 0;
        const now = new Date();
        now.setHours(0,0,0,0);
        const custosHistorico = custos.filter(custo => new Date(custo.dataVencimento).setHours(0,0,0,0) < now.getTime()).sort((a,b) => new Date(a.dataVencimento) - new Date(b.dataVencimento));
        const pagamentosAVencer = custos.filter(custo => new Date(custo.dataVencimento).setHours(0,0,0,0) >= now.getTime()).sort((a,b) => new Date(a.dataVencimento) - new Date(b.dataVencimento));


        if (custosHistorico.length > 0) {
            doc.text("Historico de Movimentacoes", 14, yPos);
            yPos += 10;
            doc.setFontSize(10);
            custosHistorico.forEach(custo => {
                if (yPos > 280) { doc.addPage(); yPos = 20; doc.setFontSize(10); }
                doc.text(`Vencimento: ${new Date(custo.dataVencimento).toLocaleDateString('pt-BR')} - Lancado em: ${new Date(custo.dataLancamento).toLocaleDateString('pt-BR')} - ${custo.descricao}: ${formatCurrency(custo.valor)}`, 14, yPos);
                yPos += 7;
                totalPdf += custo.valor;
            });
            yPos += 10;
        } else {
             doc.text("Historico de Movimentacoes (Nenhum item)", 14, yPos);
             yPos += 10;
        }


        if (pagamentosAVencer.length > 0) {
            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.text("Pagamentos a Vencer", 14, yPos);
            yPos += 10;
            doc.setFontSize(10);
            pagamentosAVencer.forEach(custo => {
                if (yPos > 280) { doc.addPage(); yPos = 20; doc.setFontSize(10); }
                doc.text(`Vencimento: ${new Date(custo.dataVencimento).toLocaleDateString('pt-BR')} - Lancado em: ${new Date(custo.dataLancamento).toLocaleDateString('pt-BR')} - ${custo.descricao}: ${formatCurrency(custo.valor)}`, 14, yPos);
                yPos += 7;
                totalPdf += custo.valor;
            });
            yPos += 10;
        } else {
            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.text("Pagamentos a Vencer (Nenhum item)", 14, yPos);
            yPos += 10;
        }

        // TOTAIS NO PDF
        doc.setFontSize(14);
        doc.setTextColor(0, 128, 0);
        doc.text(`Total Geral Investido: ${formatCurrency(totalPdf)}`, 14, yPos);
        yPos += 8;

        const totalHist = custosHistorico.reduce((sum, item) => sum + item.valor, 0);
        doc.text(`Total Ate o Momento: ${formatCurrency(totalHist)}`, 14, yPos);
        yPos += 8;

        const totalFut = pagamentosAVencer.reduce((sum, item) => sum + item.valor, 0);
        doc.text(`Total a Vencer: ${formatCurrency(totalFut)}`, 14, yPos);
        yPos += 8;

        // Responsabilidade individual no PDF
        const totalGeralParaDivisao = custos.reduce((sum, item) => sum + item.valor, 0);
        const totalPorPessoaPdf = totalGeralParaDivisao / 2;
        doc.text(`Jossias (50%): ${formatCurrency(totalPorPessoaPdf)}`, 14, yPos);
        yPos += 8;
        doc.text(`Silvana (50%): ${formatCurrency(totalPorPessoaPdf)}`, 14, yPos);


        doc.save('relatorio_custos_muro.pdf');
    });

    renderCustos();
    showHistorico();
});
