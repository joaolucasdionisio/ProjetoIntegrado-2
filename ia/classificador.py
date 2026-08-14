import sys
import json
from sklearn.tree import DecisionTreeClassifier

x = [
    [0.0], [12.5], [25.0], [40.0], [55.5], [78.0], [100.0], [120.4], [145.0], [170.0],
    [195.2], [220.0], [245.0], [270.8], [295.0],
    [305.0], [325.0], [350.0], [380.0], [410.5], [440.0], [475.0], [500.0], [530.2], [565.0],
    [600.0], [630.0], [655.8], [680.0], [695.0],
    [710.0], [730.0], [755.0], [780.0], [805.5], [830.0], [855.0], [880.0], [900.0], [925.2],
    [945.0], [965.0], [980.0], [990.5], [1000.0]
]

y = [
    "Baixa iluminação", "Baixa iluminação", "Baixa iluminação", "Baixa iluminação", "Baixa iluminação",
    "Baixa iluminação", "Baixa iluminação", "Baixa iluminação", "Baixa iluminação", "Baixa iluminação",
    "Baixa iluminação", "Baixa iluminação", "Baixa iluminação", "Baixa iluminação", "Baixa iluminação",

    "Iluminação adequada", "Iluminação adequada", "Iluminação adequada", "Iluminação adequada", "Iluminação adequada",
    "Iluminação adequada", "Iluminação adequada", "Iluminação adequada", "Iluminação adequada", "Iluminação adequada",
    "Iluminação adequada", "Iluminação adequada", "Iluminação adequada", "Iluminação adequada", "Iluminação adequada",

    "Alta luminosidade", "Alta luminosidade", "Alta luminosidade", "Alta luminosidade", "Alta luminosidade",
    "Alta luminosidade", "Alta luminosidade", "Alta luminosidade", "Alta luminosidade", "Alta luminosidade",
    "Alta luminosidade", "Alta luminosidade", "Alta luminosidade", "Alta luminosidade", "Alta luminosidade"
]

classificador = DecisionTreeClassifier()
classificador.fit(x, y)

def classificar(valor_texto):
    try:
        valor_lux = float(valor_texto)
    except (TypeError, ValueError):
        return {"status": "erro", "mensagem": "O valor informado deve ser numérico"}

    predicao = classificador.predict([[valor_lux]])[0]
    return {
        "status": "sucesso",
        "luminosidade": valor_lux,
        "classificacao": predicao
    }


if len(sys.argv) >= 2:
    print(json.dumps(classificar(sys.argv[1])), flush=True)
else:
    # Uma medição por linha; imports e modelo permanecem carregados.
    for linha in sys.stdin:
        print(json.dumps(classificar(linha.strip())), flush=True)
