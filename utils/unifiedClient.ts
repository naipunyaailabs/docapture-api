import { groqChatCompletion } from "./groqClient";
import { ollamaChat } from "./ollamaClient";

// Configuration for the AI client
export type AIClientType = 'groq' | 'ollama';

// Get the configured AI client type from environment variables
// Default to 'groq' if not specified
export const getConfiguredAIClient = (): AIClientType => {
  const clientType = process.env.AI_CLIENT || 'groq';
  if (clientType === 'ollama') {
    return 'ollama';
  }
  return 'groq';
};

// Unified chat completion function that switches between clients
export async function unifiedChatCompletion(
  system: string,
  user: string,
  imageBase64?: string,
  imageMimeType: string = "image/jpeg"
): Promise<string> {
  const clientType = getConfiguredAIClient();
  
  console.log(`[unifiedChatCompletion] Using ${clientType} client`);
  
  try {
    if (clientType === 'ollama') {
      return await ollamaChat(system, user, imageBase64, imageMimeType);
    } else {
      // Default to Groq
      return await groqChatCompletion(system, user, imageBase64, imageMimeType);
    }
  } catch (error) {
    console.error(`[unifiedChatCompletion] Error with ${clientType} client:`, error);
    throw new Error(`Failed to process chat request with ${clientType} client: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}