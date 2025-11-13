/**
 * Bun-friendly document extraction pipeline using LangChain + OCR fallback.
 *
 * Replaces pdf2table + unpdf + ad-hoc JSON extraction.
 */

import fs from "fs/promises";
import path from "path";
import os from "os";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { pdfToPng } from "pdf-to-png-converter";
import Tesseract from "tesseract.js";
import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence, RunnableLambda } from "@langchain/core/runnables";
import { unifiedChatCompletion } from "../utils/unifiedClient"; // Updated to use unified client

// ---------------------------------------------------------------------------
// Logging util
// ---------------------------------------------------------------------------
const logger = {
  info: (msg: string, data?: any) => console.log(`[ExtractLC] ${msg}`, data ?? ""),
  error: (msg: string, err?: any) => console.error(`[ExtractLC Error] ${msg}`, err ?? ""),
};

// ---------------------------------------------------------------------------
// OCR fallback
// ---------------------------------------------------------------------------
async function ocrImageBuffer(buffer: Buffer, lang = "eng") {
  // Create a temporary file path
  const tmpDir = os.tmpdir();
  const tmpFileName = `ocr_temp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}.png`;
  const tmpPath = path.join(tmpDir, tmpFileName);
  
  try {
    // Write buffer to temporary file
    await fs.writeFile(tmpPath, buffer);
    
    // Perform OCR on the temporary file
    const { data } = await Tesseract.recognize(tmpPath, lang);
    return data.text || "";
  } finally {
    // Clean up temporary file
    try {
      await fs.unlink(tmpPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

async function ocrImage(imgPath: string, lang = "eng") {
  const { data } = await Tesseract.recognize(imgPath, lang);
  return data.text || "";
}

// ---------------------------------------------------------------------------
// PDF extraction (LangChain + OCR fallback)
// ---------------------------------------------------------------------------
export async function extractPdfWithLangChain(buffer: Buffer, tmpDir = os.tmpdir(), fileName = "upload.pdf") {
  const pdfPath = path.join(tmpDir, fileName);
  await fs.writeFile(pdfPath, buffer);

  try {
    // Load text via LangChain PDFLoader (uses pdf-parse)
    const loader = new PDFLoader(pdfPath, { splitPages: true });
    const docs = await loader.load();

    const textPages = docs.map(d => d.pageContent?.trim() ?? "");
    const hasEmpty = textPages.some(t => t.length < 10);

    let ocrText = "";
    if (hasEmpty) {
      logger.info("Some pages empty → using Tesseract fallback");
      const images = await pdfToPng(pdfPath, { viewportScale: 2.0 });
      for (const img of images) {
        // Use the buffer content directly instead of relying on img.path
        const pageText = await ocrImageBuffer(img.content, "eng"); // later: auto-detect language
        ocrText += pageText + "\n\n";
      }
    }

    const text = [...textPages, ocrText].filter(Boolean).join("\n\n").trim();
    if (!text) throw new Error("No text extracted from PDF");
    return text;
  } finally {
    // Clean up the temporary PDF file
    try {
      await fs.unlink(pdfPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// ---------------------------------------------------------------------------
// Universal entry point (PDF / images / docs)
// ---------------------------------------------------------------------------
export async function extractDocLC(buffer: Buffer, fileName: string, fileType: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const type = fileType?.toLowerCase() || "";
  
  // Use cross-platform temporary directory
  const tmpDir = os.tmpdir();

  if (type === "application/pdf" || ext === "pdf") {
    return await extractPdfWithLangChain(buffer, tmpDir, fileName);
  }

  if (type.startsWith("image/") || ["jpg", "jpeg", "png"].includes(ext)) {
    // Use buffer-based OCR directly instead of writing to file
    const text = await ocrImageBuffer(buffer, "eng");
    return text;
  }

  // For doc/docx/html/md fallback
  const b64 = buffer.toString("base64").slice(0, 4000);
  const sys = `You are an intelligent document parser. Extract ALL text and structure from this ${fileType} file.`;
  const usr = `Document base64 (truncated): ${b64}`;
  return await unifiedChatCompletion(sys, usr);
}

// ---------------------------------------------------------------------------
// LangChain structured JSON extraction
// ---------------------------------------------------------------------------

// 1️⃣ Define schema (you can modify fields as needed)
const documentSchema = z.object({
  title: z.string().nullable(),
  author: z.string().nullable(),
  date: z.string().nullable(),
  total_amount: z.string().nullable(),
  currency: z.string().nullable(),
  key_values: z.record(z.string().nullable()).optional(),
});

// 2️⃣ Create parser + prompt
const parser = new StructuredOutputParser(documentSchema);
function escapeBraces(str: string) {
  return str.replace(/{/g, "{{").replace(/}/g, "}}");
}

const extractionPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are an advanced document parser. Respond ONLY with valid JSON.
${escapeBraces(parser.getFormatInstructions())}`
  ],
  [
    "user",
    `Document:

{doc}

Extract all structured information into the schema.`
  ],
]);

// 3️⃣ Wrap your Groq call into a Runnable
const groqRunnable = RunnableLambda.from(async (input: { doc: string }) => {
  // Properly resolve the prompt
  const formatted = await extractionPrompt.format({ doc: input.doc });
  const sys = "You are an advanced document parser. Respond ONLY with valid JSON.";
  const usr = formatted; // since format() replaces {doc}
  return await unifiedChatCompletion(sys, usr);
});

// 4️⃣ Compose the chain
export const structuredExtractor = RunnableSequence.from([
  async (doc: string) => ({ doc }),
  groqRunnable,
  async (raw: string) => {
    try {
      return await parser.parse(raw);
    } catch (e) {
      logger.error("JSON parse failed, returning raw text");
      return { raw };
    }
  },
]);

// ---------------------------------------------------------------------------
// Orchestration wrapper used by your route
// ---------------------------------------------------------------------------
export async function extractAndParseLC(buffer: Buffer, fileName: string, fileType: string) {
  const text = await extractDocLC(buffer, fileName, fileType);
  const structured = await structuredExtractor.invoke(text);
  return { text, structured };
}