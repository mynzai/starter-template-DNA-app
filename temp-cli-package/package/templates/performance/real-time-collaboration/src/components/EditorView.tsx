import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Editor } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { motion } from 'framer-motion';

import { useCollaborationStore } from '../stores/collaborationStore';
import { useDocumentStore } from '../stores/documentStore';
import { usePresenceStore } from '../stores/presenceStore';

import type {
  Document,
  CollaborationSession,
  Operation,
  OperationType,
  CursorPosition,
  TextSelection,
  UserPresence,
} from '../types';

interface EditorViewProps {
  document: Document;
  session: CollaborationSession | null;
}

interface MonacoEditor {
  getValue: () => string;
  setValue: (value: string) => void;
  getPosition: () => editor.IPosition | null;
  setPosition: (position: editor.IPosition) => void;
  getSelection: () => editor.ISelection | null;
  setSelection: (selection: editor.IRange) => void;
  focus: () => void;
  onDidChangeModelContent: (listener: (e: editor.IModelContentChangedEvent) => void) => editor.IDisposable;
  onDidChangeCursorPosition: (listener: (e: editor.ICursorPositionChangedEvent) => void) => editor.IDisposable;
  onDidChangeCursorSelection: (listener: (e: editor.ICursorSelectionChangedEvent) => void) => editor.IDisposable;
  addCommand: (keybinding: number, handler: () => void) => void;
  createDecorationsCollection: (decorations: editor.IModelDeltaDecoration[]) => editor.IEditorDecorationsCollection;
}

const EditorView: React.FC<EditorViewProps> = ({ document, session }) => {
  const editorRef = useRef<MonacoEditor | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [decorations, setDecorations] = useState<editor.IEditorDecorationsCollection | null>(null);
  const [isApplyingRemoteOperation, setIsApplyingRemoteOperation] = useState(false);

  // Store hooks
  const {
    applyOperation,
    userPresences,
    currentUserPresence,
    updateUserPresence,
    lastOperationLatency,
  } = useCollaborationStore();

  const {
    updateDocumentContent,
  } = useDocumentStore();

  const {
    updateCursorPosition,
    updateSelection,
  } = usePresenceStore();

  // Handle editor mount
  const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor as MonacoEditor;
    setIsEditorReady(true);

    // Set initial content
    editor.setValue(document.content);

    // Focus editor
    editor.focus();

    // Setup event listeners
    setupEditorEventListeners(editor);

    console.log('Monaco Editor mounted and configured');
  }, [document.content]);

  // Setup editor event listeners
  const setupEditorEventListeners = (editor: editor.IStandaloneCodeEditor) => {
    // Content change listener
    const contentDisposable = editor.onDidChangeModelContent((e) => {
      if (isApplyingRemoteOperation) {
        return; // Skip handling remote changes
      }

      handleContentChange(e);
    });

    // Cursor position change listener
    const cursorDisposable = editor.onDidChangeCursorPosition((e) => {
      handleCursorPositionChange(e);
    });

    // Selection change listener
    const selectionDisposable = editor.onDidChangeCursorSelection((e) => {
      handleSelectionChange(e);
    });

    // Cleanup on unmount
    return () => {
      contentDisposable.dispose();
      cursorDisposable.dispose();
      selectionDisposable.dispose();
    };
  };

  // Handle content changes and create operations
  const handleContentChange = useCallback(async (e: editor.IModelContentChangedEvent) => {
    if (!session || !editorRef.current) return;

    try {
      for (const change of e.changes) {
        const operation = createOperationFromChange(change);
        if (operation) {
          const result = await applyOperation({
            clientId: session.participants[0], // Current user
            operationType: operation,
            revision: document.version,
          });

          if (result.success) {
            // Update local document state
            const newContent = editorRef.current.getValue();
            await updateDocumentContent(document.id, newContent);
            
            console.log(`Operation applied successfully. Latency: ${lastOperationLatency?.toFixed(2)}ms`);
          } else {
            console.warn('Operation failed:', result);
            // Could show user notification here
          }
        }
      }
    } catch (error) {
      console.error('Failed to apply operation:', error);
      // Could show error notification to user
    }
  }, [session, document, applyOperation, updateDocumentContent, lastOperationLatency]);

  // Create operation from Monaco editor change
  const createOperationFromChange = (change: editor.IModelContentChange): OperationType | null => {
    const { range, text, rangeLength } = change;
    
    // Calculate absolute position from range
    const model = editorRef.current?.getModel?.();
    if (!model) return null;

    const absolutePosition = model.getOffsetAt(range.getStartPosition());

    if (text && rangeLength === 0) {
      // Insert operation
      return {
        type: 'Insert',
        position: absolutePosition,
        content: text,
      };
    } else if (!text && rangeLength > 0) {
      // Delete operation
      return {
        type: 'Delete',
        position: absolutePosition,
        length: rangeLength,
      };
    } else if (text && rangeLength > 0) {
      // Replace operation (delete + insert)
      // For OT, we split this into separate operations
      // First delete, then insert
      return {
        type: 'Delete',
        position: absolutePosition,
        length: rangeLength,
      };
      // Note: In a real implementation, you'd queue the insert operation after the delete
    }

    return null;
  };

  // Handle cursor position changes
  const handleCursorPositionChange = useCallback(async (e: editor.ICursorPositionChangedEvent) => {
    if (!session || !editorRef.current) return;

    const position = e.position;
    const cursorPosition: CursorPosition = {
      documentId: document.id,
      line: position.lineNumber,
      column: position.column,
      absolutePosition: editorRef.current.getModel?.()?.getOffsetAt(position) || 0,
    };

    try {
      await updateUserPresence({ cursorPosition });
      updateCursorPosition(cursorPosition);
    } catch (error) {
      console.error('Failed to update cursor position:', error);
    }
  }, [session, document.id, updateUserPresence, updateCursorPosition]);

  // Handle selection changes
  const handleSelectionChange = useCallback(async (e: editor.ICursorSelectionChangedEvent) => {
    if (!session || !editorRef.current) return;

    const selection = e.selection;
    const model = editorRef.current.getModel?.();
    if (!model || selection.isEmpty()) {
      // Clear selection
      await updateUserPresence({ selection: undefined });
      updateSelection(null);
      return;
    }

    const startPosition: CursorPosition = {
      documentId: document.id,
      line: selection.startLineNumber,
      column: selection.startColumn,
      absolutePosition: model.getOffsetAt(selection.getStartPosition()),
    };

    const endPosition: CursorPosition = {
      documentId: document.id,
      line: selection.endLineNumber,
      column: selection.endColumn,
      absolutePosition: model.getOffsetAt(selection.getEndPosition()),
    };

    const selectedText = model.getValueInRange(selection);

    const textSelection: TextSelection = {
      start: startPosition,
      end: endPosition,
      text: selectedText,
    };

    try {
      await updateUserPresence({ selection: textSelection });
      updateSelection(textSelection);
    } catch (error) {
      console.error('Failed to update selection:', error);
    }
  }, [session, document.id, updateUserPresence, updateSelection]);

  // Apply remote operation to editor
  const applyRemoteOperation = useCallback((operation: Operation) => {
    if (!editorRef.current || !isEditorReady) return;

    setIsApplyingRemoteOperation(true);

    try {
      const model = editorRef.current.getModel?.();
      if (!model) return;

      switch (operation.operationType.type) {
        case 'Insert': {
          const position = model.getPositionAt(operation.operationType.position);
          const range = new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          );
          
          model.pushEditOperations(
            [],
            [{ range, text: operation.operationType.content }],
            () => null
          );
          break;
        }
        
        case 'Delete': {
          const startPosition = model.getPositionAt(operation.operationType.position);
          const endPosition = model.getPositionAt(
            operation.operationType.position + operation.operationType.length
          );
          const range = new monaco.Range(
            startPosition.lineNumber,
            startPosition.column,
            endPosition.lineNumber,
            endPosition.column
          );
          
          model.pushEditOperations(
            [],
            [{ range, text: '' }],
            () => null
          );
          break;
        }
        
        case 'Retain':
          // No-op for retain operations
          break;
      }
    } catch (error) {
      console.error('Failed to apply remote operation:', error);
    } finally {
      setIsApplyingRemoteOperation(false);
    }
  }, [isEditorReady]);

  // Update presence decorations (cursors and selections)
  const updatePresenceDecorations = useCallback(() => {
    if (!editorRef.current || !isEditorReady) return;

    const model = editorRef.current.getModel?.();
    if (!model) return;

    const newDecorations: editor.IModelDeltaDecoration[] = [];

    // Add decorations for other users' cursors and selections
    userPresences.forEach((presence, userId) => {
      if (userId === currentUserPresence?.userId) return; // Skip current user

      const userColor = getUserColor(userId);

      // Add cursor decoration
      if (presence.cursorPosition) {
        const position = model.getPositionAt(presence.cursorPosition.absolutePosition);
        newDecorations.push({
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          ),
          options: {
            className: 'remote-cursor',
            before: {
              content: presence.displayName.charAt(0).toUpperCase(),
              inlineClassName: 'remote-cursor-label',
              inlineClassNameAffectsLetterSpacing: true,
            },
            beforeStyle: {
              backgroundColor: userColor,
              color: 'white',
              borderRadius: '2px',
              padding: '1px 4px',
              fontSize: '12px',
              fontWeight: 'bold',
            },
          },
        });
      }

      // Add selection decoration
      if (presence.selection) {
        const startPosition = model.getPositionAt(presence.selection.start.absolutePosition);
        const endPosition = model.getPositionAt(presence.selection.end.absolutePosition);
        
        newDecorations.push({
          range: new monaco.Range(
            startPosition.lineNumber,
            startPosition.column,
            endPosition.lineNumber,
            endPosition.column
          ),
          options: {
            className: 'remote-selection',
            inlineClassName: 'remote-selection-highlight',
            backgroundColor: userColor + '20', // 20% opacity
            borderColor: userColor,
          },
        });
      }
    });

    // Update decorations
    if (decorations) {
      decorations.set(newDecorations);
    } else {
      const newDecorationsCollection = editorRef.current.createDecorationsCollection(newDecorations);
      setDecorations(newDecorationsCollection);
    }
  }, [userPresences, currentUserPresence, isEditorReady, decorations]);

  // Get consistent color for a user
  const getUserColor = (userId: string): string => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
      '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
    ];
    
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Update decorations when presence changes
  useEffect(() => {
    updatePresenceDecorations();
  }, [updatePresenceDecorations]);

  // Handle remote operations (would come from WebRTC or WebSocket)
  useEffect(() => {
    // This would subscribe to remote operations
    // For now, we'll simulate this with a placeholder
    
    const handleRemoteOperation = (operation: Operation) => {
      applyRemoteOperation(operation);
    };

    // In a real implementation, you'd subscribe to the collaboration store
    // or WebRTC data channel for remote operations
    
    return () => {
      // Cleanup subscription
    };
  }, [applyRemoteOperation]);

  return (
    <motion.div
      className="editor-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Editor header with document info */}
      <div className="editor-header">
        <div className="document-info">
          <h2 className="document-title">{document.title}</h2>
          <div className="document-meta">
            <span className="version">v{document.version}</span>
            <span className="language">{document.metadata.language || 'text'}</span>
            <span className="collaborators">
              {document.metadata.collaborators.length} collaborator{document.metadata.collaborators.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="editor-actions">
          {/* Performance indicator */}
          {lastOperationLatency && (
            <div className={`latency-indicator ${lastOperationLatency > 150 ? 'high' : 'normal'}`}>
              <span className="latency-value">{lastOperationLatency.toFixed(0)}ms</span>
              <span className="latency-label">latency</span>
            </div>
          )}

          {/* Save status */}
          <div className="save-status">
            <span className="status-indicator saved">●</span>
            <span>All changes saved</span>
          </div>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="editor-container">
        <Editor
          height="100%"
          language={document.metadata.language || 'plaintext'}
          theme="vs-dark"
          value={document.content}
          onMount={handleEditorDidMount}
          options={{
            automaticLayout: true,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            fontSize: 14,
            lineHeight: 20,
            wordWrap: 'on',
            contextmenu: true,
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            accessibilitySupport: 'auto',
            // Collaboration-specific options
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: true,
            renderWhitespace: 'selection',
            showFoldingControls: 'always',
            bracketPairColorization: { enabled: true },
          }}
        />
      </div>

      {/* Active collaborators indicator */}
      {session && session.participants.length > 1 && (
        <motion.div
          className="active-collaborators"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="collaborators-list">
            {Array.from(userPresences.values())
              .filter(p => p.userId !== currentUserPresence?.userId)
              .map((presence) => (
                <div
                  key={presence.userId}
                  className="collaborator-avatar"
                  style={{ borderColor: getUserColor(presence.userId) }}
                  title={`${presence.displayName} - ${presence.status}`}
                >
                  {presence.avatarUrl ? (
                    <img src={presence.avatarUrl} alt={presence.displayName} />
                  ) : (
                    <span>{presence.displayName.charAt(0).toUpperCase()}</span>
                  )}
                  <div
                    className={`status-indicator ${presence.status}`}
                    style={{ backgroundColor: getUserColor(presence.userId) }}
                  />
                </div>
              ))}
          </div>
        </motion.div>
      )}

      {/* Performance warning */}
      {lastOperationLatency && lastOperationLatency > 150 && (
        <motion.div
          className="performance-warning"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
        >
          <span className="warning-icon">⚠️</span>
          <span className="warning-text">
            High latency detected. Operations may be slower than expected.
          </span>
        </motion.div>
      )}
    </motion.div>
  );
};

export default EditorView;