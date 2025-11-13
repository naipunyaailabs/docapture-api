
declare module "tesseract.js" {
  export interface TesseractResult {
    text: string;
    confidence: number;
  }

  export interface TesseractOptions {
    logger?: (m: any) => void;
  }

  export const recognize: (
    image: string | Buffer | Uint8Array,
    lang?: string,
    options?: TesseractOptions
  ) => Promise<{ data: TesseractResult }>;

  const Tesseract: {
    recognize: typeof recognize;
  };

  export default Tesseract;
}
