'use server';

import OpenAI from 'openai';
import { ChatCompletion } from 'openai/resources';
import { documentMemory } from '@/lib/document-memory';
import { reasoningEngine } from '@/lib/advanced-reasoning';

// Type for OpenAI API errors
interface OpenAIError {
    name?: string;
    message?: string;
    status?: number;
    code?: string;
}

// Enhanced extraction result with reasoning
interface EnhancedExtractionResult {
    success: boolean;
    data: unknown[];
    error?: string;
    reasoning?: string;
    confidence?: number;
    memoryUsed?: boolean;
    supplierLearned?: boolean;
}

// Initialize OpenAI client with timeout and retry configuration
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 45000, // 45 seconds timeout for Vercel compatibility
    maxRetries: 2, // Reduced retries for faster failure
});

async function fetchWithRetry(
    base64Image: string, 
    prompt: string,
    attempt: number = 1, 
    maxRetries: number = 2
): Promise<ChatCompletion> {
    try {
        console.log(`Attempt ${attempt} of ${maxRetries} for OpenAI API call`);
        
        // Add timeout wrapper for the request (Vercel has 60s limit)
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout - please try again')), 50000); // 50 seconds
        });
        
        const requestPromise = openai.chat.completions.create({
            model: "gpt-4o-mini", // Using faster mini model
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: prompt,
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`
                            }
                        }
                    ]
                }
            ],
            max_tokens: 3000, // Reduced for faster processing
            temperature: 0.1, // Slightly higher for faster processing
            response_format: { type: "json_object" }
        });
        
        const response: ChatCompletion = await Promise.race([requestPromise, timeoutPromise]);
        console.log(`OpenAI API call successful on attempt ${attempt}`);
        return response;
    } catch (error: unknown) {
        console.error(`Attempt ${attempt} failed:`, error);
        
        // Type guard to safely access error properties
        const errorObj = error as OpenAIError;
        const errorName = errorObj?.name || '';
        const errorMessage = errorObj?.message || '';
        const errorStatus = errorObj?.status || 0;
        
        // Handle specific error types
        if (errorName === 'TimeoutError' || errorMessage.includes('timeout')) {
            console.warn('Request timed out, retrying...');
        } else if (errorStatus === 504 || errorMessage.includes('504')) {
            console.warn('Server gateway timeout, retrying...');
        } else if (errorStatus === 429) {
            console.warn('Rate limit exceeded, waiting longer before retry...');
            await new Promise(resolve => setTimeout(resolve, 5000 * attempt)); // Longer wait for rate limits
        } else if (errorStatus >= 500) {
            console.warn('Server error, retrying...');
        }
        
        if (attempt >= maxRetries) {
            // Provide user-friendly error messages
            if (errorName === 'TimeoutError' || errorMessage.includes('timeout')) {
                throw new Error('The image processing is taking too long. Please try with a smaller or clearer image.');
            } else if (errorStatus === 504) {
                throw new Error('Server timeout occurred. The image may be too large or complex. Please try with a smaller image.');
            } else if (errorStatus === 429) {
                throw new Error('Too many requests. Please wait 30 seconds before trying again.');
            } else if (errorStatus === 401) {
                throw new Error('API authentication failed. Please check your OpenAI API key configuration.');
            } else if (errorStatus >= 500) {
                throw new Error('OpenAI service is temporarily unavailable. Please try again in a few minutes.');
            }
            throw error;
        }
        
        // Exponential backoff with jitter
        const baseDelay = 1000 * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 1000;
        const delay = Math.min(baseDelay + jitter, 10000); // Max 10 seconds
        
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry(base64Image, prompt, attempt + 1, maxRetries);
    }
}

export async function extractDataFromImage(base64Image: string): Promise<EnhancedExtractionResult> {
    try {
        // Validate input
        if (!base64Image || base64Image.length === 0) {
            return { 
                success: false, 
                data: [], 
                error: 'No image data provided. Please upload an image.' 
            };
        }
        
        // Check image size (approximate) - Vercel has limits
        if (base64Image.length > 10 * 1024 * 1024) { // ~10MB limit for Vercel
            return { 
                success: false, 
                data: [], 
                error: 'Image file is too large. Please use a smaller image (under 5MB) for faster processing.' 
            };
        }
        
        console.log('Starting enhanced data extraction with memory and reasoning...');
        
        // Step 1: Quick supplier detection for memory lookup
        const supplierDetectionPrompt = `Analyze this document image and identify ONLY:
1. The supplier/company name
2. The document type (receipt/invoice/docket/purchase_order)

Return response as JSON format: {"supplier": "Company Name", "documentType": "type"}`;
        
        console.log('Detecting supplier for memory lookup...');
        const supplierResponse = await fetchWithRetry(base64Image, supplierDetectionPrompt);
        
        let supplierInfo = null;
        let documentFormat = null;
        
        try {
            supplierInfo = JSON.parse(supplierResponse.choices[0].message.content || '{}');
            console.log('Supplier detected:', supplierInfo);
            
            // Check if we have learned this supplier's format
            if (supplierInfo.supplier && supplierInfo.documentType) {
                documentFormat = await documentMemory.getDocumentFormat(
                    supplierInfo.supplier, 
                    supplierInfo.documentType
                );
                console.log('Document format found:', documentFormat ? 'Yes' : 'No');
            }
        } catch {
            console.log('Supplier detection failed, proceeding with general extraction');
        }
        
        // Step 2: Generate enhanced extraction prompt
        const enhancedPrompt = generateEnhancedExtractionPrompt(documentFormat);
        
        console.log('Performing extraction with enhanced reasoning...');
        const response = await fetchWithRetry(base64Image, enhancedPrompt);
        console.log('OpenAI API response received successfully');

        if (!response.choices?.[0]?.message) {
            console.error('Invalid response structure');
            return { success: false, data: [], error: 'Invalid API response structure' };
        }

        const content = response.choices[0].message.content;
        console.log('Content from API:', content);

        if (!content) {
            console.error('No content in response');
            return { success: false, data: [], error: 'No content in response' };
        }

        try {
            const extractedData = JSON.parse(content);
            console.log('Parsed data:', extractedData);

            const documentDetails = extractedData.documentDetails || {};
            const items = extractedData.items || [];

            interface ExtractedItem {
                product: string;
                quantity: string | number;
                unit?: string;
                unitPrice?: number;
                totalPrice?: number;
                batchCode: string | null;
                useByDate: string | null;
                tempCheck: string | null;
                productIntegrityCheck: string;
                weightCheck: string;
                comments: string;
            }

            // Enhanced quantity parsing with unit detection
            const parseQuantity = (value: string | number): number => {
                let cleanedValue = value?.toString() || '0';
                // Remove common units
                cleanedValue = cleanedValue.replace(/\s*(kg|g|lbs|oz|pcs|pieces|units|each)\s*/i, '').trim();
                // Handle fractions and decimals
                const num = parseFloat(cleanedValue);
                return isNaN(num) ? 0 : num;
            };

            // Enhanced date formatting with multiple format support
            const formatDate = (dateStr: string | null): string => {
                if (!dateStr) return '';
                
                // Handle DD-MM-YY format (e.g., "20-02-25")
                const ddmmyyMatch = dateStr.match(/(\d{1,2})-(\d{1,2})-(\d{2})/);
                if (ddmmyyMatch) {
                    const day = ddmmyyMatch[1].padStart(2, '0');
                    const month = ddmmyyMatch[2].padStart(2, '0');
                    const year = parseInt(ddmmyyMatch[3]) < 50 ? `20${ddmmyyMatch[3]}` : `19${ddmmyyMatch[3]}`;
                    return `${day}/${month}/${year}`;
                }
                
                // Handle DD/MM/YYYY format
                const ddmmyyyyMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                if (ddmmyyyyMatch) {
                    const day = ddmmyyyyMatch[1].padStart(2, '0');
                    const month = ddmmyyyyMatch[2].padStart(2, '0');
                    return `${day}/${month}/${ddmmyyyyMatch[3]}`;
                }
                
                // Handle YYYY-MM-DD format (ISO)
                const isoMatch = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
                if (isoMatch) {
                    const day = isoMatch[3].padStart(2, '0');
                    const month = isoMatch[2].padStart(2, '0');
                    return `${day}/${month}/${isoMatch[1]}`;
                }
                
                // Handle month name formats
                const monthMap: { [key: string]: string } = {
                    'jan': '01', 'january': '01', 'feb': '02', 'february': '02',
                    'mar': '03', 'march': '03', 'apr': '04', 'april': '04',
                    'may': '05', 'jun': '06', 'june': '06', 'jul': '07', 'july': '07',
                    'aug': '08', 'august': '08', 'sep': '09', 'september': '09',
                    'oct': '10', 'october': '10', 'nov': '11', 'november': '11',
                    'dec': '12', 'december': '12'
                };
                
                const monthNameMatch = dateStr.toLowerCase().match(/(\d{1,2})(?:st|nd|rd|th)?\s*(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*(\d{4})?/);
                if (monthNameMatch) {
                    const day = monthNameMatch[1].padStart(2, '0');
                    const month = monthMap[monthNameMatch[2].toLowerCase()];
                    const year = monthNameMatch[3] || new Date().getFullYear();
                    return `${day}/${month}/${year}`;
                }
                
                return '';
            };

            // Filter out struck-out items and process with enhanced accuracy
            const filteredItems = items.filter((item: ExtractedItem) => 
                !item.product?.toLowerCase().includes('struck out') && 
                !item.product?.toLowerCase().includes('cancelled') &&
                !item.quantity?.toString().includes('struck out') &&
                item.product?.trim() !== ''
            );

            // Enhanced data processing with better field mapping
            const processedData = filteredItems.map((item: ExtractedItem, index: number) => {
                return {
                    date: formatDate(documentDetails.date) || formatDate(new Date().toISOString().split('T')[0]),
                    time: documentDetails.time || '',
                    supplier: documentDetails.supplier || '',
                    product: item.product || `Item ${index + 1}`,
                    qty: parseQuantity(item.quantity),
                    orderNumber: documentDetails.documentNumber || '',
                    invoiceNumber: documentDetails.documentNumber || '',
                    batchCode: item.batchCode || '',
                    useByDate: formatDate(item.useByDate) || '',
                    tempCheck: item.tempCheck || '',
                    productIntegrityCheck: item.productIntegrityCheck || 'OK',
                    weightCheck: item.weightCheck || 'OK',
                    comments: item.comments || '',
                    signature: documentDetails.signature || documentDetails.receivedBy || ''
                };
            });
            
            console.log('Processed data structure:', JSON.stringify(processedData, null, 2));

            // Enhanced validation and error handling
            if (processedData.length === 0) {
                console.warn('No valid items extracted from image');
                return { 
                    success: false, 
                    data: [], 
                    error: 'No valid items found in the document. Please ensure the image is clear and contains item information.' 
                };
            }
            
            // Validate required fields
            const validatedData = processedData.map((item: typeof processedData[0], index: number) => {
                if (!item.product || item.product.trim() === '') {
                    item.product = `Item ${index + 1}`;
                }
                if (!item.qty || item.qty <= 0) {
                    item.qty = 1; // Default quantity
                }
                return item;
            });

            console.log('Final processed data:', JSON.stringify(validatedData, null, 2));
            
            // Step 3: Learn from successful extraction
            if (supplierInfo?.supplier && supplierInfo?.documentType && validatedData.length > 0) {
                console.log('Learning from successful extraction...');
                await documentMemory.learnFromExtraction(
                    supplierInfo.supplier,
                    supplierInfo.documentType,
                    { documentDetails, items: validatedData },
                    { /* image analysis would go here */ }
                );
            }
            
            // Step 4: Generate reasoning summary
            const reasoningSummary = reasoningEngine.generateReasoningSummary(
                { documentDetails, items: validatedData },
                documentFormat || undefined
            );
            
            console.log('Reasoning summary:', reasoningSummary);
            
            return { 
                success: true, 
                data: validatedData,
                reasoning: reasoningSummary,
                confidence: documentFormat?.accuracy.successRate || 85,
                memoryUsed: !!documentFormat,
                supplierLearned: !!supplierInfo?.supplier
            };
        } catch (parseError) {
            console.error('JSON Parse error:', parseError);
            console.error('Raw content that failed to parse:', content);
            return { 
                success: false, 
                data: [], 
                error: 'Failed to parse AI response. The image may be unclear or contain unsupported content.' 
            };
        }
    } catch (error) {
        console.error('Error extracting data:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to extract data from image'
        };
    }
}

// Generate enhanced extraction prompt with JSON requirement
function generateEnhancedExtractionPrompt(documentFormat?: any): string {
    const basePrompt = `You are an expert document data extraction AI. Analyze this document image and extract structured data.

**DOCUMENT ANALYSIS:**
- Identify the document type (receipt, invoice, docket, purchase order)
- Extract supplier/company name from header
- Find all items with quantities and descriptions
- Look for dates, document numbers, and signatures
- Prioritize handwritten corrections over printed text
- Ignore completely crossed-out items

**EXTRACTION RULES:**
- Convert dates to DD/MM/YYYY format
- Extract quantities as decimal numbers (e.g., 5.5 not "5.5 kg")
- Use "OK" for quality checks if not specified
- Include all visible items, even if partially readable
- Maintain numerical precision for quantities

**CRITICAL: You must return valid JSON format with this structure:**

{
  "documentDetails": {
    "supplier": "Company Name",
    "documentNumber": "Transaction/Invoice ID",
    "date": "DD/MM/YYYY",
    "time": "HH:MM",
    "receivedBy": "Person Name",
    "signature": "Signature Name"
  },
  "items": [
    {
      "product": "Product Description",
      "quantity": 0.0,
      "batchCode": "",
      "useByDate": "",
      "tempCheck": "",
      "productIntegrityCheck": "OK",
      "weightCheck": "OK",
      "comments": ""
    }
  ]
}

Return ONLY the JSON object - no additional text or formatting.`;

    if (documentFormat) {
        return basePrompt + `

**LEARNED PATTERNS FOR ${documentFormat.supplier}:**
- Expected date format: ${documentFormat.extractionTemplate?.dateFormat || 'DD/MM/YYYY'}
- Quantity format: ${documentFormat.extractionTemplate?.quantityFormat || 'decimal'}
- Success rate: ${documentFormat.accuracy?.successRate || 0}%
- Previous extractions: ${documentFormat.accuracy?.extractionCount || 0}

**APPLY THESE PATTERNS:** Use the learned format patterns above for more accurate extraction.`;
    }

    return basePrompt;
}