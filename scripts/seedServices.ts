import mongoose from 'mongoose';
import Service from '../models/Service';

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/docapture';

// Define the services directly in the script
const services = [
  {
    id: "custom-field-extractor",
    slug: "custom-field-extractor",
    name: "Field Flex AI",
    description: "Extract user-defined fields from documents with smart Excel conversion",
    longDescription: "Upload your documents and specify the exact field names you need to extract. Ideal for unique or rapidly changing document structures. Save your field configurations as templates for quick reuse. Automatically converts extracted data to Excel format.",
    endpoint: "/process-auth/custom-field-extractor",
    supportedFormats: ["excel"],
    supportedFileTypes: [".pdf", ".jpg", ".jpeg", ".png", ".docx", ".doc", ".txt"],
    icon: "ListChecks",
    category: "Template Extraction",
    fileFieldName: "file",
    isActive: true
  },
  {
    id: "college-id",
    slug: "college-id",
    name: "ID Parse AI",
    description: "Extract College ID fields from documents with smart Excel conversion",
    longDescription: "Extract all relevant fields from College ID cards including student information, ID numbers, and other details. Automatically converts extracted data to Excel format.",
    endpoint: "/process-auth/college-id",
    supportedFormats: ["excel"],
    supportedFileTypes: [".pdf", ".jpg", ".jpeg", ".png"],
    icon: "FileCode",
    category: "Identity Verification",
    fileFieldName: "files",
    isActive: true
  },
  {
    id: "driving-license",
    slug: "driving-license",
    name: "DL Extractor AI",
    description: "Extract all fields from driving licenses with smart Excel conversion",
    longDescription: "Extract comprehensive information from driving licenses including personal details, license number, validity, and vehicle categories. Automatically converts extracted data to Excel format.",
    endpoint: "/process-auth/driving-license",
    supportedFormats: ["excel"],
    supportedFileTypes: [".jpg", ".jpeg", ".png", ".pdf"],
    icon: "FileSearch",
    category: "Identity Verification",
    fileFieldName: "files",
    isActive: true
  },
  {
    id: "table-extraction",
    slug: "table-extraction",
    name: "Tablify AI",
    description: "Extract all tables from PDFs with smart Excel conversion",
    longDescription: "Extract all tables from PDF documents and export them as Excel files with multiple sheets. Automatically converts extracted data to Excel format.",
    endpoint: "/process-auth/table-extraction",
    supportedFormats: ["excel"],
    supportedFileTypes: [".pdf"],
    icon: "Table",
    category: "Data Extraction",
    fileFieldName: "files",
    isActive: true
  },
  {
    id: "invoice",
    slug: "invoice",
    name: "Bill Bot AI",
    description: "Extract and classify invoice data with smart Excel conversion",
    longDescription: "Extract, classify and structure invoice/business document data including line items, totals, vendor information, and dates. Automatically converts extracted data to Excel format.",
    endpoint: "/process-auth/invoice",
    supportedFormats: ["excel"],
    supportedFileTypes: [".pdf", ".jpg", ".jpeg", ".png"],
    icon: "FileBarChart",
    category: "Data Extraction",
    fileFieldName: "file",
    isActive: true
  },
  {
    id: "aadhaar",
    slug: "aadhaar",
    name: "Aadhaar Capture AI",
    description: "Extract information from Aadhaar cards with smart Excel conversion",
    longDescription: "Extract all fields from Aadhaar cards including name, Aadhaar number, address, and other personal details. Automatically converts extracted data to Excel format.",
    endpoint: "/process-auth/aadhaar",
    supportedFormats: ["excel"],
    supportedFileTypes: [".jpg", ".jpeg", ".png", ".pdf"],
    icon: "FileCheck",
    category: "Identity Verification",
    fileFieldName: "files",
    isActive: true
  },
  {
    id: "pan-card",
    slug: "pan-card",
    name: "PAN Bot AI",
    description: "Extract PAN card information with smart Excel conversion",
    longDescription: "Extract all relevant fields from PAN cards including name, PAN number, date of birth, and other details. Automatically converts extracted data to Excel format.",
    endpoint: "/process-auth/pan-card",
    supportedFormats: ["excel"],
    supportedFileTypes: [".jpg", ".jpeg", ".png", ".pdf"],
    icon: "FileText",
    category: "Identity Verification",
    fileFieldName: "files",
    isActive: true
  },
  {
    id: "voter-id",
    slug: "voter-id",
    name: "Election ID Extractor AI",
    description: "Extract Voter ID information with smart Excel conversion",
    longDescription: "Extract all fields from Voter ID cards including EPIC number, name, address, and other electoral details. Automatically converts extracted data to Excel format.",
    endpoint: "/process-auth/voter-id",
    supportedFormats: ["excel"],
    supportedFileTypes: [".jpg", ".jpeg", ".png", ".pdf"],
    icon: "FileCode",
    category: "Identity Verification",
    fileFieldName: "files",
    isActive: true
  },
  {
    id: "generic-extractor",
    slug: "generic-extractor",
    name: "Docu Flex AI",
    description: "Extract tables and text from any document with smart Excel conversion",
    longDescription: "A versatile extractor that can handle various document types and extract both tables and text content. Automatically converts extracted data to Excel format.",
    endpoint: "/process-auth/generic-extractor",
    supportedFormats: ["excel"],
    supportedFileTypes: [".pdf", ".jpg", ".jpeg", ".png", ".docx", ".doc"],
    icon: "FileText",
    category: "Data Extraction",
    fileFieldName: "files",
    isActive: true
  },
  {
    id: "groq-extraction",
    slug: "groq-extraction",
    name: "Textura AI",
    description: "Advanced text extraction using AI with smart Excel conversion",
    longDescription: "Use advanced AI models to extract and structure data from arbitrary documents with high accuracy. Automatically converts extracted data to Excel format.",
    endpoint: "/process-auth/groq-extraction",
    supportedFormats: ["excel"],
    supportedFileTypes: [".pdf", ".jpg", ".jpeg", ".png"],
    icon: "Brain",
    category: "Data Extraction",
    fileFieldName: "files",
    isActive: true
  }
];

async function seedServices() {
  try {
    console.log('Connecting to MongoDB...');
    console.log('URI:', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    
    console.log('Connected to MongoDB successfully!');
    
    // Clear existing services
    console.log('Clearing existing services...');
    await Service.deleteMany({});
    console.log('Existing services cleared.');
    
    // Insert services
    for (const service of services) {
      const serviceData = {
        ...service,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await Service.create(serviceData);
      console.log(`Created service: ${service.name}`);
    }
    
    console.log('Services seeded successfully!');
    console.log(`Total services created: ${services.length}`);
    
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding services:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedServices();