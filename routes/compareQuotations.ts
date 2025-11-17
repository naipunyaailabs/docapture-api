import { extractDoc } from "../services/fieldExtractor";
import { unifiedChatCompletion } from "../utils/unifiedClient";
import { createErrorResponse, createSuccessResponse } from "../utils/errorHandler";

export async function compareQuotationsHandler(req: Request, preloadedFormData?: FormData): Promise<Response> {
  try {
    // Get form data - use preloaded if provided (avoids "Body already used" error)
    const formData = preloadedFormData || await req.formData();
    
    // Get files from form data (support multiple quotations only - no single document)
    const documents: File[] = [];
    const documentEntries = formData.getAll("documents");
    
    if (!documentEntries || documentEntries.length === 0) {
      return createErrorResponse(
        "No quotation documents provided. Please upload at least 2 quotations to compare.",
        400
      );
    }
    
    // Validate all entries are files
    for (const entry of documentEntries) {
      if (!(entry instanceof File)) {
        return createErrorResponse("Invalid file upload", 400);
      }
      documents.push(entry);
    }
    
    // Enforce minimum 2 quotations for comparison
    if (documents.length < 2) {
      return createErrorResponse(
        `Quotation comparison requires at least 2 quotations. You uploaded ${documents.length}. Please upload additional quotations.`,
        400
      );
    }
    
    // Enforce maximum limit (optional - to prevent abuse)
    if (documents.length > 10) {
      return createErrorResponse(
        `Maximum 10 quotations can be compared at once. You uploaded ${documents.length}. Please reduce the number of files.`,
        400
      );
    }
    
    // Get user requirements/criteria (optional)
    const userCriteria = formData.get("criteria")?.toString() || "";
    
    // Extract text from all documents
    const quotationTexts: { vendor: string; content: string }[] = [];
    for (const doc of documents) {
      const buffer = await doc.arrayBuffer();
      const text = await extractDoc(Buffer.from(buffer), doc.name, doc.type);
      quotationTexts.push({
        vendor: doc.name.replace(/\.[^/.]+$/, ""), // Remove file extension
        content: text
      });
    }
    
    // Create comparison prompt using TOON format for efficiency
    // TOON (Token-Oriented Object Notation) saves 30-50% tokens compared to JSON
    let quotationsTOON = `quotations[${quotationTexts.length}]{vendor,content}:\n`;
    quotationTexts.forEach((q) => {
      // Escape commas and newlines in content for TOON format
      const escapedContent = q.content.replace(/\n/g, ' ').replace(/,/g, ';');
      quotationsTOON += `${q.vendor},${escapedContent}\n`;
    });
    
    const criteriaText = userCriteria 
      ? `\n\nClient Requirements:\n${userCriteria}`
      : "";
    
    const systemPrompt = `You are an expert procurement analyst specializing in quotation comparison and vendor evaluation. 
Your task is to analyze multiple vendor quotations and provide comprehensive comparisons and recommendations.

Focus on:
- Price comparison and value for money
- Product/service specifications and quality
- Delivery timelines and terms
- Payment terms and conditions
- Vendor reputation and reliability indicators
- Total cost of ownership
- Risk assessment
- Compliance with requirements

IMPORTANT: You MUST output your analysis in well-formatted markdown. Use proper markdown syntax:
- Use ## for main sections and ### for subsections
- Use tables with | for comparisons
- Use bullet points with - or *
- Use **bold** for emphasis
- Use > for important callouts

Do NOT use HTML, code blocks, JSON, or any other formatting. Pure markdown only.`;

    const userPrompt = `Please analyze and compare the following quotations from different vendors.

Quotation data in TOON format (Token-Oriented Object Notation):
${quotationsTOON}
${criteriaText}

Provide a comprehensive analysis in markdown format with the following structure:

## Executive Summary
- Quick overview of the best option and why
- Key differentiators between vendors

## Detailed Comparison

For each vendor, analyze:

### Pricing Analysis
- Total cost breakdown
- Unit prices (if applicable)
- Hidden costs or additional fees
- Payment terms

### Product/Service Specifications
- Quality indicators
- Features and capabilities
- Compliance with requirements
- Warranty and support

### Delivery & Timeline
- Lead time
- Delivery schedule
- Installation/setup time (if applicable)

### Terms & Conditions
- Contract terms
- Cancellation policies
- Penalties or charges
- Flexibility

## Comparative Analysis Matrix

Create a markdown table showing side-by-side comparison:

| Criteria | Vendor 1 | Vendor 2 | Vendor 3 |
|----------|----------|----------|----------|
| Total Price | ... | ... | ... |
| Key Features | ... | ... | ... |
| Delivery Time | ... | ... | ... |
| Overall Rating | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

## Strengths & Weaknesses

For each vendor:

**Vendor Name:**
- ✅ Strength 1
- ✅ Strength 2
- ✅ Strength 3
- ❌ Weakness 1
- ❌ Weakness 2
- ⚠️ Risk factors

## Recommendations

### 🏆 Best Overall Value
[Which vendor offers the best combination of price, quality, and terms]

### 💰 Best Price
[Lowest cost option]

### ⭐ Best Quality
[Highest quality/specifications]

### ⚡ Best for Urgency
[Fastest delivery]

### 🥈 Runner-up
[Alternative recommendation]

## Final Recommendation

> **Recommended Vendor: [Vendor Name]**

Provide a clear, justified recommendation based on:
- Overall score
- Risk assessment
- Value proposition
- Alignment with criteria (if provided)

Include specific reasoning and any caveats or conditions.`;

    const comparison = await unifiedChatCompletion(systemPrompt, userPrompt);

    // Return the response in the format expected by the frontend
    const formattedResponse = {
      success: true,
      data: {
        result: {
          comparison: comparison.trim(),
          vendorCount: quotationTexts.length,
          vendors: quotationTexts.map(q => q.vendor)
        },
        logs: []
      }
    };
    
    return createSuccessResponse(formattedResponse);
  } catch (error) {
    console.error("[Compare Quotations Handler Error]:", error);
    return createErrorResponse(`Failed to compare quotations: ${(error as Error).message}`, 500);
  }
}
