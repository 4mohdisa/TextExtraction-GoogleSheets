"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { ExtractedData } from "@/types"

interface DataTableProps {
  data: ExtractedData[]
  setData: (data: ExtractedData[]) => void
}

function convertDateToISO(dateString: string): string {
  // Assuming your date is in DD/MM/YYYY format
  const parts = dateString.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts.map(part => parseInt(part, 10));
    const date = new Date(year, month - 1, day); // Month is 0-indexed
    if (!isNaN(date.getTime())) { // Check if date is valid
      return date.toISOString().split('T')[0];
    }
  }
  return ''; // Return empty string if conversion fails
}

export default function DataTable({ data, setData }: DataTableProps) {
  const handleEdit = (index: number, field: keyof ExtractedData, value: string) => {
    const newData = [...data]
    // Special handling for date and time
    if (field === 'date' || field === 'time') {
      newData[index] = { ...newData[index], [field]: value }
    } else if (field === 'qty') {
      newData[index] = { ...newData[index], [field]: parseInt(value) || 0 }
    } else {
      newData[index] = { ...newData[index], [field]: value }
    }
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

  const fieldConfig: Record<keyof ExtractedData, { display: string, type: 'text' | 'number' | 'date' | 'time' }> = {
    date: { display: "DATE", type: 'date' },
    time: { display: "TIME", type: 'time' },
    supplier: { display: "SUPPLIER", type: 'text' },
    product: { display: "PRODUCT", type: 'text' },
    qty: { display: "QTY", type: 'number' },
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

  console.log('DataTable Data:', data);

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            {Object.entries(fieldConfig).map(([field, config]) => (
              <TableHead key={field}>{config.display}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => (
            <TableRow key={index}>
              {Object.entries(fieldConfig).map(([field, config]) => (
                <TableCell key={field}>
                  <Input
                    type={config.type}
                    value={
                      config.type === 'date' 
                        ? (typeof item[field as keyof ExtractedData] === 'string'
                            ? convertDateToISO(item[field as keyof ExtractedData] as string)
                            : '')
                        : (item[field as keyof ExtractedData]?.toString() || '')
                    }
                    onChange={(e) => handleEdit(index, field as keyof ExtractedData, e.target.value)}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}