// agents/RFPCreatorAgent.ts
// AG-UI compliant agent for RFP creation

import { AbstractAgent, type AgentEvent } from './AbstractAgent';
import { createRfp, createStandardRfp, createRfpWordDocument } from '../services/rfpCreator';
import type { RfpSection } from '../services/rfpCreator';

export interface RFPCreationInput {
  title: string;
  organization: string;
  deadline: string;
  sections?: RfpSection[];
  format?: 'excel';
}

export interface RFPCreationResult {
  content: any;
  fileName?: string;
  fileSize?: number;
  format: string;
  processingTime: number;
  sectionsCount: number;
}

export class RFPCreatorAgent extends AbstractAgent {
  private eventHandler?: (event: AgentEvent) => void;

  constructor(eventHandler?: (event: AgentEvent) => void) {
    super();
    this.eventHandler = eventHandler;
  }

  protected async emitEvent(event: AgentEvent): Promise<void> {
    if (this.eventHandler) {
      this.eventHandler(event);
    }
    console.log(`[RFPCreatorAgent] Event:`, event);
  }

  async execute(input: RFPCreationInput): Promise<RFPCreationResult> {
    try {
      await this.emitRunStarted();
      await this.emitProgress(10, 'Starting RFP creation...');

      // Validate required fields
      if (!input.title || !input.organization || !input.deadline) {
        throw new Error('Missing required fields: title, organization, and deadline are required');
      }

      await this.emitProgress(20, 'Validating input parameters...');

      let rfpContent: any;
      const format = input.format || 'excel';

      await this.emitProgress(30, 'Generating RFP content...');

      if (input.sections && input.sections.length > 0) {
        await this.emitProgress(40, 'Creating custom RFP with provided sections...');
        
        rfpContent = await createRfp({
          title: input.title,
          organization: input.organization,
          deadline: input.deadline,
          sections: input.sections
        });
      } else {
        await this.emitProgress(40, 'Creating standard RFP with default sections...');
        
        rfpContent = await createStandardRfp(
          input.title,
          input.organization,
          input.deadline
        );
      }

      await this.emitProgress(60, 'Validating RFP content...');

      // Ensure we have sections
      if (!rfpContent.sections || rfpContent.sections.length === 0) {
        rfpContent.sections = [{
          title: "Untitled Section",
          content: "Please provide detailed information for this section."
        }];
      }

      await this.emitProgress(70, 'Processing RFP format...');

      // For Excel format, we'll create structured content that can be easily converted to Excel
      await this.emitProgress(80, 'Generating structured content for Excel conversion...');
      
      const textContent = this.generateTextContent(rfpContent);
      
      const result: RFPCreationResult = {
        content: textContent,
        format: 'excel',
        processingTime: Date.now() - this.startTime,
        sectionsCount: rfpContent.sections.length
      };

      await this.emitProgress(100, 'RFP creation completed successfully');
      await this.emitRunFinished(result);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      await this.emitRunError(errorMessage);
      throw error;
    }
  }

  private generateHTMLContent(rfpContent: any): string {
    const sectionsHtml = rfpContent.sections.map((section: RfpSection, index: number) => `
      <div class="section">
        <h3>${index + 1}. ${section.title}</h3>
        <div class="content">${section.content}</div>
      </div>
    `).join('');

    return `
      <div class="rfp-document">
        <header>
          <h1>${rfpContent.title}</h1>
          <div class="metadata">
            <p><strong>Organization:</strong> ${rfpContent.organization}</p>
            <p><strong>Deadline:</strong> ${rfpContent.deadline}</p>
          </div>
        </header>
        <main>
          ${sectionsHtml}
        </main>
      </div>
    `;
  }

  private generateTextContent(rfpContent: any): string {
    const sectionsText = rfpContent.sections.map((section: RfpSection, index: number) => 
      `${index + 1}. ${section.title}\n${section.content}\n`
    ).join('\n');

    return `
${rfpContent.title}

Organization: ${rfpContent.organization}
Deadline: ${rfpContent.deadline}

${sectionsText}
    `.trim();
  }

  // Tool definitions for AG-UI protocol
  getTools(): any[] {
    return [
      {
        name: 'create_rfp',
        description: 'Create a Request for Proposal document',
        parameters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Title of the RFP'
            },
            organization: {
              type: 'string',
              description: 'Organization issuing the RFP'
            },
            deadline: {
              type: 'string',
              description: 'Submission deadline'
            },
            sections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  content: { type: 'string' }
                }
              },
              description: 'Custom sections for the RFP'
            },
            format: {
              type: 'string',
              enum: ['excel'],
              description: 'Output format for the RFP'
            }
          },
          required: ['title', 'organization', 'deadline']
        }
      }
    ];
  }
}
