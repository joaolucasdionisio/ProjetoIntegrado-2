using System.Globalization;
using System.IO.Ports;
using System.Threading.Channels;
using IntegracaoCSharp.Models;
using IntegracaoCSharp.Services;

const string urlPadrao = "http://localhost:5000/";

string[] portasDisponiveis = SerialPort.GetPortNames();

if (portasDisponiveis.Length == 0)
{
    Console.WriteLine("Nenhuma Porta COM encontrada.");
    return;
}

Array.Sort(portasDisponiveis, StringComparer.OrdinalIgnoreCase);

string nomePorta;

if (portasDisponiveis.Length == 1)
{
    nomePorta = portasDisponiveis[0];
    Console.WriteLine($"Portas encontradas: {nomePorta}");
    Console.WriteLine($"Porta selecionada automaticamente: {nomePorta}");
}
else
{
    Console.WriteLine("Portas disponíveis:");

    for (int i = 0; i < portasDisponiveis.Length; i++)
    {
        Console.WriteLine($"{i + 1} - {portasDisponiveis[i]}");
    }

    while (true)
    {
        Console.Write("Selecione a porta: ");
        string? entrada = Console.ReadLine();

        if (int.TryParse(entrada, out int opcao)
            && opcao >= 1
            && opcao <= portasDisponiveis.Length)
        {
            nomePorta = portasDisponiveis[opcao - 1];
            Console.WriteLine($"Porta selecionada: {nomePorta}");
            break;
        }

        Console.WriteLine("Seleção inválida. Digite o número de uma porta disponível.");
    }
}

string baseUrl = args.Length > 1 ? args[1] : urlPadrao;

try
{
    using var serialService = new SerialService(nomePorta);
    using var apiService = new ApiService(baseUrl);

    serialService.Abrir();
    Console.WriteLine($"Porta {nomePorta} aberta a 115200 baud.");
    Console.WriteLine($"API: {baseUrl}");
    var medicoesPendentes = Channel.CreateBounded<Medicao>(
        new BoundedChannelOptions(1)
        {
            SingleReader = true,
            SingleWriter = true,
            FullMode = BoundedChannelFullMode.DropOldest
        });

    _ = Task.Run(async () =>
    {
        await foreach (Medicao medicao in medicoesPendentes.Reader.ReadAllAsync())
        {
            Console.WriteLine(
                $"Valor enviado: {medicao.Valor.ToString(CultureInfo.InvariantCulture)}");
            RespostaMedicao? resposta = await apiService.EnviarMedicaoAsync(medicao);
            if (resposta is not null)
            {
                Console.WriteLine($"Classificação retornada: {resposta.Classificacao}");
            }
        }
    });
    Console.WriteLine("Aguardando medições. Pressione Ctrl+C para encerrar.");

    while (true)
    {
        try
        {
            var pacote = serialService.LerPacote();
            string bytesHexadecimais = string.Join(" ",
                pacote.Bytes.Select(valor => valor.ToString("X2")));

            Console.WriteLine($"Pacote: {bytesHexadecimais}");
            Console.WriteLine(
                $"Leitura recebida: {pacote.Luminosidade.ToString("F1", CultureInfo.InvariantCulture)} lux");
            Console.WriteLine($"Filtro: {(pacote.FiltroLigado ? "ligado" : "desligado")}");

            Medicao medicao = new Medicao { Valor = pacote.Luminosidade };
            medicoesPendentes.Writer.TryWrite(medicao);
        }
        catch (TimeoutException)
        {
            Console.WriteLine("Timeout: nenhuma leitura recebida da porta serial.");
        }
        catch (IOException ex)
        {
            Console.WriteLine($"STM32 desconectado ou erro de comunicação: {ex.Message}");
            break;
        }
        catch (InvalidOperationException ex)
        {
            Console.WriteLine($"A porta serial foi desconectada ou fechada: {ex.Message}");
            break;
        }
    }
}
catch (UnauthorizedAccessException ex)
{
    Console.WriteLine($"Não foi possível abrir {nomePorta}. Acesso negado: {ex.Message}");
}
catch (InvalidOperationException ex)
{
    Console.WriteLine(ex.Message);
}
catch (IOException ex)
{
    Console.WriteLine($"Erro ao abrir a porta {nomePorta}: {ex.Message}");
}
catch (ArgumentException ex)
{
    Console.WriteLine($"Configuração inválida da porta serial: {ex.Message}");
}
catch (UriFormatException ex)
{
    Console.WriteLine($"URL da API inválida: {ex.Message}");
}
