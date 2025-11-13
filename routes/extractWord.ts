import { spawn } from 'child_process';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const extractWordHandler = async (req: Request): Promise<Response> => {
  try {
    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const base64Data = Buffer.from(bytes).toString('base64');

    // Call Python service
    const result = await callPythonWordExtractor(base64Data);
    
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Word Extraction Error]:", error);
    return new Response(
      JSON.stringify({ error: "Failed to extract Word document content" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

const callPythonWordExtractor = async (base64Data: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    // Spawn Python process
    const python = spawn('python', [
      join(__dirname, '..', 'word_extractor.py'),
      '--decode-and-extract',
      base64Data
    ]);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}: ${stderr}`));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (parseError) {
        reject(new Error(`Failed to parse Python output: ${parseError}`));
      }
    });

    python.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
};