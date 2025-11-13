import { createErrorResponse, createSuccessResponse } from "../utils/errorHandler";
import subscriptionService from "../services/subscriptionService";
import sessionService from "../services/sessionService";

export async function subscriptionHandler(req: Request): Promise<Response> {
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
    const action = pathSegments[1]; // subscription/{action}

    if (req.method === "GET" && action === "current") {
      return await getCurrentSubscription(userId);
    } else if (req.method === "GET" && action === "usage") {
      return await getUsageStatus(userId);
    } else if (req.method === "POST" && action === "upgrade") {
      return await upgradeSubscription(req, userId);
    } else if (req.method === "POST" && action === "increment") {
      return await incrementUsage(userId);
    } else {
      return createErrorResponse("Not Found", 404);
    }
  } catch (error) {
    console.error("[Subscription Handler Error]:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

async function getCurrentSubscription(userId: string): Promise<Response> {
  try {
    const subscription = await subscriptionService.getUserSubscription(userId);
    
    if (!subscription) {
      return createErrorResponse("No active subscription found", 404);
    }

    return createSuccessResponse({
      id: String(subscription._id),
      userId: subscription.userId,
      planId: subscription.planId,
      planName: subscription.planName,
      documentsLimit: subscription.documentsLimit,
      documentsUsed: subscription.documentsUsed,
      currentPeriodStart: subscription.currentPeriodStart.toISOString(),
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      status: subscription.status,
      paymentCustomerId: subscription.paymentCustomerId,
      paymentSubscriptionId: subscription.paymentSubscriptionId
    });
  } catch (error) {
    console.error("[Get Current Subscription Error]:", error);
    return createErrorResponse("Failed to get subscription", 500);
  }
}

async function getUsageStatus(userId: string): Promise<Response> {
  try {
    const { canProcess, subscription, message } = await subscriptionService.canProcessDocument(userId);
    
    if (!subscription) {
      return createErrorResponse(message || "No active subscription found", 404);
    }

    return createSuccessResponse({
      canProcess,
      documentsUsed: subscription.documentsUsed,
      documentsLimit: subscription.documentsLimit,
      planId: subscription.planId,
      planName: subscription.planName,
      message: message || `You have ${subscription.documentsLimit - subscription.documentsUsed} documents remaining.`
    });
  } catch (error) {
    console.error("[Get Usage Status Error]:", error);
    return createErrorResponse("Failed to get usage status", 500);
  }
}

async function upgradeSubscription(req: Request, userId: string): Promise<Response> {
  try {
    const body: any = await req.json();
    const { planId, planName, documentsLimit, paymentCustomerId, paymentSubscriptionId } = body;

    if (!planId || !planName || !documentsLimit) {
      return createErrorResponse("Plan details are required", 400);
    }

    const subscription = await subscriptionService.upgradeSubscription(
      userId,
      planId,
      planName,
      documentsLimit,
      paymentCustomerId,
      paymentSubscriptionId
    );

    if (!subscription) {
      return createErrorResponse("Failed to upgrade subscription", 500);
    }

    return createSuccessResponse({
      id: String(subscription._id),
      userId: subscription.userId,
      planId: subscription.planId,
      planName: subscription.planName,
      documentsLimit: subscription.documentsLimit,
      documentsUsed: subscription.documentsUsed,
      currentPeriodStart: subscription.currentPeriodStart.toISOString(),
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      status: subscription.status
    });
  } catch (error) {
    console.error("[Upgrade Subscription Error]:", error);
    return createErrorResponse("Failed to upgrade subscription", 500);
  }
}

async function incrementUsage(userId: string): Promise<Response> {
  try {
    const subscription = await subscriptionService.incrementDocumentUsage(userId);
    
    if (!subscription) {
      return createErrorResponse("Failed to increment usage", 500);
    }

    return createSuccessResponse({
      documentsUsed: subscription.documentsUsed,
      documentsLimit: subscription.documentsLimit,
      remaining: subscription.documentsLimit - subscription.documentsUsed
    });
  } catch (error) {
    console.error("[Increment Usage Error]:", error);
    return createErrorResponse("Failed to increment usage", 500);
  }
}
