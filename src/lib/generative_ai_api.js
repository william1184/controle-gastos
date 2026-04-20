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

  async uploadImageGenerateContent(imageBase64, mimeType, categoriasSaidas = []) {
    const filePart1 = fileToGenerativePart(imageBase64, mimeType);

    const imageParts = [filePart1];

    const model = this.genAI.getGenerativeModel({
      model: "gemini-flash-latest",
    });
    const hoje = new Date().toISOString().split("T")[0];

    const categoriasText = categoriasSaidas.length > 0 ? categoriasSaidas.join(", ") : "Alimentação, Transporte, Saúde, Educação, Lazer, Outros";

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

  async suggestCategories(saidas, categoriasSaidas = []) {
    const model = this.genAI.getGenerativeModel({
      model: "gemini-flash-latest",
    });

    if (categoriasSaidas.length === 0) {
      throw new Error("Lista de categorias vazia.");
    }

    const categoriasText = categoriasSaidas.join(", ");

    const prompt = `
    Você é um assistente financeiro especialista em organizar finanças pessoais e empresariais.
    Sua tarefa é analisar uma lista de despesas e sugerir a categoria e o tipo de custo mais adequados para cada uma.
    Categorias disponíveis: ${categoriasText}.
    Tipos de custo: 'Fixo' (saidas recorrentes e previsíveis como aluguel, internet, seguros) ou 'Variável' (saidas que oscilam como lazer, alimentação fora, compras impulsivas).

    Analise a lista fornecida em formato JSON e sugira:
    1. A categoria mais adequada (usando estritamente a lista de categorias disponíveis).
    2. O tipo de custo (Fixo ou Variável).

    Recomende alteração se os dados atuais parecerem incorretos, não fizerem sentido para a descrição, estiverem vazios ou forem 'Outros'/'Variável' de forma genérica.
    
    Retorne APENAS um array JSON válido, sem formatação Markdown (sem \`\`\`json), no seguinte formato:
    [
      { 
        "index": 0, 
        "categoria_sugerida": "NomeDaCategoria", 
        "tipo_custo_sugerido": "Fixo" | "Variável",
        "motivo": "Breve justificativa" 
      }
    ]
    Se não houver sugestões pertinentes, retorne um array vazio [].
    
    Despesas:
    ${JSON.stringify(saidas.map((g, i) => ({ index: i, apelido: g.apelido, categoria_atual: g.categoria, tipo_custo_atual: g.tipoCusto, total: g.total })))}
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json/gi, "").replace(/```/g, "").trim();

    return JSON.parse(text);
  }

  async suggestCategoriesEntradas(entradas, categoriasEntradas = []) {
    const model = this.genAI.getGenerativeModel({
      model: "gemini-flash-latest",
    });

    const categoriasText = categoriasEntradas.length > 0 ? categoriasEntradas.join(", ") : "Salário, Freelance, Investimentos, Rendimentos, Outros";

    const prompt = `
    Você é um assistente financeiro especialista em categorizar entradas e ganhos.
    Eu tenho uma lista de entradas e as seguintes categorias disponíveis: ${categoriasText}.
    Analise a lista de entradas fornecida em formato JSON e sugira a categoria mais adequada para cada uma, usando estritamente a lista de categorias disponíveis. Recomende alteração se a categoria atual parecer incorreta, não fizer sentido para a descrição, estiver vazia ou for 'Outros'.
    Retorne APENAS um array JSON válido, sem formatação Markdown (sem \`\`\`json), no seguinte formato:
    [
      { "index": 0, "categoria_sugerida": "NomeDaCategoria", "motivo": "Breve justificativa para a mudança" }
    ]
    Se não houver sugestões pertinentes (ou seja, se todas as categorias atuais parecerem corretas), retorne um array vazio [].
    Entradas:
    ${JSON.stringify(entradas.map((r, i) => ({ index: i, descricao: r.descricao, categoria_atual: r.categoria, valor: r.valor })))}
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json/gi, "").replace(/```/g, "").trim();

    return JSON.parse(text);
  }

  async getBudgetInsights(resumoOrcamento) {
    const model = this.genAI.getGenerativeModel({
      model: "gemini-flash-latest",
    });

    let usuariosInfo = "";
    if (resumoOrcamento.usuarios && resumoOrcamento.usuarios.length > 0) {
      usuariosInfo = "Usuários da Família/Casa:\n" + resumoOrcamento.usuarios.map(u => `- Nome: ${u.nome}, Entrada: R$ ${u.entrada}, Data de Nascimento: ${u.dataNascimento}`).join("\n") + "\nConsidere esses usuários (idade, entrada individual, momento de vida) ao fornecer dicas altamente direcionadas para a realidade da família.\n";
    }

    const prompt = `
    Você é um consultor financeiro pessoal super inteligente. Analise o seguinte resumo financeiro e forneça insights acionáveis, claros e objetivos para ajudar o usuário a melhorar sua saúde financeira.

    ${usuariosInfo}
    Resumo do período (${resumoOrcamento.periodo}):
    - Total de Entradas: R$ ${resumoOrcamento.totalEntradas}
    - Total de Saidas: R$ ${resumoOrcamento.totalSaidas}
    - Saldo: R$ ${resumoOrcamento.saldo}
    - Despesas Fixas: R$ ${resumoOrcamento.despesasFixas}
    - Despesas Variáveis: R$ ${resumoOrcamento.despesasVariaveis}

    Saidas por Categoria:
    ${JSON.stringify(resumoOrcamento.saidasPorCategoria)}

    Entradas por Categoria:
    ${JSON.stringify(resumoOrcamento.entradasPorCategoria)}

    Por favor, forneça dicas com:
    - Avaliação geral do saldo.
    - Alertas sobre categorias onde os saidas parecem altos.
    - Dicas práticas de onde reduzir (especialmente em despesas variáveis).
    - Evite formatação complexa em Markdown, utilize apenas texto simples com emojis, quebras de linha e tópicos.
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  async suggestBudgetLimits(historicoSaidas, categorias) {
    const model = this.genAI.getGenerativeModel({
      model: "gemini-flash-latest",
    });

    const prompt = `
    Você é um assistente financeiro inteligente. Com base no histórico de saidas dos últimos meses, sugira limites de orçamento realistas para o próximo mês.
    
    Categorias e histórico (Média de saidas):
    ${JSON.stringify(historicoSaidas)}

    Considere:
    1. Se o saida é recorrente.
    2. Se houve picos incomuns.
    3. Tente sugerir um limite que incentive a economia (ex: 90% da média se for variável, 100% se for fixo).

    Retorne APENAS um objeto JSON onde a chave é o ID da categoria e o valor é o limite sugerido.
    Exemplo: { "1": 500.0, "2": 1200.0 }
    
    Não inclua explicações, apenas o JSON.
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json/gi, "").replace(/```/g, "").trim();

    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Erro ao processar sugestão da IA:", e);
      return {};
    }
  }
}

export default GenerativeLanguageApi;