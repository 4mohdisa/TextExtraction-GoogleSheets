"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { ExtractedData } from "@/types"
import { format, parse } from 'date-fns'
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz'

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
          const utcTime = zonedTimeToUtc(indianTime, 'Asia/Kolkata')
          
          // Convert from UTC to Adelaide timezone
          const adelaideTime = utcToZonedTime(utcTime, 'Australia/Adelaide')
          
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

  return (
    <div className="space-y-4 overflow-x-auto max-w-[95vw] border rounded-lg p-4">
      <div className="flex justify-end mb-4">
        <Button 
          onClick={handleAddItem}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          Add New Item
        </Button>
      </div>
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
              {Object.entries(fieldConfig).map(([field, config]) => (
                <TableCell key={field} className={getColumnWidth(field)}>
                  <Input
                    type={config.type === 'decimal' ? 'number' : config.type}
                    step={config.type === 'decimal' ? '0.01' : undefined}
                    className="w-full px-2 py-1"
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
                  />
                </TableCell>
              ))}
              <TableCell className="min-w-[80px] text-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(index)}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}