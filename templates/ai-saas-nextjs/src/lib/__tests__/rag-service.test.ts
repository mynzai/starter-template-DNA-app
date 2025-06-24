import { RAGService } from '../rag-service'

// Mock the dependencies
jest.mock('../vector-db', () => ({
  VectorDatabase: jest.fn().mockImplementation(() => ({
    generateEmbedding: jest.fn().mockResolvedValue(new Array(1536).fill(0.1)),
    storeDocumentChunks: jest.fn().mockResolvedValue(['chunk-1', 'chunk-2']),
    similaritySearch: jest.fn().mockResolvedValue([
      {
        id: 'result-1',
        score: 0.8,
        metadata: {
          title: 'Test Document',
          source: 'test.pdf',
          url: 'https://example.com/test.pdf',
        },
        text: 'This is a test document content about AI and machine learning.',
      },
    ]),
    deleteDocument: jest.fn().mockResolvedValue(undefined),
    getDocumentStats: jest.fn().mockResolvedValue({
      totalDocuments: 1,
      totalChunks: 5,
      storageUsed: 1024,
    }),
  })),
}))

jest.mock('../ai-service', () => ({
  AIService: jest.fn().mockImplementation(() => ({
    generateResponse: jest.fn().mockResolvedValue({
      content: 'Based on the provided context, AI and machine learning are important technologies.',
      tokenUsage: { prompt: 100, completion: 50, total: 150 },
    }),
  })),
}))

jest.mock('../document-processor', () => ({
  DocumentProcessor: jest.fn().mockImplementation(() => ({
    processPDF: jest.fn().mockResolvedValue({
      id: 'doc-123',
      title: 'Test PDF',
      content: 'This is test content',
      metadata: {
        source: 'test.pdf',
        type: 'pdf',
        wordCount: 100,
        language: 'en',
        extractedAt: '2025-06-15T21:00:00.000Z',
      },
    }),
    processText: jest.fn().mockResolvedValue({
      id: 'doc-124',
      title: 'Test Text',
      content: 'This is test text content',
      metadata: {
        source: 'test.txt',
        type: 'text',
        wordCount: 50,
        language: 'en',
        extractedAt: '2025-06-15T21:00:00.000Z',
      },
    }),
    chunkDocument: jest.fn().mockResolvedValue([
      {
        text: 'First chunk of content',
        index: 0,
        metadata: {
          documentId: 'doc-123',
          source: 'test.pdf',
          type: 'pdf',
          startChar: 0,
          endChar: 100,
        },
      },
      {
        text: 'Second chunk of content',
        index: 1,
        metadata: {
          documentId: 'doc-123',
          source: 'test.pdf',
          type: 'pdf',
          startChar: 100,
          endChar: 200,
        },
      },
    ]),
    deduplicateChunks: jest.fn().mockImplementation((chunks) => chunks),
    validateDocument: jest.fn().mockReturnValue({
      isValid: true,
      errors: [],
    }),
  })),
}))

describe('RAGService', () => {
  let ragService: RAGService

  beforeEach(() => {
    ragService = new RAGService()
    jest.clearAllMocks()
  })

  describe('generateResponse', () => {
    it('should generate RAG response with sources', async () => {
      const request = {
        query: 'What is machine learning?',
        userId: 'user-123',
        options: {
          maxContext: 5,
          minRelevanceScore: 0.7,
          model: 'gpt-3.5-turbo',
          provider: 'openai' as const,
        },
      }

      const response = await ragService.generateResponse(request)

      expect(response).toMatchObject({
        response: expect.any(String),
        sources: expect.arrayContaining([
          expect.objectContaining({
            title: expect.any(String),
            relevanceScore: expect.any(Number),
            excerpt: expect.any(String),
          }),
        ]),
        confidence: expect.any(Number),
        tokenUsage: expect.objectContaining({
          prompt: expect.any(Number),
          completion: expect.any(Number),
          total: expect.any(Number),
        }),
        processingTime: expect.any(Number),
      })

      expect(response.sources).toHaveLength(1)
      expect(response.sources[0].title).toBe('Test Document')
      expect(response.confidence).toBeGreaterThan(0)
    })

    it('should handle empty context gracefully', async () => {
      // Mock empty search results
      const mockVectorDB = require('../vector-db').VectorDatabase
      const mockInstance = new mockVectorDB()
      mockInstance.similaritySearch.mockResolvedValueOnce([])

      const request = {
        query: 'Unknown topic',
        userId: 'user-123',
      }

      const response = await ragService.generateResponse(request)

      expect(response.sources).toHaveLength(0)
      expect(response.confidence).toBeLessThanOrEqual(0.1)
    })

    it('should respect context limits', async () => {
      const request = {
        query: 'Test query',
        userId: 'user-123',
        options: {
          maxContext: 3,
        },
      }

      await ragService.generateResponse(request)

      const mockVectorDB = require('../vector-db').VectorDatabase
      const mockInstance = new mockVectorDB()
      expect(mockInstance.similaritySearch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          topK: 3,
        })
      )
    })
  })

  describe('processDocument', () => {
    it('should process PDF file successfully', async () => {
      const mockFile = new File(['test content'], 'test.pdf', {
        type: 'application/pdf',
      })

      const documentId = await ragService.processDocument(mockFile, {
        userId: 'user-123',
        source: 'test.pdf',
        title: 'Test PDF',
      })

      expect(documentId).toBe('doc-123')

      const mockDocProcessor = require('../document-processor').DocumentProcessor
      const mockInstance = new mockDocProcessor()
      expect(mockInstance.processPDF).toHaveBeenCalled()
      expect(mockInstance.chunkDocument).toHaveBeenCalled()
      expect(mockInstance.validateDocument).toHaveBeenCalled()

      const mockVectorDB = require('../vector-db').VectorDatabase
      const mockVectorInstance = new mockVectorDB()
      expect(mockVectorInstance.storeDocumentChunks).toHaveBeenCalled()
    })

    it('should process text file successfully', async () => {
      const mockFile = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      })

      const documentId = await ragService.processDocument(mockFile, {
        userId: 'user-123',
        source: 'test.txt',
        title: 'Test Text',
      })

      expect(documentId).toBe('doc-124')

      const mockDocProcessor = require('../document-processor').DocumentProcessor
      const mockInstance = new mockDocProcessor()
      expect(mockInstance.processText).toHaveBeenCalled()
    })

    it('should handle validation errors', async () => {
      const mockDocProcessor = require('../document-processor').DocumentProcessor
      const mockInstance = new mockDocProcessor()
      mockInstance.validateDocument.mockReturnValueOnce({
        isValid: false,
        errors: ['Document too short'],
      })

      const mockFile = new File(['x'], 'test.txt', {
        type: 'text/plain',
      })

      await expect(
        ragService.processDocument(mockFile, {
          userId: 'user-123',
          source: 'test.txt',
        })
      ).rejects.toThrow('Document validation failed: Document too short')
    })

    it('should reject unsupported file types', async () => {
      const mockFile = new File(['test'], 'test.exe', {
        type: 'application/x-executable',
      })

      await expect(
        ragService.processDocument(mockFile, {
          userId: 'user-123',
          source: 'test.exe',
        })
      ).rejects.toThrow('Unsupported file type')
    })
  })

  describe('processWebPage', () => {
    it('should process web page successfully', async () => {
      const url = 'https://example.com/article'

      const documentId = await ragService.processWebPage(url, {
        userId: 'user-123',
        tags: ['web', 'article'],
      })

      expect(documentId).toBeDefined()

      const mockDocProcessor = require('../document-processor').DocumentProcessor
      const mockInstance = new mockDocProcessor()
      expect(mockInstance.processWebPage).toHaveBeenCalledWith(url)
    })
  })

  describe('deleteDocument', () => {
    it('should delete document successfully', async () => {
      await ragService.deleteDocument('doc-123', 'user-123')

      const mockVectorDB = require('../vector-db').VectorDatabase
      const mockInstance = new mockVectorDB()
      expect(mockInstance.deleteDocument).toHaveBeenCalledWith('doc-123', 'user-123')
    })
  })

  describe('getKnowledgeBaseStats', () => {
    it('should return knowledge base statistics', async () => {
      const stats = await ragService.getKnowledgeBaseStats('user-123')

      expect(stats).toEqual({
        totalDocuments: 1,
        totalChunks: 5,
        storageUsed: 1024,
      })

      const mockVectorDB = require('../vector-db').VectorDatabase
      const mockInstance = new mockVectorDB()
      expect(mockInstance.getDocumentStats).toHaveBeenCalledWith('user-123')
    })

    it('should handle errors gracefully', async () => {
      const mockVectorDB = require('../vector-db').VectorDatabase
      const mockInstance = new mockVectorDB()
      mockInstance.getDocumentStats.mockRejectedValueOnce(new Error('DB error'))

      const stats = await ragService.getKnowledgeBaseStats('user-123')

      expect(stats).toEqual({
        totalDocuments: 0,
        totalChunks: 0,
        storageUsed: 0,
      })
    })
  })

  describe('Query processing', () => {
    it('should expand queries with relevant terms', async () => {
      const request = {
        query: 'How does machine learning work?',
        userId: 'user-123',
      }

      await ragService.generateResponse(request)

      const mockVectorDB = require('../vector-db').VectorDatabase
      const mockInstance = new mockVectorDB()
      
      // Verify that similaritySearch was called with expanded query
      expect(mockInstance.similaritySearch).toHaveBeenCalledWith(
        expect.stringContaining('method'),
        expect.any(Object)
      )
    })

    it('should calculate confidence based on source relevance', async () => {
      const request = {
        query: 'Test query',
        userId: 'user-123',
      }

      const response = await ragService.generateResponse(request)

      // With a single source scoring 0.8, confidence should be reasonable
      expect(response.confidence).toBeGreaterThan(0.5)
      expect(response.confidence).toBeLessThanOrEqual(1.0)
    })
  })

  describe('Error handling', () => {
    it('should handle vector database errors', async () => {
      const mockVectorDB = require('../vector-db').VectorDatabase
      const mockInstance = new mockVectorDB()
      mockInstance.similaritySearch.mockRejectedValueOnce(new Error('Vector DB error'))

      const request = {
        query: 'Test query',
        userId: 'user-123',
      }

      await expect(ragService.generateResponse(request)).rejects.toThrow(
        'Failed to generate RAG response'
      )
    })

    it('should handle AI service errors', async () => {
      const mockAIService = require('../ai-service').AIService
      const mockInstance = new mockAIService()
      mockInstance.generateResponse.mockRejectedValueOnce(new Error('AI service error'))

      const request = {
        query: 'Test query',
        userId: 'user-123',
      }

      await expect(ragService.generateResponse(request)).rejects.toThrow(
        'Failed to generate RAG response'
      )
    })
  })
})