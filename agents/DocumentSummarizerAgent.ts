// agents/DocumentSummarizerAgent.ts
// AG-UI compliant agent for document summarization

import { AbstractAgent, type AgentEvent } from './AbstractAgent';
import { extractDocWithPreprocessing } from '../services/fieldExtractor';
import { unifiedChatCompletion } from '../utils/unifiedClient';
import { matchTemplate } from '../services/templateStore';

export interface DocumentSummarizationInput {
  document: Buffer;
  fileName: string;
  fileType: string;
  prompt?: string;
  format?: 'excel';
}

export interface DocumentSummarizationResult {
  summary: string;
  format: string;
  processingTime: number;
  wordCount?: number;
  keyPoints?: string[];
}

export class DocumentSummarizerAgent extends AbstractAgent {
  private eventHandler?: (event: AgentEvent) => void;

  constructor(eventHandler?: (event: AgentEvent) => void) {
    super();
    this.eventHandler = eventHandler;
  }

  protected async emitEvent(event: AgentEvent): Promise<void> {
    if (this.eventHandler) {
      this.eventHandler(event);
    }
    console.log(`[DocumentSummarizerAgent] Event:`, event);
  }

  async execute(input: DocumentSummarizationInput): Promise<DocumentSummarizationResult> {
    try {
      await this.emitRunStarted();
      await this.emitProgress(10, 'Starting document summarization...');

      // Extract document text
      await this.emitProgress(20, 'Extracting document text...');
      const { originalText: text } = await extractDocWithPreprocessing(input.document, input.fileName, input.fileType);

      await this.emitProgress(40, 'Analyzing document content...');

      // Create summarization prompt based on format
      const format = input.format || 'excel';
      const summarizationPrompt = this.createSummarizationPrompt(text, input.prompt, format);

      await this.emitProgress(60, 'Generating summary...');

      // Generate summary using AI
      const systemPrompt = "You are an advanced document summarizer. You can understand complex documents and create concise, accurate summaries. Focus on the most important information and maintain the document's key meaning.";
      
      const summary = await unifiedChatCompletion(systemPrompt, summarizationPrompt);

      await this.emitProgress(90, 'Processing summary...');

      // Extract key points if HTML format
      const keyPoints = undefined; // Key points extraction removed for Excel-only format
      const wordCount = this.countWords(summary);

      const result: DocumentSummarizationResult = {
        summary: summary.trim(),
        format,
        processingTime: Date.now() - this.startTime,
        wordCount,
        keyPoints
      };

      await this.emitProgress(100, 'Summarization completed successfully');
      await this.emitRunFinished(result);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      await this.emitRunError(errorMessage);
      throw error;
    }
  }

  private createSummarizationPrompt(text: string, userPrompt?: string, format: string = 'html'): string {
    const basePrompt = userPrompt?.trim() 
      ? `Summarize the following document focusing on: ${userPrompt}.`
      : `Provide a comprehensive summary of the following document. Include key points, main ideas, and important details.`;

    // For Excel format, we'll create a structured summary that can be easily converted to Excel
    return `${basePrompt} Format the summary in a structured way that can be easily converted to Excel:
    Document Summary
    
    Overview:
    Overall summary text
    
    Key Insights:
    - Insight 1
    - Insight 2
    
    Important Details:
    Details description
    
    Document: ${text}`;
  }

  private extractKeyPoints(htmlSummary: string): string[] {
    // Simple extraction of key points from HTML
    const keyPoints: string[] = [];
    const liMatches = htmlSummary.match(/<li[^>]*>(.*?)<\/li>/g);
    if (liMatches) {
      keyPoints.push(...liMatches.map(match => 
        match.replace(/<[^>]*>/g, '').trim()
      ));
    }
    return keyPoints;
  }

  private countWords(text: string): number {
    return text.replace(/<[^>]*>/g, '').split(/\s+/).filter(word => word.length > 0).length;
  }

  // Tool definitions for AG-UI protocol
  getTools(): any[] {
    return [
      {
        name: 'summarize_document',
        description: 'Summarize a document with optional custom focus',
        parameters: {
          type: 'object',
          properties: {
            document: {
              type: 'string',
              description: 'Base64 encoded document content'
            },
            fileName: {
              type: 'string',
              description: 'Name of the document file'
            },
            fileType: {
              type: 'string',
              description: 'MIME type of the document'
            },
            prompt: {
              type: 'string',
              description: 'Optional custom summarization focus'
            },
            format: {
              type: 'string',
              enum: ['excel'],
              description: 'Output format for the summary'
            }
          },
          required: ['document', 'fileName', 'fileType']
        }
      }
    ];
  }
}
