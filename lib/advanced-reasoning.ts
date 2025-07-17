import { DocumentFormat } from './document-memory'

// Advanced reasoning engine for document extraction
export class AdvancedReasoningEngine {
  
  // Generate context-aware prompt with reasoning
  generateReasoningPrompt(
    base64Image: string,
    documentFormat?: DocumentFormat,
    previousExtractions?: any[]
  ): string {
    const basePrompt = this.getBaseReasoningPrompt()
    const contextPrompt = this.getContextualPrompt(documentFormat)
    const learningPrompt = this.getLearningPrompt(previousExtractions)
    
    return `${basePrompt}\n\n${contextPrompt}\n\n${learningPrompt}`
  }

  private getBaseReasoningPrompt(): string {
    return `You are an expert document analysis AI with advanced reasoning capabilities. 

**REASONING APPROACH:**
1. **Visual Analysis**: First examine the overall document structure, layout, and visual elements
2. **Pattern Recognition**: Identify recurring patterns, formatting, and document type
3. **Contextual Understanding**: Understand the business context and document purpose
4. **Logical Validation**: Cross-verify extracted data for consistency and accuracy
5. **Error Prevention**: Apply learned patterns to avoid common extraction mistakes

**MULTI-STEP REASONING PROCESS:**

**Step 1: Document Assessment**
- Analyze document type (receipt, invoice, docket, purchase order)
- Identify supplier/company from header or letterhead
- Determine document quality and potential extraction challenges
- Note any handwritten elements, stamps, or corrections

**Step 2: Structural Analysis**
- Map document layout (header, body, footer sections)
- Identify item listing format and separation patterns
- Locate key information zones (dates, totals, signatures)
- Analyze text alignment and formatting cues

**Step 3: Content Extraction with Reasoning**
- Extract header information using contextual clues
- Process item listings with quantity and description validation
- Cross-reference dates and numbers for consistency
- Identify and prioritize handwritten corrections over printed text

**Step 4: Quality Assurance**
- Verify extracted quantities make logical sense
- Check date formats for consistency
- Validate that item descriptions are complete
- Ensure mathematical consistency where applicable

**Step 5: Output Generation**
- Structure data according to learned patterns
- Apply supplier-specific formatting rules
- Include confidence indicators for uncertain extractions
- Flag potential errors or ambiguities`
  }

  private getContextualPrompt(documentFormat?: DocumentFormat): string {
    if (!documentFormat) {
      return `**GENERAL EXTRACTION RULES:**
- Apply standard business document conventions
- Use common date formats (DD/MM/YYYY, DD-MM-YY)
- Extract quantities as precise decimal numbers
- Identify products by description or item name
- Default to "OK" for quality check fields if not specified`
    }

    return `**SUPPLIER-SPECIFIC CONTEXT:**
**Supplier:** ${documentFormat.supplier}
**Document Type:** ${documentFormat.documentType}
**Success Rate:** ${documentFormat.accuracy.successRate}%

**LEARNED PATTERNS:**
- **Date Format:** ${documentFormat.extractionTemplate.dateFormat}
- **Time Format:** ${documentFormat.extractionTemplate.timeFormat || 'Not specified'}
- **Quantity Format:** ${documentFormat.extractionTemplate.quantityFormat}
- **Header Location:** ${documentFormat.extractionTemplate.headerLocation}
- **Items Section:** ${documentFormat.extractionTemplate.itemsSection}

**EXTRACTION HINTS:**
- **Date Patterns:** ${documentFormat.extractionHints.datePatterns.join(', ')}
- **Quantity Patterns:** ${documentFormat.extractionHints.quantityPatterns.join(', ')}
- **Item Separators:** ${documentFormat.extractionHints.itemSeparators.join(', ')}
- **Signature Location:** ${documentFormat.extractionHints.signatureLocation}

**SPECIAL INSTRUCTIONS:**
${documentFormat.extractionHints.specialInstructions.map(instruction => `- ${instruction}`).join('\n')}

**COMMON ERRORS TO AVOID:**
${documentFormat.accuracy.commonErrors.map(error => `- ${this.getErrorDescription(error)}`).join('\n')}

**FIELD EXPECTATIONS:**
- **Supplier:** Should be "${documentFormat.extractionTemplate.commonFields.supplier}"
- **Document Number:** Format similar to "${documentFormat.extractionTemplate.commonFields.documentNumber}"
- **Signature:** Usually "${documentFormat.extractionTemplate.commonFields.signature}"`
  }

  private getLearningPrompt(previousExtractions?: any[]): string {
    if (!previousExtractions || previousExtractions.length === 0) {
      return `**LEARNING CONTEXT:**
This is the first time processing this type of document. Apply general best practices.`
    }

    const recentExample = previousExtractions[previousExtractions.length - 1]
    
    return `**LEARNING FROM PREVIOUS EXTRACTIONS:**
**Recent Successful Pattern:**
- **Items Found:** ${recentExample.items?.length || 0}
- **Date Format:** ${recentExample.documentDetails?.date || 'Not found'}
- **Typical Quantities:** ${this.analyzeQuantityPatterns(previousExtractions)}
- **Product Naming:** ${this.analyzeProductPatterns(previousExtractions)}

**CONSISTENCY EXPECTATIONS:**
- Follow similar item extraction patterns
- Maintain consistent date formatting
- Use similar quantity precision
- Apply learned field mappings`
  }

  // Advanced reasoning for specific extraction challenges
  generateSpecificReasoningPrompt(challenge: string, context: any): string {
    switch (challenge) {
      case 'handwritten_correction':
        return this.getHandwrittenReasoningPrompt(context)
      case 'poor_quality_image':
        return this.getPoorQualityReasoningPrompt(context)
      case 'multiple_pages':
        return this.getMultiPageReasoningPrompt(context)
      case 'foreign_language':
        return this.getForeignLanguageReasoningPrompt(context)
      default:
        return this.getGeneralReasoningPrompt(context)
    }
  }

  private getHandwrittenReasoningPrompt(context: any): string {
    return `**HANDWRITTEN CORRECTION ANALYSIS:**
**Reasoning Steps:**
1. **Identify Corrections:** Look for crossed-out text with handwritten replacements
2. **Prioritize Handwritten:** Always use handwritten values over printed ones
3. **Verify Consistency:** Ensure handwritten corrections make logical sense
4. **Context Validation:** Cross-check corrections against document context

**Special Instructions:**
- Look for pen/pencil marks over printed text
- Check for quantity corrections (common in delivery receipts)
- Verify product name corrections or additions
- Note signature authenticity and clarity`
  }

  private getPoorQualityReasoningPrompt(context: any): string {
    return `**POOR QUALITY IMAGE ANALYSIS:**
**Reasoning Steps:**
1. **Focus on Clear Areas:** Extract from highest quality sections first
2. **Use Context Clues:** Infer unclear text from surrounding context
3. **Pattern Recognition:** Use document structure to guide extraction
4. **Confidence Indicators:** Flag uncertain extractions

**Extraction Strategy:**
- Prioritize critical fields (supplier, total, date)
- Use partial text matching for product names
- Estimate quantities based on visible digits
- Flag ambiguous extractions for manual review`
  }

  private getMultiPageReasoningPrompt(context: any): string {
    return `**MULTI-PAGE DOCUMENT ANALYSIS:**
**Reasoning Steps:**
1. **Page Identification:** Determine if this is part of a multi-page document
2. **Content Distribution:** Identify which information appears on which page
3. **Continuation Logic:** Handle continued item lists or summaries
4. **Completeness Check:** Ensure all relevant information is captured

**Special Considerations:**
- Look for "continued on next page" indicators
- Check for page numbers or sequence markers
- Identify summary vs detail pages
- Extract from most complete or relevant page`
  }

  private getForeignLanguageReasoningPrompt(context: any): string {
    return `**FOREIGN LANGUAGE DOCUMENT ANALYSIS:**
**Reasoning Steps:**
1. **Language Detection:** Identify the primary language used
2. **Universal Elements:** Focus on numbers, dates, and recognizable patterns
3. **Context Translation:** Use business context to understand content
4. **Standard Formatting:** Apply universal document formatting rules

**Extraction Focus:**
- Prioritize numerical data (quantities, prices, dates)
- Use document structure for field identification
- Recognize common business terms across languages
- Apply logical business document patterns`
  }

  private getGeneralReasoningPrompt(context: any): string {
    return `**GENERAL ADVANCED REASONING:**
**Comprehensive Analysis:**
1. **Visual Structure:** Analyze layout and formatting
2. **Business Logic:** Apply commercial document standards
3. **Data Validation:** Cross-verify extracted information
4. **Error Prevention:** Use learned patterns to avoid mistakes

**Quality Assurance:**
- Ensure numerical consistency
- Validate date and time formats
- Check product description completeness
- Verify logical business relationships`
  }

  // Helper methods for analysis
  private analyzeQuantityPatterns(extractions: any[]): string {
    const quantities = extractions.flatMap(ext => 
      ext.items?.map((item: any) => item.quantity) || []
    ).filter(q => q !== undefined)

    if (quantities.length === 0) return 'No pattern detected'
    
    const hasDecimals = quantities.some(q => q.toString().includes('.'))
    const avgQuantity = quantities.reduce((a, b) => a + parseFloat(b), 0) / quantities.length
    
    return `${hasDecimals ? 'Decimal' : 'Integer'} values, average: ${avgQuantity.toFixed(2)}`
  }

  private analyzeProductPatterns(extractions: any[]): string {
    const products = extractions.flatMap(ext => 
      ext.items?.map((item: any) => item.product) || []
    ).filter(p => p && p.length > 0)

    if (products.length === 0) return 'No pattern detected'
    
    const avgLength = products.reduce((a, b) => a + b.length, 0) / products.length
    const hasNumbers = products.some(p => /\d/.test(p))
    
    return `Average length: ${avgLength.toFixed(0)} chars, ${hasNumbers ? 'includes' : 'no'} numbers`
  }

  private getErrorDescription(error: string): string {
    const errorDescriptions: Record<string, string> = {
      'date_extraction_error': 'Date format misinterpretation - double-check date patterns',
      'item_count_mismatch': 'Missing or extra items - verify item separation logic',
      'quantity_parsing_error': 'Quantity decimal/unit errors - check number formatting',
      'supplier_name_error': 'Incorrect supplier extraction - verify header analysis',
      'signature_location_error': 'Signature not found - check bottom sections carefully'
    }
    
    return errorDescriptions[error] || `Unknown error: ${error}`
  }

  // Generate reasoning summary for debugging
  generateReasoningSummary(extractedData: any, documentFormat?: DocumentFormat): string {
    return `
**REASONING SUMMARY:**
**Document Analysis:**
- Supplier: ${extractedData.documentDetails?.supplier || 'Not detected'}
- Document Type: ${documentFormat?.documentType || 'Unknown'}
- Items Extracted: ${extractedData.items?.length || 0}
- Confidence: ${documentFormat?.accuracy.successRate || 'Unknown'}%

**Applied Patterns:**
- Date Format: ${documentFormat?.extractionTemplate.dateFormat || 'Standard'}
- Quantity Format: ${documentFormat?.extractionTemplate.quantityFormat || 'Standard'}
- Previous Extractions: ${documentFormat?.accuracy.extractionCount || 0}

**Quality Indicators:**
- All required fields present: ${this.validateRequiredFields(extractedData)}
- Logical consistency: ${this.validateLogicalConsistency(extractedData)}
- Format adherence: ${this.validateFormatAdherence(extractedData, documentFormat)}
`
  }

  private validateRequiredFields(data: any): string {
    const required = ['supplier', 'items']
    const missing = required.filter(field => 
      !data.documentDetails?.[field] && !data[field]
    )
    return missing.length === 0 ? 'Yes' : `Missing: ${missing.join(', ')}`
  }

  private validateLogicalConsistency(data: any): string {
    const items = data.items || []
    const hasValidQuantities = items.every((item: any) => 
      item.quantity && item.quantity > 0
    )
    const hasValidProducts = items.every((item: any) => 
      item.product && item.product.length > 0
    )
    
    return hasValidQuantities && hasValidProducts ? 'Yes' : 'Issues detected'
  }

  private validateFormatAdherence(data: any, format?: DocumentFormat): string {
    if (!format) return 'No format to compare'
    
    const dateMatches = this.validateDateFormat(
      data.documentDetails?.date, 
      format.extractionTemplate.dateFormat
    )
    
    return dateMatches ? 'Yes' : 'Format deviation detected'
  }

  private validateDateFormat(date: string, expectedFormat: string): boolean {
    if (!date) return false
    
    switch (expectedFormat) {
      case 'DD/MM/YYYY':
        return /^\d{2}\/\d{2}\/\d{4}$/.test(date)
      case 'DD-MM-YY':
        return /^\d{2}-\d{2}-\d{2}$/.test(date)
      default:
        return true
    }
  }
}

// Export singleton instance
export const reasoningEngine = new AdvancedReasoningEngine()