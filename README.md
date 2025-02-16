# Vision-Powered Document Extraction System 📄

A modern web application that uses AI to extract data from documents and automatically populate Google Sheets. Built with Next.js, TypeScript, and OpenAI's GPT-4 Vision API.

## 🚀 Features

- **AI-Powered Data Extraction**: Uses GPT-4 Vision API to intelligently extract data from images
- **Smart Form Fields**: Automatically populated form with extracted data
- **Google Sheets Integration**: Direct integration with Google Sheets for data storage
- **Real-time Editing**: Edit extracted data before submission
- **Modern UI**: Built with Next.js and Shadcn UI components
- **Type Safety**: Full TypeScript support throughout the application

## 📋 Supported Fields

The system extracts and manages the following fields:
- Time
- Supplier
- Product
- Quantity
- Order Number
- Invoice Number
- Batch Code
- Use By Date
- Temperature Check
- Product Integrity Check
- Weight Check
- Comments
- Signature

## 🛠️ Technical Stack

- **Frontend**: Next.js 14 with TypeScript
- **UI Components**: Shadcn UI
- **AI Integration**: OpenAI GPT-4 Vision API
- **Data Storage**: Google Sheets API
- **State Management**: React Hooks
- **Styling**: Tailwind CSS

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/vision-powered-document-extraction.git
   cd vision-powered-document-extraction
   ```

2. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the frontend directory:
   ```env
   OPENAI_API_KEY=your_openai_api_key
   GOOGLE_SHEETS_CREDENTIALS_PATH=path_to_credentials.json
   ```

4. **Set up Google Sheets credentials**
   - Create a Google Cloud Project
   - Enable Google Sheets API
   - Create a service account and download credentials
   - Save the credentials as `credentials.json` in the project root
   - Share your Google Sheet with the service account email

5. **Run the development server**
   ```bash
   npm run dev
   ```

## 📝 Usage

1. **Upload Document**
   - Click the upload button
   - Select an image of your document
   - Wait for AI processing

2. **Review & Edit Data**
   - Review extracted data in the form
   - Edit any fields if needed
   - All changes are saved automatically

3. **Submit to Google Sheets**
   - Click 'Submit to Google Sheets'
   - Data will be appended to your configured sheet

## 🔒 Security

- Environment variables for sensitive credentials
- Google Sheets service account authentication
- No sensitive data stored in the application
- Secure API endpoints

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- OpenAI for the GPT-4 Vision API
- Vercel for Next.js
- Shadcn for the UI components
- Google for Sheets API
