'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Code, 
  FileText, 
  Zap, 
  Search, 
  Play,
  Download,
  Copy,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Shield,
  Clock,
  Eye,
  Settings,
  Terminal
} from 'lucide-react'

interface CodeAnalysis {
  language: string
  framework?: string
  complexity: {
    cyclomaticComplexity: number
    cognitiveComplexity: number
    linesOfCode: number
    maintainabilityIndex: number
  }
  suggestions: Array<{
    type: string
    severity: string
    line: number
    message: string
    suggestion: string
  }>
  security: {
    vulnerabilities: Array<{
      type: string
      severity: string
      line: number
      description: string
    }>
    score: number
  }
  performance: {
    issues: Array<{
      type: string
      severity: string
      line: number
      description: string
    }>
    score: number
  }
}

interface CodeGenerationResult {
  code: string
  language: string
  framework?: string
  type: string
  explanation: string
  tests?: string
  documentation?: string
  dependencies: string[]
  usage: {
    example: string
    imports: string[]
  }
  quality: {
    score: number
    suggestions: string[]
  }
}

export default function CodeToolsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState<'analyze' | 'generate' | 'optimize'>('analyze')
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('typescript')
  const [framework, setFramework] = useState('')
  const [description, setDescription] = useState('')
  const [generationType, setGenerationType] = useState('function')
  const [optimizationType, setOptimizationType] = useState('performance')
  const [isProcessing, setIsProcessing] = useState(false)
  const [analysis, setAnalysis] = useState<CodeAnalysis | null>(null)
  const [generationResult, setGenerationResult] = useState<CodeGenerationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const handleAnalyzeCode = async () => {
    if (!code.trim()) {
      setError('Please enter code to analyze')
      return
    }

    setIsProcessing(true)
    setError(null)
    setAnalysis(null)

    try {
      const response = await fetch('/api/code/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language,
          filename: `example.${language === 'typescript' ? 'ts' : language === 'javascript' ? 'js' : 'py'}`,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Analysis failed')
      }

      const data = await response.json()
      setAnalysis(data.analysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleGenerateCode = async () => {
    if (!description.trim()) {
      setError('Please enter a description for code generation')
      return
    }

    setIsProcessing(true)
    setError(null)
    setGenerationResult(null)

    try {
      const response = await fetch('/api/code/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: generationType,
          language,
          framework: framework || undefined,
          description,
          options: {
            includeComments: true,
            includeTests: true,
            includeTypes: language === 'typescript',
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Code generation failed')
      }

      const data = await response.json()
      setGenerationResult(data.result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code generation failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleOptimizeCode = async () => {
    if (!code.trim()) {
      setError('Please enter code to optimize')
      return
    }

    setIsProcessing(true)
    setError(null)
    setGenerationResult(null)

    try {
      const response = await fetch('/api/code/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language,
          optimizationType,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Code optimization failed')
      }

      const data = await response.json()
      setGenerationResult(data.result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code optimization failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
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
              <Terminal className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AI Development Tools</h1>
                <p className="text-gray-600">Analyze, generate, and optimize code with AI</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => router.push('/chat')}
              >
                <Search className="h-4 w-4 mr-2" />
                AI Chat
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
        {/* Tool Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-8">
          <button
            onClick={() => setActiveTab('analyze')}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'analyze'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Search className="h-4 w-4 mr-2" />
            Code Analysis
          </button>
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'generate'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Code className="h-4 w-4 mr-2" />
            Code Generation
          </button>
          <button
            onClick={() => setActiveTab('optimize')}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'optimize'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Zap className="h-4 w-4 mr-2" />
            Code Optimization
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Panel */}
          <div className="space-y-6">
            {/* Language and Framework Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="typescript">TypeScript</option>
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="go">Go</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Framework (Optional)
                  </label>
                  <select
                    value={framework}
                    onChange={(e) => setFramework(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">None</option>
                    {language === 'typescript' || language === 'javascript' ? (
                      <>
                        <option value="react">React</option>
                        <option value="vue">Vue.js</option>
                        <option value="angular">Angular</option>
                        <option value="next.js">Next.js</option>
                        <option value="express">Express.js</option>
                      </>
                    ) : language === 'python' ? (
                      <>
                        <option value="django">Django</option>
                        <option value="flask">Flask</option>
                        <option value="fastapi">FastAPI</option>
                      </>
                    ) : language === 'java' ? (
                      <>
                        <option value="spring">Spring</option>
                        <option value="hibernate">Hibernate</option>
                      </>
                    ) : null}
                  </select>
                </div>

                {activeTab === 'generate' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Generation Type
                    </label>
                    <select
                      value={generationType}
                      onChange={(e) => setGenerationType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="function">Function</option>
                      <option value="class">Class</option>
                      <option value="component">Component</option>
                      <option value="api">API Route</option>
                      <option value="test">Test</option>
                      <option value="config">Configuration</option>
                    </select>
                  </div>
                )}

                {activeTab === 'optimize' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Optimization Type
                    </label>
                    <select
                      value={optimizationType}
                      onChange={(e) => setOptimizationType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="performance">Performance</option>
                      <option value="readability">Readability</option>
                      <option value="security">Security</option>
                    </select>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Input Area */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeTab === 'analyze' ? 'Code to Analyze' :
                   activeTab === 'generate' ? 'Code Description' :
                   'Code to Optimize'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeTab === 'generate' ? (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what code you want to generate..."
                    className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                ) : (
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder={`Enter your ${language} code here...`}
                    className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                )}

                <div className="mt-4">
                  <Button
                    onClick={
                      activeTab === 'analyze' ? handleAnalyzeCode :
                      activeTab === 'generate' ? handleGenerateCode :
                      handleOptimizeCode
                    }
                    disabled={isProcessing || (!code.trim() && activeTab !== 'generate') || (!description.trim() && activeTab === 'generate')}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        {activeTab === 'analyze' ? 'Analyze Code' :
                         activeTab === 'generate' ? 'Generate Code' :
                         'Optimize Code'}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results Panel */}
          <div className="space-y-6">
            {/* Analysis Results */}
            {activeTab === 'analyze' && analysis && (
              <>
                {/* Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Eye className="h-5 w-5" />
                      <span>Analysis Overview</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Language</p>
                        <p className="font-medium">{analysis.language}</p>
                      </div>
                      {analysis.framework && (
                        <div>
                          <p className="text-sm text-gray-600">Framework</p>
                          <p className="font-medium">{analysis.framework}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-600">Lines of Code</p>
                        <p className="font-medium">{analysis.complexity.linesOfCode}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Complexity</p>
                        <p className="font-medium">{analysis.complexity.cyclomaticComplexity}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          analysis.complexity.maintainabilityIndex >= 70 ? 'bg-green-100 text-green-800' :
                          analysis.complexity.maintainabilityIndex >= 40 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          Maintainability: {analysis.complexity.maintainabilityIndex}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          analysis.security.score >= 80 ? 'bg-green-100 text-green-800' :
                          analysis.security.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          <Shield className="h-4 w-4 mr-1" />
                          Security: {analysis.security.score}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          analysis.performance.score >= 80 ? 'bg-green-100 text-green-800' :
                          analysis.performance.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          <TrendingUp className="h-4 w-4 mr-1" />
                          Performance: {analysis.performance.score}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Suggestions */}
                {analysis.suggestions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Code Suggestions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analysis.suggestions.slice(0, 5).map((suggestion, index) => (
                          <div key={index} className="p-3 border border-gray-200 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(suggestion.severity)}`}>
                                {suggestion.severity.toUpperCase()}
                              </span>
                              <span className="text-sm text-gray-500">Line {suggestion.line}</span>
                            </div>
                            <p className="text-sm font-medium text-gray-900">{suggestion.message}</p>
                            <p className="text-sm text-gray-600 mt-1">{suggestion.suggestion}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Security Issues */}
                {analysis.security.vulnerabilities.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Shield className="h-5 w-5 text-red-500" />
                        <span>Security Issues</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analysis.security.vulnerabilities.map((vuln, index) => (
                          <div key={index} className="p-3 border border-red-200 rounded-lg bg-red-50">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(vuln.severity)}`}>
                                {vuln.severity.toUpperCase()}
                              </span>
                              <span className="text-sm text-gray-500">Line {vuln.line}</span>
                            </div>
                            <p className="text-sm font-medium text-red-900">{vuln.type}</p>
                            <p className="text-sm text-red-700 mt-1">{vuln.description}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Generation/Optimization Results */}
            {(activeTab === 'generate' || activeTab === 'optimize') && generationResult && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Generated Code</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(generationResult.code)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                    </CardTitle>
                    <CardDescription>{generationResult.explanation}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{generationResult.code}</code>
                    </pre>

                    {generationResult.dependencies.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Dependencies:</p>
                        <div className="flex flex-wrap gap-2">
                          {generationResult.dependencies.map((dep, index) => (
                            <Badge key={index} variant="secondary">{dep}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex items-center space-x-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        generationResult.quality.score >= 80 ? 'bg-green-100 text-green-800' :
                        generationResult.quality.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        Quality Score: {generationResult.quality.score}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {generationResult.tests && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Generated Tests</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(generationResult.tests!)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                        <code>{generationResult.tests}</code>
                      </pre>
                    </CardContent>
                  </Card>
                )}

                {generationResult.usage.example && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Usage Example</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                        <code>{generationResult.usage.example}</code>
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Empty State */}
            {!analysis && !generationResult && (
              <Card>
                <CardContent className="text-center py-12">
                  <Code className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {activeTab === 'analyze' ? 'Ready to Analyze' :
                     activeTab === 'generate' ? 'Ready to Generate' :
                     'Ready to Optimize'}
                  </h3>
                  <p className="text-gray-500">
                    {activeTab === 'analyze' ? 'Enter your code to get detailed analysis and suggestions' :
                     activeTab === 'generate' ? 'Describe what you want to build and let AI generate the code' :
                     'Paste your code to get performance, readability, or security optimizations'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}