# Starter Template DNA App - Frontend Architecture Document

## Table of Contents

- [Introduction](#introduction)
- [Overall Frontend Philosophy & Patterns](#overall-frontend-philosophy--patterns)
- [Cross-Framework UI Strategy](#cross-framework-ui-strategy)
- [AI-Native Interface Components](#ai-native-interface-components)
- [Framework-Specific Frontend Architectures](#framework-specific-frontend-architectures)
- [Shared Design System DNA](#shared-design-system-dna)
- [State Management Strategies](#state-management-strategies)
- [API Interaction Layer](#api-interaction-layer)
- [Cross-Framework Routing Strategy](#cross-framework-routing-strategy)
- [Build, Bundling, and Deployment](#build-bundling-and-deployment)
- [Frontend Testing Strategy](#frontend-testing-strategy)
- [Accessibility (AX) Implementation](#accessibility-ax-implementation)
- [Performance Considerations](#performance-considerations)
- [AI Integration UI Patterns](#ai-integration-ui-patterns)
- [Template Generation UI Guidelines](#template-generation-ui-guidelines)
- [Cross-Platform Design Consistency](#cross-platform-design-consistency)
- [Change Log](#change-log)

## Introduction

This document defines the frontend architecture strategy for the Starter
Template DNA App ecosystem, covering UI/UX patterns across Flutter, React
Native, Next.js, and Tauri frameworks. It establishes consistent design
principles while optimizing for each framework's strengths and the AI-native
development experience.

**Key Architecture Goals:**

- **Cross-Framework Consistency:** Unified design language across all template
  types
- **AI-Native UI Patterns:** Specialized components for LLM integration and
  streaming responses
- **Framework Optimization:** Leverage each framework's unique strengths and
  conventions
- **Developer Experience:** Intuitive interfaces for template selection, DNA
  composition, and generation
- **Performance-First:** Optimized rendering for real-time AI interactions and
  large-scale applications

**Link to Main Architecture Document:**
`/Users/mynzailabs/starter-template-DNA-app/starter-template-dna-architecture.md`
**Link to UI/UX Specification:** _To be created for specific template types_
**Link to Primary Design Files:** _To be established for design system_

## Overall Frontend Philosophy & Patterns

### Cross-Framework Design Principles

**1. AI-First Interface Design**

- **Conversation-Driven Interfaces:** Primary interaction through natural
  language with AI systems
- **Streaming Response Optimization:** UI components designed for real-time
  content updates
- **Context-Aware Interactions:** Interfaces adapt based on AI understanding and
  user intent
- **Progressive Disclosure:** Complex AI capabilities revealed gradually as
  users advance

**2. Framework-Agnostic Component Architecture**

- **Atomic Design Enhanced:** Atoms → Molecules → Organisms → Templates → DNA
  Compositions
- **Cross-Platform Component Mapping:** Consistent behavior with
  platform-specific implementations
- **Shared Interface Contracts:** TypeScript interfaces ensuring component
  compatibility
- **DNA-Driven Modularity:** UI components mirror DNA module architecture

**3. Performance-Centric Design**

- **Lazy Loading by Default:** All non-critical components loaded on demand
- **Streaming-Optimized Rendering:** UI updates without blocking during AI
  responses
- **Memory-Efficient Patterns:** Virtualization for large lists, efficient state
  management
- **Network-Aware Components:** Graceful degradation for poor connectivity

### Framework-Specific Architectural Approaches

| Framework        | Primary Strength           | UI Architecture Pattern            | State Management                                       |
| ---------------- | -------------------------- | ---------------------------------- | ------------------------------------------------------ |
| **Flutter**      | Single codebase deployment | Widget-based with Riverpod         | Provider pattern with immutable state                  |
| **React Native** | Enterprise ecosystem       | Component-based with Redux Toolkit | Centralized store with feature slices                  |
| **Next.js**      | Full-stack integration     | Page-based with server components  | Zustand for client state, React Query for server state |
| **Tauri**        | Native performance         | Hybrid native + web components     | Rust backend state + web frontend state                |

## Cross-Framework UI Strategy

### Unified Component Interface System

All templates implement a shared component interface enabling consistent
developer experience across frameworks:

```typescript
// Shared component interface for cross-framework compatibility
interface DNAComponent {
  id: string;
  type: 'input' | 'display' | 'action' | 'layout' | 'ai-interface';
  props: Record<string, any>;
  styling: PlatformStyles;
  accessibility: AccessibilityProps;
  testId: string;
}

interface PlatformStyles {
  flutter?: FlutterStyling;
  reactNative?: RNStyling;
  web?: WebStyling;
  tauri?: TauriStyling;
}
```

### Cross-Platform Design Token System

**Color Palette (AI-Native Theme)**

```typescript
const AITheme = {
  primary: {
    50: '#f0f9ff', // Light AI interaction backgrounds
    500: '#3b82f6', // Primary AI accent color
    900: '#1e3a8a', // Deep AI processing indicators
  },
  semantic: {
    aiActive: '#10b981', // AI processing active state
    aiStreaming: '#f59e0b', // Streaming response indicator
    aiError: '#ef4444', // AI error states
    aiSuccess: '#22c55e', // Successful AI operations
  },
  code: {
    background: '#1f2937', // Code editor backgrounds
    syntax: '#e5e7eb', // Syntax highlighting base
    accent: '#60a5fa', // Code accent colors
  },
};
```

**Typography Scale (Developer-Focused)**

```typescript
const Typography = {
  code: {
    fontFamily: 'JetBrains Mono, Fira Code, monospace',
    sizes: { xs: 12, sm: 14, md: 16, lg: 18, xl: 20 },
  },
  interface: {
    fontFamily: 'Inter, system-ui, sans-serif',
    sizes: { xs: 12, sm: 14, md: 16, lg: 18, xl: 24, xxl: 32 },
  },
  ai: {
    fontFamily: 'Inter, system-ui, sans-serif',
    weight: { normal: 400, medium: 500, semibold: 600 },
  },
};
```

**Spacing & Layout System**

```typescript
const Layout = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },
  containerSizes: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    xxl: 1536,
  },
  aiInterface: {
    chatWidth: 768, // Optimal width for AI conversations
    sidebarWidth: 320, // Template selection sidebar
    toolPanelWidth: 400, // DNA composition panel
  },
};
```

## AI-Native Interface Components

### Core AI Component Library

#### 1. StreamingTextDisplay Component

**Purpose:** Display AI-generated content with real-time streaming updates
**Cross-Framework Implementation:**

```typescript
// Flutter Implementation
class StreamingTextWidget extends StatefulWidget {
  final Stream<String> textStream;
  final TextStyle style;
  final Duration animationDuration;
}

// React Native Implementation
const StreamingText: React.FC<{
  textStream: Observable<string>;
  style: TextStyle;
  animationDuration: number;
}>;

// Next.js Implementation
const StreamingText: React.FC<{
  textStream: ReadableStream<string>;
  className: string;
  animationDuration: number;
}>;
```

**Key Features:**

- Typewriter animation for streaming text
- Syntax highlighting for code blocks
- Markdown rendering with live updates
- Copy-to-clipboard functionality
- Word-wrap optimization for code

#### 2. AIConversationInterface Component

**Purpose:** Complete chat interface for AI interactions with context management

**Props Interface:**

```typescript
interface AIConversationProps {
  conversationId: string;
  onMessage: (message: string, context?: any) => Promise<void>;
  streamingResponse: Observable<AIResponse>;
  contextItems: ContextItem[];
  enableVoiceInput?: boolean;
  enableFileUpload?: boolean;
  placeholder: string;
  maxTokens?: number;
  showTokenCount?: boolean;
}
```

**Features:**

- Multi-turn conversation history
- Context item management (files, previous conversations)
- Token usage tracking and warnings
- Voice input integration (platform-specific)
- File attachment support
- Conversation export/import

#### 3. DNACompositionPanel Component

**Purpose:** Visual interface for selecting and configuring DNA modules

**Props Interface:**

```typescript
interface DNACompositionProps {
  availableModules: DNAModule[];
  selectedModules: DNAModuleConfig[];
  onModuleToggle: (moduleId: string) => void;
  onConfigChange: (moduleId: string, config: any) => void;
  compatibilityMatrix: CompatibilityMatrix;
  showCompatibilityWarnings: boolean;
}
```

**Features:**

- Drag-and-drop module selection
- Real-time compatibility validation
- Configuration panels for each module
- Visual dependency mapping
- Cost estimation for AI modules

#### 4. TemplatePreviewComponent

**Purpose:** Live preview of generated template structure and code

**Features:**

- File tree visualization
- Syntax-highlighted code preview
- Diff view for template updates
- Interactive file explorer
- Generated code statistics

### AI Response State Management

```typescript
interface AIResponseState {
  status: 'idle' | 'thinking' | 'streaming' | 'complete' | 'error';
  content: string;
  metadata: {
    tokensUsed: number;
    responseTime: number;
    model: string;
    confidence?: number;
  };
  error?: Error;
}

// State management across frameworks
// Flutter: Riverpod provider
// React Native: Redux Toolkit slice
// Next.js: Zustand store
// Tauri: Rust backend + frontend bridge
```

## Framework-Specific Frontend Architectures

### Flutter Frontend Architecture

**Directory Structure:**

```plaintext
lib/
├── core/                           # Core app infrastructure
│   ├── theme/                      # AI theme and design tokens
│   ├── routing/                    # Navigation configuration
│   └── constants/                  # App-wide constants
├── features/                       # Feature-based organization
│   ├── template_selection/         # Template discovery and selection
│   │   ├── presentation/           # UI components and pages
│   │   ├── application/            # Riverpod providers and state
│   │   └── domain/                 # Business logic and models
│   ├── dna_composition/            # DNA module composition interface
│   ├── ai_interaction/             # AI conversation interfaces
│   ├── code_generation/            # Template generation and preview
│   └── project_management/         # Generated project management
├── shared/                         # Shared UI components
│   ├── widgets/                    # Reusable widgets
│   │   ├── ai_components/          # AI-specific widgets
│   │   ├── form_components/        # Form and input widgets
│   │   └── layout_components/      # Layout and navigation widgets
│   ├── utils/                      # Utility functions
│   └── models/                     # Shared data models
└── main.dart                       # App entry point
```

**State Management Pattern (Riverpod):**

```dart
// Template selection state
final templateSelectionProvider = StateNotifierProvider<TemplateSelectionNotifier, TemplateSelectionState>(
  (ref) => TemplateSelectionNotifier(ref.read(templateRepositoryProvider)),
);

// AI conversation state
final aiConversationProvider = StreamNotifierProvider<AIConversationNotifier, AIConversationState>(
  () => AIConversationNotifier(),
);

// DNA composition state
final dnaCompositionProvider = StateNotifierProvider<DNACompositionNotifier, DNACompositionState>(
  (ref) => DNACompositionNotifier(ref.read(dnaRepositoryProvider)),
);
```

**Component Architecture:**

- **Atoms:** Individual form inputs, buttons, icons
- **Molecules:** AI message bubbles, DNA module cards, template preview items
- **Organisms:** Complete AI chat interface, DNA composition panel, template
  gallery
- **Templates:** Full-screen layouts for different workflow stages
- **Pages:** Complete user flows for template generation process

### React Native Frontend Architecture

**Directory Structure:**

```plaintext
src/
├── components/                     # Shared component library
│   ├── ui/                         # Base UI components
│   ├── ai/                         # AI-specific components
│   ├── forms/                      # Form components
│   └── navigation/                 # Navigation components
├── features/                       # Feature-based modules
│   ├── templateSelection/          # Template discovery and selection
│   │   ├── components/             # Feature-specific components
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── services/               # API integration
│   │   └── store/                  # Redux slices
│   ├── dnaComposition/             # DNA module composition
│   ├── aiInteraction/              # AI conversation features
│   └── codeGeneration/             # Template generation
├── navigation/                     # App navigation structure
├── services/                       # Global API services
├── store/                          # Redux store configuration
├── styles/                         # Global styles and themes
└── utils/                          # Utility functions
```

**State Management (Redux Toolkit):**

```typescript
// Template selection slice
const templateSelectionSlice = createSlice({
  name: 'templateSelection',
  initialState: templateSelectionInitialState,
  reducers: {
    setSelectedTemplate: (state, action) => {
      state.selectedTemplate = action.payload;
    },
    updateFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
  },
  extraReducers: builder => {
    builder.addCase(fetchTemplatesAsync.fulfilled, (state, action) => {
      state.templates = action.payload;
      state.loading = false;
    });
  },
});

// AI conversation slice with streaming support
const aiConversationSlice = createSlice({
  name: 'aiConversation',
  initialState: aiConversationInitialState,
  reducers: {
    startConversation: (state, action) => {
      state.conversations[action.payload.id] = {
        id: action.payload.id,
        messages: [],
        status: 'idle',
      };
    },
    appendStreamingContent: (state, action) => {
      const { conversationId, content } = action.payload;
      const conversation = state.conversations[conversationId];
      if (conversation?.messages.length > 0) {
        const lastMessage =
          conversation.messages[conversation.messages.length - 1];
        if (lastMessage.role === 'assistant') {
          lastMessage.content += content;
        }
      }
    },
  },
});
```

### Next.js Frontend Architecture

**Directory Structure:**

```plaintext
src/
├── app/                            # Next.js App Router
│   ├── (dashboard)/               # Route groups for dashboard
│   │   ├── templates/             # Template selection routes
│   │   ├── compose/               # DNA composition routes
│   │   └── generate/              # Generation process routes
│   ├── api/                       # API routes for backend integration
│   │   ├── templates/             # Template management endpoints
│   │   ├── ai/                    # AI service endpoints
│   │   └── generation/            # Template generation endpoints
│   ├── globals.css                # Global styles with AI theme
│   └── layout.tsx                 # Root layout component
├── components/                    # React component library
│   ├── ui/                        # Base UI components (shadcn/ui based)
│   ├── ai/                        # AI-specific components
│   ├── templates/                 # Template-related components
│   └── dna/                       # DNA composition components
├── lib/                           # Utilities and configurations
│   ├── ai/                        # AI service integrations
│   ├── store/                     # Zustand store definitions
│   ├── utils/                     # Utility functions
│   └── validations/               # Zod validation schemas
├── hooks/                         # Custom React hooks
├── styles/                        # Additional styling
└── types/                         # TypeScript type definitions
```

**State Management (Zustand + React Query):**

```typescript
// Template store
export const useTemplateStore = create<TemplateStore>((set, get) => ({
  selectedTemplate: null,
  filters: defaultFilters,
  setSelectedTemplate: template => set({ selectedTemplate: template }),
  updateFilters: newFilters =>
    set(state => ({
      filters: { ...state.filters, ...newFilters },
    })),
}));

// AI conversation store with streaming
export const useAIStore = create<AIStore>((set, get) => ({
  conversations: {},
  activeConversationId: null,
  startConversation: id =>
    set(state => ({
      conversations: {
        ...state.conversations,
        [id]: { id, messages: [], status: 'idle' },
      },
      activeConversationId: id,
    })),
  appendStreamingContent: (conversationId, content) =>
    set(state => {
      const conversation = state.conversations[conversationId];
      if (!conversation) return state;

      const updatedMessages = [...conversation.messages];
      const lastMessage = updatedMessages[updatedMessages.length - 1];

      if (lastMessage?.role === 'assistant') {
        lastMessage.content += content;
      }

      return {
        conversations: {
          ...state.conversations,
          [conversationId]: { ...conversation, messages: updatedMessages },
        },
      };
    }),
}));

// React Query for server state
export const useTemplates = () =>
  useQuery({
    queryKey: ['templates'],
    queryFn: () => templateService.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
```

### Tauri Frontend Architecture

**Directory Structure:**

```plaintext
src-tauri/                         # Rust backend
├── src/
│   ├── commands/                  # Tauri command handlers
│   ├── services/                  # Business logic services
│   └── main.rs                    # Tauri app entry point
└── tauri.conf.json               # Tauri configuration

src/                              # Web frontend (React/TypeScript)
├── components/                   # React components
│   ├── native/                   # Native integration components
│   ├── ai/                       # AI interface components
│   └── templates/                # Template management components
├── services/                     # Frontend service layer
│   ├── tauri/                    # Tauri command wrappers
│   ├── ai/                       # AI service integration
│   └── templates/                # Template management
├── stores/                       # Frontend state management
├── utils/                        # Utility functions
└── types/                        # TypeScript definitions
```

**Rust-Frontend Bridge Pattern:**

```rust
// Tauri command for template generation
#[tauri::command]
async fn generate_template(
    template_id: String,
    dna_modules: Vec<String>,
    config: TemplateConfig,
) -> Result<GenerationResult, String> {
    let generator = TemplateGenerator::new();
    generator.generate(template_id, dna_modules, config)
        .await
        .map_err(|e| e.to_string())
}

// Streaming AI responses
#[tauri::command]
async fn start_ai_conversation(
    window: tauri::Window,
    conversation_id: String,
) -> Result<(), String> {
    let ai_service = AIService::new();

    tokio::spawn(async move {
        let mut stream = ai_service.start_conversation().await;
        while let Some(chunk) = stream.next().await {
            window.emit("ai_chunk", &AIChunk {
                conversation_id: conversation_id.clone(),
                content: chunk,
            }).unwrap();
        }
    });

    Ok(())
}
```

## Template Generation UI Guidelines

### Progressive Template Configuration

#### Step-by-Step Configuration Flow

```typescript
interface TemplateConfigurationFlow {
  steps: ConfigurationStep[];
  currentStep: number;
  completedSteps: number[];
  validationRules: StepValidationRule[];
}

interface ConfigurationStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  validation: ValidationSchema;
  dependencies: string[];
  optional: boolean;
}

// Configuration flow for AI-native templates
const aiTemplateFlow: ConfigurationStep[] = [
  {
    id: 'template-selection',
    title: 'Choose Template Type',
    description: 'Select the type of AI-native application you want to build',
    component: TemplateSelectionStep,
    validation: templateSelectionSchema,
    dependencies: [],
    optional: false,
  },
  {
    id: 'ai-provider-setup',
    title: 'Configure AI Provider',
    description: 'Set up your AI service provider and model preferences',
    component: AIProviderSetupStep,
    validation: aiProviderSchema,
    dependencies: ['template-selection'],
    optional: false,
  },
  {
    id: 'dna-composition',
    title: 'Select DNA Modules',
    description: 'Choose and configure the DNA modules for your application',
    component: DNACompositionStep,
    validation: dnaCompositionSchema,
    dependencies: ['template-selection', 'ai-provider-setup'],
    optional: false,
  },
  {
    id: 'advanced-configuration',
    title: 'Advanced Settings',
    description: 'Fine-tune advanced settings and integrations',
    component: AdvancedConfigurationStep,
    validation: advancedConfigSchema,
    dependencies: ['dna-composition'],
    optional: true,
  },
];
```

#### Real-Time Configuration Preview

```typescript
// Live preview component showing generated template structure
const ConfigurationPreview: React.FC<{
  configuration: TemplateConfiguration;
  framework: Framework;
}> = ({ configuration, framework }) => {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePreview = useCallback(async () => {
    setIsGenerating(true);
    try {
      const preview = await templateService.generatePreview(configuration, framework);
      setPreviewData(preview);
    } catch (error) {
      console.error('Preview generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [configuration, framework]);

  useEffect(() => {
    const debounced = debounce(generatePreview, 500);
    debounced();
    return () => debounced.cancel();
  }, [generatePreview]);

  return (
    <div className="preview-container">
      <div className="preview-header">
        <h3>Template Preview</h3>
        {isGenerating && <Spinner size="sm" />}
      </div>

      {previewData && (
        <div className="preview-content">
          <FileTreeVisualization
            files={previewData.fileStructure}
            expandedPaths={previewData.importantPaths}
          />

          <div className="preview-stats">
            <StatCard
              label="Estimated Files"
              value={previewData.estimatedFileCount}
            />
            <StatCard
              label="DNA Modules"
              value={configuration.selectedModules.length}
            />
            <StatCard
              label="Build Time"
              value={`~${previewData.estimatedBuildTime}s`}
            />
          </div>

          <CodePreviewPanel
            files={previewData.keyFiles}
            syntax={framework}
          />
        </div>
      )}
    </div>
  );
};
```

### Code Generation Visualization

#### Real-Time Code Generation Display

```typescript
// Component for showing code generation progress
const CodeGenerationProgress: React.FC<{
  generationId: string;
  onComplete: (result: GenerationResult) => void;
}> = ({ generationId, onComplete }) => {
  const [progress, setProgress] = useState<GenerationProgress>({
    phase: 'initializing',
    completedFiles: 0,
    totalFiles: 0,
    currentFile: null,
    errors: [],
    warnings: [],
  });

  useEffect(() => {
    const eventSource = new EventSource(`/api/generation/${generationId}/stream`);

    eventSource.onmessage = (event) => {
      const update: GenerationUpdate = JSON.parse(event.data);

      switch (update.type) {
        case 'progress':
          setProgress(prev => ({ ...prev, ...update.data }));
          break;
        case 'file-complete':
          setProgress(prev => ({
            ...prev,
            completedFiles: prev.completedFiles + 1,
            currentFile: null,
          }));
          break;
        case 'complete':
          onComplete(update.result);
          eventSource.close();
          break;
        case 'error':
          setProgress(prev => ({
            ...prev,
            errors: [...prev.errors, update.error],
          }));
          break;
      }
    };

    return () => eventSource.close();
  }, [generationId, onComplete]);

  return (
    <div className="generation-progress">
      <div className="progress-header">
        <h3>Generating Template</h3>
        <ProgressBar
          value={progress.completedFiles}
          max={progress.totalFiles}
          className="main-progress"
        />
      </div>

      <div className="progress-details">
        <div className="current-phase">
          <PhaseIndicator phase={progress.phase} />
          <span className="phase-label">
            {getPhaseLabel(progress.phase)}
          </span>
        </div>

        {progress.currentFile && (
          <div className="current-file">
            <FileIcon type={getFileType(progress.currentFile)} />
            <span>Generating {progress.currentFile}</span>
            <PulsingDots />
          </div>
        )}

        <div className="generation-stats">
          <div className="stat-item">
            <span className="stat-label">Files:</span>
            <span className="stat-value">
              {progress.completedFiles} / {progress.totalFiles}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Warnings:</span>
            <span className="stat-value warning">
              {progress.warnings.length}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Errors:</span>
            <span className="stat-value error">
              {progress.errors.length}
            </span>
          </div>
        </div>

        {progress.errors.length > 0 && (
          <ErrorSummary errors={progress.errors} />
        )}
      </div>
    </div>
  );
};
```

#### Interactive File Explorer for Generated Code

```typescript
// Enhanced file explorer with code preview and editing capabilities
const GeneratedCodeExplorer: React.FC<{
  generationResult: GenerationResult;
  onFileModify?: (filePath: string, content: string) => void;
}> = ({ generationResult, onFileModify }) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const filteredFiles = useMemo(() => {
    if (!searchQuery) return generationResult.files;

    return generationResult.files.filter(file =>
      file.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [generationResult.files, searchQuery]);

  const handleFileSelect = useCallback(async (filePath: string) => {
    setSelectedFile(filePath);

    // Load file content (could be from memory or fetch from server)
    const file = generationResult.files.find(f => f.path === filePath);
    if (file) {
      setFileContent(file.content);
    }
  }, [generationResult.files]);

  const handleContentChange = useCallback((newContent: string) => {
    setFileContent(newContent);
    if (selectedFile && onFileModify) {
      onFileModify(selectedFile, newContent);
    }
  }, [selectedFile, onFileModify]);

  return (
    <div className="code-explorer">
      <div className="explorer-sidebar">
        <div className="search-section">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search files and content..."
          />
        </div>

        <div className="file-tree">
          <FileTreeView
            files={filteredFiles}
            selectedFile={selectedFile}
            expandedFolders={expandedFolders}
            onFileSelect={handleFileSelect}
            onFolderToggle={(folder) => {
              setExpandedFolders(prev => {
                const next = new Set(prev);
                if (next.has(folder)) {
                  next.delete(folder);
                } else {
                  next.add(folder);
                }
                return next;
              });
            }}
          />
        </div>

        <div className="generation-summary">
          <h4>Generation Summary</h4>
          <div className="summary-stats">
            <div className="stat">
              <span className="label">Total Files:</span>
              <span className="value">{generationResult.files.length}</span>
            </div>
            <div className="stat">
              <span className="label">Lines of Code:</span>
              <span className="value">{generationResult.totalLines}</span>
            </div>
            <div className="stat">
              <span className="label">Generation Time:</span>
              <span className="value">{generationResult.duration}s</span>
            </div>
          </div>
        </div>
      </div>

      <div className="code-viewer">
        {selectedFile ? (
          <>
            <div className="file-header">
              <div className="file-info">
                <FileIcon type={getFileType(selectedFile)} />
                <span className="file-path">{selectedFile}</span>
              </div>
              <div className="file-actions">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(fileContent)}
                >
                  <CopyIcon /> Copy
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadFile(selectedFile, fileContent)}
                >
                  <DownloadIcon /> Download
                </Button>
              </div>
            </div>

            <CodeEditor
              value={fileContent}
              onChange={handleContentChange}
              language={getLanguageFromFile(selectedFile)}
              readOnly={!onFileModify}
              theme="vs-dark"
              options={{
                minimap: { enabled: true },
                lineNumbers: 'on',
                wordWrap: 'on',
                scrollBeyondLastLine: false,
              }}
            />
          </>
        ) : (
          <div className="no-file-selected">
            <EmptyStateIcon />
            <h3>Select a file to view its content</h3>
            <p>Choose any file from the tree to see its generated code</p>
          </div>
        )}
      </div>
    </div>
  );
};
```

## Cross-Platform Design Consistency

### Design System Implementation

#### Cross-Framework Component Mapping

```typescript
// Design system component mapping across frameworks
interface ComponentMapping {
  name: string;
  flutter: string;
  reactNative: string;
  web: string;
  tauri: string;
  props: ComponentPropMapping;
  styling: ComponentStylingMapping;
}

const componentMappings: ComponentMapping[] = [
  {
    name: 'Button',
    flutter: 'ElevatedButton',
    reactNative: 'TouchableOpacity',
    web: 'button',
    tauri: 'button',
    props: {
      onPress: {
        flutter: 'onPressed',
        reactNative: 'onPress',
        web: 'onClick',
        tauri: 'onClick',
      },
      disabled: {
        flutter: 'onPressed: null',
        reactNative: 'disabled',
        web: 'disabled',
        tauri: 'disabled',
      },
      variant: {
        flutter: 'style',
        reactNative: 'style',
        web: 'className',
        tauri: 'className',
      },
    },
    styling: {
      primary: {
        flutter:
          'ButtonStyle(backgroundColor: MaterialStateProperty.all(Colors.blue))',
        reactNative: 'styles.primaryButton',
        web: 'btn-primary',
        tauri: 'btn-primary',
      },
    },
  },
  {
    name: 'StreamingText',
    flutter: 'StreamingTextWidget',
    reactNative: 'StreamingText',
    web: 'StreamingText',
    tauri: 'StreamingText',
    props: {
      textStream: {
        flutter: 'Stream<String>',
        reactNative: 'Observable<string>',
        web: 'ReadableStream<string>',
        tauri: 'EventTarget',
      },
      onComplete: {
        flutter: 'VoidCallback',
        reactNative: '() => void',
        web: '() => void',
        tauri: '() => void',
      },
    },
    styling: {
      container: {
        flutter: 'Container(decoration: BoxDecoration(...))',
        reactNative: 'styles.streamingContainer',
        web: 'streaming-text-container',
        tauri: 'streaming-text-container',
      },
    },
  },
];
```

#### Responsive Design Patterns

```typescript
// Cross-platform responsive design utilities
interface ResponsiveBreakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
  ultrawide: number;
}

const breakpoints: ResponsiveBreakpoints = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
  ultrawide: 1280,
};

// Flutter responsive implementation
class FlutterResponsiveBuilder extends StatelessWidget {
  final Widget Function(BuildContext context, DeviceType device) builder;

  DeviceType getDeviceType(double width) {
    if (width < breakpoints.mobile) return DeviceType.mobile;
    if (width < breakpoints.tablet) return DeviceType.tablet;
    if (width < breakpoints.desktop) return DeviceType.desktop;
    return DeviceType.ultrawide;
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final deviceType = getDeviceType(constraints.maxWidth);
        return builder(context, deviceType);
      },
    );
  }
}

// React Native responsive implementation
const useResponsiveLayout = () => {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const deviceType = useMemo(() => {
    const { width } = dimensions;
    if (width < breakpoints.mobile) return 'mobile';
    if (width < breakpoints.tablet) return 'tablet';
    if (width < breakpoints.desktop) return 'desktop';
    return 'ultrawide';
  }, [dimensions]);

  return { deviceType, dimensions };
};

// Web responsive implementation (Next.js)
const useResponsiveDesign = () => {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < breakpoints.mobile) setDeviceType('mobile');
      else if (width < breakpoints.tablet) setDeviceType('tablet');
      else if (width < breakpoints.desktop) setDeviceType('desktop');
      else setDeviceType('ultrawide');
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return deviceType;
};
```

### Theme System Synchronization

#### Cross-Platform Theme Provider

```typescript
// Unified theme provider across all frameworks
interface UnifiedTheme {
  colors: ColorPalette;
  typography: TypographyScale;
  spacing: SpacingScale;
  shadows: ShadowDefinitions;
  animations: AnimationDefinitions;
  aiSpecific: AIThemeExtensions;
}

interface AIThemeExtensions {
  streamingColors: {
    active: string;
    complete: string;
    error: string;
    thinking: string;
  };
  codeEditor: {
    background: string;
    foreground: string;
    selection: string;
    lineHighlight: string;
  };
  chatInterface: {
    userBubble: string;
    aiBubble: string;
    systemMessage: string;
    timestamp: string;
  };
}

// Theme implementation generators for each platform
class ThemeGenerator {
  static generateFlutterTheme(theme: UnifiedTheme): string {
    return `
ThemeData(
  primarySwatch: MaterialColor(
    ${theme.colors.primary[500]},
    <int, Color>{
      50: Color(${theme.colors.primary[50]}),
      100: Color(${theme.colors.primary[100]}),
      // ... other shades
    },
  ),
  textTheme: TextTheme(
    bodyLarge: TextStyle(
      fontFamily: '${theme.typography.interface.fontFamily}',
      fontSize: ${theme.typography.interface.sizes.md},
    ),
  ),
  elevatedButtonTheme: ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      backgroundColor: Color(${theme.colors.primary[500]}),
    ),
  ),
);`;
  }

  static generateReactNativeTheme(theme: UnifiedTheme): Record<string, any> {
    return {
      colors: theme.colors,
      typography: {
        bodyLarge: {
          fontFamily: theme.typography.interface.fontFamily,
          fontSize: theme.typography.interface.sizes.md,
          fontWeight: theme.typography.interface.weight.normal,
        },
      },
      spacing: theme.spacing,
      button: {
        primary: {
          backgroundColor: theme.colors.primary[500],
          borderRadius: 8,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
        },
      },
    };
  }

  static generateWebCSS(theme: UnifiedTheme): string {
    return `
:root {
  /* Colors */
  --color-primary-50: ${theme.colors.primary[50]};
  --color-primary-500: ${theme.colors.primary[500]};
  --color-primary-900: ${theme.colors.primary[900]};
  
  /* AI-specific colors */
  --color-ai-active: ${theme.aiSpecific.streamingColors.active};
  --color-ai-streaming: ${theme.aiSpecific.streamingColors.complete};
  --color-ai-error: ${theme.aiSpecific.streamingColors.error};
  
  /* Typography */
  --font-interface: ${theme.typography.interface.fontFamily};
  --font-code: ${theme.typography.code.fontFamily};
  
  /* Spacing */
  --spacing-xs: ${theme.spacing.xs}px;
  --spacing-sm: ${theme.spacing.sm}px;
  --spacing-md: ${theme.spacing.md}px;
  --spacing-lg: ${theme.spacing.lg}px;
  
  /* AI Interface specific */
  --chat-width: ${theme.aiSpecific.chatInterface.chatWidth}px;
}

.btn-primary {
  background-color: var(--color-primary-500);
  color: white;
  border: none;
  border-radius: 8px;
  padding: var(--spacing-md) var(--spacing-lg);
  font-family: var(--font-interface);
  cursor: pointer;
}

.streaming-text-container {
  background-color: var(--color-ai-streaming);
  border-left: 3px solid var(--color-ai-active);
  padding: var(--spacing-md);
  border-radius: 8px;
  font-family: var(--font-code);
}`;
  }
}
```

## Change Log

| Change                                 | Date       | Version | Description                                                                | Author                  |
| -------------------------------------- | ---------- | ------- | -------------------------------------------------------------------------- | ----------------------- |
| Initial Frontend Architecture Creation | 2025-01-08 | 1.0     | Comprehensive frontend architecture for multi-framework template ecosystem | Jane (Design Architect) |

---

**Frontend Architecture Document Complete - Ready for Cross-Framework
Implementation**

This comprehensive frontend architecture establishes unified design patterns and
AI-native interface components across Flutter, React Native, Next.js, and Tauri
frameworks, enabling consistent developer experience while optimizing for each
platform's unique strengths in the template generation ecosystem.
