import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import { getSettings } from "../settings";

export interface CompletionOptions {
  system?: string;
  temperature?: number;
  maxTokens?: number;
  /** If true, expect JSON output from the model */
  jsonMode?: boolean;
}

export interface EmbeddingResult {
  vectors: number[][];
}

export class LLMClient {
  /** Generate a text completion */
  async complete(prompt: string, options: CompletionOptions = {}): Promise<string> {
    const settings = getSettings();
    const { system, temperature = 0.3, maxTokens = 2048, jsonMode = false } = options;

    switch (settings.llmProvider) {
      case "openai":
        return this._openaiComplete(prompt, system, temperature, maxTokens, jsonMode);
      case "gemini":
        return this._geminiComplete(prompt, system, temperature, maxTokens);
      case "cursor":
        return this._cursorComplete(prompt, system, temperature, maxTokens, jsonMode);
      default:
        throw new Error(`Unknown LLM provider: ${settings.llmProvider}`);
    }
  }

  /** Embed a list of texts, returns one vector per text */
  async embed(texts: string[]): Promise<number[][]> {
    const settings = getSettings();
    switch (settings.llmProvider) {
      case "openai":
      case "cursor":
        return this._openaiEmbed(texts);
      case "gemini":
        return this._geminiEmbed(texts);
      default:
        throw new Error(`Unknown LLM provider: ${settings.llmProvider}`);
    }
  }

  private async _openaiComplete(
    prompt: string,
    system: string | undefined,
    temperature: number,
    maxTokens: number,
    jsonMode: boolean
  ): Promise<string> {
    const settings = getSettings();
    const openai = new OpenAI({ apiKey: settings.openaiKey });
    const messages: OpenAI.ChatCompletionMessageParam[] = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: prompt });

    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: jsonMode ? { type: "json_object" } : undefined,
    });
    return res.choices[0]?.message?.content ?? "";
  }

  private async _geminiComplete(
    prompt: string,
    system: string | undefined,
    temperature: number,
    maxTokens: number
  ): Promise<string> {
    const settings = getSettings();
    const genai = new GoogleGenerativeAI(settings.geminiKey);
    const model = genai.getGenerativeModel({
      model: "gemini-1.5-pro",
      systemInstruction: system,
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  private async _cursorComplete(
    prompt: string,
    system: string | undefined,
    temperature: number,
    maxTokens: number,
    jsonMode: boolean
  ): Promise<string> {
    const settings = getSettings();
    const messages: Array<{ role: string; content: string }> = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: prompt });

    const res = await axios.post(
      "https://api.cursor.sh/v1/chat/completions",
      {
        model: "claude-3-5-sonnet",
        messages,
        temperature,
        max_tokens: maxTokens,
        response_format: jsonMode ? { type: "json_object" } : undefined,
      },
      {
        headers: {
          Authorization: `Bearer ${settings.cursorKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    return res.data.choices[0]?.message?.content ?? "";
  }

  private async _openaiEmbed(texts: string[]): Promise<number[][]> {
    const settings = getSettings();
    const openai = new OpenAI({
      apiKey:
        settings.llmProvider === "cursor" ? settings.cursorKey : settings.openaiKey,
      baseURL:
        settings.llmProvider === "cursor"
          ? "https://api.cursor.sh/v1"
          : undefined,
    });
    const res = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
    });
    return res.data.map((d) => d.embedding);
  }

  private async _geminiEmbed(texts: string[]): Promise<number[][]> {
    const settings = getSettings();
    const genai = new GoogleGenerativeAI(settings.geminiKey);
    const model = genai.getGenerativeModel({ model: "text-embedding-004" });
    const results = await Promise.all(
      texts.map((t) => model.embedContent(t))
    );
    return results.map((r) => r.embedding.values);
  }
}

export const llmClient = new LLMClient();
