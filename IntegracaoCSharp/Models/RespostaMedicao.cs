using System.Text.Json.Serialization;

namespace IntegracaoCSharp.Models;

public class RespostaMedicao
{
    [JsonPropertyName("valor")]
    public double Valor { get; set; }

    [JsonPropertyName("classificacao")]
    public string? Classificacao { get; set; }
}
