const express = require("express");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const app = express();
const PORTA = 5000;
const LIMITE_HISTORICO = 20;
const historico = [];

const caminhoProjeto = path.resolve(__dirname, "..");
const caminhoScriptPython = path.join(caminhoProjeto, "ia", "classificador.py");
const pythonDoAmbienteVirtual = path.join(
  caminhoProjeto,
  ".venv",
  "Scripts",
  "python.exe"
);
const comandoPython = fs.existsSync(pythonDoAmbienteVirtual)
  ? pythonDoAmbienteVirtual
  : "python";

app.use(express.json());
app.use(express.static(path.join(caminhoProjeto, "public")));

let processoPython;
const requisicoesPython = [];

function rejeitarRequisicoesPython(mensagem) {
  while (requisicoesPython.length > 0) {
    requisicoesPython.shift().reject(new Error(mensagem));
  }
}

function iniciarClassificador() {
  if (!fs.existsSync(caminhoScriptPython)) {
    throw new Error("Script Python não encontrado.");
  }

  processoPython = spawn(comandoPython, [caminhoScriptPython], {
    stdio: ["pipe", "pipe", "pipe"]
  });

  readline.createInterface({ input: processoPython.stdout }).on("line", (linha) => {
    const requisicao = requisicoesPython.shift();
    if (!requisicao) return;

    try {
      const resultado = JSON.parse(linha);
      if (resultado.status !== "sucesso") {
        requisicao.reject(new Error(
          resultado.mensagem || "Erro ao executar o classificador Python."
        ));
      } else if (
        typeof resultado.luminosidade !== "number" ||
        typeof resultado.classificacao !== "string"
      ) {
        requisicao.reject(new Error("Resposta incompleta do classificador Python."));
      } else {
        requisicao.resolve(resultado);
      }
    } catch {
      requisicao.reject(new Error("O Python não retornou um JSON válido."));
    }
  });

  processoPython.stderr.on("data", (dados) => {
    console.error(`Python: ${dados.toString().trim()}`);
  });
  processoPython.on("error", (erro) => {
    rejeitarRequisicoesPython(
      erro.code === "ENOENT" ? "Python não encontrado." : "Erro ao iniciar o Python."
    );
  });
  processoPython.on("exit", () => {
    processoPython = undefined;
    rejeitarRequisicoesPython("O processo Python foi encerrado.");
  });
}

function executarClassificador(valor) {
  return new Promise((resolve, reject) => {
    if (!processoPython || processoPython.exitCode !== null) {
      try {
        iniciarClassificador();
      } catch (erro) {
        reject(erro);
        return;
      }
    }

    requisicoesPython.push({ resolve, reject });
    processoPython.stdin.write(`${valor}\n`, (erro) => {
      if (!erro) return;

      const indice = requisicoesPython.findIndex((item) => item.resolve === resolve);
      if (indice >= 0) requisicoesPython.splice(indice, 1);
      reject(new Error("Erro ao enviar a medição ao Python."));
    });
  });
}

app.post("/api/medicoes", async (req, res) => {
  const valor = req.body?.valor;

  if (valor === undefined || valor === null) {
    return res.status(400).json({
      status: "erro",
      mensagem: "O campo valor é obrigatório."
    });
  }

  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    return res.status(400).json({
      status: "erro",
      mensagem: "O campo valor deve ser numérico."
    });
  }

  try {
    const resultadoPython = await executarClassificador(valor);
    const medicao = {
      valor: resultadoPython.luminosidade,
      classificacao: resultadoPython.classificacao,
      horario: new Date().toISOString()
    };

    historico.unshift(medicao);
    if (historico.length > LIMITE_HISTORICO) {
      historico.pop();
    }

    return res.status(200).json({
      status: "sucesso",
      valor: medicao.valor,
      classificacao: medicao.classificacao
    });
  } catch (erro) {
    console.error(erro.message);
    return res.status(500).json({
      status: "erro",
      mensagem: erro.message
    });
  }
});

app.get("/api/medicoes", (req, res) => {
  res.status(200).json({
    atual: historico[0] || null,
    historico
  });
});

app.use((erro, req, res, next) => {
  if (erro instanceof SyntaxError && erro.status === 400 && "body" in erro) {
    return res.status(400).json({
      status: "erro",
      mensagem: "JSON inválido."
    });
  }

  console.error(erro.message);
  return res.status(500).json({
    status: "erro",
    mensagem: "Erro interno do servidor."
  });
});

iniciarClassificador();

app.listen(PORTA, () => {
  console.log(`Servidor disponível em http://localhost:${PORTA}`);
});
