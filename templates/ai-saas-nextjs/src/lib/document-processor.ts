import * as pdf from 'pdf-parse'
import cheerio from 'cheerio'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'

export interface ProcessedDocument {
  id: string
  title: string
  content: string
  metadata: {
    source: string
    type: 'pdf' | 'web' | 'text'
    url?: string
    pageCount?: number
    wordCount: number
    language?: string
    extractedAt: string
  }
}

export interface DocumentChunk {
  text: string
  index: number
  metadata: {
    documentId: string
    source: string
    type: string
    startChar: number
    endChar: number
  }
}

export class DocumentProcessor {
  private textSplitter: RecursiveCharacterTextSplitter

  constructor() {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', '. ', '! ', '? ', ' ', ''],
    })
  }

  /**
   * Process PDF document
   */
  async processPDF(
    buffer: Buffer,
    metadata: { source: string; url?: string }
  ): Promise<ProcessedDocument> {
    try {
      const data = await pdf(buffer)
      
      const processed: ProcessedDocument = {
        id: this.generateDocumentId(),
        title: this.extractTitleFromText(data.text) || 'Untitled PDF',
        content: this.cleanText(data.text),
        metadata: {
          source: metadata.source,
          type: 'pdf',
          url: metadata.url,
          pageCount: data.numpages,
          wordCount: this.countWords(data.text),
          language: await this.detectLanguage(data.text),
          extractedAt: new Date().toISOString(),
        },
      }

      return processed
    } catch (error) {
      console.error('Error processing PDF:', error)
      throw new Error('Failed to process PDF document')
    }
  }

  /**
   * Process web page content
   */
  async processWebPage(
    url: string,
    userAgent = 'AI-SaaS-Bot/1.0'
  ): Promise<ProcessedDocument> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': userAgent,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const html = await response.text()
      const $ = cheerio.load(html)

      // Remove script, style, and other non-content elements
      $('script, style, nav, header, footer, aside, .ad, .advertisement').remove()

      // Extract title
      const title = $('title').text() || $('h1').first().text() || 'Untitled Page'

      // Extract main content
      const contentSelectors = [
        'main',
        'article',
        '.content',
        '.post-content',
        '.entry-content',
        '#content',
        'body',
      ]

      let content = ''
      for (const selector of contentSelectors) {
        const element = $(selector)
        if (element.length > 0) {
          content = element.text()
          break
        }
      }

      if (!content) {
        content = $('body').text()
      }

      const cleanedContent = this.cleanText(content)

      const processed: ProcessedDocument = {
        id: this.generateDocumentId(),
        title: this.cleanText(title),
        content: cleanedContent,
        metadata: {
          source: url,
          type: 'web',
          url,
          wordCount: this.countWords(cleanedContent),
          language: await this.detectLanguage(cleanedContent),
          extractedAt: new Date().toISOString(),
        },
      }

      return processed
    } catch (error) {
      console.error('Error processing web page:', error)
      throw new Error(`Failed to process web page: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Process plain text
   */
  async processText(
    text: string,
    metadata: { source: string; title?: string }
  ): Promise<ProcessedDocument> {
    try {
      const cleanedText = this.cleanText(text)
      
      const processed: ProcessedDocument = {
        id: this.generateDocumentId(),
        title: metadata.title || this.extractTitleFromText(cleanedText) || 'Untitled Text',
        content: cleanedText,
        metadata: {
          source: metadata.source,
          type: 'text',
          wordCount: this.countWords(cleanedText),
          language: await this.detectLanguage(cleanedText),
          extractedAt: new Date().toISOString(),
        },
      }

      return processed
    } catch (error) {
      console.error('Error processing text:', error)
      throw new Error('Failed to process text document')
    }
  }

  /**
   * Split document into chunks
   */
  async chunkDocument(document: ProcessedDocument): Promise<DocumentChunk[]> {
    try {
      const textChunks = await this.textSplitter.splitText(document.content)
      
      const chunks: DocumentChunk[] = []
      let currentChar = 0

      for (let i = 0; i < textChunks.length; i++) {
        const chunkText = textChunks[i]
        const startChar = currentChar
        const endChar = currentChar + chunkText.length

        chunks.push({
          text: chunkText,
          index: i,
          metadata: {
            documentId: document.id,
            source: document.metadata.source,
            type: document.metadata.type,
            startChar,
            endChar,
          },
        })

        currentChar = endChar
      }

      return chunks
    } catch (error) {
      console.error('Error chunking document:', error)
      throw new Error('Failed to chunk document')
    }
  }

  /**
   * Clean and normalize text
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newline
      .replace(/[^\w\s\.,!?;:()\-"']/g, '') // Remove special characters except basic punctuation
      .trim()
  }

  /**
   * Extract title from text content
   */
  private extractTitleFromText(text: string): string | null {
    const lines = text.split('\n').filter(line => line.trim().length > 0)
    
    if (lines.length === 0) return null

    // Look for the first substantial line that could be a title
    for (const line of lines.slice(0, 3)) {
      const trimmed = line.trim()
      if (trimmed.length >= 10 && trimmed.length <= 100) {
        return trimmed
      }
    }

    return null
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  /**
   * Simple language detection (placeholder - could use a real library)
   */
  private async detectLanguage(text: string): Promise<string> {
    // Simple heuristic - in production, use a proper language detection library
    const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']
    const sampleWords = text.toLowerCase().split(/\s+/).slice(0, 100)
    
    const englishMatches = sampleWords.filter(word => englishWords.includes(word)).length
    const confidence = englishMatches / Math.min(sampleWords.length, englishWords.length)
    
    return confidence > 0.1 ? 'en' : 'unknown'
  }

  /**
   * Generate unique document ID
   */
  private generateDocumentId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Validate document content
   */
  validateDocument(document: ProcessedDocument): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!document.content || document.content.trim().length < 10) {
      errors.push('Document content is too short')
    }

    if (!document.title || document.title.trim().length === 0) {
      errors.push('Document title is missing')
    }

    if (document.metadata.wordCount < 5) {
      errors.push('Document has too few words')
    }

    if (document.content.length > 1000000) {
      errors.push('Document is too large (>1MB text)')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Remove duplicate chunks based on content similarity
   */
  async deduplicateChunks(chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
    const uniqueChunks: DocumentChunk[] = []
    const seen = new Set<string>()

    for (const chunk of chunks) {
      // Simple deduplication based on normalized text
      const normalized = chunk.text.toLowerCase().replace(/\s+/g, ' ').trim()
      const hash = this.simpleHash(normalized)

      if (!seen.has(hash)) {
        seen.add(hash)
        uniqueChunks.push(chunk)
      }
    }

    return uniqueChunks
  }

  /**
   * Simple hash function for deduplication
   */
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString()
  }
}

export const documentProcessor = new DocumentProcessor()