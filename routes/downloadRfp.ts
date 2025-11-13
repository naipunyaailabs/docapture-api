import { createRfp, createStandardRfp, createRfpWordDocument } from "../services/rfpCreator";
import type { RfpSection } from "../services/rfpCreator";
import { createErrorResponse, createSuccessResponse } from "../utils/errorHandler";

interface CreateRfpRequest {
  title: string;
  organization: string;
  deadline: string;
  sections?: RfpSection[];
}

export async function downloadRfpHandler(req: Request): Promise<Response> {
  try {
    // Get JSON data from request
    const requestData = await req.json() as CreateRfpRequest;
    
    // Validate required fields
    if (!requestData.title || !requestData.organization || !requestData.deadline) {
      return new Response(JSON.stringify({ 
        error: "Missing required fields: title, organization, and deadline are required" 
      }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }
    
    let rfpContent: import("../services/rfpCreator").RfpContent;
    
    if (requestData.sections && requestData.sections.length > 0) {
      // Create custom RFP with provided sections
      try {
        rfpContent = await createRfp({
          title: requestData.title,
          organization: requestData.organization,
          deadline: requestData.deadline,
          sections: requestData.sections
        });
      } catch (rfpError: any) {
        console.error('[DownloadRfpHandler] Error creating custom RFP:', rfpError);
        return new Response(JSON.stringify({ 
          error: `Failed to create custom RFP: ${rfpError.message || "Unknown error"}` 
        }), { 
          status: 500, 
          headers: { "Content-Type": "application/json" } 
        });
      }
    } else {
      // Create standard RFP with default sections
      try {
        rfpContent = await createStandardRfp(
          requestData.title,
          requestData.organization,
          requestData.deadline
        );
      } catch (standardRfpError: any) {
        console.error('[DownloadRfpHandler] Error creating standard RFP:', standardRfpError);
        return new Response(JSON.stringify({ 
          error: `Failed to create standard RFP: ${standardRfpError.message || "Unknown error"}` 
        }), { 
          status: 500, 
          headers: { "Content-Type": "application/json" } 
        });
      }
    }
    
    // Validate that we have content to work with
    if (!rfpContent) {
      console.error('[DownloadRfpHandler] No RFP content generated');
      return new Response(JSON.stringify({ 
        error: "Failed to generate RFP content" 
      }), { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      });
    }
    
    // Validate that we have sections
    if (!rfpContent.sections || rfpContent.sections.length === 0) {
      console.warn('[DownloadRfpHandler] No sections in RFP content, creating default section');
      rfpContent.sections = [{
        title: "Untitled Section",
        content: "Please provide detailed information for this section."
      }];
    }
    
    // Create Word document from the RFP content
    console.log('[DownloadRfpHandler] Generating Word document...');
    try {
      const wordBuffer = await createRfpWordDocument(rfpContent);
      console.log('[DownloadRfpHandler] Word document generated successfully');
      
      // Return the Word document as a downloadable file
      return new Response(wordBuffer, { 
        headers: { 
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${requestData.title.replace(/\s+/g, '_')}_RFP.docx"`
        } 
      });
    } catch (docError: any) {
      console.error('[DownloadRfpHandler] Error generating Word document:', docError);
      return new Response(JSON.stringify({ 
        error: `Failed to generate Word document: ${docError.message || "Unknown error"}` 
      }), { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      });
    }
  } catch (error: any) {
    console.error('[DownloadRfpHandler] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to create RFP" 
    }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}