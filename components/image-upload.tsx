"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { extractDataFromImage } from "@/app/actions/openai.action"
import { ExtractedData } from "@/types"
import { Upload, FileImage, X, Loader2 } from "lucide-react"
import Image from "next/image"

interface ImageUploadProps {
  onDataExtracted: (data: ExtractedData[]) => void
}

export default function ImageUpload({ onDataExtracted }: ImageUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      
      // Validate file type
      if (!selectedFile.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        })
        return
      }
      
      // Validate file size (max 5MB for better performance)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB for faster processing",
          variant: "destructive",
        })
        return
      }
      
      setFile(selectedFile)
      
      // Create preview URL
      const reader = new FileReader()
      reader.onload = (event) => {
        setPreviewUrl(event.target?.result as string)
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsLoading(true)
    setProgress(0)
    setStatus('Preparing image...')
    
    try {
      // Convert file to base64 with progress
      setProgress(10)
      setStatus('Processing image...')
      const buffer = await file.arrayBuffer()
      const base64Image = Buffer.from(buffer).toString('base64')
      
      setProgress(30)
      setStatus('Analyzing document with AI...')
      
      const result = await extractDataFromImage(base64Image)
      
      setProgress(90)
      setStatus('Finalizing extraction...')

      if (!result.success) {
        throw new Error(result.error || 'Failed to extract data')
      }

      setProgress(100)
      setStatus('Complete!')
      
      onDataExtracted(result.data);
      
      // Enhanced success message with memory information
      const memoryInfo = result.memoryUsed ? ' (using learned patterns)' : '';
      const confidenceInfo = result.confidence ? ` - ${result.confidence}% confidence` : '';
      
      toast({
        title: "Success",
        description: `Successfully extracted ${result.data.length} item(s) from image${memoryInfo}${confidenceInfo}`,
      })
      
      // Log reasoning for debugging
      if (result.reasoning) {
        console.log('Extraction reasoning:', result.reasoning);
      }
    } catch (error) {
      console.error('Error:', error)
      setStatus('Error occurred')
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to extract data'
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('taking too long')) {
          errorMessage = 'Processing took too long. Please try with a smaller or clearer image.'
        } else if (error.message.includes('504') || error.message.includes('Gateway Timeout')) {
          errorMessage = 'Server timeout. The image may be too complex. Please try with a simpler image.'
        } else if (error.message.includes('429')) {
          errorMessage = 'Too many requests. Please wait 30 seconds before trying again.'
        } else if (error.message.includes('too large')) {
          errorMessage = 'Image is too large. Please use a smaller image (under 5MB).'
        } else {
          errorMessage = error.message
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setTimeout(() => {
        setIsLoading(false)
        setProgress(0)
        setStatus('')
      }, 1000)
    }
  }
  
  const handleRemoveFile = () => {
    setFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      const droppedFile = droppedFiles[0]
      if (droppedFile.type.startsWith('image/')) {
        setFile(droppedFile)
        const reader = new FileReader()
        reader.onload = (event) => {
          setPreviewUrl(event.target?.result as string)
        }
        reader.readAsDataURL(droppedFile)
      }
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Upload Document Image</h2>
        <p className="text-sm text-gray-600 mb-4">
          Upload an image of your receipt, invoice, or delivery docket to extract data automatically
        </p>
      </div>
      
      {!file ? (
        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium mb-2">Drop your image here</p>
          <p className="text-sm text-gray-500 mb-4">or click to browse</p>
          <p className="text-xs text-gray-400">Supports JPG, PNG, GIF (max 10MB)</p>
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isLoading}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <FileImage className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium truncate">{file.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {previewUrl && (
              <div className="mt-3">
                <div className="relative max-w-full max-h-48 mx-auto">
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    width={400}
                    height={300}
                    className="max-w-full max-h-48 object-contain rounded border"
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-center space-x-4">
            <Button
              variant="outline"
              onClick={handleRemoveFile}
              disabled={isLoading}
            >
              Choose Different Image
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={!file || isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {status || 'Processing...'}
                </>
              ) : (
                "Extract Data"
              )}
            </Button>
            
            {/* Progress Bar */}
            {isLoading && (
              <div className="mt-4 space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 text-center">{status}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
