'use server'

import { documentMemory } from '@/lib/document-memory'

// Learn from user corrections
export async function learnFromCorrection(
  originalData: unknown,
  correctedData: unknown,
  supplier: string,
  documentType: string
) {
  try {
    console.log('Learning from correction:', { supplier, documentType })
    
    // Update memory with correction
    await documentMemory.learnFromCorrection(
      supplier,
      documentType,
      originalData,
      correctedData
    )
    
    console.log('Correction learned successfully')
    return { success: true }
  } catch (error) {
    console.error('Failed to learn from correction:', error)
    return { 
      success: false, 
      error: 'Failed to save correction feedback' 
    }
  }
}

// Get all learned document formats for debugging
export async function getLearnedFormats() {
  try {
    const formats = await documentMemory.getAllFormats()
    return { success: true, formats }
  } catch (error) {
    console.error('Failed to get learned formats:', error)
    return { 
      success: false, 
      error: 'Failed to retrieve learned formats' 
    }
  }
}

// Reset memory for testing
export async function resetMemory() {
  try {
    await documentMemory.clearMemory()
    console.log('Memory cleared successfully')
    return { success: true }
  } catch (error) {
    console.error('Failed to reset memory:', error)
    return { 
      success: false, 
      error: 'Failed to reset memory' 
    }
  }
}