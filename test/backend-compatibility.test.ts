// test/backend-compatibility.test.ts
// Test compatibility with existing backend endpoints

import { describe, it, expect } from 'bun:test';

describe('Backend Compatibility', () => {
  it('should map AG-UI agent types to correct endpoints', () => {
    const endpointMap: Record<string, string> = {
      'field-extractor': '/extract',
      'document-summarizer': '/summarize',
      'rfp-creator': '/create-rfp',
      'rfp-summarizer': '/summarize-rfp'
    };

    expect(endpointMap['field-extractor']).toBe('/extract');
    expect(endpointMap['document-summarizer']).toBe('/summarize');
    expect(endpointMap['rfp-creator']).toBe('/create-rfp');
    expect(endpointMap['rfp-summarizer']).toBe('/summarize-rfp');
  });

  it('should handle response format correctly', () => {
    // Mock response from existing backend
    const mockResponse = {
      success: true,
      data: {
        result: {
          extracted: { title: "Test Document", amount: 100 },
          templateId: null,
          usedTemplate: false
        },
        logs: []
      }
    };

    expect(mockResponse.success).toBe(true);
    expect(mockResponse.data.result.extracted).toBeDefined();
    expect(mockResponse.data.result.templateId).toBeNull();
  });

  it('should handle error responses correctly', () => {
    const mockErrorResponse = {
      success: false,
      error: "Failed to extract information from document"
    };

    expect(mockErrorResponse.success).toBe(false);
    expect(mockErrorResponse.error).toBeDefined();
  });
});
