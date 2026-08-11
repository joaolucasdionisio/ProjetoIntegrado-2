using System.Text.Json.Serialization;

namespace IntegracaoCSharp.Models;

public class Medicao
{
    [JsonPropertyName("valor")]
    public double Valor { get; set; }
}
