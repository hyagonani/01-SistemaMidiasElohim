import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.VITE_GOOGLE_AI_API_KEY || process.env.GOOGLE_AI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
  try {
    const { prompt, cardId } = await req.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key não configurada." },
        { status: 500 }
      );
    }

    // Parse the style prefix if present
    const styleMatch = prompt.match(/^\[STYLE:\s*([^\]]+)\]/);
    let styleName = (cardId === 1 || cardId === 13) ? "CAPA" : "ESTILO-PESSOAL"; // defaults (Card 1 and 13 use CAPA)
    let cleanPrompt = prompt;
    
    if (styleMatch) {
      styleName = styleMatch[1].trim();
      cleanPrompt = prompt.replace(/^\[STYLE:\s*[^\]]+\]\s*/, "");
    }

    // Determine the layout reference file based on the cardId
    let layoutFileName = "CARD-MIDDLE.png";
    if (cardId === 1) {
      layoutFileName = "CARD-PRINCIPAL.png";
    } else if (cardId === 13) {
      layoutFileName = "CARD-FINAL.png";
    }

    // Load both reference images
    let backgroundReferencePart = null;
    let layoutReferencePart = null;

    try {
      const bgPath = path.join(process.cwd(), "public", "ref-cards", `${styleName}.png`);
      if (fs.existsSync(bgPath)) {
        const bgBuffer = fs.readFileSync(bgPath);
        backgroundReferencePart = {
          inlineData: {
            data: bgBuffer.toString("base64"),
            mimeType: "image/png",
          },
        };
      }
    } catch (e) {
      console.warn(`Aviso: Não foi possível carregar a imagem de estilo ${styleName}.png`);
    }

    try {
      const layoutPath = path.join(process.cwd(), "public", "ref-cards", layoutFileName);
      if (fs.existsSync(layoutPath)) {
        const layoutBuffer = fs.readFileSync(layoutPath);
        layoutReferencePart = {
          inlineData: {
            data: layoutBuffer.toString("base64"),
            mimeType: "image/png",
          },
        };
      }
    } catch (e) {
      console.warn(`Aviso: Não foi possível carregar a imagem de layout ${layoutFileName}`);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-image-preview" });

    // Instructing Gemini on how to synthesize the layout reference and artistic reference
    const synthesisInstruction = `
Você recebeu DUAS imagens de referência:
1. Imagem de Layout (A primeira imagem): É um guia absoluto de posicionamento, fontes, margens, logos, ícones e alinhamento de texto. Siga esse mapa visual com precisão de pixel.
   ATENÇÃO ABSOLUTA E CRÍTICA: Os textos escritos nesta imagem de layout são APENAS PLACEHOLDERS (como "Aqui é o segundo parágrafo...", "Here is the second paragraph..."). 
   Você NUNCA, SOB NENHUMA CIRCUNSTÂNCIA, deve copiar essas frases fictícias da referência de layout para a imagem gerada.
2. Imagem de Estilo Artístico (A segunda imagem): É o guia para a estética do fundo, estilo da arte, iluminação, roupas e cores a serem aplicadas.

Sua tarefa é renderizar a nova imagem seguindo rigorosamente o Layout da primeira imagem com o Estilo Artístico da segunda imagem.
Você deve escrever EXCLUSIVAMENTE os textos que estão explícitos nas INSTRUÇÕES DE ARTE abaixo.

INSTRUÇÃO DE ARTE:
${cleanPrompt}
`;

    // Criando as partes da mensagem (Instrução + Imagens de Referência)
    const parts: any[] = [{ text: synthesisInstruction }];
    if (layoutReferencePart) {
      parts.push(layoutReferencePart);
    }
    if (backgroundReferencePart) {
      parts.push(backgroundReferencePart);
    }

    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig: {
        // @ts-ignore
        responseModalities: ["IMAGE"],
      }
    });

    const response = await result.response;
    const imagePart = response.candidates?.[0].content.parts.find(p => p.inlineData);
    
    if (!imagePart || !imagePart.inlineData) {
      throw new Error("O Nano Banana 2 não retornou uma imagem. Verifique se o prompt e a referência são válidos.");
    }

    return NextResponse.json({ 
      image: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` 
    });

  } catch (error: any) {
    console.error("Erro na geração de imagem com referência:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao gerar imagem no Nano Banana 2." },
      { status: 500 }
    );
  }
}
