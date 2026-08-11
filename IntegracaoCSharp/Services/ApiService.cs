using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using IntegracaoCSharp.Models;

namespace IntegracaoCSharp.Services;

public class ApiService : IDisposable
{
    private readonly HttpClient _httpClient;

    public ApiService(string baseUrl)
    {
        _httpClient = new HttpClient
        {
            BaseAddress = new Uri(baseUrl),
            Timeout = TimeSpan.FromSeconds(5)
        };
    }

    public async Task<RespostaMedicao?> EnviarMedicaoAsync(Medicao medicao)
    {
        try
        {
            using var resposta = await _httpClient.PostAsJsonAsync("api/medicoes", medicao);

            string conteudo = await resposta.Content.ReadAsStringAsync();

            if (resposta.StatusCode != HttpStatusCode.OK)
            {
                Console.WriteLine(
                    $"Erro HTTP {(int)resposta.StatusCode} ({resposta.ReasonPhrase}). " +
                    $"Resposta: {conteudo}");
                return null;
            }

            try
            {
                var resultado = JsonSerializer.Deserialize<RespostaMedicao>(conteudo);

                if (resultado is null || string.IsNullOrWhiteSpace(resultado.Classificacao))
                {
                    Console.WriteLine("JSON de resposta inválido ou incompleto.");
                    return null;
                }

                return resultado;
            }
            catch (JsonException ex)
            {
                Console.WriteLine($"JSON de resposta inválido: {ex.Message}");
                return null;
            }
        }
        catch (TaskCanceledException)
        {
            Console.WriteLine("Timeout ao aguardar a resposta da API.");
            return null;
        }
        catch (HttpRequestException ex)
        {
            Console.WriteLine($"Servidor indisponível ou erro de conexão: {ex.Message}");
            return null;
        }
    }

    public void Dispose()
    {
        _httpClient.Dispose();
    }
}
