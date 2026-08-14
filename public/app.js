const ENDPOINT_MEDICOES = "/api/medicoes";
const INTERVALO_ATUALIZACAO = 2000;

const luminosidadeAtual = document.getElementById("luminosidade-atual");
const classificacaoAtual = document.getElementById("classificacao-atual");
const ultimaAtualizacao = document.getElementById("ultima-atualizacao");
const cardStatus = document.getElementById("card-status");
const historicoCorpo = document.getElementById("historico-corpo");
const semMedicoes = document.getElementById("sem-medicoes");
const conexao = document.getElementById("conexao");
const mensagemErro = document.getElementById("mensagem-erro");
const alertaCritico = document.getElementById("alerta-critico");
const mediaMedicoes = document.getElementById("media-medicoes");
const maximoMedicoes = document.getElementById("maximo-medicoes");
const minimoMedicoes = document.getElementById("minimo-medicoes");
const tendenciaMedicoes = document.getElementById("tendencia-medicoes");
const graficoCanvas = document.getElementById("grafico-luminosidade");
const graficoSemDados = document.getElementById("grafico-sem-dados");

let graficoLuminosidade = null;

function formatarLuminosidade(valor) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(valor);
}

function formatarData(horario) {
  return new Date(horario).toLocaleString("pt-BR");
}

function formatarHorario(horario) {
  return new Date(horario).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function classeDoStatus(classificacao) {
  const classes = {
    "Baixa iluminação": "status-baixa",
    "Iluminação adequada": "status-adequada",
    "Alta luminosidade": "status-alta"
  };

  return classes[classificacao] || "status-sem-dados";
}

function atualizarStatus(medicao) {
  const classes = ["status-baixa", "status-adequada", "status-alta", "status-sem-dados"];
  cardStatus.classList.remove(...classes);

  if (!medicao) {
    luminosidadeAtual.innerHTML = "-- <small>lux</small>";
    classificacaoAtual.textContent = "Aguardando medição";
    ultimaAtualizacao.textContent = "--";
    cardStatus.classList.add("status-sem-dados");
    alertaCritico.hidden = true;
    return;
  }

  luminosidadeAtual.innerHTML = `${formatarLuminosidade(medicao.valor)} <small>lux</small>`;
  classificacaoAtual.textContent = medicao.classificacao;
  ultimaAtualizacao.textContent = formatarData(medicao.horario);
  cardStatus.classList.add(classeDoStatus(medicao.classificacao));
  alertaCritico.hidden = medicao.classificacao !== "Alta luminosidade";
}

function obterValoresValidos(historico) {
  return historico
    .map((medicao) => Number(medicao.valor))
    .filter((valor) => Number.isFinite(valor));
}

function calcularTendencia(historico) {
  const ultimasLeituras = historico.slice(0, 5).reverse();

  if (ultimasLeituras.length < 2) {
    return { texto: "Aguardando dados", classe: "tendencia-estavel" };
  }

  const meio = Math.floor(ultimasLeituras.length / 2);
  const primeiraMetade = obterValoresValidos(ultimasLeituras.slice(0, meio));
  const segundaMetade = obterValoresValidos(ultimasLeituras.slice(-meio));

  if (!primeiraMetade.length || !segundaMetade.length) {
    return { texto: "Aguardando dados", classe: "tendencia-estavel" };
  }

  const media = (valores) => valores.reduce((soma, valor) => soma + valor, 0) / valores.length;
  const mediaInicial = media(primeiraMetade);
  const mediaFinal = media(segundaMetade);
  const diferenca = mediaFinal - mediaInicial;
  const limiteEstavel = Math.max(1, Math.abs(mediaInicial) * 0.02);

  if (Math.abs(diferenca) <= limiteEstavel) {
    return { texto: "Estável →", classe: "tendencia-estavel" };
  }

  return diferenca > 0
    ? { texto: "Crescendo ↑", classe: "tendencia-crescendo" }
    : { texto: "Diminuindo ↓", classe: "tendencia-diminuindo" };
}

function atualizarEstatisticas(historico) {
  const valores = obterValoresValidos(historico);

  if (!valores.length) {
    mediaMedicoes.innerHTML = "-- <small>lux</small>";
    maximoMedicoes.innerHTML = "-- <small>lux</small>";
    minimoMedicoes.innerHTML = "-- <small>lux</small>";
  } else {
    const media = valores.reduce((soma, valor) => soma + valor, 0) / valores.length;
    mediaMedicoes.innerHTML = `${formatarLuminosidade(media)} <small>lux</small>`;
    maximoMedicoes.innerHTML = `${formatarLuminosidade(Math.max(...valores))} <small>lux</small>`;
    minimoMedicoes.innerHTML = `${formatarLuminosidade(Math.min(...valores))} <small>lux</small>`;
  }

  const tendencia = calcularTendencia(historico);
  tendenciaMedicoes.textContent = tendencia.texto;
  tendenciaMedicoes.className = `tendencia ${tendencia.classe}`;
}

function atualizarGrafico(historico) {
  const medicoesValidas = historico
    .filter((medicao) => Number.isFinite(Number(medicao.valor)) && !Number.isNaN(new Date(medicao.horario).getTime()))
    .slice()
    .reverse();

  graficoSemDados.hidden = medicoesValidas.length > 0;
  graficoCanvas.hidden = medicoesValidas.length === 0;

  if (!medicoesValidas.length || typeof Chart === "undefined") {
    return;
  }

  const rotulos = medicoesValidas.map((medicao) => formatarHorario(medicao.horario));
  const valores = medicoesValidas.map((medicao) => Number(medicao.valor));

  if (graficoLuminosidade) {
    graficoLuminosidade.stop();
    graficoLuminosidade.data.labels = rotulos;
    graficoLuminosidade.data.datasets[0].data = valores;
    graficoLuminosidade.update();
    return;
  }

  graficoLuminosidade = new Chart(graficoCanvas, {
    type: "line",
    data: {
      labels: rotulos,
      datasets: [{
        label: "Luminosidade (lux)",
        data: valores,
        borderColor: "#278049",
        backgroundColor: "rgba(39, 128, 73, 0.12)",
        borderWidth: 3,
        pointRadius: 3,
        pointHoverRadius: 5,
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 500,
        easing: "easeOutQuart"
      },
      interaction: { intersect: false, mode: "index" },
      scales: {
        x: { title: { display: true, text: "Horário" } },
        y: { beginAtZero: true, title: { display: true, text: "Luminosidade (lux)" } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function criarBadge(classificacao) {
  const badge = document.createElement("span");
  badge.className = `badge ${classeDoStatus(classificacao)}`;
  badge.textContent = classificacao;
  return badge;
}

function atualizarHistorico(historico) {
  historicoCorpo.replaceChildren();
  semMedicoes.hidden = historico.length > 0;

  historico.forEach((medicao) => {
    const linha = document.createElement("tr");
    const horario = document.createElement("td");
    const luminosidade = document.createElement("td");
    const classificacao = document.createElement("td");

    horario.textContent = formatarData(medicao.horario);
    luminosidade.textContent = `${formatarLuminosidade(medicao.valor)} lux`;
    classificacao.appendChild(criarBadge(medicao.classificacao));

    linha.append(horario, luminosidade, classificacao);
    historicoCorpo.appendChild(linha);
  });
}

async function carregarMedicoes() {
  try {
    const resposta = await fetch(ENDPOINT_MEDICOES, { cache: "no-store" });

    if (!resposta.ok) {
      throw new Error(`Erro HTTP ${resposta.status}`);
    }

    const dados = await resposta.json();

    if (!Array.isArray(dados.historico)) {
      throw new Error("Resposta inválida da API");
    }

    atualizarStatus(dados.atual);
    atualizarHistorico(dados.historico);
    atualizarEstatisticas(dados.historico);
    atualizarGrafico(dados.historico);
    conexao.textContent = "Dados atualizados";
    conexao.classList.remove("erro");
    mensagemErro.hidden = true;
  } catch (erro) {
    conexao.textContent = "Servidor indisponível";
    conexao.classList.add("erro");
    mensagemErro.textContent = "Não foi possível carregar as medições. Uma nova tentativa será feita automaticamente.";
    mensagemErro.hidden = false;
    console.error("Erro ao carregar medições:", erro);
  }
}

carregarMedicoes();
setInterval(carregarMedicoes, INTERVALO_ATUALIZACAO);
