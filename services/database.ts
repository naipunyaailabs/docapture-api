import mongoose from 'mongoose';

class DatabaseService {
  private static instance: DatabaseService;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async connect(): Promise<void> {
    if (this.isConnected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      // Try cloud MongoDB first
      const cloudMongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
      const localMongoUri = 'mongodb://localhost:27017/docapture';
      
      if (cloudMongoUri) {
        try {
          console.log('Attempting to connect to cloud MongoDB...');
          await mongoose.connect(cloudMongoUri, {
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
          });
          
          this.isConnected = true;
          this.isConnecting = false;
          console.log('Connected to cloud MongoDB');
          return;
        } catch (cloudError) {
          console.error('Cloud MongoDB connection error:', cloudError);
          console.log('Falling back to local MongoDB...');
        }
      }
      
      // Fallback to local MongoDB
      console.log('Attempting to connect to local MongoDB...');
      await mongoose.connect(localMongoUri, {
        serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      });
      
      this.isConnected = true;
      this.isConnecting = false;
      console.log('Connected to local MongoDB');
    } catch (error) {
      this.isConnecting = false;
      console.error('MongoDB connection error:', error);
      console.log('Running in fallback mode without database persistence');
      // Don't throw the error to allow the application to continue running
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('Disconnected from MongoDB');
    }
  }

  isConnectedToDatabase(): boolean {
    return this.isConnected;
  }
}

export default DatabaseService.getInstance();