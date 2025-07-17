"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, TrendingUp, FileText, Clock } from 'lucide-react'
import { getLearnedFormats } from '@/app/actions/learn-corrections.action'

interface DocumentFormat {
  id: string
  supplier: string
  documentType: string
  accuracy: {
    successRate: number
    extractionCount: number
    lastUpdated: string
  }
}

export default function MemoryStatus() {
  const [formats, setFormats] = useState<DocumentFormat[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const loadFormats = async () => {
    setIsLoading(true)
    try {
      const result = await getLearnedFormats()
      if (result.success) {
        setFormats(result.formats || [])
      }
    } catch (error) {
      console.error('Failed to load formats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadFormats()
  }, [])

  const totalExtractions = formats.reduce((sum, format) => sum + format.accuracy.extractionCount, 0)
  const avgAccuracy = formats.length > 0 
    ? formats.reduce((sum, format) => sum + format.accuracy.successRate, 0) / formats.length
    : 0

  const getAccuracyColor = (rate: number) => {
    if (rate >= 90) return 'bg-green-500'
    if (rate >= 75) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case 'receipt': return '🧾'
      case 'invoice': return '📄'
      case 'docket': return '📋'
      case 'purchase_order': return '📝'
      default: return '📄'
    }
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-blue-600" />
          AI Memory System
        </CardTitle>
        <CardDescription>
          Document format learning and pattern recognition
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <FileText className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Learned Formats</p>
              <p className="text-2xl font-bold text-blue-600">{formats.length}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Avg Accuracy</p>
              <p className="text-2xl font-bold text-green-600">{avgAccuracy.toFixed(1)}%</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
            <Clock className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Total Extractions</p>
              <p className="text-2xl font-bold text-purple-600">{totalExtractions}</p>
            </div>
          </div>
        </div>

        {/* Show/Hide Details Button */}
        <div className="flex justify-between items-center">
          <Button 
            variant="outline" 
            onClick={() => setShowDetails(!showDetails)}
            disabled={isLoading}
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </Button>
          <Button 
            variant="outline" 
            onClick={loadFormats}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>

        {/* Detailed Format List */}
        {showDetails && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Learned Document Formats</h3>
            {formats.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No document formats learned yet. Upload some documents to start learning!
              </p>
            ) : (
              <div className="grid gap-3">
                {formats.map((format) => (
                  <div 
                    key={format.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getDocumentTypeIcon(format.documentType)}</span>
                        <div>
                          <h4 className="font-medium">{format.supplier}</h4>
                          <p className="text-sm text-gray-600 capitalize">
                            {format.documentType.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="secondary" 
                          className="text-xs"
                        >
                          {format.accuracy.extractionCount} extractions
                        </Badge>
                        <div className="flex items-center gap-1">
                          <div 
                            className={`w-3 h-3 rounded-full ${getAccuracyColor(format.accuracy.successRate)}`}
                          />
                          <span className="text-sm font-medium">
                            {format.accuracy.successRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-500">
                      Last updated: {new Date(format.accuracy.lastUpdated).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Status Message */}
        {formats.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Memory Active:</strong> The system is learning from your documents and will 
              automatically apply learned patterns to improve extraction accuracy for recurring suppliers.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}