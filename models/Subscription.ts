import mongoose, { Document, Schema } from 'mongoose';

export enum SubscriptionStatus {
  Trial = 'trial',
  Active = 'active',
  Cancelled = 'cancelled',
  Expired = 'expired'
}

export interface ISubscription extends Document {
  userId: string;
  planId: string;
  planName: string;
  documentsLimit: number;
  documentsUsed: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  status: SubscriptionStatus;
  paymentCustomerId?: string;
  paymentSubscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  planId: { type: String, required: true },
  planName: { type: String, required: true },
  documentsLimit: { type: Number, required: true },
  documentsUsed: { type: Number, default: 0 },
  currentPeriodStart: { type: Date, required: true },
  currentPeriodEnd: { type: Date, required: true },
  status: { 
    type: String, 
    enum: Object.values(SubscriptionStatus),
    default: SubscriptionStatus.Trial 
  },
  paymentCustomerId: { type: String },
  paymentSubscriptionId: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt timestamp on save
SubscriptionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
