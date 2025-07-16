"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2, Plus, AlertCircle, Check } from "lucide-react"
import { ExtractedData } from "@/types"
import { format, parse } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import { useState } from 'react'

interface DataTableProps {
  data: ExtractedData[]
  setData: (data: ExtractedData[]) => void
}

function convertDateToISO(dateString: string | undefined | null): string {
  if (!dateString) return '';
  
  try {
    // First check if it's already in ISO format
    if (dateString.includes('-')) {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return dateString;
      }
    }

    // Try DD/MM/YYYY format
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts.map(part => parseInt(part.trim(), 10));
      const date = new Date(year, month - 1, day); // Month is 0-indexed
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
  } catch (error) {
    console.error('Date conversion error:', error);
  }
  
  return ''; // Return empty string if conversion fails
}

export default function DataTable({ data, setData }: DataTableProps) {
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  
  const validateField = (field: keyof ExtractedData, value: string | number): string => {
    
    switch (field) {
      case 'product':
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          return 'Product name is required'
        }
        break
      case 'qty':
        if (!value || (typeof value === 'number' && value <= 0)) {
          return 'Quantity must be greater than 0'
        }
        break
      case 'date':
        if (value && !isValidDate(value.toString())) {
          return 'Invalid date format'
        }
        break
      case 'supplier':
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          return 'Supplier name is required'
        }
        break
    }
    return ''
  }
  
  const isValidDate = (dateString: string): boolean => {
    if (!dateString) return true // Empty is allowed
    try {
      const date = new Date(dateString)
      return !isNaN(date.getTime())
    } catch {
      return false
    }
  }
  
  const handleAddItem = () => {
    const newItem: ExtractedData = {
      date: format(new Date(), 'dd/MM/yyyy'),
      time: format(new Date(), 'hh:mm a'),
      supplier: '',
      product: '',
      qty: 0,
      orderNumber: '',
      invoiceNumber: '',
      batchCode: '',
      useByDate: '',
      tempCheck: '',
      productIntegrityCheck: 'OK',
      weightCheck: 'OK',
      comments: '',
      signature: ''
    };
    setData([...data, newItem]);
  };
  const handleEdit = (index: number, field: keyof ExtractedData, value: string) => {
    const newData = [...data]
    
    if (field === 'qty') {
      // Allow decimal numbers for quantity
      const parsedValue = parseFloat(value) || 0
      newData[index] = { ...newData[index], [field]: parsedValue }
    } else if (field === 'date') {
      try {
        // Try to parse and format the date consistently
        const parsedDate = parse(value, 'yyyy-MM-dd', new Date())
        const formattedDate = format(parsedDate, 'dd/MM/yyyy')
        newData[index] = { ...newData[index], [field]: formattedDate }
      } catch (error: unknown) {
        console.warn(`Failed to parse date: ${error instanceof Error ? error.message : 'Unknown error'}`)
        // If parsing fails, keep the original value
        newData[index] = { ...newData[index], [field]: value }
      }
    } else if (field === 'time') {
      try {
        // Parse the input time (assuming it's in Indian time)
        const timeParts = value.split(':')
        if (timeParts.length >= 2) {
          const hours = parseInt(timeParts[0])
          const minutes = parseInt(timeParts[1])

          // Create a date object for today with the input time in Indian timezone
          const today = new Date()
          const indianTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes)
          
          // Convert from Indian timezone to UTC
          const utcTime = fromZonedTime(indianTime, 'Asia/Kolkata')
          
          // Convert from UTC to Adelaide timezone
          const adelaideTime = toZonedTime(utcTime, 'Australia/Adelaide')
          
          // Format in 12-hour format
          const adelaideHours = adelaideTime.getHours()
          const adelaideMinutes = adelaideTime.getMinutes()
          const period = adelaideHours >= 12 ? 'PM' : 'AM'
          const twelveHour = adelaideHours % 12 || 12
          
          const formattedTime = `${twelveHour.toString().padStart(2, '0')}:${adelaideMinutes.toString().padStart(2, '0')} ${period}`
          newData[index] = { ...newData[index], [field]: formattedTime }
        } else {
          newData[index] = { ...newData[index], [field]: value }
        }
      } catch (error: unknown) {
        console.warn(`Failed to parse time: ${error instanceof Error ? error.message : 'Unknown error'}`)
        newData[index] = { ...newData[index], [field]: value }
      }
    } else {
      newData[index] = { ...newData[index], [field]: value }
    }
    
    // Validate the field
    const error = validateField(field, field === 'qty' ? parseFloat(value) : value)
    const fieldKey = `${index}-${field}`
    const newErrors = { ...validationErrors }
    
    if (error) {
      newErrors[fieldKey] = error
    } else {
      delete newErrors[fieldKey]
    }
    
    setValidationErrors(newErrors)
    setData(newData)
  }

  const handleDelete = (index: number) => {
    const newData = data.filter((_, i) => i !== index)
    setData(newData)
  }

  // Update the ExtractedData interface for the new structure
  interface ExtractedData {
    date: string
    time: string
    supplier: string
    product: string
    qty: number
    orderNumber: string
    invoiceNumber: string
    batchCode: string
    useByDate: string
    tempCheck: string
    productIntegrityCheck: string
    weightCheck: string
    comments: string
    signature: string
  }

  const fieldConfig: Record<keyof ExtractedData, { display: string, type: 'text' | 'number' | 'date' | 'time' | 'decimal' }> = {
    date: { display: "DATE", type: 'date' },
    time: { display: "TIME", type: 'time' },
    supplier: { display: "SUPPLIER", type: 'text' },
    product: { display: "PRODUCT", type: 'text' },
    qty: { display: "QTY", type: 'decimal' },
    orderNumber: { display: "ORDER NUMBER", type: 'text' },
    invoiceNumber: { display: "INVOICE NUMBER", type: 'text' },
    batchCode: { display: "BATCH CODE", type: 'text' },
    useByDate: { display: "USE BY DATE", type: 'date' },
    tempCheck: { display: "TEMP CHECK", type: 'text' },
    productIntegrityCheck: { display: "PRODUCT INTEGRITY CHECK", type: 'text' },
    weightCheck: { display: "WEIGHT CHECK", type: 'text' },
    comments: { display: "COMMENTS", type: 'text' },
    signature: { display: "SIGNATURE", type: 'text' },
  }

  // Define column widths based on content type
  const getColumnWidth = (field: string) => {
    switch (field) {
      case 'date':
      case 'time':
        return 'min-w-[150px]'; // Date and time fields
      case 'qty':
        return 'min-w-[100px]'; // Quantity field
      case 'supplier':
      case 'product':
      case 'comments':
        return 'min-w-[300px]'; // Wide text fields
      case 'tempCheck':
      case 'weightCheck':
      case 'productIntegrityCheck':
        return 'min-w-[200px]'; // Check fields
      default:
        return 'min-w-[200px]'; // All other fields
    }
  };

  // Count validation errors
  const errorCount = Object.keys(validationErrors).length
  const hasErrors = errorCount > 0
  
  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{data.length}</span> item{data.length !== 1 ? 's' : ''}
          </div>
          {hasErrors && (
            <div className="flex items-center space-x-1 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{errorCount} validation error{errorCount !== 1 ? 's' : ''}</span>
            </div>
          )}
          {!hasErrors && data.length > 0 && (
            <div className="flex items-center space-x-1 text-green-600">
              <Check className="w-4 h-4" />
              <span className="text-sm">All data valid</span>
            </div>
          )}
        </div>
        <Button 
          onClick={handleAddItem}
          variant="outline"
          size="sm"
          className="flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Item</span>
        </Button>
      </div>
      
      {/* Table Container */}
      <div className="overflow-x-auto border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            {Object.entries(fieldConfig).map(([field, config]) => (
              <TableHead key={field} className={getColumnWidth(field)}>
                {config.display}
              </TableHead>
            ))}
            <TableHead className="min-w-[80px] text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => (
            <TableRow key={index}>
              {Object.entries(fieldConfig).map(([field, config]) => {
                const fieldKey = `${index}-${field}`
                const hasError = validationErrors[fieldKey]
                
                return (
                  <TableCell key={field} className={getColumnWidth(field)}>
                    <div className="relative">
                      <Input
                        type={config.type === 'decimal' ? 'number' : config.type}
                        step={config.type === 'decimal' ? '0.01' : undefined}
                        className={`w-full px-2 py-1 ${hasError ? 'border-red-500 bg-red-50' : ''}`}
                        value={
                          config.type === 'date'
                            ? convertDateToISO(item[field as keyof ExtractedData] as string | undefined)
                            : config.type === 'decimal'
                            ? (typeof item[field as keyof ExtractedData] === 'number'
                                ? item[field as keyof ExtractedData].toString()
                                : '')
                            : (item[field as keyof ExtractedData]?.toString() || '')
                        }
                        onChange={(e) => handleEdit(index, field as keyof ExtractedData, e.target.value)}
                        placeholder={config.type === 'decimal' ? '0.00' : `Enter ${config.display.toLowerCase()}`}
                      />
                      {hasError && (
                        <div className="absolute -bottom-5 left-0 text-xs text-red-600">
                          {hasError}
                        </div>
                      )}
                    </div>
                  </TableCell>
                )
              })}
              <TableCell className="min-w-[80px] text-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(index)}
                  className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                  title="Delete item"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
      
      {/* Help Text */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Click in any cell to edit the extracted data</p>
        <p>• Red highlighted fields contain validation errors that need to be fixed</p>
        <p>• Use the &quot;Add Item&quot; button to manually add additional items</p>
      </div>
    </div>
  )
}