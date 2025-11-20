import sessionService from "../services/sessionService";

/**
 * Validates API key from Authorization header
 * @param req - The incoming request
 * @returns boolean indicating if the API key is valid
 */
export function validateApiKey(req: Request): boolean {
  // In a production environment, you would check against a database or environment variable
  // For now, we'll use a simple check against the environment variable
  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("[Auth] No valid Authorization header found");
    return false;
  }
  
  const apiKey = authHeader.substring(7); // Remove "Bearer " prefix
  const validApiKey = process.env.API_KEY;
  
  console.log(`[Auth] Received API key: ${apiKey.substring(0, 10)}...`);
  console.log(`[Auth] Expected API key: ${validApiKey?.substring(0, 10)}...`);
  
  // If no API key is configured, allow all requests (development mode)
  if (!validApiKey) {
    console.warn("No API_KEY configured in environment variables. Authentication is disabled.");
    return true;
  }
  
  const isValid = apiKey === validApiKey;
  console.log(`[Auth] API key validation result: ${isValid}`);
  return isValid;
}

/**
 * Validates user token from Authorization header
 * @param req - The incoming request
 * @returns string with userId if valid, null if invalid
 */
export function validateUserToken(req: Request): string | null {
  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("[Auth] No valid Authorization header for user token validation");
    return null;
  }
  
  const token = authHeader.substring(7); // Remove "Bearer " prefix
  const userId = sessionService.getUserIdFromToken(token);
  
  console.log(`[Auth] User token validation result: ${userId ? 'valid' : 'invalid'}`);
  return userId;
}

/**
 * Validates either API key or user token from Authorization header
 * @param req - The incoming request
 * @returns object with isValid flag and type of authentication
 */
export function validateAuthentication(req: Request): { isValid: boolean; type: 'api_key' | 'user_token' | 'none'; userId?: string } {
  // First try to validate user token
  const userId = validateUserToken(req);
  if (userId) {
    console.log("[Auth] User token validation successful");
    return { isValid: true, type: 'user_token', userId };
  }
  
  // Then try to validate API key
  if (validateApiKey(req)) {
    console.log("[Auth] API key validation successful");
    return { isValid: true, type: 'api_key' };
  }
  
  // No valid authentication
  console.log("[Auth] No valid authentication found");
  return { isValid: false, type: 'none' };
}

/**
 * Middleware function to protect routes with API key authentication
 * @param req - The incoming request
 * @returns Response with 401 error if authentication fails, null if successful
 */
export function authenticateRequest(req: Request): Response | null {
  // Allow OPTIONS preflight requests without authentication
  if (req.method === "OPTIONS") {
    return null;
  }
  
  if (!validateApiKey(req)) {
    return new Response(
      JSON.stringify({ 
        error: "Unauthorized", 
        message: "Invalid or missing API key" 
      }), 
      { 
        status: 401, 
        headers: { 
          "Content-Type": "application/json",
          "WWW-Authenticate": "Bearer realm=\"API Key Required\"" 
        } 
      }
    );
  }
  
  return null; // Authentication successful
}