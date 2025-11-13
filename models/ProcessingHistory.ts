import mongoose, { Document, Schema } from 'mongoose';

export interface IProcessingHistory extends Document {
  userId: string;
  serviceId: string;
  serviceName: string;
  fileName: string;
  fileSize: number;
  format: string;
  status: 'completed' | 'failed' | 'processing';
  result: any;
  error?: string;
  logs?: string[];
  processedAt: Date;
  processingTime?: number; // in milliseconds
  createdAt: Date;
}

const ProcessingHistorySchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  serviceId: { type: String, required: true },
  serviceName: { type: String, required: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  format: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['completed', 'failed', 'processing'],
    required: true 
  },
  result: { type: Schema.Types.Mixed },
  error: { type: String },
  logs: [{ type: String }],
  processedAt: { type: Date, default: Date.now },
  processingTime: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

// Create compound index for efficient queries
ProcessingHistorySchema.index({ userId: 1, processedAt: -1 });
ProcessingHistorySchema.index({ userId: 1, serviceId: 1 });

export default mongoose.model<IProcessingHistory>('ProcessingHistory', ProcessingHistorySchema);
