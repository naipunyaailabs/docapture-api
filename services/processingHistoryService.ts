import ProcessingHistory, { type IProcessingHistory } from '../models/ProcessingHistory';

class ProcessingHistoryService {
  // Create processing history record
  async createProcessingRecord(data: {
    userId: string;
    serviceId: string;
    serviceName: string;
    fileName: string;
    fileSize: number;
    format: string;
    status: 'completed' | 'failed' | 'processing';
    result?: any;
    error?: string;
    logs?: string[];
    processingTime?: number;
  }): Promise<IProcessingHistory | null> {
    try {
      const record = new ProcessingHistory({
        ...data,
        processedAt: new Date()
      });

      await record.save();
      return record;
    } catch (error) {
      console.error('Error creating processing record:', error);
      return null;
    }
  }

  // Get user's processing history
  async getUserProcessingHistory(
    userId: string, 
    limit: number = 50, 
    offset: number = 0,
    serviceId?: string
  ): Promise<IProcessingHistory[]> {
    try {
      const query: any = { userId };
      
      if (serviceId) {
        query.serviceId = serviceId;
      }

      return await ProcessingHistory.find(query)
        .sort({ processedAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec();
    } catch (error) {
      console.error('Error getting processing history:', error);
      return [];
    }
  }

  // Get processing record by ID
  async getProcessingRecordById(id: string, userId: string): Promise<IProcessingHistory | null> {
    try {
      return await ProcessingHistory.findOne({ _id: id, userId }).exec();
    } catch (error) {
      console.error('Error getting processing record:', error);
      return null;
    }
  }

  // Get analytics data
  async getAnalytics(userId: string, days: number = 30): Promise<{
    totalProcessed: number;
    successRate: number;
    avgProcessingTime: number;
    documentsThisMonth: number;
    serviceBreakdown: Array<{
      serviceId: string;
      serviceName: string;
      count: number;
      successRate: number;
    }>;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const records = await ProcessingHistory.find({
        userId,
        processedAt: { $gte: startDate }
      }).exec();

      const totalProcessed = records.length;
      const completed = records.filter(r => r.status === 'completed').length;
      const successRate = totalProcessed > 0 ? (completed / totalProcessed) * 100 : 0;

      const processingTimes = records
        .filter(r => r.processingTime)
        .map(r => r.processingTime!);
      
      const avgProcessingTime = processingTimes.length > 0
        ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length / 1000 // Convert to seconds
        : 0;

      // Documents this month
      const thisMonthStart = new Date();
      thisMonthStart.setDate(1);
      thisMonthStart.setHours(0, 0, 0, 0);

      const documentsThisMonth = await ProcessingHistory.countDocuments({
        userId,
        processedAt: { $gte: thisMonthStart }
      });

      // Service breakdown
      const serviceMap = new Map<string, { count: number; completed: number; name: string }>();
      
      records.forEach(record => {
        const existing = serviceMap.get(record.serviceId) || { 
          count: 0, 
          completed: 0, 
          name: record.serviceName 
        };
        
        existing.count++;
        if (record.status === 'completed') {
          existing.completed++;
        }
        
        serviceMap.set(record.serviceId, existing);
      });

      const serviceBreakdown = Array.from(serviceMap.entries()).map(([serviceId, data]) => ({
        serviceId,
        serviceName: data.name,
        count: data.count,
        successRate: (data.completed / data.count) * 100
      }));

      return {
        totalProcessed,
        successRate,
        avgProcessingTime,
        documentsThisMonth,
        serviceBreakdown
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      return {
        totalProcessed: 0,
        successRate: 0,
        avgProcessingTime: 0,
        documentsThisMonth: 0,
        serviceBreakdown: []
      };
    }
  }

  // Update processing record
  async updateProcessingRecord(
    id: string, 
    userId: string, 
    updates: Partial<IProcessingHistory>
  ): Promise<IProcessingHistory | null> {
    try {
      return await ProcessingHistory.findOneAndUpdate(
        { _id: id, userId },
        updates,
        { new: true }
      ).exec();
    } catch (error) {
      console.error('Error updating processing record:', error);
      return null;
    }
  }

  // Delete processing record
  async deleteProcessingRecord(id: string, userId: string): Promise<boolean> {
    try {
      const result = await ProcessingHistory.deleteOne({ _id: id, userId }).exec();
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting processing record:', error);
      return false;
    }
  }
}

export default new ProcessingHistoryService();
