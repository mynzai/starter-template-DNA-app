import { Pinecone } from '@pinecone-database/pinecone'
import OpenAI from 'openai'

export interface VectorMetadata {
  id: string
  text: string
  source: string
  userId: string
  documentId?: string
  chunkIndex?: number
  title?: string
  url?: string
  createdAt: string
  tags?: string[]
}

export interface VectorSearchResult {
  id: string
  score: number
  metadata: VectorMetadata
  text: string
}

export interface VectorQuery {
  vector: number[]
  topK: number
  filter?: Record<string, any>
  includeMetadata?: boolean
}

export class VectorDatabase {
  private pinecone: Pinecone
  private openai: OpenAI
  private indexName: string

  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || '',
    })
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    })
    this.indexName = process.env.PINECONE_INDEX_NAME || 'ai-saas-knowledge'
  }

  /**
   * Generate embeddings for text using OpenAI
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text.replace(/\n/g, ' '),
      })
      return response.data[0].embedding
    } catch (error) {
      console.error('Error generating embedding:', error)
      throw new Error('Failed to generate embedding')
    }
  }

  /**
   * Store document chunks in vector database
   */
  async storeDocumentChunks(
    chunks: Array<{
      text: string
      metadata: Omit<VectorMetadata, 'id' | 'createdAt'>
    }>
  ): Promise<string[]> {
    try {
      const index = this.pinecone.index(this.indexName)
      const vectors = []

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const embedding = await this.generateEmbedding(chunk.text)
        const id = `${chunk.metadata.documentId || Date.now()}-chunk-${i}`

        vectors.push({
          id,
          values: embedding,
          metadata: {
            ...chunk.metadata,
            id,
            text: chunk.text,
            createdAt: new Date().toISOString(),
            chunkIndex: i,
          },
        })
      }

      await index.upsert(vectors)
      return vectors.map(v => v.id)
    } catch (error) {
      console.error('Error storing document chunks:', error)
      throw new Error('Failed to store document chunks')
    }
  }

  /**
   * Perform similarity search
   */
  async similaritySearch(
    query: string,
    options: {
      topK?: number
      threshold?: number
      filter?: Record<string, any>
      userId?: string
    } = {}
  ): Promise<VectorSearchResult[]> {
    try {
      const { topK = 5, threshold = 0.7, filter = {}, userId } = options

      // Add user filter if provided
      if (userId) {
        filter.userId = userId
      }

      const queryEmbedding = await this.generateEmbedding(query)
      const index = this.pinecone.index(this.indexName)

      const queryRequest = {
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
      }

      const queryResponse = await index.query(queryRequest)

      return (queryResponse.matches || [])
        .filter(match => (match.score || 0) >= threshold)
        .map(match => ({
          id: match.id || '',
          score: match.score || 0,
          metadata: match.metadata as VectorMetadata,
          text: (match.metadata as VectorMetadata)?.text || '',
        }))
        .sort((a, b) => b.score - a.score)
    } catch (error) {
      console.error('Error performing similarity search:', error)
      throw new Error('Failed to perform similarity search')
    }
  }

  /**
   * Delete document from vector database
   */
  async deleteDocument(documentId: string, userId: string): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName)
      
      // Delete all chunks for this document
      await index.deleteMany({
        filter: {
          documentId,
          userId,
        },
      })
    } catch (error) {
      console.error('Error deleting document:', error)
      throw new Error('Failed to delete document')
    }
  }

  /**
   * Get document statistics
   */
  async getDocumentStats(userId: string): Promise<{
    totalDocuments: number
    totalChunks: number
    storageUsed: number
  }> {
    try {
      const index = this.pinecone.index(this.indexName)
      
      const stats = await index.describeIndexStats()
      
      // Note: Pinecone doesn't provide per-user stats directly
      // In a production app, you'd maintain this in your main database
      return {
        totalDocuments: 0, // Would query from main DB
        totalChunks: stats.totalVectorCount || 0,
        storageUsed: 0, // Would calculate from main DB
      }
    } catch (error) {
      console.error('Error getting document stats:', error)
      return {
        totalDocuments: 0,
        totalChunks: 0,
        storageUsed: 0,
      }
    }
  }

  /**
   * Update document metadata
   */
  async updateDocumentMetadata(
    documentId: string,
    userId: string,
    metadata: Partial<VectorMetadata>
  ): Promise<void> {
    try {
      // Note: Pinecone doesn't support metadata updates directly
      // In practice, you'd need to fetch, update, and re-upsert
      // For now, we'll throw an error to indicate this limitation
      throw new Error('Metadata updates require document re-processing')
    } catch (error) {
      console.error('Error updating document metadata:', error)
      throw error
    }
  }

  /**
   * Search documents by metadata
   */
  async searchByMetadata(
    filter: Record<string, any>,
    userId: string
  ): Promise<VectorSearchResult[]> {
    try {
      const index = this.pinecone.index(this.indexName)
      
      const queryRequest = {
        vector: new Array(1536).fill(0), // Dummy vector for metadata-only search
        topK: 100,
        includeMetadata: true,
        filter: {
          ...filter,
          userId,
        },
      }

      const queryResponse = await index.query(queryRequest)

      return (queryResponse.matches || []).map(match => ({
        id: match.id || '',
        score: match.score || 0,
        metadata: match.metadata as VectorMetadata,
        text: (match.metadata as VectorMetadata)?.text || '',
      }))
    } catch (error) {
      console.error('Error searching by metadata:', error)
      throw new Error('Failed to search by metadata')
    }
  }
}

export const vectorDB = new VectorDatabase()