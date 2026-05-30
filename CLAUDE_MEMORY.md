# Claude Code Session Memory

## Project Overview
**Document Data Extraction System** - A Next.js application that processes delivery dockets/invoices using OpenAI's GPT-4 Vision API and integrates with Google Sheets for data storage.

### Tech Stack
- Next.js 15.1.0 with TypeScript
- OpenAI GPT-4 Vision API for document extraction
- Google Sheets API integration
- React with Tailwind CSS
- AI memory system for document format learning

## Session Summary

### Initial Request
User asked to analyze and improve their document extraction project for better accuracy and efficiency. The system extracts data from delivery dockets/invoices and displays it in a table format.

### Major Improvements Implemented

#### 1. **Memory System Implementation**
- **File**: `lib/document-memory.ts`
- **Purpose**: AI learns document formats per supplier for 100% recurring weekly documents
- **Features**: 
  - Stores supplier-specific extraction patterns
  - Learns from successful extractions
  - Improves accuracy over time

#### 2. **Advanced Reasoning Engine**
- **File**: `lib/advanced-reasoning.ts`
- **Purpose**: Context-aware extraction with multi-step reasoning
- **Features**:
  - Generates enhanced prompts based on document history
  - Provides better understanding of document context

#### 3. **Enhanced Data Table with Keyboard Shortcuts**
- **File**: `components/data-table.tsx`
- **Features**:
  - **Ctrl+D**: Copy field to below
  - **Ctrl+Shift+D**: Copy entire row below
  - **Enter**: Move to next row same field
  - **Tab**: Move to next field (native)
  - Visual feedback and tooltips
  - Field validation with error highlighting

#### 4. **Fixed Date Selector Bug**
- **Issue**: Clicking date 11 would select 10 (off-by-one error)
- **Fix**: Corrected `convertDateToISO` function timezone handling
- **Location**: `components/data-table.tsx:17-46`

#### 5. **Fixed Time Picker Issues**
- **Issue**: Complex timezone conversion causing parsing errors
- **Fix**: Simplified time handling with proper 24-hour ↔ 12-hour conversion
- **Functions**: 
  - `convertTimeTo24Hour()` - Converts AM/PM to 24-hour for HTML inputs
  - Simplified time parsing logic
- **Location**: `components/data-table.tsx:48-76, 132-151`

## Technical Issues Resolved

### 1. **Sentry Browser Extension Errors**
- **Solution**: Added error suppression scripts and enhanced error boundary
- **Files**: Enhanced error handling throughout application

### 2. **504 Gateway Timeout on Vercel**
- **Solution**: Reduced OpenAI timeouts from 60s to 45s for Vercel compatibility
- **File**: `app/actions/openai.action.ts`

### 3. **OpenAI JSON Format Error**
- **Error**: `'messages' must contain the word 'json'`
- **Solution**: Added "json" keyword to prompts to satisfy API requirements
- **File**: `app/actions/openai.action.ts`

### 4. **Google Sheets Authentication Error**
- **Error**: "Failed to create auth client"
- **Solution**: Created comprehensive setup guide
- **File**: `GOOGLE_SHEETS_SETUP.md`
- **Test Script**: `scripts/test-google-sheets.js`

### 5. **Next.js Build Cache Corruption**
- **Error**: `ENOENT: no such file or directory, open '.next/server/app/page/app-build-manifest.json'`
- **Solution**: Cleared build cache with `rm -rf .next && npm run build`

## Environment Configuration

### Required Environment Variables (.env.local)
```env
# OpenAI API Configuration
OPENAI_API_KEY=sk-proj-...

# Google Sheets API Configuration
GOOGLE_CLIENT_EMAIL=docket-automation@docket-automation.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Google Sheets Settings
GOOGLE_SPREADSHEET_ID=1Dvw4pRMPN9CwxHNURQXFKw7FDVDb1ovXz1gpQ90h3hs
```

## Key Files Modified

### Core Components
- **`app/page.tsx`** - Main application page
- **`components/image-upload.tsx`** - Enhanced drag-and-drop with preview
- **`components/data-table.tsx`** - Major enhancements with keyboard shortcuts
- **`app/actions/openai.action.ts`** - Core extraction logic with memory integration
- **`app/actions/google-sheets.action.ts`** - Google Sheets integration

### New Features
- **`lib/document-memory.ts`** - Document format learning system
- **`lib/advanced-reasoning.ts`** - Advanced reasoning engine
- **`GOOGLE_SHEETS_SETUP.md`** - Setup guide for Google Sheets integration
- **`scripts/test-google-sheets.js`** - Testing script for Google Sheets API

## Google Sheets Integration

### Column Structure
| A | B | C | D | E | F | G | H | I | J | K | L | M | N |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| DATE | TIME | SUPPLIER | PRODUCT | QTY | ORDER NUMBER | INVOICE NUMBER | BATCH CODE | USE BY DATE | TEMP CHECK | PRODUCT INTEGRITY CHECK | WEIGHT CHECK | COMMENTS | SIGNATURE |

### Status
- ✅ Authentication working correctly
- ✅ Read/write operations functional
- ✅ Test script confirms all functionality

## Current State

### What's Working
- ✅ Document extraction with AI memory system
- ✅ Advanced reasoning for better accuracy
- ✅ Date picker (fixed off-by-one error)
- ✅ Time picker (simplified and working)
- ✅ Keyboard shortcuts for efficient data entry
- ✅ Google Sheets integration
- ✅ Build and deployment
- ✅ Error handling and validation

### Recent Commits
1. `6c60e49` - Complete keyboard shortcuts implementation and fix lint issues
2. `1735726` - Fix time picker functionality and simplify time handling
3. `10d994f` - Fix date selector bug and add keyboard shortcuts for field copying
4. `ea03aae` - Fix OpenAI JSON format error and enhance data validation
5. `eddee5c` - Fix Vercel timeout issues and optimize OpenAI API performance

## Performance Optimizations
- Reduced bundle size by removing unused imports
- Optimized OpenAI API timeouts for Vercel deployment
- Enhanced error boundaries and user feedback
- Improved UI responsiveness with proper loading states

## User Experience Enhancements
- Comprehensive keyboard shortcuts with visual feedback
- Tooltips and help sections
- Real-time validation with error highlighting
- Progress indicators and status feedback
- Responsive design with proper mobile support

## Memory System Features
- **Supplier Recognition**: Automatically identifies recurring suppliers
- **Format Learning**: Learns document layouts per supplier
- **Pattern Storage**: Stores successful extraction patterns
- **Accuracy Improvement**: Gets better with each processed document
- **Context Awareness**: Uses previous extractions to improve current ones

## Testing Status
- ✅ Build process verified
- ✅ Google Sheets integration tested
- ✅ All keyboard shortcuts functional
- ✅ Date/time pickers working correctly
- ✅ Memory system integrated and operational

## Next Steps (if needed)
1. Monitor memory system learning effectiveness with recurring documents
2. Consider adding more advanced validation rules
3. Potential UI/UX improvements based on user feedback
4. Performance monitoring and optimization

---
*Generated by Claude Code on 2025-07-17*
*Last updated after fixing Next.js build cache corruption*