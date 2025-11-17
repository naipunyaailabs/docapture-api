import { createErrorResponse, createSuccessResponse } from "../utils/errorHandler";
import sessionService from "../services/sessionService";
import subscriptionService from "../services/subscriptionService";
import processingHistoryService from "../services/processingHistoryService";
import { extractHandler } from "./extract";
import { summarizeHandler } from "./summarize";
import { summarizeRfpHandler } from "./summarizeRfp";
import { createRfpHandler } from "./createRfp";
import { uploadHandler } from "./upload";
import { compareQuotationsHandler } from "./compareQuotations";

/**
 * Enhanced document processing handler with user authentication,
 * subscription checking, and history logging
 */
export async function processWithAuthHandler(req: Request): Promise<Response> {
  const startTime = Date.now();
  let userId: string | null = null;
  let fileName = "unknown";
  let fileSize = 0;
  let serviceId = "";
  let serviceName = "";
  
  try {
    // Get user from session
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return createErrorResponse("Unauthorized - User authentication required", 401);
    }

    const token = authHeader.substring(7);
    userId = sessionService.getUserIdFromToken(token);
    if (!userId) {
      return createErrorResponse("Invalid session", 401);
    }

    const url = new URL(req.url);
    const pathSegments = url.pathname.split("/").filter(segment => segment);
    
    // Expected path: /process-auth/{serviceId}
    serviceId = pathSegments[1] || "";

    if (!serviceId) {
      return createErrorResponse("Service ID is required", 400);
    }

    // Get service info - simplified without service lookup
    serviceName = serviceId;

    // Check subscription and quota
    const { canProcess, subscription, message } = await subscriptionService.canProcessDocument(userId);
    
    if (!canProcess) {
      // Log failed attempt
      await processingHistoryService.createProcessingRecord({
        userId,
        serviceId,
        serviceName,
        fileName: "quota_exceeded",
        fileSize: 0,
        format: "none",
        status: "failed",
        error: message || "Document quota exceeded",
        processingTime: Date.now() - startTime
      });

      return createErrorResponse(
        message || "Document processing quota exceeded",
        403
      );
    }

    // Extract file info from request
    const formData = await req.formData();
    const fileEntry = formData.get('document');
    
    if (fileEntry && typeof fileEntry !== 'string') {
      fileName = (fileEntry as any).name || 'document';
      fileSize = (fileEntry as any).size || 0;
    }

    // Route to appropriate handler based on serviceId
    // Pass formData directly to avoid "Body already used" error
    let response: Response;
    
    switch (serviceId) {
      case "field-extractor":
      case "invoice":
      case "receipt":
      case "id-verification":
      case "bank-statement":
      case "custom-field-extractor":
      case "college-id":
      case "driving-license":
      case "table-extraction":
      case "aadhaar":
      case "pan-card":
      case "voter-id":
      case "generic-extractor":
      case "groq-extraction":
        response = await extractHandler(req, formData as any);
        break;
      case "document-summarizer":
        response = await summarizeHandler(req, formData as any);
        break;
      case "quotation-compare":
        response = await compareQuotationsHandler(req, formData as any);
        break;
      case "rfp-creator":
        response = await createRfpHandler(req); // Uses JSON, not FormData
        break;
      case "rfp-summarizer":
        response = await summarizeRfpHandler(req, formData as any);
        break;
      case "template-uploader":
        response = await uploadHandler(req, formData as any);
        break;
      default:
        response = createErrorResponse(`Service ${serviceId} not found`, 404);
    }

    const processingTime = Date.now() - startTime;

    // Parse response to determine status
    let status: 'completed' | 'failed' | 'processing' = 'completed';
    let result: any = null;
    let error: string | undefined;

    try {
      const responseClone = response.clone();
      const responseData: any = await responseClone.json();
      
      if (!response.ok || responseData.error) {
        status = 'failed';
        error = responseData.error || responseData.detail || response.statusText;
      } else {
        result = responseData;
      }
    } catch (e) {
      // If response is not JSON, consider it completed
      status = 'completed';
    }

    // Increment document usage only if successful
    if (status === 'completed') {
      await subscriptionService.incrementDocumentUsage(userId);
    }

    // Log processing history
    await processingHistoryService.createProcessingRecord({
      userId,
      serviceId,
      serviceName,
      fileName,
      fileSize,
      format: formData.get('format') as string || 'json',
      status,
      result,
      error,
      processingTime
    });

    return response;
  } catch (error) {
    console.error("[Process With Auth Handler Error]:", error);
    
    // Log failed processing
    if (userId) {
      await processingHistoryService.createProcessingRecord({
        userId,
        serviceId,
        serviceName,
        fileName,
        fileSize,
        format: 'unknown',
        status: 'failed',
        error: error instanceof Error ? error.message : "Internal server error",
        processingTime: Date.now() - startTime
      });
    }

    return createErrorResponse("Internal server error", 500);
  }
}
