'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Upload, 
  FileText, 
  Globe, 
  Trash2, 
  Search, 
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Download,
  Tag,
  BookOpen
} from 'lucide-react'

interface Document {
  id: string
  title: string
  source: string
  type: 'pdf' | 'web' | 'text'
  url?: string
  size?: number
  wordCount?: number
  language?: string
  status: 'processing' | 'completed' | 'failed'
  errorMessage?: string
  tags: string[]
  createdAt: string
  processedAt?: string
  _count: {
    chunks: number
  }
}

interface UploadProgress {
  fileName: string
  progress: number
  status: 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
}

export default function KnowledgePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const [isUploading, setIsUploading] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch('/api/documents/upload')
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents)
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session?.user) {
      fetchDocuments()
    }
  }, [session?.user, fetchDocuments])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    const uploads: UploadProgress[] = Array.from(files).map(file => ({
      fileName: file.name,
      progress: 0,
      status: 'uploading' as const,
    }))
    setUploadProgress(uploads)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const formData = new FormData()
      formData.append('file', file)

      try {
        // Update progress to uploading
        setUploadProgress(prev => prev.map((upload, index) => 
          index === i ? { ...upload, status: 'uploading', progress: 50 } : upload
        ))

        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          // Update progress to processing
          setUploadProgress(prev => prev.map((upload, index) => 
            index === i ? { ...upload, status: 'processing', progress: 75 } : upload
          ))

          // Wait a bit to simulate processing
          await new Promise(resolve => setTimeout(resolve, 1000))

          // Mark as completed
          setUploadProgress(prev => prev.map((upload, index) => 
            index === i ? { ...upload, status: 'completed', progress: 100 } : upload
          ))
        } else {
          const error = await response.json()
          setUploadProgress(prev => prev.map((upload, index) => 
            index === i ? { 
              ...upload, 
              status: 'error', 
              error: error.error || 'Upload failed' 
            } : upload
          ))
        }
      } catch (error) {
        setUploadProgress(prev => prev.map((upload, index) => 
          index === i ? { 
            ...upload, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Upload failed' 
          } : upload
        ))
      }
    }

    // Refresh documents list
    setTimeout(() => {
      fetchDocuments()
      setUploadProgress([])
      setIsUploading(false)
    }, 2000)

    // Reset file input
    event.target.value = ''
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setDocuments(prev => prev.filter(doc => doc.id !== documentId))
      } else {
        alert('Failed to delete document')
      }
    } catch (error) {
      console.error('Error deleting document:', error)
      alert('Failed to delete document')
    }
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus
    const matchesType = filterType === 'all' || doc.type === filterType
    
    return matchesSearch && matchesStatus && matchesType
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-500" />
      case 'web':
        return <Globe className="h-4 w-4 text-blue-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
                <p className="text-gray-600">Manage your documents and knowledge sources</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => router.push('/chat')}
              >
                <Search className="h-4 w-4 mr-2" />
                Query Knowledge
              </Button>
              
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard')}
              >
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Upload Documents</span>
            </CardTitle>
            <CardDescription>
              Add PDF, text, or markdown files to your knowledge base
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                multiple
                accept=".pdf,.txt,.md"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <label
                htmlFor="file-upload"
                className={`cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900">
                  {isUploading ? 'Uploading...' : 'Choose files to upload'}
                </p>
                <p className="text-gray-500">
                  PDF, TXT, or MD files up to 10MB each
                </p>
              </label>
            </div>

            {/* Upload Progress */}
            {uploadProgress.length > 0 && (
              <div className="mt-6 space-y-3">
                {uploadProgress.map((upload, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{upload.fileName}</span>
                      <Badge variant={
                        upload.status === 'completed' ? 'default' :
                        upload.status === 'error' ? 'destructive' : 'secondary'
                      }>
                        {upload.status}
                      </Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          upload.status === 'completed' ? 'bg-green-500' :
                          upload.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                    {upload.error && (
                      <p className="text-red-500 text-sm mt-2">{upload.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="pdf">PDF</option>
                <option value="web">Web</option>
                <option value="text">Text</option>
              </select>

              <Button
                variant="outline"
                onClick={fetchDocuments}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Documents List */}
        {isLoading ? (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Loading documents...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {documents.length === 0 ? 'No documents yet' : 'No documents match your filters'}
              </h3>
              <p className="text-gray-500">
                {documents.length === 0 
                  ? 'Upload your first document to get started'
                  : 'Try adjusting your search or filters'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDocuments.map((document) => (
              <Card key={document.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(document.type)}
                      <CardTitle className="text-lg truncate">{document.title}</CardTitle>
                    </div>
                    {getStatusIcon(document.status)}
                  </div>
                  <CardDescription className="truncate">
                    {document.source}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {/* Tags */}
                  {document.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {document.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {document.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{document.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Size:</span>
                      <span>{formatFileSize(document.size)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Words:</span>
                      <span>{document.wordCount?.toLocaleString() || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Chunks:</span>
                      <span>{document._count.chunks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Created:</span>
                      <span>{new Date(document.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Error Message */}
                  {document.status === 'failed' && document.errorMessage && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {document.errorMessage}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-between pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Navigate to document view
                        router.push(`/knowledge/${document.id}`)
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteDocument(document.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}