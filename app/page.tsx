"use client"

import { useState } from "react"
import ImageUpload from "@/components/image-upload"
import DataTable from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { appendSheetData } from "@/app/actions/google-sheets.action"
import { ExtractedData } from "@/types"

export default function Home() {
  const [extractedData, setExtractedData] = useState<ExtractedData[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

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
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit data",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="container mx-auto p-4">
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Document Data Extraction</h1>
        {extractedData.length === 0 ? (
          <ImageUpload onDataExtracted={handleDataExtracted} />
        ) : (
          <>
            <DataTable
              data={extractedData}
              setData={setExtractedData}
            />
            <div className="mt-4 space-x-4">
              <Button 
                onClick={handleCancel} 
                variant="outline"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit to Google Sheets"}
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
