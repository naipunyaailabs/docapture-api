// agents/HttpAgent.ts
// AG-UI compliant HTTP agent for handling requests

import { AbstractAgent, AgentEvent } from './AbstractAgent';
import { DocumentFieldExtractorAgent } from './DocumentFieldExtractorAgent';
import { DocumentSummarizerAgent } from './DocumentSummarizerAgent';
import { RFPCreatorAgent } from './RFPCreatorAgent';

export interface HttpAgentConfig {
  port?: number;
  cors?: boolean;
  apiKey?: string;
}

export class HttpAgent extends AbstractAgent {
  private config: HttpAgentConfig;
  private eventHandler?: (event: AgentEvent) => void;

  constructor(config: HttpAgentConfig = {}, eventHandler?: (event: AgentEvent) => void) {
    super();
    this.config = config;
    this.eventHandler = eventHandler;
  }

  protected async emitEvent(event: AgentEvent): Promise<void> {
    if (this.eventHandler) {
      this.eventHandler(event);
    }
    console.log(`[HttpAgent] Event:`, event);
  }

  async execute(request: Request): Promise<Response> {
    try {
      await this.emitRunStarted();
      await this.emitProgress(10, 'Processing HTTP request...');

      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/').filter(segment => segment);

      // Handle CORS preflight requests
      if (request.method === 'OPTIONS') {
        await this.emitProgress(50, 'Handling CORS preflight...');
        return this.createCorsResponse(new Response(null, { status: 204 }));
      }

      // Route to appropriate agent based on path
      const agentType = pathSegments[1]; // e.g., "field-extractor", "document-summarizer", etc.

      await this.emitProgress(30, `Routing to ${agentType} agent...`);

      let response: Response;

      switch (agentType) {
        case 'field-extractor':
          response = await this.handleFieldExtraction(request);
          break;
        case 'document-summarizer':
          response = await this.handleDocumentSummarization(request);
          break;
        case 'rfp-creator':
          response = await this.handleRFPCreation(request);
          break;
        default:
          response = new Response(JSON.stringify({ 
            error: `Agent ${agentType} not found` 
          }), { 
            status: 404, 
            headers: { "Content-Type": "application/json" } 
          });
      }

      await this.emitProgress(90, 'Finalizing response...');
      await this.emitRunFinished({ status: response.status });

      return this.createCorsResponse(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      await this.emitRunError(errorMessage);
      
      const errorResponse = new Response(JSON.stringify({ 
        error: errorMessage 
      }), { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      });
      
      return this.createCorsResponse(errorResponse);
    }
  }

  private async handleFieldExtraction(request: Request): Promise<Response> {
    const formData = await request.formData();
    const file = formData.get('document') as File;
    const prompt = formData.get('prompt')?.toString();
    const requiredFields = formData.get('requiredFields')?.toString();

    if (!file) {
      return new Response(JSON.stringify({ 
        error: 'No document provided' 
      }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const agent = new DocumentFieldExtractorAgent(this.eventHandler);

    try {
      const result = await agent.execute({
        document: buffer,
        fileName: file.name,
        fileType: file.type,
        prompt,
        requiredFields: requiredFields ? JSON.parse(requiredFields) : undefined
      });

      return new Response(JSON.stringify({
        success: true,
        data: {
          result,
          logs: []
        }
      }), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }), { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      });
    }
  }

  private async handleDocumentSummarization(request: Request): Promise<Response> {
    const formData = await request.formData();
    const file = formData.get('document') as File;
    const prompt = formData.get('prompt')?.toString();
    const format = formData.get('format')?.toString() as 'html' | 'text' | 'markdown' || 'html';

    if (!file) {
      return new Response(JSON.stringify({ 
        error: 'No document provided' 
      }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const agent = new DocumentSummarizerAgent(this.eventHandler);

    try {
      const result = await agent.execute({
        document: buffer,
        fileName: file.name,
        fileType: file.type,
        prompt,
        format
      });

      return new Response(JSON.stringify({
        success: true,
        data: {
          result,
          logs: []
        }
      }), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }), { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      });
    }
  }

  private async handleRFPCreation(request: Request): Promise<Response> {
    const requestData = await request.json();

    if (!requestData.title || !requestData.organization || !requestData.deadline) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: title, organization, and deadline are required' 
      }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    const agent = new RFPCreatorAgent(this.eventHandler);

    try {
      const result = await agent.execute({
        title: requestData.title,
        organization: requestData.organization,
        deadline: requestData.deadline,
        sections: requestData.sections,
        format: requestData.format || 'word'
      });

      return new Response(JSON.stringify({
        success: true,
        data: {
          result,
          logs: []
        }
      }), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }), { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      });
    }
  }

  private createCorsResponse(response: Response): Response {
    if (this.config.cors !== false) {
      response.headers.set("Access-Control-Allow-Origin", "*");
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
      response.headers.set("Access-Control-Max-Age", "86400");
    }
    return response;
  }

  // Tool definitions for AG-UI protocol
  getTools(): any[] {
    return [
      {
        name: 'process_document',
        description: 'Process documents using various AI agents',
        parameters: {
          type: 'object',
          properties: {
            agentType: {
              type: 'string',
              enum: ['field-extractor', 'document-summarizer', 'rfp-creator'],
              description: 'Type of agent to use for processing'
            },
            input: {
              type: 'object',
              description: 'Input data for the specific agent'
            }
          },
          required: ['agentType', 'input']
        }
      }
    ];
  }
}
