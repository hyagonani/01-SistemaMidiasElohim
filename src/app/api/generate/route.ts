import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.VITE_GOOGLE_AI_API_KEY || process.env.GOOGLE_AI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
  try {
    const { phase, monthName, monthColor, symbol, tribe, baseText, refinedTexts, cardIndex, currentPrompt, instruction } = await req.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key não configurada. Por favor, adicione GOOGLE_GENERATIVE_AI_API_KEY ao seu arquivo .env.local" },
        { status: 500 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

    // PHASE 1: Summarize and generate initial TSV structure
    if (phase === "summarize") {
      const prompt = `
Você é um redator criativo e mentor espiritual especializado em conteúdo para Instagram. 
Sua tarefa é transformar um texto bíblico técnico sobre um mês específico em um carrossel emocionante, simples e transformador.

DADOS DE ENTRADA:
- Nome do Mês: ${monthName}
- Cor do Mês: ${monthColor}
- Animal/Símbolo: ${symbol}
- Tribo do Mês: ${tribe}
- Texto Base: ${baseText}

DIRETRIZES DE LINGUAGEM:
1. Tom: Caloroso, devocional, inspirador e acolhedor.
2. Simplicidade: Evite termos teológicos complexos ou linguagem acadêmica. Se houver um conceito difícil, explique-o como se estivesse conversando com um amigo.
3. Conexão Emocional: Foque em como a mensagem do mês se aplica à vida prática e aos sentimentos do leitor. 
4. Engajamento: Use "você" e faça perguntas que provoquem reflexão.
5. Objetivo: Fazer o leitor sentir que este mês é uma oportunidade divina para ele.
6. Termos em Hebraico: Sempre que uma palavra em hebraico for utilizada, forneça obrigatoriamente o seu significado ou contexto de forma simples (ex: "Palavra (que significa X)").

TAREFA:
Resuma o 'Texto Base' e divida-o em colunas (C2 a C12). Cada card (de 2 a 12) deve ter até 3 blocos de texto curtos (T1, T2, T3). 
O Card 1 é a capa e deve ter um subtítulo que gere curiosidade ou um impacto emocional imediato.

FORMATO DE RESPOSTA (JSON):
{
  "texts": {
    "monthName": "${monthName}",
    "monthColor": "${monthColor}",
    "symbol": "${symbol}",
    "tribe": "${tribe}",
    "subheadline": "Subtítulo impactante gerado aqui",
    "cards": [
      { "id": 2, "t1": "Texto 1", "t2": "Texto 2", "t3": "Texto 3" },
      ... até o 12
    ]
  },
  "tsv": "[NOME DO MÊS]\t[COR DO MÊS]\t[ANIMAL/SIMBOLO]\t[TRIBO DO MÊS]\t[Subheadline]\tC2-T1\tC2-T2\tC2-T3\t..."
}
Retorne estritamente o JSON. No campo TSV, siga a ordem exata solicitada anteriormente.
`;
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return NextResponse.json(JSON.parse(jsonMatch![0]));
    }

    const commonRules = `
ESCOLHA DO ESTILO E SELEÇÃO DE REFERÊNCIA DE BACKGROUND (ALTAMENTE CRÍTICO):
Cada prompt gerado deve ser prefixado obrigatoriamente com a referência de estilo de background que você escolheu para o card. A IA deve decidir qual usar de acordo com o conteúdo:

- [STYLE: CAPA] (Exclusivo para o Card 1): Serve para exemplificar o uso das cores de destaque e do símbolo em uma aplicação.
- [STYLE: ESTILO-EXPLICATIVO] (Para cards explicativos): Quando o conteúdo ensina, exemplifica uma ação ou conceito (ex: mãos apontando para um mapa, ensinando, explicando caminhos).
- [STYLE: ESTILO-PESSOAL] (Para cards práticos e cotidianos): Quando o texto fala de sentimentos, oração ou situações da vida prática e pessoal do leitor (ex: alguém orando, clamando, buscando direção).
- [STYLE: ESTILO-ROUPAS-PERSONAGEM-MISTICO] (Para cards com figuras sábias ou proféticas): Quando o conteúdo foca no povo de Deus, sábios ou profetas do tempo da Bíblia em suas vestes típicas.

MAPAS DE LAYOUT E TIPOGRAFIA DE TEXTO (O gerador usará essas imagens como guia absoluto de texto):
- Card 1 (Capa): Guiado pelo layout de CARD-PRINCIPAL.png (posicionamento de título, subtítulo, logo e elementos decorativos).
- Cards 2 a 12 (Meio): Guiados pelo layout de CARD-MIDDLE.png (bloco de textos, espaçamento e alinhamento).
- Card 13 (Fim): Guiado pelo layout de CARD-FINAL.png (texto de encerramento, CTA, estrutura).

REGRAS DE FORMATAÇÃO DO PROMPT:
- Inicie todo prompt obrigatoriamente com: "[STYLE: NOME_DO_ESTILO] A masterpiece hyper-realistic cinematic photography..."
- RENDERE OS TEXTOS REAIS NA IMAGEM: O prompt deve explicitamente incluir instruções para renderizar o texto EXATO que foi gerado na Etapa 2 (enviado no JSON de dados). Por exemplo: "overlaying the scene, write the exact text in white color: 'TEXTO_AQUI_DO_JSON'".
- INTEGRACAO VISUAL E HARMONIA CROMÁTICA (MUITO CRÍTICO): Cada card deve obrigatoriamente incluir pequenos detalhes, objetos e realces sutis (cerca de 5% da imagem) usando a cor do mês "${monthColor}". Isto NÃO deve se limitar apenas a luzes: pode incluir pequenos objetos decorativos no cenário, utensílios de metal ou madeira com acabamento/detalhes na cor "${monthColor}", flores, bordados finos ou adornos em vestimentas, contornos elegantes de rochas, fios brilhantes, reflexos divinos ou relevos temáticos. O prompt DEVE descrever exatamente que elemento físico, decoração ou detalhe de luz na cor "${monthColor}" está integrado para unir visualmente todo o carrossel.
- PROIBIÇÃO DE CORES COMPLEMENTARES (CRÍTICO): NUNCA utilize combinações de cores complementares no fundo ou no cenário (evite misturar verde com vermelho, azul com laranja, roxo com amarelo). Combinações complementares de alto contraste quebram a elegância, a solenidade e o aspecto luxuoso e sagrado do carrossel. Prefira paletas análogas, monocromáticas ou tons neutros (como areia, pedra antiga, marrom escuro, tons de terra, cinza escuro ou preto) onde a cor do mês "${monthColor}" sobressaia sutilmente como o único ponto de cor focal sofisticado.
- Nunca inclua os textos das imagens de referência na nova geração. Use EXCLUSIVAMENTE os textos fornecidos no JSON.
- NUNCA use pirâmides.
- Cores de Texto: BRANCO para tudo, EXCETO o título da Capa (Card 1) e destaques do Card 13 ("Calendário Bíblico" e "Tempos e Estações"), que usam a cor "${monthColor}" (Metálico e Brilhante).
- Marca d'água (@elohim.church.oficial): Presente APENAS nos cards 2 a 12, CENTRALIZADO na parte INFERIOR. PROIBIDO no Card 1 e 13.
- Setinhas (>>>): APENAS no Card 1.
`;

    if (phase === "generate-prompts") {
      const cardsList = [
        `Card 1 (Capa): Título Principal: "${monthName}" | Subtítulo: "${refinedTexts.subheadline || ""}"`,
        ...(refinedTexts.cards || []).map((c: any) => `Card ${c.id}: Texto 1 (T1): "${c.t1 || ""}" | Texto 2 (T2): "${c.t2 || ""}" | Texto 3 (T3): "${c.t3 || ""}"`),
        `Card 13 (Fim/CTA): Texto Fixo OBRIGATÓRIO: "Quer viver os tempos de Deus?\nTodos os meses mergulhamos no\nCalendário Bíblico e nas revelações\nque Yeshua nos ensinou.\nGrupo: Tempos e Estações\nComente 'Quero aprender'\ne receba o acesso."`
      ].join("\n");

      const prompt = `
Você é um Diretor de Arte. Crie 13 prompts épicos para o Nano Banana 2.

DADOS DE ENTRADA EXATOS E INDIVIDUAIS PARA CADA CARD (Você deve usar EXCLUSIVAMENTE esses textos para cada card correspondente, nunca misture ou repita os textos entre cards):
${cardsList}

${commonRules}

ESTRUTURA ESPECÍFICA:
Card 1: Comece com o prefixo [STYLE: CAPA]. SÍMBOLO "${symbol}" em destaque monumental. Título "${monthName}" em ${monthColor} (Fonte de Luxo).
Cards 2 a 12: Texto branco, handle centralizado, fundo evolutivo.
Card 13: Comece obrigatoriamente com o prefixo [STYLE: CAPA]. SÍMBOLO "${symbol}" incorporado no cenário (como no portal/fundo). Texto FIXO (Quer viver os tempos de Deus...). Sem handle.

REQUISITO RIGOROSO DE FIDELIDADE:
Ao criar o prompt do Card X, escreva especificamente a instrução para o gerador renderizar EXATAMENTE o Texto 1 (T1), Texto 2 (T2) e Texto 3 (T3) designados para o Card X na lista acima. Nunca misture, nunca duplique e nunca troque os textos de posição.

Retorne JSON: { "prompts": [...], "tsv": "..." }`;
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return NextResponse.json(JSON.parse(jsonMatch![0]));
    }

    if (phase === "regenerate-single-prompt") {
      const cardData = refinedTexts.cards ? refinedTexts.cards[cardIndex] : refinedTexts;
      const prompt = `
Você é um Diretor de Arte. REGENERE o prompt para o Card ${cardIndex + 1}.
Mantenha o MESMO texto e layout, mas mude COMPLETAMENTE o fundo para algo ÉPICO.

DADOS DO CARD: ${JSON.stringify(cardData, null, 2)}

${commonRules}

REGRAS ESPECÍFICAS DESTA REGENERAÇÃO:
- Se for Card 1: Prefixo [STYLE: CAPA] obrigatório. Símbolo "${symbol}" DEVE estar em destaque central.
- Se for Card 13: Prefixo [STYLE: CAPA] obrigatório. Símbolo "${symbol}" DEVE estar incorporado no fundo. Texto deve ser EXATAMENTE "Quer viver os tempos de Deus?\nTodos os meses mergulhamos no\nCalendário Bíblico e nas revelações\nque Yeshua nos ensinou.\nGrupo: Tempos e Estações\nComente 'Quero aprender'\ne receba o acesso."
- Se for Card 1 ou 13: Proibido handle @elohim.church.oficial.

Retorne JSON estrito: { "prompt": "..." }`;
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return NextResponse.json(JSON.parse(jsonMatch![0]));
    }

    if (phase === "refine-prompt") {
      const prompt = `
Você é um Diretor de Arte Sênior. Sua missão é REFINAR um prompt de imagem atual com base nas instruções de alteração fornecidas pelo usuário para corrigir erros ou alterar o cenário.

PROMPT DE IMAGEM ATUAL:
"${currentPrompt}"

INSTRUÇÕES DE ALTERAÇÃO DO USUÁRIO (Siga rigorosamente):
"${instruction}"

${commonRules}

REGRAS RÍGIDAS DE REFINAMENTO:
1. Aplique a alteração solicitada no cenário/fundo (ex: remover pessoas indesejadas, alterar cores, reposicionar elementos, mudar estilo visual).
2. Preserve o mesmo prefixo de estilo original [STYLE: ...] do prompt atual (não mude a marcação entre colchetes).
3. Mantenha os textos originais e sua diagramação idêntica ao prompt atual. Mude apenas os elementos de imagem de fundo.
4. Garanta que o resultado seja altamente realista, épico, cinematográfico, 8k.

Retorne JSON estrito: { "prompt": "..." }`;
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return NextResponse.json(JSON.parse(jsonMatch![0]));
    }

    return NextResponse.json({ error: "Fase inválida" }, { status: 400 });
  } catch (error: any) {
    console.error("Erro na API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
