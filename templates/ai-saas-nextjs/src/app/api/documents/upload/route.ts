import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { ragService } from '@/lib/rag-service'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const tags = formData.get('tags') as string
    const title = formData.get('title') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Unsupported file type. Supported: PDF, TXT, MD' 
      }, { status: 400 })
    }

    // Create document record
    const document = await prisma.document.create({
      data: {
        title: title || file.name,
        source: file.name,
        type: file.type === 'application/pdf' ? 'pdf' : 'text',
        size: file.size,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        status: 'processing',
        userId: session.user.id,
      },
    })

    // Process document in background
    try {
      const documentId = await ragService.processDocument(file, {
        userId: session.user.id,
        source: file.name,
        title: title || file.name,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      })

      // Update document status
      await prisma.document.update({
        where: { id: document.id },
        data: {
          status: 'completed',
          processedAt: new Date(),
        },
      })

      return NextResponse.json({
        id: document.id,
        documentId,
        message: 'Document uploaded and processed successfully',
      })
    } catch (processingError) {
      console.error('Document processing error:', processingError)
      
      // Update document with error status
      await prisma.document.update({
        where: { id: document.id },
        data: {
          status: 'failed',
          errorMessage: processingError instanceof Error ? processingError.message : 'Processing failed',
        },
      })

      return NextResponse.json({
        id: document.id,
        error: 'Document uploaded but processing failed',
        details: processingError instanceof Error ? processingError.message : 'Unknown error',
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Document upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const tag = searchParams.get('tag')

    const where: any = {
      userId: session.user.id,
    }

    if (status) where.status = status
    if (type) where.type = type
    if (tag) where.tags = { has: tag }

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        source: true,
        type: true,
        url: true,
        size: true,
        wordCount: true,
        language: true,
        status: true,
        errorMessage: true,
        tags: true,
        createdAt: true,
        processedAt: true,
        _count: {
          select: {
            chunks: true,
          },
        },
      },
    })

    const total = await prisma.document.count({ where })

    return NextResponse.json({
      documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}