import { extractAndParseLC } from "../services/extractLC";
import { matchTemplate } from "../services/templateStore"; // optional; still supported
import { createErrorResponse, createSuccessResponse } from "../utils/errorHandler";

/**
 * Extract Handler
 * -------------------------------
 * Handles uploaded documents, performs text + structured extraction using
 * LangChain and Tesseract, and returns normalized JSON output.
 *
 * Supports: PDF, image, DOC/DOCX, HTML, MD.
 */
export async function extractHandler(req: Request, preloadedFormData?: FormData): Promise<Response> {
  try {
    // Use preloaded form data (if already parsed)
    const formData = preloadedFormData || await req.formData();

    // 1️⃣ File validation
    const file = formData.get("document");
    if (!file || !(file instanceof File)) {
      return createErrorResponse("No document provided or invalid file", 400);
    }

    const buffer = await file.arrayBuffer();
    const fileName = file.name;
    const fileType = file.type;

    // 2️⃣ Extract + parse document using LangChain pipeline
    const { text, structured } = await extractAndParseLC(Buffer.from(buffer), fileName, fileType);

    // 3️⃣ Optional: Template matching (if you ever re-enable Qdrant or embeddings)
    const preprocessedText = text; // currently raw; you can add preprocessing if needed
    const matchedTemplateResult = await matchTemplate(preprocessedText);
    const matchedTemplate = matchedTemplateResult
      ? {
          fields: matchedTemplateResult.fields,
          id: matchedTemplateResult.id,
          confidence: matchedTemplateResult.confidence,
        }
      : null;

    // 4️⃣ Confidence logic
    const useTemplateExtraction =
      matchedTemplateResult && matchedTemplateResult.confidence >= 70;

    // 5️⃣ Merge all results
    const result = {
      extracted: structured,
      textLength: text.length,
      usedTemplate: !!(useTemplateExtraction && matchedTemplate),
      templateId: matchedTemplate?.id || null,
      confidence: matchedTemplate?.confidence || null,
    };

    // 6️⃣ Return response in the format expected by the frontend
    const formattedResponse = {
      success: true,
      data: {
        result: result,
        logs: []
      }
    };

    return createSuccessResponse(formattedResponse);
  } catch (error: any) {
    console.error("[extractHandler] Extraction failed:", error);
    return createErrorResponse(error.message || "Document extraction failed", 500);
  }
}
