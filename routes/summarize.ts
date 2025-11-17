import { extractDoc } from "../services/fieldExtractor";
import { unifiedChatCompletion } from "../utils/unifiedClient";
import { createErrorResponse, createSuccessResponse } from "../utils/errorHandler";

export async function summarizeHandler(req: Request, preloadedFormData?: FormData): Promise<Response> {
  try {
    // Get form data - use preloaded if provided (avoids "Body already used" error)
    const formData = preloadedFormData || await req.formData();
    
    // Get file from form data
    const file = formData.get("document");
    if (!file || !(file instanceof File)) {
      return createErrorResponse("No document provided or invalid file", 400);
    }
    
    // Get user prompt and summary length from form data
    const userPrompt: string = formData.get("prompt")?.toString() || "";
    const summaryLength: string = formData.get("length")?.toString() || "medium";
    const buffer = await file.arrayBuffer();
    
    // Use extractDoc to get text content
    const text: string = await extractDoc(Buffer.from(buffer), file.name, file.type);
    
    // Convert document content to TOON format for token efficiency
    // TOON (Token-Oriented Object Notation) saves 30-50% tokens compared to verbose formatting
    const documentTOON = `document{filename,content}:\n${file.name},${text.replace(/\n/g, ' ').replace(/,/g, ';')}`;

    // Create summarization prompt based on length preference
    let summarizationPrompt: string;
    let systemMessage: string;
    
    if (summaryLength.toLowerCase() === "detailed") {
      systemMessage = "You are an advanced document analyzer. Create comprehensive, detailed summaries that thoroughly cover all major topics, subtopics, supporting details, and nuances. Provide in-depth analysis with proper structure using HTML with Tailwind CSS classes.";
      summarizationPrompt = userPrompt.trim()
        ? `Create a detailed, comprehensive summary focusing on: ${userPrompt}. Include:
- Complete overview and context
- All major sections with detailed explanations
- Key themes with thorough analysis
- Important details and supporting information
- Conclusions and implications

Document data (TOON format):
${documentTOON}

Format using this HTML structure with Tailwind CSS:
<div class="min-h-screen bg-gray-50 py-12">
  <div class="max-w-4xl mx-auto px-4">
    <div class="bg-white rounded-xl shadow-lg p-8">
      <div class="space-y-8">
        <h2 class="text-3xl font-bold text-gray-900 text-center">Comprehensive Analysis</h2>
        <div class="prose prose-lg text-gray-700">
          <div class="space-y-6">
            <h3 class="text-2xl font-semibold text-gray-800">Executive Overview</h3>
            <p class="text-gray-700 leading-relaxed">Detailed context and scope</p>
          </div>
          <div class="space-y-6">
            <h3 class="text-2xl font-semibold text-gray-800">Detailed Analysis</h3>
            <div class="ml-4 space-y-4">
              <div><h4 class="text-xl font-medium text-gray-800">Section</h4>
              <p class="text-gray-700 leading-relaxed ml-4">In-depth coverage</p></div>
            </div>
          </div>
          <div class="space-y-6">
            <h3 class="text-2xl font-semibold text-gray-800">Key Findings</h3>
            <ul class="list-disc pl-8 space-y-3">
              <li class="text-gray-700 leading-relaxed">Finding with explanation</li>
            </ul>
          </div>
          <div class="space-y-6">
            <h3 class="text-2xl font-semibold text-gray-800">Implications</h3>
            <p class="text-gray-700 leading-relaxed">Impact and significance</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
Document: ${text}`
        : `Create a comprehensive, detailed summary. Provide thorough coverage of all aspects including complete context, detailed analysis of all major sections, key findings with explanations, supporting details, and implications.

Document data (TOON format):
${documentTOON}

Format using this HTML structure with Tailwind CSS:
<div class="min-h-screen bg-gray-50 py-12">
  <div class="max-w-4xl mx-auto px-4">
    <div class="bg-white rounded-xl shadow-lg p-8">
      <div class="space-y-8">
        <h2 class="text-3xl font-bold text-gray-900 text-center">Comprehensive Summary</h2>
        <div class="prose prose-lg text-gray-700">
          <div class="space-y-6">
            <h3 class="text-2xl font-semibold text-gray-800">Document Overview</h3>
            <p class="text-gray-700 leading-relaxed">Complete overview with context</p>
          </div>
          <div class="space-y-6">
            <h3 class="text-2xl font-semibold text-gray-800">Main Content</h3>
            <div class="ml-4 space-y-4">
              <div><h4 class="text-xl font-medium text-gray-800">Topic</h4>
              <p class="text-gray-700 leading-relaxed ml-4">Detailed analysis</p></div>
            </div>
          </div>
          <div class="space-y-6">
            <h3 class="text-2xl font-semibold text-gray-800">Key Insights</h3>
            <ul class="list-disc pl-8 space-y-3">
              <li class="text-gray-700 leading-relaxed">Insight with comprehensive explanation</li>
            </ul>
          </div>
          <div class="space-y-6">
            <h3 class="text-2xl font-semibold text-gray-800">Conclusions</h3>
            <p class="text-gray-700 leading-relaxed">Impact and implications</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
Document: ${text}`;
    } else if (summaryLength.toLowerCase() === "short") {
      systemMessage = "You are a concise document summarizer. Create brief summaries that capture only the most essential points. Be direct and to the point while using HTML with Tailwind CSS classes.";
      summarizationPrompt = userPrompt.trim()
        ? `Provide a brief summary focusing on: ${userPrompt}. Include only the most essential points.

Document data (TOON format):
${documentTOON}

Format using this HTML structure with Tailwind CSS:
<div class="min-h-screen bg-gray-50 py-12">
  <div class="max-w-4xl mx-auto px-4">
    <div class="bg-white rounded-xl shadow-lg p-8">
      <div class="space-y-8">
        <h2 class="text-3xl font-bold text-gray-900 text-center">Quick Summary</h2>
        <div class="prose prose-lg text-gray-700">
          <div class="space-y-6">
            <h3 class="text-2xl font-semibold text-gray-800">Essential Points</h3>
            <ul class="list-disc pl-8 space-y-3">
              <li class="text-gray-700 leading-relaxed">Key point</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
Document: ${text}`
        : `Provide a brief summary. Include only the most essential information in a concise format.

Document data (TOON format):
${documentTOON}

Format using this HTML structure with Tailwind CSS:
<div class="min-h-screen bg-gray-50 py-12">
  <div class="max-w-4xl mx-auto px-4">
    <div class="bg-white rounded-xl shadow-lg p-8">
      <div class="space-y-8">
        <h2 class="text-3xl font-bold text-gray-900 text-center">Quick Summary</h2>
        <div class="prose prose-lg text-gray-700">
          <div class="space-y-6">
            <h3 class="text-2xl font-semibold text-gray-800">Key Points</h3>
            <ul class="list-disc pl-8 space-y-3">
              <li class="text-gray-700 leading-relaxed">Essential information</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
Document: ${text}`;
    } else {
      // Medium length (default)
      systemMessage = "You are an advanced document summarizer. Create balanced summaries that cover key points, main ideas, and important details while maintaining clarity and conciseness. Format your response using HTML with Tailwind CSS classes.";
      summarizationPrompt = userPrompt.trim()
        ? `Summarize focusing on: ${userPrompt}. Include key points, main ideas, and important details.

Document data (TOON format):
${documentTOON}

Format using this HTML structure with Tailwind CSS:
<div class="min-h-screen bg-gray-50 py-12">
  <div class="max-w-4xl mx-auto px-4">
    <div class="bg-white rounded-xl shadow-lg p-8">
      <div class="space-y-8">
        <h2 class="text-3xl font-bold text-gray-900 text-center">Summary</h2>
        <div class="prose prose-lg text-gray-700">
          <div class="space-y-6">
            <h3 class="text-2xl font-semibold text-gray-800">Overview</h3>
            <p class="text-gray-700 leading-relaxed">Main overview</p>
          </div>
          <div class="space-y-6">
            <h3 class="text-2xl font-semibold text-gray-800">Key Points</h3>
            <ul class="list-disc pl-8 space-y-3">
              <li class="text-gray-700 leading-relaxed">Point</li>
            </ul>
          </div>
          <div class="space-y-6">
            <h3 class="text-2xl font-semibold text-gray-800">Important Details</h3>
            <p class="text-gray-700 leading-relaxed">Details</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
Document: ${text}`
        : `Provide a comprehensive summary. Include key points, main ideas, and important details.

Document data (TOON format):
${documentTOON}

Format using this HTML structure with Tailwind CSS:
<div class="min-h-screen bg-gray-50 py-12">
  <div class="max-w-4xl mx-auto px-4">
    <div class="bg-white rounded-xl shadow-lg p-8">
      <div class="space-y-8">
        <h2 class="text-3xl font-bold text-gray-900 text-center">Document Summary</h2>
        <div class="prose prose-lg text-gray-700">
          <div class="space-y-6">
            <h3 class="text-2xl font-semibold text-gray-800">Overview</h3>
            <p class="text-gray-700 leading-relaxed">Summary overview</p>
          </div>
          <div class="space-y-6">
            <h3 class="text-2xl font-semibold text-gray-800">Key Insights</h3>
            <ul class="list-disc pl-8 space-y-3">
              <li class="text-gray-700 leading-relaxed">Insight</li>
            </ul>
          </div>
          <div class="space-y-6">
            <h3 class="text-2xl font-semibold text-gray-800">Important Details</h3>
            <p class="text-gray-700 leading-relaxed">Key details</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
Document: ${text}`;
    }

    const summary: string = await unifiedChatCompletion(
      systemMessage,
      summarizationPrompt
    );

    // Return the response in the format expected by the frontend
    const formattedResponse = {
      success: true,
      data: {
        result: {
          summary: summary.trim()
        },
        logs: []
      }
    };
    
    return createSuccessResponse(formattedResponse);
  } catch (error) {
    console.error("[Summarize Handler Error]:", error);
    // Return HTML error response for frontend compatibility
    return new Response(
      `<div class='p-4 bg-red-50 text-red-700 rounded-lg text-center max-w-2xl mx-auto mt-8'>
        <h3 class="font-bold">Error</h3>
        <p>Failed to summarize document: ${(error as Error).message}</p>
       </div>`, 
      { 
        status: 500,
        headers: { "Content-Type": "text/html" }
      }
    );
  }
}