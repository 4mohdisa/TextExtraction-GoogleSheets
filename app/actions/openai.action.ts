'use server';

import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function extractDataFromImage(base64Image: string) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Analyze this delivery docket image carefully and extract the following details into JSON format:
        
        **RECEIVED IN GOOD ORDER AND CONDITION Section:**
        - **Received By**: Name of who received the delivery
        - **Received Date**: Date when it was received (format: DD/MM/YYYY)
        - **Signature**: Name of the person who signed
        
        **Header Section:**
        - **Supplier**: Company name
        - **Order Number**: Number associated with the order
        - **Invoice/Docket Number**: Any number associated with the invoice or docket
        
        **Items Section:**
        - **Product**: Full description of each product
        - **Quantity**: Number of items (use integers)
        - **Batch Code**: If present, in format like 'RB-S-2-26'
        - **Use By Date**: Date if present (format: DD/MM/YYYY or original format if different)
        - **Temp Check**: Any temperature check notation (like "Passed", "Failed", or exact temperature)
        - **Product Integrity Check**: Any notes on product condition (e.g., "Damaged", "OK")
        - **Weight Check**: Any weight verification (e.g., "Correct", "Discrepancy")
        - **Comments**: Any additional comments or notes related to the item
        
        Format the data as follows:
        - All items should be in an array named 'items'.
        - Common document details (Received By, Received Date, Supplier, Order Number, Invoice Number, Signature) should be under a 'documentDetails' object outside the items array.
        
        Return the JSON in this structure:
        
        {
          "documentDetails": {
            "receivedBy": "Name",
            "receivedDate": "Date",
            "supplier": "Company Name",
            "orderNumber": "Number",
            "invoiceNumber": "Number",
            "signature": "Name"
          },
          "items": [
            {
              "product": "Description",
              "quantity": 1,
              "batchCode": "Code",
              "useByDate": "Date",
              "tempCheck": "Check Result",
              "productIntegrityCheck": "Check Result",
              "weightCheck": "Check Result",
              "comments": "Any Comments"
            }
          ]
        }
        
        Ensure all fields are included for each item, even if empty or not applicable, use an empty string or null where appropriate. Pay special attention to the signature at the document's bottom and make sure all numbers are correctly formatted as integers where they should be.`
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
            max_tokens: 2000, // Adjust based on expected output size
            temperature: 0.1, // Lower temperature for more precise data extraction
            response_format: { type: "json_object" }
        });

        console.log('Raw API Response:', JSON.stringify(response, null, 2));

        if (!response.choices || !response.choices[0] || !response.choices[0].message) {
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
            let extractedData = JSON.parse(content);
            console.log('Parsed data:', extractedData);

            // Here's where you need to adjust:
            const documentDetails = extractedData.documentDetails || {};
            const items = extractedData.items || [];

            const processedData = items.map((item: { product: any; quantity: { toString: () => any; }; batchCode: any; useByDate: any; tempCheck: any; productIntegrityCheck: any; weightCheck: any; comments: any; }) => ({
                date: documentDetails.receivedDate || '',
                time: '', // You might want to handle time separately if available
                supplier: documentDetails.supplier || '',
                product: item.product || '',
                qty: parseInt(item.quantity?.toString() || '0', 10),
                orderNumber: documentDetails.orderNumber || '',
                invoiceNumber: documentDetails.invoiceNumber || '',
                batchCode: item.batchCode || '',
                useByDate: item.useByDate || '',
                tempCheck: item.tempCheck || '',
                productIntegrityCheck: item.productIntegrityCheck || 'OK',
                weightCheck: item.weightCheck || 'OK',
                comments: item.comments || 'OK',
                signature: documentDetails.signature || ''   
            }));

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
