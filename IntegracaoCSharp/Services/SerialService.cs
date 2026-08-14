using System.IO.Ports;

namespace IntegracaoCSharp.Services;

public class SerialService : IDisposable
{
    private readonly SerialPort _portaSerial;

    public SerialService(string nomePorta)
    {
        _portaSerial = new SerialPort(nomePorta, 115200)
        {
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

    public (byte[] Bytes, double Luminosidade, bool FiltroLigado) LerPacote()
    {
        while (true)
        {
            int inicio = _portaSerial.ReadByte();

            if (inicio != 0xAA)
            {
                continue;
            }

            byte[] pacote = new byte[5];
            pacote[0] = (byte)inicio;

            for (int i = 1; i < pacote.Length; i++)
            {
                pacote[i] = (byte)_portaSerial.ReadByte();
            }

            if (pacote[4] != 0x55 || (pacote[3] != 0x00 && pacote[3] != 0x01))
            {
                continue;
            }

            int valorInteiro = (pacote[1] << 8) | pacote[2];
            double luminosidade = valorInteiro / 10.0;
            bool filtroLigado = pacote[3] == 0x01;

            return (pacote, luminosidade, filtroLigado);
        }
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
