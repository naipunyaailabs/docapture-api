import mongoose from 'mongoose';
import Service from '../models/Service';

// Document processing services with updated formats
const documentServices = [
  {
    id: "field-extractor",
    slug: "field-extractor",
    name: "Field Flex AI",
    description: "Extract user-defined fields from documents with smart Excel conversion",
    longDescription: "Upload your documents and specify the exact field names you need to extract. Ideal for unique or rapidly changing document structures. Save your field configurations as templates for quick reuse. Automatically converts extracted data to Excel format.",
    endpoint: "/extract",
    supportedFormats: ["excel"], // Removed JSON format
    supportedFileTypes: [".pdf", ".jpg", ".jpeg", ".png", ".docx", ".doc", ".txt"],
    icon: "ListChecks",
    category: "Template Extraction",
    fileFieldName: "document",
    isActive: true
  },
  {
    id: "document-summarizer",
    slug: "document-summarizer",
    name: "Docu Summarizer AI",
    description: "Create comprehensive summaries of documents in PDF or Word format",
    longDescription: "Generate concise, accurate summaries of any document with key points and important details highlighted. Download summaries in PDF or Word format for easy sharing and storage.",
    endpoint: "/summarize",
    supportedFormats: ["pdf", "docx"], // Updated to support PDF and Word formats
    supportedFileTypes: [".pdf", ".jpg", ".jpeg", ".png", ".docx", ".doc", ".txt"],
    icon: "FileText",
    category: "Document Processing",
    fileFieldName: "document",
    isActive: true
  },
  {
    id: "rfp-creator",
    slug: "rfp-creator",
    name: "RFP Creator",
    description: "Generate professional RFP documents",
    longDescription: "Create comprehensive Request for Proposal (RFP) documents with customizable sections, requirements, and formatting. Save time on proposal development with AI-assisted RFP generation.",
    endpoint: "/create-rfp",
    supportedFormats: ["docx"],
    supportedFileTypes: [".txt", ".json"],
    icon: "FilePlus",
    category: "Document Creation",
    fileFieldName: "data",
    isActive: true
  },
  {
    id: "rfp-summarizer",
    slug: "rfp-summarizer",
    name: "RFP Summarizer",
    description: "Summarize RFP documents for quick review with smart Excel conversion",
    longDescription: "Extract key requirements, deadlines, and important information from RFP documents. Get a structured overview of RFP content to quickly understand submission requirements. Automatically converts summary data to Excel format.",
    endpoint: "/summarize-rfp",
    supportedFormats: ["excel"], // Only Excel format supported
    supportedFileTypes: [".pdf", ".docx"],
    icon: "FileBarChart",
    category: "Document Processing",
    fileFieldName: "document",
    isActive: true
  },
  {
    id: "template-uploader",
    slug: "template-uploader",
    name: "Template Uploader",
    description: "Upload and store document templates with smart Excel conversion",
    longDescription: "Upload document templates for reuse in field extraction. Store templates with predefined field configurations for consistent data extraction across similar documents. Automatically converts template data to Excel format.",
    endpoint: "/upload",
    supportedFormats: ["excel"], // Removed JSON format
    supportedFileTypes: [".pdf", ".jpg", ".jpeg", ".png", ".docx", ".doc", ".txt"],
    icon: "Upload",
    category: "Template Management",
    fileFieldName: "document",
    isActive: true
  }
];

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/docapture';

async function addDocumentServices() {
  try {
    console.log('Connecting to MongoDB...');
    console.log('URI:', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    
    console.log('Connected to MongoDB successfully!');
    console.log('Adding document processing services...');
    
    for (const serviceData of documentServices) {
      // Check if service already exists
      const existingService = await Service.findOne({ id: serviceData.id });
      if (existingService) {
        console.log(`Service ${serviceData.name} already exists, updating...`);
        // Update existing service
        await Service.updateOne({ id: serviceData.id }, serviceData);
      } else {
        // Create new service
        const service = new Service(serviceData);
        await service.save();
        console.log(`Added service: ${serviceData.name}`);
      }
    }
    
    console.log('All document services processed successfully');
    console.log(`Total services: ${documentServices.length}`);
  } catch (error) {
    console.error('Error adding document services:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  }
}

addDocumentServices();

export { documentServices };