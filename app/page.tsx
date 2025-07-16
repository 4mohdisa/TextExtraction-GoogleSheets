"use client"

import { useState, useEffect } from "react"
import ImageUpload from "@/components/image-upload"
import DataTable from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { appendSheetData } from "@/app/actions/google-sheets.action"
import { ExtractedData } from "@/types"
import { CheckCircle, Upload, Table, ArrowLeft, Loader2 } from "lucide-react"
import { suppressBrowserExtensionErrors, handleApplicationError } from "@/lib/error-handler"

export default function Home() {
  const [extractedData, setExtractedData] = useState<ExtractedData[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  
  // Initialize error suppression for browser extensions
  useEffect(() => {
    suppressBrowserExtensionErrors();
  }, []);

  const handleDataExtracted = (data: ExtractedData[]) => {
    console.log('Extracted data:', JSON.stringify(data, null, 2));
    setExtractedData(data);
  }

  const handleCancel = () => {
    setExtractedData([])
  }

  const handleSubmit = async () => {
    if (!extractedData) return;
  
    setIsSubmitting(true);
    try {
      console.log('Raw extracted data:', JSON.stringify(extractedData, null, 2));
  
      // Transform each row of data for Google Sheets
      const transformedData = extractedData.map(item => [
        item.date || '', // DATE
        item.time || '', // TIME
        item.supplier || '', // SUPPLIER
        item.product || '', // PRODUCT
        item.qty || '', // QTY
        item.orderNumber || '', // ORDER NUMBER
        item.invoiceNumber || '', // INVOICE NUMBER
        item.batchCode || '', // BATCH CODE
        item.useByDate || '', // USE BY DATE
        item.tempCheck || 'OK', // TEMP CHECK
        item.productIntegrityCheck || 'OK', // PRODUCT INTEGRITY CHECK
        item.weightCheck || 'OK', // WEIGHT CHECK
        item.comments || '', // COMMENTS
        item.signature || ''  // SIGNATURE
    ]);
  
      console.log('Transformed data:', JSON.stringify(transformedData, null, 2));
  
      const response = await appendSheetData(transformedData);
  
      if (!response.success) {
        throw new Error(response.error || 'Failed to update Google Sheet');
      }
  
      toast({
        title: "Success",
        description: "Data successfully submitted to Google Sheets",
      });
  
      // Reset the state after successful submission
      setExtractedData([]);
  
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = handleApplicationError(
        error instanceof Error ? error : new Error('Failed to submit data'),
        'Google Sheets submission'
      );
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="text-center py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Document Data Extraction</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Upload receipts, invoices, or delivery dockets to automatically extract and organize data for Google Sheets
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center items-center mb-8 max-w-2xl mx-auto">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${extractedData.length === 0 ? 'text-blue-600' : 'text-green-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${extractedData.length === 0 ? 'bg-blue-100' : 'bg-green-100'}`}>
                {extractedData.length === 0 ? <Upload className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
              </div>
              <span className="text-sm font-medium">Upload Image</span>
            </div>
            <div className={`w-8 h-0.5 ${extractedData.length > 0 ? 'bg-green-400' : 'bg-gray-300'}`} />
            <div className={`flex items-center space-x-2 ${extractedData.length > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${extractedData.length > 0 ? 'bg-blue-100' : 'bg-gray-100'}`}>
                <Table className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">Review Data</span>
            </div>
            <div className={`w-8 h-0.5 bg-gray-300`} />
            <div className="flex items-center space-x-2 text-gray-400">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100">
                <CheckCircle className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">Submit to Sheets</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto">
          {extractedData.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8">
              <ImageUpload onDataExtracted={handleDataExtracted} />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Data Table */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Extracted Data</h2>
                  <div className="text-sm text-gray-500">
                    {extractedData.length} item{extractedData.length !== 1 ? 's' : ''} found
                  </div>
                </div>
                <DataTable
                  data={extractedData}
                  setData={setExtractedData}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center space-x-4 pb-8">
                <Button 
                  onClick={handleCancel} 
                  variant="outline"
                  disabled={isSubmitting}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Start Over</span>
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={isSubmitting || extractedData.length === 0}
                  className="bg-green-600 hover:bg-green-700 flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Submit to Google Sheets</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
