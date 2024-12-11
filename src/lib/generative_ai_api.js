// lib/generativeLanguageApi.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

function fileToGenerativePart(base64Data, mimeType) {
  return {
    inlineData: {
      data: base64Data,
      mimeType,
    },
  };
}

class GenerativeLanguageApi {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    this.baseUrl =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";
    this.genAI = new GoogleGenerativeAI(this.apiKey);
  }

  async uploadImageGenerateContent(imageBase64, mimeType, categoriasGastos = []) {
    const filePart1 = fileToGenerativePart(imageBase64, mimeType);

    const imageParts = [filePart1];

    const model = this.genAI.getGenerativeModel({
      model: "gemini-flash-latest",
    });
    const hoje = new Date().toISOString().split("T")[0];

    const categoriasText = categoriasGastos.length > 0 ? categoriasGastos.join(", ") : "Alimentação, Transporte, Saúde, Educação, Lazer, Outros";

    const prompt = `
    Você é uma IA especializada em leitura e extração de informações de cupons fiscais. Sua tarefa é analisar o texto de um cupom fiscal e retornar as informações no formato JSON especificado abaixo. Caso alguma informação não seja encontrada no cupom, insira o valor 'Nao encontrado'. Certifique-se de seguir o formato JSON fornecido:

    produtos: Uma lista de objetos contendo:

    nome: Nome do produto.
    codigo: Código do produto.
    quantidade: Quantidade adquirida.
    unidade: Unidade de medida (ex.: 'un', 'kg').
    preco_unitario: Preço unitário do produto.
    preco_total: Preço total do produto.
    data: Data da compra no formato YYYY-MM-DD.

    apelido: Um apelido ou descrição para a compra. Caso não enconttrado, "CUPOM + campo data"
    categoria: A categoria da compra que melhor se encaixa neste cupom. Dê preferência por escolher uma desta lista: ${categoriasText}.

    total: O valor total da compra.

    Se alguma informação não for encontrada, preencha com 'Nao encontrado' em campos string, 0 em campos inteiro e ${hoje} em campos data .

    Exemplo de JSON esperado:
    {
      "produtos": [
        {
          "nome": "Produto A",
          "codigo": "12345",
          "quantidade": 2,
          "unidade": "un",
          "preco_unitario": 50.0,
          "preco_total": 100.0
        },
        {
          "nome": "Produto B",
          "codigo": "67890",
          "quantidade": 1,
          "unidade": "un",
          "preco_unitario": 150.0,
          "preco_total": 150.0
        }
      ],
      "data": "2023-10-01",
      "apelido": "Compra de Outubro",
      "categoria": "Alimentação",
      "total": 250.0
    }
    Agora, analise o seguinte texto de um cupom fiscal e retorne o JSON correspondente. Sem formatação`;

    const result = await model.generateContent([prompt, ...imageParts]);

    // Processar o resultado e armazenar no cache
    const parsedResult = JSON.parse(
      result.response.text().replace("```json", "").replace("```", "")
    );

    return parsedResult;
  }
}

export default GenerativeLanguageApi;