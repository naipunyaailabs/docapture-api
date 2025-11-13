import { unifiedChatCompletion } from "../utils/unifiedClient";
import { extractPdfTextWithUnpdf } from "./pdfParser";
import { pdfToPng } from "pdf-to-png-converter";
import * as fs from "fs";
import * as path from "path";
import { PDFDocument } from 'pdf-lib';
import { detectLanguage } from "../utils/languageDetector";

// Type definitions
type Logger = {
  info: (msg: string, data?: any) => void;
  error: (msg: string, err?: any) => void;
};

/**
 * Preprocess document text for better template matching
 * @param text Document text
 * @returns Preprocessed text with structural information
 */
function preprocessDocumentText(text: string): string {
  // Remove extra whitespace and normalize
  let processed = text.replace(/\s+/g, ' ').trim();
  
  // Extract document structure information
  const lines = processed.split('\n');
  const nonEmptyLines = lines.filter(line => line.trim().length > 0);
  
  // Identify potential headers (lines in uppercase with less than 10 words)
  const headers = nonEmptyLines.filter(line => {
    const trimmed = line.trim();
    return trimmed === trimmed.toUpperCase() && trimmed.split(' ').length <= 10;
  });
  
  // Identify potential data patterns (lines with colons, numbers, dates)
  const dataPatterns = nonEmptyLines.filter(line => {
    return /[:\d\-\/]/.test(line) && line.length > 10;
  });
  
  // Create a structured representation
  const structuredRepresentation = `
Document Structure:
- Total characters: ${processed.length}
- Total lines: ${lines.length}
- Content lines: ${nonEmptyLines.length}
- Headers: ${headers.length}
- Data patterns: ${dataPatterns.length}

Content Preview:
${nonEmptyLines.slice(0, 20).join('\n')}
`;
  
  return structuredRepresentation;
}

type ExtractionResult = {
  directText: string;
  ocrText: string;
  combinedText: string;
};

// Logger factory
function createLogger(): Logger {
  return {
    info: (msg: string, data?: any) => console.log(`[PDF Extractor] ${msg}`, data || ''),
    error: (msg: string, err?: any) => console.error(`[PDF Extractor Error] ${msg}:`, err)
  };
}

async function detectDocumentLanguage(buffer: Buffer, fileName: string): Promise<{language: string, score: number}> {
    try {
        const result = await detectLanguage(buffer);
        return result;
    } catch (error) {
        console.error("[Language Detection] Failed:", error);
        return { language: "unknown", score: 0 };
    }
}

// Function to check if PDF is fully digital
function isFullyDigitalText(text: string): boolean {
  // More lenient check - if we have text and at least a few lines, consider it digital
  return text.length > 0 && text.split('\n').length > 3;
}

// Function to extract text directly from PDF
export async function extractDirectText(buffer: Buffer, logger: Logger): Promise<string> {
  try {
    logger.info('Attempting direct text extraction');
    const text = await extractPdfTextWithUnpdf(buffer);
    const trimmedText = text.trim();
    logger.info('Direct text extraction complete', { charCount: trimmedText.length });
    return trimmedText;
  } catch (error) {
    logger.error('Text extraction failed', error);
    return "";
  }
}

// Function to perform OCR on PDF pages
async function performOcrExtraction(
  buffer: Buffer, 
  totalPages: number, 
  detectedLanguage: string, 
  tmpDir: string,
  logger: Logger
): Promise<string[]> {
  const ocrResults: string[] = [];
  try {
    // Convert PDF to images using the native JS library instead of Python service
    logger.info('Converting PDF to PNG images using native JS library');
    const pngImages = await pdfToPng(buffer, {
      disableFontFace: false,
      useSystemFonts: true
    });

    // Process each page image with OCR
    for (let i = 0; i < pngImages.length; i++) {
      const pageNum = i + 1;
      const pngImage = pngImages[i];
      logger.info(`Processing page ${pageNum}/${pngImages.length}`);
      
      // Check if pngImage exists and has content
      if (!pngImage || !pngImage.content) {
        logger.error(`Failed to get content for page ${pageNum}`);
        continue;
      }
      
      const pageText = await unifiedChatCompletion(
        `You are an intelligent document parsing agent specialized in OCR for ${detectedLanguage} language documents. 
Extract EVERYTHING from this image, including:
- All visible text, no matter how small or faint
- Headers, footers, page numbers
- Tables, charts, and their contents
- Annotations, stamps, watermarks
- Numbers, symbols, special characters
- Any handwritten text
- Metadata and document properties
- Text in all orientations
Pay special attention to ${detectedLanguage} language patterns and characters.
Preserve the exact content, formatting, and layout. Do not omit or summarize anything.`,
        `This is page ${pageNum} of ${pngImages.length} in ${detectedLanguage} language. Extract EVERYTHING visible, preserving all details exactly as they appear.`,
        pngImage.content.toString('base64'),
        'image/png'
      );
      
      if (pageText?.trim()) {
        ocrResults.push(`=== Page ${pageNum} ===\n${pageText.trim()}`);
        logger.info(`Successfully extracted text from page ${pageNum}`);
      }
    }
  } catch (error) {
    logger.error('Image extraction failed', error);
  }
  return ocrResults;
}

// Function to combine extraction results
function combineExtractionResults(
  directText: string, 
  ocrText: string, 
  detectedLanguage: string
): string {
  // If we have direct text, prioritize it
  if (directText.trim()) {
    return `=== Direct Text Extraction (${detectedLanguage}) ===\n${directText.trim()}`;
  }
  
  // If we have OCR text, use it
  if (ocrText.trim()) {
    return `=== OCR Extracted Text (${detectedLanguage}) ===\n${ocrText.trim()}`;
  }
  
  // Return empty string if no text was extracted
  return "";
}

async function extractTextFromPdf(buffer: Buffer, detectedLanguage: string): Promise<string> {
  const logger = createLogger();
  logger.info('Starting PDF text extraction');
  
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const totalPages = pdfDoc.getPageCount();
  logger.info(`PDF has ${totalPages} pages`);

  // Try text extraction
  const directText = await extractDirectText(buffer, logger);

  // If we have sufficient digital text, use it directly
  if (isFullyDigitalText(directText)) {
    logger.info('PDF appears to be fully digital, skipping image extraction');
    return directText;
  }

  logger.info('Starting image-based extraction for potentially scanned content');
  let ocrResults: string[] = [];
  
  try {
    const uniqueId = Date.now().toString();
    const tmpDir = path.resolve(__dirname, "../tmp", uniqueId);
    fs.mkdirSync(tmpDir, { recursive: true });
    logger.info('Created temp directory', { path: tmpDir });

    // Perform OCR extraction for potentially scanned content
    ocrResults = await performOcrExtraction(buffer, totalPages, detectedLanguage, tmpDir, logger);

  } finally {
    const tmpDir = path.resolve(__dirname, "../tmp", Date.now().toString());
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      logger.info('Cleaned up temp directory');
    }
  }

  const ocrText = ocrResults.join('\n\n');
  const combinedText = combineExtractionResults(directText, ocrText, detectedLanguage);

  if (!combinedText.trim()) {
    throw new Error('Failed to extract any text from the PDF');
  }

  logger.info('Extraction complete', {
    language: detectedLanguage,
    directTextLength: directText.length,
    ocrTextLength: ocrText.length,
    totalLength: combinedText.length
  });

  return combinedText;
}

async function extractTextFromImage(buffer: Buffer, extension: string, detectedLanguage: string): Promise<string> {
  const imageMimeType = extension === "png" ? "image/png" : "image/jpeg";
  const imageBase64 = buffer.toString("base64");
  const systemPrompt = `You are an OCR agent specialized in ${detectedLanguage} language documents. Extract EVERYTHING visible in this image. Pay special attention to ${detectedLanguage} language patterns and characters. Do not omit or summarize anything.`;
  const userPrompt = `Extract EVERYTHING visible in this ${detectedLanguage} language image or document. Include all text, numbers, symbols, annotations, and any other visible content. Preserve the exact formatting and layout.`;
  return await unifiedChatCompletion(systemPrompt, userPrompt, imageBase64, imageMimeType);
}

async function extractTextFromOther(buffer: Buffer, extension: string, detectedLanguage: string): Promise<string> {
  const systemPrompt = `You are an intelligent document parsing agent specialized in ${detectedLanguage} language documents. Extract EVERYTHING from this document, including all text, formatting, metadata, and structural elements. Pay special attention to ${detectedLanguage} language patterns and characters.`;
  const userPrompt = `Document binary (base64):\n${buffer.toString("base64").slice(0, 4000)}...\n\nExtract ALL content exactly as it appears, preserving all details and formatting.`;
  return await unifiedChatCompletion(systemPrompt, userPrompt);
}

// Function to determine document type
function getDocumentType(fileName: string, fileType: string): { extension: string; type: string } {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  const type = fileType?.toLowerCase() || "";
  return { extension, type };
}

// Function to check if document is PDF
function isPdfDocument(extension: string, type: string): boolean {
  return type === "application/pdf" || extension === "pdf";
}

// Function to check if document is an image
function isImageDocument(extension: string, type: string): boolean {
  return type.startsWith("image/") || ["jpg", "jpeg", "png", "bmp", "gif", "tiff"].includes(extension);
}

// Function to check if document is other supported type
function isOtherSupportedDocument(
  extension: string, 
  type: string
): boolean {
  return (
    type === "application/msword" ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ["doc", "docx"].includes(extension) ||
    type === "text/html" ||
    type === "text/markdown" ||
    ["html", "md"].includes(extension)
  );
}

export async function extractDoc(buffer: Buffer, fileName: string, fileType: string): Promise<string> {
  const { extension, type } = getDocumentType(fileName, fileType);

  // Detect language first
  const { language: detectedLanguage } = await detectDocumentLanguage(buffer, fileName)
    .catch(e => {
      console.error("[Language Detection] Failed:", e);
      return { language: "unknown", score: 0 };
    });

  let extractedText = "";
  
  if (isPdfDocument(extension, type)) {
    extractedText = await extractTextFromPdf(buffer, detectedLanguage);
  } else if (isImageDocument(extension, type)) {
    extractedText = await extractTextFromImage(buffer, extension, detectedLanguage);
  } else if (isOtherSupportedDocument(extension, type)) {
    extractedText = await extractTextFromOther(buffer, extension, detectedLanguage);
  } else {
    extractedText = await extractTextFromOther(buffer, extension, detectedLanguage);
  }
  
  // Return the original extracted text for processing
  return extractedText;
}

export async function extractDocWithLang(buffer: Buffer, fileName: string, fileType: string): Promise<{ text: string, language: string, score: number }> {
  const { language, score } = await detectDocumentLanguage(buffer, fileName)
    .catch(e => {
      console.error("[Language Detection] Failed:", e);
      return { language: "unknown", score: 0 };
    });

  const text = await extractDoc(buffer, fileName, fileType);
  return { text, language, score };
}

/**
 * Extract document text and return both original and preprocessed versions
 * @param buffer Document buffer
 * @param fileName Document file name
 * @param fileType Document MIME type
 * @returns Object with original text and preprocessed text
 */
export async function extractDocWithPreprocessing(buffer: Buffer, fileName: string, fileType: string): Promise<{ originalText: string, preprocessedText: string }> {
  const originalText = await extractDoc(buffer, fileName, fileType);
  const preprocessedText = preprocessDocumentText(originalText);
  return { originalText, preprocessedText };
}