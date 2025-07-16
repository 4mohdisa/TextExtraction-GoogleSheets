'use server';

import OpenAI from 'openai';
import { ChatCompletion } from 'openai/resources';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function fetchWithRetry(base64Image: string, attempt: number = 1, maxRetries: number = 3): Promise<ChatCompletion> {
    try {
        const response: ChatCompletion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `You are an expert document data extraction system. Analyze this document image (receipt, invoice, or delivery docket) and extract structured data with high accuracy.

**DOCUMENT TYPES TO HANDLE:**
1. **Supermarket Receipts** (like Salam Supermarket, Woolworths, Coles, etc.)
2. **Invoices** (supplier invoices, service invoices)
3. **Delivery Dockets** (delivery notes, packing slips)
4. **Purchase Orders** (formal purchase documentation)

**EXTRACTION RULES:**

**Header/Document Information:**
- **Supplier/Company**: Business name at top of document
- **Document Type**: Identify if it's a receipt, invoice, docket, or purchase order
- **Document Number**: Transaction ID, invoice number, docket number, or order number
- **Date**: Document date in DD/MM/YYYY format (convert from any format)
- **Time**: Time if available (convert to HH:MM format)

**Recipient/Customer Information:**
- **Received By**: Person who received goods/made purchase
- **Customer Name**: If different from "Received By"
- **Signature**: Person who signed for delivery/purchase

**Items/Products:**
- **Product Description**: Full product name/description
- **Quantity**: Numeric quantity (weight in kg, pieces, units)
- **Unit Price**: Price per unit if available
- **Total Price**: Total cost for the item
- **Batch Code**: Product batch/lot number
- **Use By Date**: Expiry or best before date
- **Temperature Check**: Cold chain compliance (for perishables)
- **Product Integrity**: Condition of product (OK/Damaged)
- **Weight Check**: Weight verification (OK/Variance)
- **Comments**: Any additional notes or remarks

**PROCESSING INSTRUCTIONS:**
1. **Handwritten Priority**: If text is crossed out and rewritten, use the handwritten correction
2. **Struck-out Items**: Ignore completely crossed-out items
3. **Multi-line Descriptions**: Combine related text into single product descriptions
4. **Decimal Precision**: Maintain decimal precision for quantities and prices
5. **Date Standardization**: Convert all dates to DD/MM/YYYY format
6. **Missing Data**: Use empty strings for missing information
7. **Default Values**: Use "OK" for integrity/weight checks unless issues noted

**OUTPUT FORMAT:**
Return JSON in this exact structure:

{
  "documentDetails": {
    "documentType": "Receipt|Invoice|Docket|Purchase Order",
    "supplier": "Company Name",
    "documentNumber": "Number/ID",
    "date": "DD/MM/YYYY",
    "time": "HH:MM",
    "receivedBy": "Person Name",
    "customerName": "Customer Name",
    "signature": "Signature Name",
    "totalAmount": "Total if available"
  },
  "items": [
    {
      "product": "Full Product Description",
      "quantity": 0.0,
      "unit": "kg|pieces|units|etc",
      "unitPrice": 0.0,
      "totalPrice": 0.0,
      "batchCode": "",
      "useByDate": "",
      "tempCheck": "",
      "productIntegrityCheck": "OK",
      "weightCheck": "OK",
      "comments": ""
    }
  ]
}

**ACCURACY REQUIREMENTS:**
- Extract ALL visible items, even if partially obscured
- Maintain exact spelling of product names
- Preserve numerical precision
- Handle various date formats correctly
- Detect and process handwritten corrections
- Identify document context (retail vs wholesale vs delivery)

Analyze the image carefully and extract all available information with maximum accuracy.`,
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
            max_tokens: 4000, // Increased for comprehensive extraction
            temperature: 0.05, // Very low for maximum precision
            response_format: { type: "json_object" }
        });
        return response;
    } catch (error) {
        if (attempt >= maxRetries) throw error;
        console.warn(`Retry attempt ${attempt} failed, retrying...`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        return fetchWithRetry(base64Image, attempt + 1, maxRetries);
    }
}

export async function extractDataFromImage(base64Image: string) {
    try {
        const response = await fetchWithRetry(base64Image);
        console.log('Raw API Response:', JSON.stringify(response, null, 2));

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
                    orderNumber: documentDetails.documentNumber || documentDetails.orderNumber || '',
                    invoiceNumber: documentDetails.documentNumber || documentDetails.invoiceNumber || '',
                    batchCode: item.batchCode || '',
                    useByDate: formatDate(item.useByDate) || '',
                    tempCheck: item.tempCheck || '',
                    productIntegrityCheck: item.productIntegrityCheck || 'OK',
                    weightCheck: item.weightCheck || 'OK',
                    comments: item.comments || '',
                    signature: documentDetails.signature || documentDetails.receivedBy || ''
                };
            });

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
            return { success: true, data: validatedData };
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