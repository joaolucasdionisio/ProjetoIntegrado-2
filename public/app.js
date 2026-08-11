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

function formatarLuminosidade(valor) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(valor);
}

function formatarData(horario) {
  return new Date(horario).toLocaleString("pt-BR");
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
    return;
  }

  luminosidadeAtual.innerHTML = `${formatarLuminosidade(medicao.valor)} <small>lux</small>`;
  classificacaoAtual.textContent = medicao.classificacao;
  ultimaAtualizacao.textContent = formatarData(medicao.horario);
  cardStatus.classList.add(classeDoStatus(medicao.classificacao));
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
