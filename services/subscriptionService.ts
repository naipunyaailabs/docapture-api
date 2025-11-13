import Subscription, { type ISubscription, SubscriptionStatus } from '../models/Subscription';

class SubscriptionService {
  // Create trial subscription for new user
  async createTrialSubscription(userId: string): Promise<ISubscription | null> {
    try {
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const subscription = new Subscription({
        userId,
        planId: 'trial',
        planName: 'Trial',
        documentsLimit: 5,
        documentsUsed: 0,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        status: SubscriptionStatus.Trial
      });

      await subscription.save();
      return subscription;
    } catch (error) {
      console.error('Error creating trial subscription:', error);
      return null;
    }
  }

  // Get user's current subscription
  async getUserSubscription(userId: string): Promise<ISubscription | null> {
    try {
      return await Subscription.findOne({ userId, status: { $in: [SubscriptionStatus.Trial, SubscriptionStatus.Active] } })
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      console.error('Error getting user subscription:', error);
      return null;
    }
  }

  // Check if user can process document (has quota)
  async canProcessDocument(userId: string): Promise<{ canProcess: boolean; subscription: ISubscription | null; message?: string }> {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription) {
        return {
          canProcess: false,
          subscription: null,
          message: 'No active subscription found'
        };
      }

      // Check if subscription is expired
      if (subscription.currentPeriodEnd < new Date()) {
        subscription.status = SubscriptionStatus.Expired;
        await subscription.save();
        return {
          canProcess: false,
          subscription,
          message: 'Subscription expired. Please renew your plan.'
        };
      }

      // Check document limit
      if (subscription.documentsUsed >= subscription.documentsLimit) {
        return {
          canProcess: false,
          subscription,
          message: `You've reached your limit of ${subscription.documentsLimit} documents for this period.`
        };
      }

      return {
        canProcess: true,
        subscription
      };
    } catch (error) {
      console.error('Error checking document quota:', error);
      return {
        canProcess: false,
        subscription: null,
        message: 'Error checking subscription status'
      };
    }
  }

  // Increment document usage
  async incrementDocumentUsage(userId: string): Promise<ISubscription | null> {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription) {
        return null;
      }

      subscription.documentsUsed += 1;
      await subscription.save();
      
      return subscription;
    } catch (error) {
      console.error('Error incrementing document usage:', error);
      return null;
    }
  }

  // Upgrade subscription
  async upgradeSubscription(
    userId: string, 
    planId: string, 
    planName: string, 
    documentsLimit: number,
    paymentCustomerId?: string,
    paymentSubscriptionId?: string
  ): Promise<ISubscription | null> {
    try {
      // Cancel existing subscription
      await Subscription.updateMany(
        { userId, status: { $in: [SubscriptionStatus.Trial, SubscriptionStatus.Active] } },
        { status: SubscriptionStatus.Cancelled }
      );

      // Create new subscription
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const subscription = new Subscription({
        userId,
        planId,
        planName,
        documentsLimit,
        documentsUsed: 0,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        status: SubscriptionStatus.Active,
        paymentCustomerId,
        paymentSubscriptionId
      });

      await subscription.save();
      return subscription;
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      return null;
    }
  }

  // Get usage statistics
  async getUsageStats(userId: string): Promise<{
    documentsUsed: number;
    documentsLimit: number;
    planId: string;
    planName: string;
    usagePercentage: number;
    daysRemaining: number;
  } | null> {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription) {
        return null;
      }

      const now = new Date();
      const daysRemaining = Math.ceil((subscription.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const usagePercentage = (subscription.documentsUsed / subscription.documentsLimit) * 100;

      return {
        documentsUsed: subscription.documentsUsed,
        documentsLimit: subscription.documentsLimit,
        planId: subscription.planId,
        planName: subscription.planName,
        usagePercentage,
        daysRemaining
      };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return null;
    }
  }
}

export default new SubscriptionService();
