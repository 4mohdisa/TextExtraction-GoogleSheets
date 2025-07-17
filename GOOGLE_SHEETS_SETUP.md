# Google Sheets Setup Guide

## 🚀 Quick Setup Instructions

### Step 1: Create Google Cloud Service Account

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create/Select Project**: Create a new project or select an existing one
3. **Enable Google Sheets API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

4. **Create Service Account**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Name: `document-extraction-service`
   - Click "Create and Continue"

5. **Download Service Account Key**:
   - Click on your service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose "JSON" format
   - Download the file

### Step 2: Configure Environment Variables

Open your `.env.local` file and update these values:

```env
# Replace with values from your downloaded JSON file
GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

**Important**: 
- Keep the quotes around the private key
- Don't remove the `\n` characters - they're needed for proper formatting

### Step 3: Share Google Sheet with Service Account

1. **Open your Google Sheet**: https://docs.google.com/spreadsheets/d/1Dvw4pRMPN9CwxHNURQXFKw7FDVDb1ovXz1gpQ90h3hs/edit
2. **Click "Share" button** (top right)
3. **Add the service account email** (from your JSON file)
4. **Set permissions to "Editor"**
5. **Click "Send"**

### Step 4: Test Your Setup

Run the test script to verify everything works:

```bash
node scripts/test-google-sheets.js
```

This will:
- ✅ Check environment variables
- ✅ Test authentication
- ✅ Test spreadsheet access
- ✅ Test reading data
- ✅ Test writing data

### Step 5: Verify Sheet Structure

Make sure your Google Sheet has these column headers in row 1:

| A | B | C | D | E | F | G | H | I | J | K | L | M | N |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| DATE | TIME | SUPPLIER | PRODUCT | QTY | ORDER NUMBER | INVOICE NUMBER | BATCH CODE | USE BY DATE | TEMP CHECK | PRODUCT INTEGRITY CHECK | WEIGHT CHECK | COMMENTS | SIGNATURE |

## 🔧 Common Issues & Solutions

### Error: "Failed to create auth client"
- **Cause**: Missing or invalid environment variables
- **Fix**: Check your `.env.local` file has correct `GOOGLE_CLIENT_EMAIL` and `GOOGLE_PRIVATE_KEY`

### Error: "403 Forbidden"
- **Cause**: Service account doesn't have access to spreadsheet
- **Fix**: Share the spreadsheet with your service account email

### Error: "404 Not Found"
- **Cause**: Incorrect spreadsheet ID
- **Fix**: Check your `GOOGLE_SPREADSHEET_ID` in the code

### Error: "invalid_grant"
- **Cause**: Malformed private key
- **Fix**: Ensure private key is properly formatted with `\n` characters

## 📋 Environment Variables Reference

```env
# OpenAI API Configuration
OPENAI_API_KEY=sk-proj-...

# Google Sheets API Configuration
GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"

# Google Sheets Settings
GOOGLE_SPREADSHEET_ID=1Dvw4pRMPN9CwxHNURQXFKw7FDVDb1ovXz1gpQ90h3hs
```

## ✅ Success Checklist

- [ ] Google Cloud project created
- [ ] Google Sheets API enabled
- [ ] Service account created and JSON key downloaded
- [ ] Environment variables set in `.env.local`
- [ ] Google Sheet shared with service account
- [ ] Test script runs successfully
- [ ] Sheet has correct column headers

Once all items are checked, your Google Sheets integration should work perfectly!