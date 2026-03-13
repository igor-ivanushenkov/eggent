import { embed, embedMany } from "ai";
import { createEmbeddingModel } from "@/lib/providers/llm-provider";
import fs from "fs/promises";
import type { AppSettings } from "@/lib/types";

export interface ContentToEmbed {
  text?: string;
  file?: {
    path: string;
    mimeType: string;
  };
}

/**
 * Generate embeddings for an array of texts (Legacy / Text-only fallback)
 */
export async function embedTexts(
  texts: string[],
  config: AppSettings["embeddingsModel"]
): Promise<number[][]> {
  const contents = texts.map((text) => ({ text }));
  return embedContent(contents, config);
}

/**
 * Generate embeddings for an array of mixed content (Text and/or Files)
 */
export async function embedContent(
  contents: ContentToEmbed[],
  config: AppSettings["embeddingsModel"]
): Promise<number[][]> {
  try {
    // Mock mode for testing without API keys
    if (config.provider === "mock") {
      const dim = config.dimensions || 1536;
      const count = contents.length;
      return Array(count).fill(0).map(() => {
        const vec = Array(dim).fill(0).map(() => Math.random() - 0.5);
        const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
        return vec.map(v => v / norm);
      });
    }

    // Direct REST API for Google provider (needed for multimodal and specific task types)
    if (config.provider === "google") {
      if (!config.apiKey) {
        throw new Error("Google API Key is required for embeddings");
      }

      const isGeminiV1 = config.model === "gemini-embedding-001";
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:${
        isGeminiV1 || contents.length === 1 ? "embedContent" : "batchEmbedContents"
      }`;

      // Gemini v1 doesn't support file embedding
      if (isGeminiV1 && contents.some(c => c.file)) {
        throw new Error("gemini-embedding-001 does not support file embeddings. Use gemini-embedding-2-preview instead.");
      }

      if (isGeminiV1 || contents.length === 1) {
        // Single embedContent call
        const content = contents[0];
        const parts = [];
        
        if (content.text) {
          parts.push({ text: content.text });
        }
        
        if (content.file && !isGeminiV1) {
          const fileData = await fs.readFile(content.file.path);
          const base64Data = fileData.toString("base64");
          parts.push({
            inline_data: {
              mime_type: content.file.mimeType,
              data: base64Data
            }
          });
        }

        const body: Record<string, any> = {
          model: `models/${config.model}`,
          content: { parts }
        };

        if (config.taskType) {
          body.taskType = config.taskType;
        }
        
        if (config.dimensions && !isGeminiV1) {
          body.output_dimensionality = config.dimensions;
        }

        const res = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": config.apiKey
          },
          body: JSON.stringify(body)
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Google API Error (${res.status}): ${errorText}`);
        }

        const data = await res.json();
        return [data.embedding.values];
      } else {
        // Batch embedContents call (only for v2 preview or newer)
        const requests = await Promise.all(contents.map(async (content) => {
          const parts = [];
          
          if (content.text) {
            parts.push({ text: content.text });
          }
          
          if (content.file) {
            const fileData = await fs.readFile(content.file.path);
            const base64Data = fileData.toString("base64");
            parts.push({
              inline_data: {
                mime_type: content.file.mimeType,
                data: base64Data
              }
            });
          }

          const reqBody: Record<string, any> = {
            model: `models/${config.model}`,
            content: { parts }
          };

          if (config.taskType) reqBody.taskType = config.taskType;
          if (config.dimensions) reqBody.output_dimensionality = config.dimensions;

          return reqBody;
        }));

        const res = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": config.apiKey
          },
          body: JSON.stringify({ requests })
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Google API Batch Error (${res.status}): ${errorText}`);
        }

        const data = await res.json();
        return data.embeddings.map((e: any) => e.values);
      }
    }

    // Default Vercel AI SDK fallback for other text-only providers (OpenAI, OpenRouter, etc)
    const textsOnly = contents.map(c => {
      if (c.file) throw new Error(`Provider ${config.provider} does not support multimodal embeddings yet.`);
      return c.text || "";
    });

    // Provide the config model directly for legacy behavior
    const legacyConfig = {
      provider: config.provider,
      model: config.model,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      dimensions: config.dimensions
    };
    
    const model = createEmbeddingModel(legacyConfig);

    if (textsOnly.length === 1) {
      const { embedding } = await embed({
        model,
        value: textsOnly[0],
      });
      return [embedding];
    }

    const { embeddings } = await embedMany({
      model,
      values: textsOnly,
    });
    return embeddings;
  } catch (error) {
    console.error("Embedding error:", error);
    throw new Error(
      `Failed to generate embeddings: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
