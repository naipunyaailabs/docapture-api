// agents/DocumentFieldExtractorAgent.ts
// AG-UI compliant agent for document field extraction

import { AbstractAgent, type AgentEvent } from './AbstractAgent';
import { extractDocWithPreprocessing } from '../services/fieldExtractor';
import { unifiedChatCompletion } from '../utils/unifiedClient';
import { matchTemplate } from '../services/templateStore';

export interface FieldExtractionInput {
  document: Buffer;
  fileName: string;
  fileType: string;
  prompt?: string;
  requiredFields?: string[];
}

export interface FieldExtractionResult {
  extracted: any;
  templateId?: string;
  usedTemplate: boolean;
  confidence?: number;
  processingTime: number;
  language?: string;
}

export class DocumentFieldExtractorAgent extends AbstractAgent {
  private eventHandler?: (event: AgentEvent) => void;

  constructor(eventHandler?: (event: AgentEvent) => void) {
    super();
    this.eventHandler = eventHandler;
  }

  protected async emitEvent(event: AgentEvent): Promise<void> {
    if (this.eventHandler) {
      this.eventHandler(event);
    }
    console.log(`[FieldExtractorAgent] Event:`, event);
  }

  async execute(input: FieldExtractionInput): Promise<FieldExtractionResult> {
    try {
      await this.emitRunStarted();
      await this.emitProgress(10, 'Starting document processing...');

      // Extract document text with preprocessing
      await this.emitProgress(20, 'Extracting document text...');
      const { originalText, preprocessedText } = await extractDocWithPreprocessing(
        input.document,
        input.fileName,
        input.fileType
      );

      await this.emitProgress(40, 'Analyzing document structure...');

      // Perform template matching
      const matchedTemplateResult = await matchTemplate(preprocessedText);
      const matchedTemplate = matchedTemplateResult 
        ? { 
            fields: matchedTemplateResult.fields, 
            id: matchedTemplateResult.id,
            confidence: matchedTemplateResult.confidence
          } 
        : null;

      await this.emitProgress(60, 'Matching document template...');

      // Determine extraction strategy
      const useTemplateExtraction = matchedTemplateResult && matchedTemplateResult.confidence >= 70;
      
      await this.emitProgress(70, 'Generating extraction prompt...');

      const extractionPrompt = this.getExtractionPrompt(
        originalText,
        input.prompt,
        matchedTemplate,
        useTemplateExtraction ? useTemplateExtraction : undefined,
        input.requiredFields
      );

      await this.emitProgress(80, 'Processing with AI...');

      // Stream the AI response
      const systemPrompt = "You are an advanced document parser and contextual extractor. You deeply understand document structures and can extract both explicit and implicit information. Respond ONLY with valid JSON.";
      
      // For now, we'll use the existing unifiedChatCompletion
      // In a full AG-UI implementation, this would be streamed
      const response = await unifiedChatCompletion(systemPrompt, extractionPrompt);

      await this.emitProgress(90, 'Parsing extraction results...');

      // Parse the response
      let extracted: any = null;
      try {
        const firstBrace = response.indexOf("{");
        const lastBrace = response.lastIndexOf("}");
        extracted = (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace)
          ? JSON.parse(response.slice(firstBrace, lastBrace + 1)) : null;
      } catch (parseError) {
        console.error('Failed to parse extraction result:', parseError);
        extracted = { error: 'Failed to parse extraction result', rawResponse: response };
      }

      const result: FieldExtractionResult = {
        extracted,
        templateId: matchedTemplate?.id || undefined,
        usedTemplate: !!(useTemplateExtraction && matchedTemplate),
        confidence: matchedTemplateResult?.confidence,
        processingTime: Date.now() - this.startTime
      };

      await this.emitProgress(100, 'Extraction completed successfully');
      await this.emitRunFinished(result);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      await this.emitRunError(errorMessage);
      throw error;
    }
  }

  private getExtractionPrompt(
    docContent: string,
    userPrompt?: string,
    matchedTemplate?: any,
    useTemplateExtraction?: boolean,
    requiredFields?: string[]
  ): string {
    if (useTemplateExtraction && matchedTemplate) {
      return `Extract the following fields from the document: ${matchedTemplate.fields.join(", ")}. Respond ONLY with valid JSON. Do not include explanations, comments, or extra text. The response MUST start with '{' and end with '}'. If you cannot find a field, use null as its value. Document: ${docContent}`;
    } else if (requiredFields && requiredFields.length > 0) {
      return `Extract the following fields from the document: ${requiredFields.join(", ")}. Respond ONLY with valid JSON. Do not include explanations, comments, or extra text. The response MUST start with '{' and end with '}'. If you cannot find a field, use null as its value. Document: ${docContent}`;
    } else if (userPrompt?.trim()) {
      return `Extract the information described by the user from the document: "${userPrompt}" Respond ONLY with valid JSON. Document: ${docContent}`;
    } else {
      return `Extract all key-value pairs, dates, names, organizations, and any other structured information from the following document. Respond ONLY with valid JSON. Document: ${docContent}`;
    }
  }

  // Tool definitions for AG-UI protocol
  getTools(): any[] {
    return [
      {
        name: 'extract_fields',
        description: 'Extract structured fields from a document',
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
              description: 'Optional custom extraction prompt'
            },
            requiredFields: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific fields to extract'
            }
          },
          required: ['document', 'fileName', 'fileType']
        }
      }
    ];
  }
}
