import { createErrorResponse, createSuccessResponse } from "../utils/errorHandler";
import serviceService from "../services/serviceService";
import { authenticateRequest } from "../utils/auth";

export async function servicesHandler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split("/").filter(segment => segment);
    // Expected path: /services or /services/{serviceId}
    const serviceId = pathSegments[1]; // e.g., "custom-field-extractor"

    console.log(`[ServicesHandler] Request received for path: ${url.pathname}`);
    console.log(`[ServicesHandler] Method: ${req.method}`);
    console.log(`[ServicesHandler] Service ID: ${serviceId}`);
    
    // Log the Authorization header for debugging
    const authHeader = req.headers.get("Authorization");
    console.log(`[ServicesHandler] Authorization header: ${authHeader}`);
    
    // Apply authentication to all service routes - allow both API key and user token
    const authResponse = authenticateRequest(req);
    if (authResponse) {
      console.log(`[ServicesHandler] Authentication failed, returning 401`);
      return authResponse;
    }

    if (req.method === "GET" && !serviceId) {
      // GET /services - List all services
      console.log(`[ServicesHandler] Handling list services request`);
      return await listServicesHandler(req);
    } else if (req.method === "GET" && serviceId) {
      // GET /services/{serviceId} - Get specific service
      console.log(`[ServicesHandler] Handling get service request for ID: ${serviceId}`);
      return await getServiceHandler(req, serviceId);
    } else {
      console.log(`[ServicesHandler] Method not allowed: ${req.method}`);
      return createErrorResponse("Method not allowed", 405);
    }
  } catch (error) {
    console.error("[Services Handler Error]:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

async function listServicesHandler(req: Request): Promise<Response> {
  try {
    const services = await serviceService.findAllServices();
    console.log(`[ServicesHandler] findAllServices returned ${services?.length || 0} services`);
    if (!services) {
      return createErrorResponse("Failed to retrieve services", 500);
    }
    
    return createSuccessResponse(services);
  } catch (error) {
    console.error("[List Services Handler Error]:", error);
    return createErrorResponse("Failed to retrieve services", 500);
  }
}

async function getServiceHandler(req: Request, serviceId: string): Promise<Response> {
  try {
    // Try to find by ID first, then by slug
    let service = await serviceService.findServiceById(serviceId);
    if (!service) {
      service = await serviceService.findServiceBySlug(serviceId);
    }
    
    if (!service) {
      return createErrorResponse("Service not found", 404);
    }
    
    return createSuccessResponse(service);
  } catch (error) {
    console.error("[Get Service Handler Error]:", error);
    return createErrorResponse("Failed to retrieve service", 500);
  }
}