# Sistema Integrado de Monitoramento de Luminosidade

Projeto escolar desenvolvido para coletar, transmitir, classificar e exibir medições de luminosidade em tempo real.

## Integrantes

- João Lucas Dionísio
- Ryan Mizael

  Link do vídeo do Projeto:
  - https://youtu.be/Ow9x-3E58Rw?si=UdcXoYxlrlfzaKf7

## Funcionamento do sistema

O STM32 realiza a leitura analógica do sensor ou potenciômetro e converte o valor para luminosidade. A medição é enviada pela conexão USB CDC e recebida na Porta COM pela aplicação C#. Em seguida, o C# trata os dados, converte a medição para JSON e a envia por HTTP para a API Node.js.

A API encaminha o valor ao classificador em Python, armazena as medições recentes em memória e disponibiliza os resultados ao frontend. A interface consulta a API periodicamente e apresenta a leitura atual, a classificação e o histórico.

## Fluxo da aplicação

```text
STM32 -> Porta COM -> C# -> API Node.js -> Python/IA -> Frontend
```

## Módulos

- **STM32:** realiza a leitura analógica do sensor ou potenciômetro, converte o valor para uma escala de luminosidade e envia um pacote binário pela USB CDC.
- **C#:** identifica as Portas COM disponíveis, realiza a leitura contínua da porta selecionada, interpreta os pacotes, converte as medições para JSON e as envia à API por HTTP.
- **Node.js:** executa o servidor e a API responsáveis pela integração entre C#, classificador Python e frontend. Também mantém em memória as 20 medições mais recentes.
- **Python:** utiliza um modelo de Machine Learning baseado em árvore de decisão para classificar a luminosidade.
- **Frontend:** exibe os dados e as estatísticas em tempo real, com atualização automática a cada dois segundos.

## Classificações

- Baixa iluminação
- Iluminação adequada
- Alta luminosidade

## Funcionalidades

- Leitura de luminosidade;
- comunicação USB CDC e Porta COM;
- identificação e seleção da Porta COM;
- envio dos dados para a API;
- classificação automática por IA;
- exibição da leitura atual;
- histórico das medições;
- horário da última atualização;
- gráfico de luminosidade;
- média das medições;
- valor máximo e valor mínimo;
- indicação de tendência das últimas leituras;
- alerta visual para alta luminosidade.

## Tecnologias utilizadas

- STM32 e C
- C# / .NET 10
- Node.js e Express
- Python
- scikit-learn
- HTML
- CSS
- JavaScript
- Chart.js

## Estrutura do projeto

```text
ProjetoIntegrado-2/
├── stm32/              # Firmware e configuração do STM32
├── IntegracaoCSharp/   # Leitura serial e comunicação com a API
├── servidor/           # Servidor e API Node.js
├── ia/                 # Classificador de luminosidade em Python
└── public/             # Interface web
```

## Execução

### 1. STM32

Abra o projeto da pasta `stm32` no STM32CubeIDE, compile o firmware, grave-o na placa e conecte o STM32 ao computador pela USB. O dispositivo deverá ser reconhecido como uma Porta COM.

### 2. Servidor Node.js

Na raiz do projeto, instale as dependências necessárias:

```powershell
cd servidor
npm install
python -m pip install scikit-learn
```

Depois, inicie o servidor:

```powershell
npm start
```

A API e o frontend ficarão disponíveis em `http://localhost:5000`.

### 3. Aplicação C#

Com o servidor em execução e o STM32 conectado, abra outro terminal na raiz do projeto e execute:

```powershell
dotnet run --project IntegracaoCSharp/IntegracaoCSharp.csproj
```

Se houver mais de uma Porta COM disponível, selecione na aplicação aquela correspondente ao STM32.

### 4. Frontend

Acesse no navegador:

```text
http://localhost:5000
```
