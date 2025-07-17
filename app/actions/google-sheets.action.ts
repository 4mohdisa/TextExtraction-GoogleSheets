'use server';

import { google } from "googleapis";

// Make sure this is your correct spreadsheet ID from the URL
const SPREADSHEET_ID = '1Dvw4pRMPN9CwxHNURQXFKw7FDVDb1ovXz1gpQ90h3hs';
const SHEET_RANGE = 'Sheet1!A:M';

// Enable debug logging
const DEBUG = true;

function log(...args: unknown[]) {
    if (DEBUG) {
        console.log('[Google Sheets Debug]:', ...args);
    }
}

// Create a reusable auth client using environment variables
async function getAuthClient() {
    try {
        // Check if required environment variables are set
        const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
        const privateKey = process.env.GOOGLE_PRIVATE_KEY;
        
        if (!clientEmail || !privateKey) {
            throw new Error(
                'Missing Google Sheets credentials. Please set GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY in your .env.local file.'
            );
        }
        
        log('Using client email:', clientEmail);
        log('Private key length:', privateKey.length);
        
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: clientEmail,
                private_key: privateKey.replace(/\\n/g, '\n')
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        // Verify authentication
        await auth.getRequestHeaders();
        log('Authentication successful');

        return { auth, clientEmail };
    } catch (error) {
        console.error('Error creating auth client:', error);
        
        if (error instanceof Error) {
            if (error.message.includes('Missing Google Sheets credentials')) {
                throw error; // Re-throw our custom error
            }
            if (error.message.includes('invalid_grant')) {
                throw new Error('Invalid Google service account credentials. Please check your GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY.');
            }
        }
        
        throw new Error('Failed to create auth client. Please check your Google Sheets configuration.');
    }
}

export async function getSheetData() {
    try {
        const { auth } = await getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth });

        // Verify sheet access
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: SHEET_RANGE,
        });

        return { success: true, data: response.data.values };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error fetching sheet data:', errorMessage);
        
        // Handle specific Google API errors
        if (error instanceof Error && 'code' in error) {
            const googleError = error as { code: number };
            if (googleError.code === 404) {
                return {
                    success: false,
                    error: 'Spreadsheet not found'
                };
            }
        }

        return {
            success: false,
            error: errorMessage
        };
    }
}

export async function appendSheetData(data: Array<Array<string | number>>) {
    try {
        const { auth, clientEmail } = await getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth });

        log('Service account email:', clientEmail);
        log('Spreadsheet ID:', SPREADSHEET_ID);
        log('Sheet range:', SHEET_RANGE);
        log('Raw data to append:', JSON.stringify(data, null, 2));

        // Validate data format
        if (!Array.isArray(data) || !Array.isArray(data[0])) {
            throw new Error('Data must be a 2D array');
        }

        try {
            // Verify we can access the spreadsheet
            const testAccess = await sheets.spreadsheets.get({
                spreadsheetId: SPREADSHEET_ID,
            });
            log('Successfully accessed spreadsheet:', testAccess.data.properties?.title);

            // Get current values to determine next row
            const currentValues = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: SHEET_RANGE,
            });
            const nextRow = (currentValues.data.values?.length || 1) + 1;
            log('Next row to write:', nextRow);

            // Update range for the new structure with DATE and TIME columns
            const targetRange = `Sheet1!A${nextRow}:N${nextRow}`; // Now includes column N for the last field
            log('Target range:', targetRange);

            // Transform data to match the new structure
            const transformedData = data.map(item => [
                item[0], // DATE
                item[1], // TIME
                item[2], // SUPPLIER
                item[3], // PRODUCT
                item[4], // QTY
                item[5], // ORDER NUMBER
                item[6], // INVOICE NUMBER
                item[7], // BATCH CODE
                item[8], // USE BY DATE
                item[9], // TEMP CHECK
                item[10], // PRODUCT INTEGRITY CHECK
                item[11], // WEIGHT CHECK
                item[12], // COMMENTS
                item[13]  // SIGNATURE
            ]);

            // Append data to sheet
            const response = await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: targetRange,
                valueInputOption: 'RAW',
                insertDataOption: 'INSERT_ROWS',
                requestBody: {
                    values: transformedData
                }
            });

            log('Successfully appended data:', response.data);
            return { success: true, data: response.data };
        } catch (accessError) {
            const errorMessage = accessError instanceof Error ? accessError.message : 'Unknown error occurred';
            log('Failed to access spreadsheet:', errorMessage);
            
            if (accessError instanceof Error && 'code' in accessError) {
                const googleError = accessError as { code: number };
                if (googleError.code === 403) {
                    throw new Error(
                        `Service account ${clientEmail} does not have access to the spreadsheet. ` +
                        'Please share the spreadsheet with this email and grant Editor access.'
                    );
                }
            }
            throw new Error(errorMessage);
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error appending sheet data:', errorMessage);

        // Handle specific Google API errors
        if (error instanceof Error && 'code' in error) {
            const googleError = error as { code: number };
            if (googleError.code === 403) {
                return { 
                    success: false, 
                    error: 'Access denied. Make sure the service account has edit permission on the spreadsheet.' 
                };
            }
        }

        return { 
            success: false, 
            error: errorMessage 
        };
    }
}