import { GoogleGenAI, GenerateContentResponse, Chat, Type } from "@google/genai";
import { Persona, ChatMessage, GenerateConfig } from "../types";

const getModelForPersona = (persona: Persona): string => {
  switch (persona) {
    case Persona.SmartGPT:
      return 'gemini-2.5-flash'; // Fast, smart
    case Persona.BusinessGPT:
      return 'gemini-3-pro-preview'; // Deep reasoning for business
    case Persona.EducationGPT:
      return 'gemini-3-pro-preview'; // Deep reasoning for education
    default:
      return 'gemini-2.5-flash';
  }
};

const getSystemInstruction = (persona: Persona): string => {
  const coreDirective = `
    CRITICAL INSTRUCTION: You are SmartGPT AI, an advanced intelligence integrated into the SmartGPT app and web browser.
    CAPABILITIES: You have direct access to Image Generation and Real-time Search.
    
    IMAGE GENERATION PROTOCOL:
    If the user asks for an image, the system handles it. Provide a brief creative description of the art being generated.
  `;

  const base = "You are SmartGPT AI from the SmartGPT app.";
  switch (persona) {
    case Persona.SmartGPT:
      return `${base} ${coreDirective} You are the apex of intelligence. Precise, witty, and omniscient. Your name is SmartGPT.`;
    case Persona.BusinessGPT:
      return `${base} ${coreDirective} Your name is BusinessGPT. You are a corporate strategist and market expert. Focus on ROI, market trends, and professional insights.`;
    case Persona.EducationGPT:
      return `${base} ${coreDirective} Your name is EducationGPT. You are a master educator. Explain complex topics simply and foster learning.`;
    default:
      return base + coreDirective;
  }
};

export class GeminiService {
  
  private getAi() {
    // API key must be obtained exclusively from process.env.API_KEY
    return new GoogleGenAI({ apiKey: process.env.API_KEY })
  async generateMessage(
    prompt: string,
    history: ChatMessage[],
    config: GenerateConfig,
    files?: File[]
  ): Promise<{ text: string, groundingUrls: any[] }> {
    const ai = this.getAi();
    const modelName = getModelForPersona(config.persona);
    
    const parts: any[] = [{ text: prompt }];

    // Handle file attachments (basic images)
    if (files && files.length > 0) {
      for (const file of files) {
        const base64 = await this.fileToBase64(file);
        parts.push({
          inlineData: {
            mimeType: file.type,
            data: base64
          }
        });
      }
    }

    const tools: any[] = [];
    // Add Search Grounding
    tools.push({ googleSearch: {} });

    const generationConfig: any = {
      systemInstruction: getSystemInstruction(config.persona),
      tools: tools.length > 0 ? tools : undefined,
    };

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts },
        config: generationConfig
      });

      const text = response.text || "Data stream empty.";
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const groundingUrls = groundingChunks
        .filter((c: any) => c.web?.uri)
        .map((c: any) => ({ uri: c.web.uri, title: c.web.title }));

      return { text, groundingUrls };

    } catch (error) {
      console.error("Gemini Error:", error);
      throw error; 
    }
  }

  async generateImage(prompt: string, size: '1K' | '2K' | '4K', aspectRatio: string): Promise<string> {
    const ai = this.getAi();
    const model = 'gemini-3-pro-image-preview';

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: [{ text: prompt }] },
            config: {
                imageConfig: {
                    imageSize: size,
                    aspectRatio: aspectRatio as any
                }
            }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        throw new Error("No image data returned");
    } catch (e) {
        console.error(e);
        throw e;
    }
  }

  async transcribeAudio(audioFile: File): Promise<string> {
    const ai = this.getAi();
    const base64 = await this.fileToBase64(audioFile);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { inlineData: { mimeType: audioFile.type, data: base64 } },
                { text: "Transcribe this audio exactly." }
            ]
        }
    });
    return response.text || "";
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
