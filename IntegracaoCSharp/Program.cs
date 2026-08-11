using System.Globalization;
using System.IO.Ports;
using IntegracaoCSharp.Models;
using IntegracaoCSharp.Services;

const string portaPadrao = "COM3";
const string urlPadrao = "http://localhost:5000/";

string nomePorta = args.Length > 0 ? args[0] : portaPadrao;
string baseUrl = args.Length > 1 ? args[1] : urlPadrao;

try
{
    using var serialService = new SerialService(nomePorta);
    using var apiService = new ApiService(baseUrl);

    serialService.Abrir();
    Console.WriteLine($"Porta {nomePorta} aberta a 115200 baud.");
    Console.WriteLine($"API: {baseUrl}");
    Console.WriteLine("Aguardando medições. Pressione Ctrl+C para encerrar.");

    while (true)
    {
        try
        {
            string leitura = serialService.LerLinha();
            Console.WriteLine($"Leitura recebida: {leitura}");

            if (!SerialService.TentarConverterLeitura(leitura, out double valor))
            {
                Console.WriteLine("Leitura inválida. O dado não será enviado.");
                continue;
            }

            Medicao medicao = new Medicao { Valor = valor };
            Console.WriteLine(
                $"Valor enviado: {medicao.Valor.ToString(CultureInfo.InvariantCulture)}");

            RespostaMedicao? resposta = await apiService.EnviarMedicaoAsync(medicao);

            if (resposta is not null)
            {
                Console.WriteLine($"Classificação retornada: {resposta.Classificacao}");
            }
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
