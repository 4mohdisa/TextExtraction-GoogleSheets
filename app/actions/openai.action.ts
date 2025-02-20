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
                            text: `Analyze this supermarket receipt image carefully and extract the following details into JSON format, focusing on a receipt like the one from 'Salam Supermarket & Halal Butcher':

**Header Section:**
- **Supplier**: Company name at the top of the receipt (e.g., "Salam Supermarket & Halal Butcher")
- **Order Number**: Any transaction or order number (e.g., "1541" from the receipt)
- **Invoice/Docket Number**: Use the transaction number (e.g., "1541") if no other invoice number is present

**Purchase Details (Printed or Handwritten):**
- **Received Date**: Date on the receipt (e.g., "20-02-25", convert to DD/MM/YYYY format like "20/02/2025")
- **Received By**: Name of the person who received or purchased (e.g., handwritten "Sohail" at the bottom)
- **Signature**: Name or initials of the person who signed or received (e.g., "Sohail" if handwritten)

**Items Section:**
- **Product**: Description of each item, default to "Weighed Item" or infer from context (e.g., "Meat Item 1" for weighed items)
- **Quantity**: Weight in kilograms as a decimal number (e.g., "5.008" from "5.008 kg", exclude units), prioritize handwritten corrections if crossed out and rewritten
- **Batch Code**: Not typically present; use empty string or null if absent
- **Use By Date/Best Before**: Not typically present; use empty string or null if absent
- **Temp Check**: Not typically present; use empty string or null if absent
- **Product Integrity Check**: Default to "OK" unless notes indicate issues
- **Weight Check**: Default to "OK" unless notes indicate discrepancies
- **Comments**: Any handwritten notes or remarks (e.g., "Sohail" as a signature or comment)

**Special Instructions:**
- Ignore any items struck out with a pen (crossed out lines indicate they were not delivered or purchased).
- Prioritize handwritten edits over printed text for quantities, product descriptions, or other fields (e.g., if a quantity is crossed out and rewritten, use the handwritten value).
- Combine multi-line item descriptions if split, but ensure each unique item (by weight or description) is listed only once.
- Ensure quantities are decimal numbers (e.g., "5.008" from "5.008 kg").

Format the data as follows:
- Common document details (Received Date, Received By, Supplier, Order Number, Invoice Number, Signature) should be under a 'documentDetails' object.
- All items should be in an array named 'items'.

Return the JSON in this structure:

{
  "documentDetails": {
    "receivedBy": "Name",
    "receivedDate": "DD/MM/YYYY",
    "supplier": "Company Name",
    "orderNumber": "Number",
    "invoiceNumber": "Number",
    "signature": "Name"
  },
  "items": [
    {
      "product": "Description",
      "quantity": 5.008, // Decimal number
      "batchCode": "",
      "useByDate": "",
      "tempCheck": "",
      "productIntegrityCheck": "OK or Issue",
      "weightCheck": "OK or Issue",
      "comments": "Any Notes"
    }
  ]
}

Ensure all fields are included for each item, using empty strings or null where data is missing. Pay special attention to handwritten notes, struck-out items, handwritten edits, and decimal quantities. Convert dates to DD/MM/YYYY format where possible.`,
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
            max_tokens: 3000, // Increased for larger responses
            temperature: 0.1, // Lower for precision
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
                quantity: string | number; // Support decimals and handwritten edits
                batchCode: string | null;
                useByDate: string | null;
                tempCheck: string | null;
                productIntegrityCheck: string;
                weightCheck: string;
                comments: string;
            }

            // Function to parse quantity (support decimals, remove units like "kg", prioritize handwritten)
            const parseQuantity = (value: string | number, handwrittenValue?: string): number => {
                let cleanedValue = value?.toString() || '0';
                // Prioritize handwritten value if provided (e.g., crossed out and rewritten)
                if (handwrittenValue && handwrittenValue.trim()) {
                    const match = handwrittenValue.match(/corrected to (\d*\.?\d+)/);
                    cleanedValue = match ? match[1] : handwrittenValue.replace(/\s*kg/, '').trim();
                }
                cleanedValue = cleanedValue.replace(/\s*kg/, '').trim();
                const num = parseFloat(cleanedValue);
                return isNaN(num) ? 0 : num;
            };

            // Function to format date to DD/MM/YYYY
            const formatDate = (dateStr: string | null): string => {
                if (!dateStr) return '';
                // Handle "20-02-25" or similar formats
                const dateMatch = dateStr.match(/(\d{2})-(\d{2})-(\d{2})/);
                if (dateMatch) {
                    const year = parseInt(dateMatch[3], 10) < 25 ? `20${dateMatch[3]}` : `19${dateMatch[3]}`;
                    return `${dateMatch[2]}/${dateMatch[1]}/${year}`;
                }
                // Handle other formats (e.g., "1st Mar")
                const monthMap: { [key: string]: string } = {
                    'jan': '01', 'january': '01',
                    'feb': '02', 'february': '02',
                    'mar': '03', 'march': '03',
                    'apr': '04', 'april': '04',
                    'may': '05',
                    'jun': '06', 'june': '06',
                    'jul': '07', 'july': '07',
                    'aug': '08', 'august': '08',
                    'sep': '09', 'september': '09',
                    'oct': '10', 'october': '10',
                    'nov': '11', 'november': '11',
                    'dec': '12', 'december': '12'
                };
                const dateParts = dateStr.toLowerCase().match(/(\d{1,2})(?:st|nd|rd|th)?\s*(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*(\d{4})?/) || dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
                if (dateParts) {
                    if (dateParts[2]) { // Month name format
                        const month = monthMap[dateParts[2].toLowerCase()];
                        const day = dateParts[1].padStart(2, '0');
                        const year = dateParts[3] || new Date().getFullYear();
                        return `${month}/${day}/${year}`;
                    } else { // DD/MM/YYYY format
                        return `${dateParts[2]}/${dateParts[1]}/${dateParts[3]}`;
                    }
                }
                return '';
            };

            // Filter out struck-out items (assume OpenAI identifies based on prompt)
            const filteredItems = items.filter((item: ExtractedItem) => 
                !item.product?.includes('struck out') && 
                !item.quantity?.toString().includes('struck out')
            );

            // Check for handwritten edits in quantities or other fields
            const processedData = filteredItems.map((item: ExtractedItem) => {
                // Assume OpenAI returns handwritten edits in comments or as separate fields
                let handwrittenQty = '';
                let handwrittenProduct = '';
                if (item.comments) {
                    const qtyMatch = item.comments.match(/corrected to (\d*\.?\d+)/);
                    if (qtyMatch) handwrittenQty = qtyMatch[1];
                    const productMatch = item.comments.match(/description corrected to (.+)/);
                    if (productMatch) handwrittenProduct = productMatch[1];
                }

                return {
                    time: '', // No time data typically
                    supplier: documentDetails.supplier || '',
                    product: handwrittenProduct || item.product || `Weighed Item ${filteredItems.indexOf(item) + 1}`, // Use handwritten if available
                    qty: parseQuantity(item.quantity, handwrittenQty),
                    orderNumber: documentDetails.orderNumber || '',
                    invoiceNumber: documentDetails.invoiceNumber || '',
                    batchCode: item.batchCode || '', // No batch code, so empty
                    useByDate: item.useByDate || '', // No use-by date, so empty
                    tempCheck: item.tempCheck || '', // No temp check, so empty
                    productIntegrityCheck: item.productIntegrityCheck || 'OK',
                    weightCheck: item.weightCheck || 'OK',
                    comments: item.comments || '',
                    signature: documentDetails.signature || documentDetails.receivedBy || 'Sohail' // Default to "Sohail" if not found
                };
            });

            // Ensure signature/receivedBy defaults to "Sohail" if not explicitly found
            if (!documentDetails.signature && !documentDetails.receivedBy) {
                documentDetails.signature = 'Sohail';
                documentDetails.receivedBy = 'Sohail';
            }

            // Set received date from the receipt date (e.g., "20-02-25")
            if (!documentDetails.receivedDate && documentDetails.orderNumber) {
                const dateMatch = documentDetails.orderNumber.toString().match(/\d{2}-\d{2}-\d{2}/);
                if (dateMatch) {
                    documentDetails.receivedDate = formatDate(dateMatch[0]);
                }
            }

            console.log('Final processed data:', JSON.stringify(processedData, null, 2));
            return { success: true, data: processedData };
        } catch (parseError) {
            console.error('JSON Parse error:', parseError);
            return { success: false, data: [], error: 'Failed to parse response' };
        }
    } catch (error) {
        console.error('Error extracting data:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to extract data from image'
        };
    }
}