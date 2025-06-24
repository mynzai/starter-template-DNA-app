import { AIService, AIMessage, AIServiceConfig } from './ai-service'
import { VectorDatabase, VectorSearchResult } from './vector-db'
import { DocumentProcessor, ProcessedDocument } from './document-processor'

export interface RAGRequest {
  query: string
  userId: string
  chatId?: string
  options?: {
    maxContext?: number
    minRelevanceScore?: number
    includeMetadata?: boolean
    model?: string
    provider?: 'openai' | 'anthropic'
  }
}

export interface RAGResponse {
  response: string
  sources: Array<{
    id: string
    title: string
    url?: string
    relevanceScore: number
    excerpt: string
  }>
  confidence: number
  tokenUsage: {
    prompt: number
    completion: number
    total: number
  }
  processingTime: number
}

export interface RAGContext {
  text: string
  source: string
  title: string
  url?: string
  relevanceScore: number
}

export class RAGService {
  private aiService: AIService
  private vectorDB: VectorDatabase
  private documentProcessor: DocumentProcessor

  constructor() {
    this.aiService = new AIService()
    this.vectorDB = new VectorDatabase()
    this.documentProcessor = new DocumentProcessor()
  }

  /**
   * Generate RAG response
   */
  async generateResponse(request: RAGRequest): Promise<RAGResponse> {
    const startTime = Date.now()

    try {
      // 1. Process and expand query
      const processedQuery = await this.processQuery(request.query)

      // 2. Retrieve relevant context
      const context = await this.retrieveContext(processedQuery, request.userId, {
        maxResults: request.options?.maxContext || 5,
        minScore: request.options?.minRelevanceScore || 0.7,
      })

      // 3. Generate response with context
      const response = await this.generateContextualResponse(
        request.query,
        context,
        {
          model: request.options?.model || 'gpt-3.5-turbo',
          provider: request.options?.provider || 'openai',
        }
      )

      // 4. Calculate confidence and prepare sources
      const confidence = this.calculateConfidence(context, response)
      const sources = context.map(ctx => ({
        id: `source_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: ctx.title,
        url: ctx.url,
        relevanceScore: ctx.relevanceScore,
        excerpt: this.createExcerpt(ctx.text, request.query),
      }))

      return {
        response: response.content,
        sources,
        confidence,
        tokenUsage: response.tokenUsage || { prompt: 0, completion: 0, total: 0 },
        processingTime: Date.now() - startTime,
      }
    } catch (error) {
      console.error('Error generating RAG response:', error)
      throw new Error('Failed to generate RAG response')
    }
  }

  /**
   * Process document and store in vector database
   */
  async processDocument(
    file: File | Buffer,
    metadata: {
      userId: string
      source: string
      title?: string
      tags?: string[]
      url?: string
    }
  ): Promise<string> {
    try {
      let processed: ProcessedDocument

      // Determine document type and process accordingly
      if (file instanceof File) {
        if (file.type === 'application/pdf') {
          const buffer = Buffer.from(await file.arrayBuffer())
          processed = await this.documentProcessor.processPDF(buffer, {
            source: metadata.source,
            url: metadata.url,
          })
        } else if (file.type.startsWith('text/')) {
          const text = await file.text()
          processed = await this.documentProcessor.processText(text, {
            source: metadata.source,
            title: metadata.title || file.name,
          })
        } else {
          throw new Error('Unsupported file type')
        }
      } else {
        // Assume it's a text buffer
        const text = file.toString('utf-8')
        processed = await this.documentProcessor.processText(text, {
          source: metadata.source,
          title: metadata.title,
        })
      }

      // Validate document
      const validation = this.documentProcessor.validateDocument(processed)
      if (!validation.isValid) {
        throw new Error(`Document validation failed: ${validation.errors.join(', ')}`)
      }

      // Chunk document
      const chunks = await this.documentProcessor.chunkDocument(processed)
      const deduplicatedChunks = await this.documentProcessor.deduplicateChunks(chunks)

      // Prepare chunks for vector storage
      const vectorChunks = deduplicatedChunks.map(chunk => ({
        text: chunk.text,
        metadata: {
          userId: metadata.userId,
          documentId: processed.id,
          source: metadata.source,
          title: processed.title,
          url: metadata.url,
          tags: metadata.tags || [],
          chunkIndex: chunk.index,
        },
      }))

      // Store in vector database
      await this.vectorDB.storeDocumentChunks(vectorChunks)

      return processed.id
    } catch (error) {
      console.error('Error processing document:', error)
      throw new Error(`Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Process web page and store in vector database
   */
  async processWebPage(
    url: string,
    metadata: {
      userId: string
      tags?: string[]
    }
  ): Promise<string> {
    try {
      const processed = await this.documentProcessor.processWebPage(url)
      
      // Validate document
      const validation = this.documentProcessor.validateDocument(processed)
      if (!validation.isValid) {
        throw new Error(`Web page validation failed: ${validation.errors.join(', ')}`)
      }

      // Chunk and store
      const chunks = await this.documentProcessor.chunkDocument(processed)
      const deduplicatedChunks = await this.documentProcessor.deduplicateChunks(chunks)

      const vectorChunks = deduplicatedChunks.map(chunk => ({
        text: chunk.text,
        metadata: {
          userId: metadata.userId,
          documentId: processed.id,
          source: url,
          title: processed.title,
          url,
          tags: metadata.tags || [],
          chunkIndex: chunk.index,
        },
      }))

      await this.vectorDB.storeDocumentChunks(vectorChunks)
      return processed.id
    } catch (error) {
      console.error('Error processing web page:', error)
      throw new Error(`Failed to process web page: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete document from knowledge base
   */
  async deleteDocument(documentId: string, userId: string): Promise<void> {
    try {
      await this.vectorDB.deleteDocument(documentId, userId)
    } catch (error) {
      console.error('Error deleting document:', error)
      throw new Error('Failed to delete document')
    }
  }

  /**
   * Get user's knowledge base statistics
   */
  async getKnowledgeBaseStats(userId: string) {
    try {
      return await this.vectorDB.getDocumentStats(userId)
    } catch (error) {
      console.error('Error getting knowledge base stats:', error)
      return {
        totalDocuments: 0,
        totalChunks: 0,
        storageUsed: 0,
      }
    }
  }

  /**
   * Process and expand query for better retrieval
   */
  private async processQuery(query: string): Promise<string> {
    // Simple query processing - in production, could use more sophisticated NLP
    const cleaned = query.trim().toLowerCase()
    
    // Add common query expansions
    const expansions = []
    
    // Add synonyms for common terms
    if (cleaned.includes('how')) expansions.push('method', 'way', 'process')
    if (cleaned.includes('what')) expansions.push('definition', 'meaning', 'explanation')
    if (cleaned.includes('why')) expansions.push('reason', 'cause', 'purpose')
    
    return expansions.length > 0 ? `${query} ${expansions.join(' ')}` : query
  }

  /**
   * Retrieve relevant context from vector database
   */
  private async retrieveContext(
    query: string,
    userId: string,
    options: { maxResults: number; minScore: number }
  ): Promise<RAGContext[]> {
    try {
      const results = await this.vectorDB.similaritySearch(query, {
        topK: options.maxResults,
        threshold: options.minScore,
        userId,
      })

      return results.map(result => ({
        text: result.text,
        source: result.metadata.source,
        title: result.metadata.title || 'Untitled',
        url: result.metadata.url,
        relevanceScore: result.score,
      }))
    } catch (error) {
      console.error('Error retrieving context:', error)
      return []
    }
  }

  /**
   * Generate AI response with retrieved context
   */
  private async generateContextualResponse(
    query: string,
    context: RAGContext[],
    config: { model: string; provider: 'openai' | 'anthropic' }
  ) {
    const contextText = context
      .map((ctx, i) => `[Source ${i + 1}: ${ctx.title}]\n${ctx.text}`)
      .join('\n\n')

    const prompt = this.buildRAGPrompt(query, contextText)

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant that answers questions based on provided context. Always cite your sources and be accurate.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ]

    const aiConfig: AIServiceConfig = {
      provider: config.provider,
      model: config.model,
      temperature: 0.3, // Lower temperature for more factual responses
      maxTokens: 1000,
    }

    return await this.aiService.generateResponse(messages, aiConfig)
  }

  /**
   * Build RAG prompt with context
   */
  private buildRAGPrompt(query: string, context: string): string {
    return `Based on the following context, please answer the question. If the context doesn't contain enough information to answer the question, say so clearly.

Context:
${context}

Question: ${query}

Instructions:
- Provide a comprehensive answer based on the context
- Cite specific sources when making claims
- If the context is insufficient, state this clearly
- Be concise but thorough
- Use markdown formatting for better readability

Answer:`
  }

  /**
   * Calculate confidence score for the response
   */
  private calculateConfidence(context: RAGContext[], response: any): number {
    if (context.length === 0) return 0.1

    // Base confidence on relevance scores and number of sources
    const avgRelevance = context.reduce((sum, ctx) => sum + ctx.relevanceScore, 0) / context.length
    const sourceBonus = Math.min(context.length / 5, 1) * 0.2 // Bonus for multiple sources

    return Math.min(avgRelevance + sourceBonus, 1.0)
  }

  /**
   * Create excerpt from text around query terms
   */
  private createExcerpt(text: string, query: string, maxLength = 200): string {
    const queryWords = query.toLowerCase().split(/\s+/)
    const textLower = text.toLowerCase()
    
    // Find the best position to extract excerpt
    let bestPosition = 0
    let maxMatches = 0

    for (let i = 0; i < text.length - maxLength; i += 50) {
      const segment = textLower.slice(i, i + maxLength)
      const matches = queryWords.filter(word => segment.includes(word)).length
      
      if (matches > maxMatches) {
        maxMatches = matches
        bestPosition = i
      }
    }

    let excerpt = text.slice(bestPosition, bestPosition + maxLength)
    
    // Clean up excerpt boundaries
    if (bestPosition > 0) {
      const firstSpace = excerpt.indexOf(' ')
      if (firstSpace > 0) excerpt = excerpt.slice(firstSpace + 1)
      excerpt = '...' + excerpt
    }
    
    if (bestPosition + maxLength < text.length) {
      const lastSpace = excerpt.lastIndexOf(' ')
      if (lastSpace > 0) excerpt = excerpt.slice(0, lastSpace)
      excerpt = excerpt + '...'
    }

    return excerpt.trim()
  }
}

export const ragService = new RAGService()