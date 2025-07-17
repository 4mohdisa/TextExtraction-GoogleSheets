import { promises as fs } from 'fs'
import path from 'path'

// Document format memory structure
export interface DocumentFormat {
  id: string
  supplier: string
  documentType: 'receipt' | 'invoice' | 'docket' | 'purchase_order'
  extractionTemplate: {
    headerLocation: string
    dateFormat: string
    timeFormat?: string
    itemsSection: string
    quantityFormat: string
    priceFormat?: string
    commonFields: Record<string, string>
    itemFields: Record<string, string>
  }
  extractionHints: {
    datePatterns: string[]
    quantityPatterns: string[]
    itemSeparators: string[]
    signatureLocation: string
    specialInstructions: string[]
  }
  accuracy: {
    successRate: number
    commonErrors: string[]
    lastUpdated: string
    extractionCount: number
  }
  examples: {
    goodExtractions: any[]
    corrections: any[]
  }
}

// Memory manager class
export class DocumentMemoryManager {
  private memoryPath: string
  private memory: Map<string, DocumentFormat> = new Map()

  constructor() {
    this.memoryPath = path.join(process.cwd(), 'data', 'document-memory.json')
    this.initializeMemory()
  }

  private async initializeMemory() {
    try {
      // Ensure data directory exists
      await fs.mkdir(path.dirname(this.memoryPath), { recursive: true })
      
      // Load existing memory
      const data = await fs.readFile(this.memoryPath, 'utf-8')
      const memoryData = JSON.parse(data)
      
      for (const [key, value] of Object.entries(memoryData)) {
        this.memory.set(key, value as DocumentFormat)
      }
    } catch (error) {
      console.log('Initializing new document memory system')
      await this.saveMemory()
    }
  }

  private async saveMemory() {
    try {
      const memoryData = Object.fromEntries(this.memory.entries())
      await fs.writeFile(this.memoryPath, JSON.stringify(memoryData, null, 2))
    } catch (error) {
      console.error('Failed to save document memory:', error)
    }
  }

  // Get or create document format for supplier
  async getDocumentFormat(supplier: string, documentType: string): Promise<DocumentFormat | null> {
    const key = `${supplier.toLowerCase()}-${documentType.toLowerCase()}`
    return this.memory.get(key) || null
  }

  // Learn from successful extraction
  async learnFromExtraction(
    supplier: string,
    documentType: string,
    extractedData: any,
    imageAnalysis: any
  ) {
    const key = `${supplier.toLowerCase()}-${documentType.toLowerCase()}`
    let format = this.memory.get(key)

    if (!format) {
      // Create new format
      format = {
        id: key,
        supplier,
        documentType: documentType as any,
        extractionTemplate: this.analyzeExtractionTemplate(imageAnalysis, extractedData),
        extractionHints: this.generateExtractionHints(imageAnalysis, extractedData),
        accuracy: {
          successRate: 100,
          commonErrors: [],
          lastUpdated: new Date().toISOString(),
          extractionCount: 1
        },
        examples: {
          goodExtractions: [extractedData],
          corrections: []
        }
      }
    } else {
      // Update existing format
      format.accuracy.extractionCount++
      format.accuracy.lastUpdated = new Date().toISOString()
      format.examples.goodExtractions.push(extractedData)
      
      // Keep only last 5 examples
      if (format.examples.goodExtractions.length > 5) {
        format.examples.goodExtractions = format.examples.goodExtractions.slice(-5)
      }
      
      // Update extraction hints based on new data
      format.extractionHints = this.refineExtractionHints(format.extractionHints, imageAnalysis, extractedData)
    }

    this.memory.set(key, format)
    await this.saveMemory()
  }

  // Learn from correction/error
  async learnFromCorrection(
    supplier: string,
    documentType: string,
    originalData: any,
    correctedData: any
  ) {
    const key = `${supplier.toLowerCase()}-${documentType.toLowerCase()}`
    let format = this.memory.get(key)

    if (format) {
      format.examples.corrections.push({
        original: originalData,
        corrected: correctedData,
        timestamp: new Date().toISOString()
      })

      // Analyze common errors
      const errorAnalysis = this.analyzeError(originalData, correctedData)
      if (errorAnalysis && !format.accuracy.commonErrors.includes(errorAnalysis)) {
        format.accuracy.commonErrors.push(errorAnalysis)
      }

      // Update success rate
      format.accuracy.successRate = Math.max(
        format.accuracy.successRate - 5,
        0
      )

      this.memory.set(key, format)
      await this.saveMemory()
    }
  }

  // Generate extraction template from successful extraction
  private analyzeExtractionTemplate(imageAnalysis: any, extractedData: any): DocumentFormat['extractionTemplate'] {
    return {
      headerLocation: 'top',
      dateFormat: this.detectDateFormat(extractedData.documentDetails?.date),
      timeFormat: this.detectTimeFormat(extractedData.documentDetails?.time),
      itemsSection: 'center',
      quantityFormat: this.detectQuantityFormat(extractedData.items),
      priceFormat: this.detectPriceFormat(extractedData.items),
      commonFields: {
        supplier: extractedData.documentDetails?.supplier || '',
        documentNumber: extractedData.documentDetails?.documentNumber || '',
        signature: extractedData.documentDetails?.signature || ''
      },
      itemFields: {
        product: 'product name or description',
        quantity: 'numeric value with optional unit',
        batchCode: 'alphanumeric code',
        useByDate: 'date in various formats'
      }
    }
  }

  // Generate extraction hints
  private generateExtractionHints(imageAnalysis: any, extractedData: any): DocumentFormat['extractionHints'] {
    return {
      datePatterns: this.extractDatePatterns(extractedData.documentDetails?.date),
      quantityPatterns: this.extractQuantityPatterns(extractedData.items),
      itemSeparators: ['new line', 'dashed line', 'blank space'],
      signatureLocation: 'bottom right',
      specialInstructions: [
        'Look for handwritten corrections',
        'Ignore crossed-out items',
        'Check for multiple pages',
        'Verify decimal precision for quantities'
      ]
    }
  }

  // Refine extraction hints based on new data
  private refineExtractionHints(
    existingHints: DocumentFormat['extractionHints'],
    imageAnalysis: any,
    extractedData: any
  ): DocumentFormat['extractionHints'] {
    const newDatePatterns = this.extractDatePatterns(extractedData.documentDetails?.date)
    const newQuantityPatterns = this.extractQuantityPatterns(extractedData.items)

    return {
      ...existingHints,
      datePatterns: Array.from(new Set([...existingHints.datePatterns, ...newDatePatterns])),
      quantityPatterns: Array.from(new Set([...existingHints.quantityPatterns, ...newQuantityPatterns]))
    }
  }

  // Helper methods
  private detectDateFormat(date: string): string {
    if (!date) return 'DD/MM/YYYY'
    if (date.includes('-')) return 'DD-MM-YY'
    if (date.includes('/')) return 'DD/MM/YYYY'
    return 'DD/MM/YYYY'
  }

  private detectTimeFormat(time: string): string {
    if (!time) return 'HH:MM'
    if (time.includes('AM') || time.includes('PM')) return 'HH:MM AM/PM'
    return 'HH:MM'
  }

  private detectQuantityFormat(items: any[]): string {
    if (!items || items.length === 0) return 'decimal'
    
    const hasDecimals = items.some(item => 
      item.quantity && item.quantity.toString().includes('.')
    )
    
    return hasDecimals ? 'decimal' : 'integer'
  }

  private detectPriceFormat(items: any[]): string {
    if (!items || items.length === 0) return 'currency'
    
    const hasPrice = items.some(item => item.unitPrice || item.totalPrice)
    return hasPrice ? 'currency' : 'none'
  }

  private extractDatePatterns(date: string): string[] {
    if (!date) return []
    
    const patterns = []
    if (date.includes('-')) patterns.push('DD-MM-YY')
    if (date.includes('/')) patterns.push('DD/MM/YYYY')
    if (date.match(/\d{1,2}(?:st|nd|rd|th)/)) patterns.push('DD ordinal Month YYYY')
    
    return patterns
  }

  private extractQuantityPatterns(items: any[]): string[] {
    if (!items || items.length === 0) return []
    
    const patterns = []
    items.forEach(item => {
      if (item.quantity) {
        const qty = item.quantity.toString()
        if (qty.includes('.')) patterns.push('decimal')
        if (qty.match(/\d+/)) patterns.push('integer')
      }
    })
    
    return Array.from(new Set(patterns))
  }

  private analyzeError(original: any, corrected: any): string | null {
    // Analyze common error patterns
    if (original.documentDetails?.date !== corrected.documentDetails?.date) {
      return 'date_extraction_error'
    }
    
    if (original.items?.length !== corrected.items?.length) {
      return 'item_count_mismatch'
    }
    
    const qtyErrors = original.items?.some((item: any, index: number) => 
      item.quantity !== corrected.items?.[index]?.quantity
    )
    
    if (qtyErrors) {
      return 'quantity_parsing_error'
    }
    
    return null
  }

  // Get all learned formats
  async getAllFormats(): Promise<DocumentFormat[]> {
    return Array.from(this.memory.values())
  }

  // Clear memory (for testing)
  async clearMemory() {
    this.memory.clear()
    await this.saveMemory()
  }
}

// Export singleton instance
export const documentMemory = new DocumentMemoryManager()