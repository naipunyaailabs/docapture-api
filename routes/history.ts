import { createErrorResponse, createSuccessResponse } from "../utils/errorHandler";
import processingHistoryService from "../services/processingHistoryService";
import sessionService from "../services/sessionService";

export async function historyHandler(req: Request): Promise<Response> {
  try {
    // Get user from session
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return createErrorResponse("Unauthorized", 401);
    }

    const token = authHeader.substring(7);
    const userId = sessionService.getUserIdFromToken(token);
    if (!userId) {
      return createErrorResponse("Invalid session", 401);
    }

    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(segment => segment);
    const action = pathSegments[1]; // history/{action} or history/{id}

    if (req.method === "GET" && !action) {
      return await getProcessingHistory(req, userId);
    } else if (req.method === "GET" && action === "analytics") {
      return await getAnalytics(req, userId);
    } else if (req.method === "GET" && action) {
      return await getProcessingRecordById(action, userId);
    } else if (req.method === "POST") {
      return await createProcessingRecord(req, userId);
    } else if (req.method === "DELETE" && action) {
      return await deleteProcessingRecord(action, userId);
    } else {
      return createErrorResponse("Not Found", 404);
    }
  } catch (error) {
    console.error("[History Handler Error]:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

async function getProcessingHistory(req: Request, userId: string): Promise<Response> {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const serviceId = url.searchParams.get('serviceId') || undefined;

    const history = await processingHistoryService.getUserProcessingHistory(
      userId,
      limit,
      offset,
      serviceId
    );

    const formattedHistory = history.map(record => ({
      id: (record._id as any).toString(),
      serviceId: record.serviceId,
      serviceName: record.serviceName,
      fileName: record.fileName,
      fileSize: record.fileSize,
      format: record.format,
      status: record.status,
      result: record.result,
      error: record.error,
      logs: record.logs,
      processedAt: record.processedAt.toISOString(),
      processingTime: record.processingTime
    }));

    return createSuccessResponse(formattedHistory);
  } catch (error) {
    console.error("[Get Processing History Error]:", error);
    return createErrorResponse("Failed to get processing history", 500);
  }
}

async function getProcessingRecordById(id: string, userId: string): Promise<Response> {
  try {
    const record = await processingHistoryService.getProcessingRecordById(id, userId);
    
    if (!record) {
      return createErrorResponse("Processing record not found", 404);
    }

    return createSuccessResponse({
      id: (record._id as any).toString(),
      serviceId: record.serviceId,
      serviceName: record.serviceName,
      fileName: record.fileName,
      fileSize: record.fileSize,
      format: record.format,
      status: record.status,
      result: record.result,
      error: record.error,
      logs: record.logs,
      processedAt: record.processedAt.toISOString(),
      processingTime: record.processingTime
    });
  } catch (error) {
    console.error("[Get Processing Record Error]:", error);
    return createErrorResponse("Failed to get processing record", 500);
  }
}

async function getAnalytics(req: Request, userId: string): Promise<Response> {
  try {
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get('days') || '30');

    const analytics = await processingHistoryService.getAnalytics(userId, days);

    return createSuccessResponse(analytics);
  } catch (error) {
    console.error("[Get Analytics Error]:", error);
    return createErrorResponse("Failed to get analytics", 500);
  }
}

async function createProcessingRecord(req: Request, userId: string): Promise<Response> {
  try {
    const body: any = await req.json();
    const {
      serviceId,
      serviceName,
      fileName,
      fileSize,
      format,
      status,
      result,
      error,
      logs,
      processingTime
    } = body;

    if (!serviceId || !serviceName || !fileName || !format || !status) {
      return createErrorResponse("Missing required fields", 400);
    }

    const record = await processingHistoryService.createProcessingRecord({
      userId,
      serviceId,
      serviceName,
      fileName,
      fileSize: fileSize || 0,
      format,
      status,
      result,
      error,
      logs,
      processingTime
    });

    if (!record) {
      return createErrorResponse("Failed to create processing record", 500);
    }

    return createSuccessResponse({
      id: (record._id as any).toString(),
      serviceId: record.serviceId,
      serviceName: record.serviceName,
      fileName: record.fileName,
      processedAt: record.processedAt.toISOString()
    }, 201);
  } catch (error) {
    console.error("[Create Processing Record Error]:", error);
    return createErrorResponse("Failed to create processing record", 500);
  }
}

async function deleteProcessingRecord(id: string, userId: string): Promise<Response> {
  try {
    const success = await processingHistoryService.deleteProcessingRecord(id, userId);
    
    if (!success) {
      return createErrorResponse("Failed to delete processing record", 500);
    }

    return createSuccessResponse({ message: "Processing record deleted successfully" });
  } catch (error) {
    console.error("[Delete Processing Record Error]:", error);
    return createErrorResponse("Failed to delete processing record", 500);
  }
}
