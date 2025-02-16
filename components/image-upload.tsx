"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { extractDataFromImage } from "@/app/actions/openai.action"
import { ExtractedData } from "@/types"

interface ImageUploadProps {
  onDataExtracted: (data: ExtractedData[]) => void
}

export default function ImageUpload({ onDataExtracted }: ImageUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsLoading(true)
    try {
      // Convert file to base64
      const buffer = await file.arrayBuffer()
      const base64Image = Buffer.from(buffer).toString('base64')

      const result = await extractDataFromImage(base64Image)

      if (!result.success) {
        throw new Error(result.error || 'Failed to extract data')
      }

      onDataExtracted(result.data);
      
      toast({
        title: "Success",
        description: "Data successfully extracted from image",
      })
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to extract data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="picture">Picture</Label>
      <Input
        id="picture"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={isLoading}
      />
      <Button 
        onClick={handleUpload}
        disabled={!file || isLoading}
      >
        {isLoading ? "Extracting..." : "Extract Data"}
      </Button>
    </div>
  )
}
