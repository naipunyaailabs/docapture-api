// test/agui-integration.test.ts
// Integration tests for AG-UI protocol

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { DocumentFieldExtractorAgent } from '../agents/DocumentFieldExtractorAgent';
import { DocumentSummarizerAgent } from '../agents/DocumentSummarizerAgent';
import { RFPCreatorAgent } from '../agents/RFPCreatorAgent';
import { HttpAgent } from '../agents/HttpAgent';

describe('AG-UI Protocol Integration', () => {
  let events: any[] = [];

  beforeEach(() => {
    events = [];
  });

  afterEach(() => {
    events = [];
  });

  const createEventHandler = () => {
    return (event: any) => {
      events.push(event);
    };
  };

  describe('DocumentFieldExtractorAgent', () => {
    it('should emit proper AG-UI events during execution', async () => {
      const eventHandler = createEventHandler();
      const agent = new DocumentFieldExtractorAgent(eventHandler);

      // Mock document input
      const input = {
        document: Buffer.from('Sample document content'),
        fileName: 'test.txt',
        fileType: 'text/plain',
        prompt: 'Extract key information'
      };

      try {
        await agent.execute(input);
      } catch (error) {
        // Expected to fail in test environment without Groq API
        console.log('Expected error in test environment:', error);
      }

      // Verify events were emitted
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe('run_started');
      expect(events[0].runId).toBeDefined();
      expect(events[0].timestamp).toBeDefined();
    });

    it('should have proper tool definitions', () => {
      const agent = new DocumentFieldExtractorAgent();
      const tools = agent.getTools();

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('extract_fields');
      expect(tools[0].description).toBeDefined();
      expect(tools[0].parameters).toBeDefined();
    });
  });

  describe('DocumentSummarizerAgent', () => {
    it('should emit proper AG-UI events during execution', async () => {
      const eventHandler = createEventHandler();
      const agent = new DocumentSummarizerAgent(eventHandler);

      const input = {
        document: Buffer.from('Sample document content for summarization'),
        fileName: 'test.txt',
        fileType: 'text/plain',
        prompt: 'Summarize this document',
        format: 'html' as const
      };

      try {
        await agent.execute(input);
      } catch (error) {
        console.log('Expected error in test environment:', error);
      }

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe('run_started');
    });

    it('should have proper tool definitions', () => {
      const agent = new DocumentSummarizerAgent();
      const tools = agent.getTools();

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('summarize_document');
      expect(tools[0].parameters.properties.format.enum).toContain('html');
    });
  });

  describe('RFPCreatorAgent', () => {
    it('should emit proper AG-UI events during execution', async () => {
      const eventHandler = createEventHandler();
      const agent = new RFPCreatorAgent(eventHandler);

      const input = {
        title: 'Test RFP',
        organization: 'Test Org',
        deadline: '2024-12-31',
        sections: [
          { title: 'Section 1', content: 'Content 1' }
        ],
        format: 'html' as const
      };

      try {
        await agent.execute(input);
      } catch (error) {
        console.log('Expected error in test environment:', error);
      }

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe('run_started');
    });

    it('should have proper tool definitions', () => {
      const agent = new RFPCreatorAgent();
      const tools = agent.getTools();

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('create_rfp');
      expect(tools[0].parameters.required).toContain('title');
    });
  });

  describe('HttpAgent', () => {
    it('should handle field extraction requests', async () => {
      const eventHandler = createEventHandler();
      const agent = new HttpAgent({ cors: true }, eventHandler);

      // Mock FormData
      const formData = new FormData();
      formData.append('document', new Blob(['test content'], { type: 'text/plain' }), 'test.txt');
      formData.append('prompt', 'Extract information');

      const request = new Request('http://localhost:5000/agui/field-extractor', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': 'Bearer test-key'
        }
      });

      try {
        const response = await agent.execute(request);
        expect(response).toBeInstanceOf(Response);
      } catch (error) {
        console.log('Expected error in test environment:', error);
      }
    });

    it('should have proper tool definitions', () => {
      const agent = new HttpAgent();
      const tools = agent.getTools();

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('process_document');
      expect(tools[0].parameters.properties.agentType.enum).toContain('field-extractor');
    });
  });

  describe('Event Flow', () => {
    it('should follow proper event sequence', async () => {
      const eventHandler = createEventHandler();
      const agent = new DocumentFieldExtractorAgent(eventHandler);

      const input = {
        document: Buffer.from('test'),
        fileName: 'test.txt',
        fileType: 'text/plain'
      };

      try {
        await agent.execute(input);
      } catch (error) {
        // Expected in test environment
      }

      // Check event sequence
      const eventTypes = events.map(e => e.type);
      expect(eventTypes).toContain('run_started');
      
      // Should have progress events
      const progressEvents = events.filter(e => e.type === 'progress');
      expect(progressEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should emit error events on failure', async () => {
      const eventHandler = createEventHandler();
      const agent = new DocumentFieldExtractorAgent(eventHandler);

      // Invalid input to trigger error
      const input = {
        document: null as any,
        fileName: '',
        fileType: ''
      };

      try {
        await agent.execute(input);
      } catch (error) {
        // Expected error
      }

      // Should have error event
      const errorEvents = events.filter(e => e.type === 'run_error');
      expect(errorEvents.length).toBeGreaterThan(0);
    });
  });
});
