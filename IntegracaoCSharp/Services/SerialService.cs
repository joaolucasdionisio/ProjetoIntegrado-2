using System.Globalization;
using System.IO.Ports;

namespace IntegracaoCSharp.Services;

public class SerialService : IDisposable
{
    private readonly SerialPort _portaSerial;

    public SerialService(string nomePorta)
    {
        _portaSerial = new SerialPort(nomePorta, 115200)
        {
            NewLine = "\n",
            ReadTimeout = 2000
        };
    }

    public void Abrir()
    {
        string[] portasDisponiveis = SerialPort.GetPortNames();

        if (!portasDisponiveis.Contains(_portaSerial.PortName,
                StringComparer.OrdinalIgnoreCase))
        {
            string lista = portasDisponiveis.Length == 0
                ? "nenhuma"
                : string.Join(", ", portasDisponiveis);

            throw new InvalidOperationException(
                $"A porta {_portaSerial.PortName} não existe. Portas disponíveis: {lista}.");
        }

        _portaSerial.Open();
    }

    public string LerLinha()
    {
        return _portaSerial.ReadLine().Trim();
    }

    public static bool TentarConverterLeitura(string leitura, out double valor)
    {
        return double.TryParse(
            leitura,
            NumberStyles.Float,
            CultureInfo.InvariantCulture,
            out valor)
            && double.IsFinite(valor);
    }

    public void Dispose()
    {
        if (_portaSerial.IsOpen)
        {
            _portaSerial.Close();
        }

        _portaSerial.Dispose();
    }
}
