const express = require("express");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");

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

function executarClassificador(valor) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(caminhoScriptPython)) {
      reject(new Error("Script Python não encontrado."));
      return;
    }

    execFile(
      comandoPython,
      [caminhoScriptPython, String(valor)],
      { timeout: 10000 },
      (erro, stdout) => {
        let resultado;

        try {
          resultado = JSON.parse(stdout.trim());
        } catch {
          let mensagem = "O Python não retornou um JSON válido.";

          if (erro?.code === "ENOENT") {
            mensagem = "Python não encontrado.";
          } else if (erro) {
            mensagem = "Erro ao executar o classificador Python.";
          }

          reject(
            new Error(mensagem)
          );
          return;
        }

        if (erro || resultado.status !== "sucesso") {
          reject(
            new Error(resultado.mensagem || "Erro ao executar o classificador Python.")
          );
          return;
        }

        if (
          typeof resultado.luminosidade !== "number" ||
          typeof resultado.classificacao !== "string"
        ) {
          reject(new Error("Resposta incompleta do classificador Python."));
          return;
        }

        resolve(resultado);
      }
    );
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

app.listen(PORTA, () => {
  console.log(`Servidor disponível em http://localhost:${PORTA}`);
});
