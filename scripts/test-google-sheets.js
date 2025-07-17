// Test script to validate Google Sheets setup
const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

async function testGoogleSheetsSetup() {
    console.log('🔍 Testing Google Sheets Setup...\n');
    
    // Check environment variables
    console.log('📋 Checking environment variables...');
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || '1Dvw4pRMPN9CwxHNURQXFKw7FDVDb1ovXz1gpQ90h3hs';
    
    if (!clientEmail) {
        console.error('❌ GOOGLE_CLIENT_EMAIL is not set');
        return false;
    }
    
    if (!privateKey) {
        console.error('❌ GOOGLE_PRIVATE_KEY is not set');
        return false;
    }
    
    console.log('✅ Client Email:', clientEmail);
    console.log('✅ Private Key Length:', privateKey.length);
    console.log('✅ Spreadsheet ID:', spreadsheetId);
    
    // Test authentication
    console.log('\n🔐 Testing authentication...');
    try {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: clientEmail,
                private_key: privateKey.replace(/\\n/g, '\n')
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        
        await auth.getRequestHeaders();
        console.log('✅ Authentication successful');
        
        // Test spreadsheet access
        console.log('\n📊 Testing spreadsheet access...');
        const sheets = google.sheets({ version: 'v4', auth });
        
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: spreadsheetId,
        });
        
        console.log('✅ Spreadsheet accessible:', spreadsheet.data.properties.title);
        
        // Test reading data
        console.log('\n📖 Testing data read...');
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'Sheet1!A1:N1',
        });
        
        console.log('✅ Data read successful');
        console.log('📋 Current headers:', response.data.values?.[0] || 'No headers found');
        
        // Test writing data
        console.log('\n✍️ Testing data write...');
        const testData = [
            ['TEST', new Date().toISOString(), 'Test Supplier', 'Test Product', 1, 'TEST001', 'TEST001', '', '', 'OK', 'OK', 'OK', 'Test comment', 'Test signature']
        ];
        
        await sheets.spreadsheets.values.append({
            spreadsheetId: spreadsheetId,
            range: 'Sheet1!A:N',
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            requestBody: {
                values: testData
            }
        });
        
        console.log('✅ Test data written successfully');
        
        console.log('\n🎉 All tests passed! Your Google Sheets setup is working correctly.');
        return true;
        
    } catch (error) {
        console.error('\n❌ Error during testing:', error.message);
        
        if (error.message.includes('invalid_grant')) {
            console.error('🔧 Fix: Check your GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY values');
        } else if (error.message.includes('403')) {
            console.error('🔧 Fix: Share the spreadsheet with your service account email:', clientEmail);
        } else if (error.message.includes('404')) {
            console.error('🔧 Fix: Check your GOOGLE_SPREADSHEET_ID value');
        }
        
        return false;
    }
}

// Run the test
testGoogleSheetsSetup()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Unexpected error:', error);
        process.exit(1);
    });