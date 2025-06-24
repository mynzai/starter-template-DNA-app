import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/ai_service.dart';
import '../../../core/services/voice_service.dart';
import '../../../core/providers/chat_provider.dart';
import '../../../core/providers/connectivity_provider.dart';
import '../widgets/message_bubble.dart';
import '../widgets/chat_input.dart';
import '../widgets/typing_indicator.dart';
import '../widgets/voice_recording_overlay.dart';

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> with TickerProviderStateMixin {
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _messageController = TextEditingController();
  
  late AnimationController _voiceAnimationController;
  bool _isVoiceRecording = false;
  bool _isTyping = false;

  @override
  void initState() {
    super.initState();
    _voiceAnimationController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    
    _initializeChat();
    _setupVoiceListener();
  }

  void _initializeChat() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
      if (args?['initialMessage'] != null) {
        _sendMessage(args!['initialMessage']);
      }
    });
  }

  void _setupVoiceListener() {
    VoiceService.instance.speechResultStream.listen((result) {
      if (result.isFinal && result.recognizedWords.isNotEmpty) {
        _sendMessage(result.recognizedWords);
      }
    });

    VoiceService.instance.stateStream.listen((state) {
      setState(() {
        _isVoiceRecording = state == VoiceServiceState.listening;
      });
      
      if (state == VoiceServiceState.listening) {
        _voiceAnimationController.repeat();
      } else {
        _voiceAnimationController.stop();
      }
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _messageController.dispose();
    _voiceAnimationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final chatState = ref.watch(chatProvider);
    final isConnected = ref.watch(connectivityProvider);
    final theme = Theme.of(context);
    final isIOS = theme.platform == TargetPlatform.iOS;

    return Scaffold(
      appBar: _buildAppBar(context, isIOS, isConnected),
      body: Stack(
        children: [
          Column(
            children: [
              // Connection status banner
              if (!isConnected)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  color: Colors.orange.shade100,
                  child: Row(
                    children: [
                      Icon(
                        isIOS ? CupertinoIcons.wifi_slash : Icons.wifi_off,
                        color: Colors.orange,
                        size: 16,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Offline mode - Limited AI capabilities',
                        style: TextStyle(
                          color: Colors.orange.shade800,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),

              // Messages list
              Expanded(
                child: chatState.messages.isEmpty
                    ? _buildEmptyState(context, isIOS)
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.all(16),
                        itemCount: chatState.messages.length + (_isTyping ? 1 : 0),
                        itemBuilder: (context, index) {
                          if (index == chatState.messages.length && _isTyping) {
                            return const TypingIndicator();
                          }
                          
                          final message = chatState.messages[index];
                          return MessageBubble(
                            message: message,
                            showAvatar: index == 0 || 
                                chatState.messages[index - 1].role != message.role,
                          );
                        },
                      ),
              ),

              // Chat input
              ChatInput(
                controller: _messageController,
                onSendMessage: _sendMessage,
                onStartVoiceRecording: _startVoiceRecording,
                onStopVoiceRecording: _stopVoiceRecording,
                isRecording: _isVoiceRecording,
                isEnabled: !_isTyping,
              ),
            ],
          ),

          // Voice recording overlay
          if (_isVoiceRecording)
            VoiceRecordingOverlay(
              animationController: _voiceAnimationController,
              onCancel: _stopVoiceRecording,
            ),
        ],
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context, bool isIOS, bool isConnected) {
    return AppBar(
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('AI Assistant'),
          Text(
            isConnected ? 'Online' : 'Offline',
            style: TextStyle(
              fontSize: 12,
              color: isConnected ? Colors.green : Colors.orange,
              fontWeight: FontWeight.normal,
            ),
          ),
        ],
      ),
      elevation: 0,
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      actions: [
        IconButton(
          icon: Icon(isIOS ? CupertinoIcons.ellipsis : Icons.more_vert),
          onPressed: () => _showChatOptions(context, isIOS),
        ),
      ],
    );
  }

  Widget _buildEmptyState(BuildContext context, bool isIOS) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isIOS ? CupertinoIcons.chat_bubble_2 : Icons.chat_bubble_outline,
              size: 80,
              color: Colors.grey.shade400,
            ),
            const SizedBox(height: 24),
            Text(
              'Start a conversation',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                color: Colors.grey.shade600,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Ask me anything! I can help with questions, analysis, and creative tasks.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Colors.grey.shade500,
              ),
            ),
            const SizedBox(height: 32),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _buildSuggestionChip('Explain quantum computing'),
                _buildSuggestionChip('Help me write an email'),
                _buildSuggestionChip('Plan a healthy meal'),
                _buildSuggestionChip('Code review tips'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSuggestionChip(String text) {
    return ActionChip(
      label: Text(text),
      onPressed: () => _sendMessage(text),
      backgroundColor: Theme.of(context).primaryColor.withOpacity(0.1),
      side: BorderSide(
        color: Theme.of(context).primaryColor.withOpacity(0.3),
      ),
    );
  }

  void _sendMessage(String message) async {
    if (message.trim().isEmpty) return;

    _messageController.clear();
    
    // Add user message to chat
    ref.read(chatProvider.notifier).addMessage(
      role: MessageRole.user,
      content: message,
    );

    setState(() {
      _isTyping = true;
    });

    _scrollToBottom();

    try {
      // Get AI response
      final response = await AIService.instance.sendMessage(
        message: message,
        conversationId: ref.read(chatProvider).conversationId,
      );

      // Add AI response to chat
      ref.read(chatProvider.notifier).addMessage(
        role: MessageRole.assistant,
        content: response.content,
        metadata: {
          'provider': response.provider,
          'model': response.model,
          'tokens': response.tokens,
          'isOffline': response.isOffline,
        },
      );

      _scrollToBottom();
    } catch (e) {
      debugPrint('Send message error: $e');
      
      // Add error message
      ref.read(chatProvider.notifier).addMessage(
        role: MessageRole.assistant,
        content: 'Sorry, I encountered an error. Please try again.',
      );
    } finally {
      setState(() {
        _isTyping = false;
      });
    }
  }

  void _startVoiceRecording() async {
    try {
      final hasPermission = await VoiceService.instance.requestPermissions();
      if (!hasPermission) {
        _showPermissionDialog();
        return;
      }

      await VoiceService.instance.startListening();
    } catch (e) {
      debugPrint('Voice recording error: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Voice recording failed: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _stopVoiceRecording() async {
    await VoiceService.instance.stopListening();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _showChatOptions(BuildContext context, bool isIOS) {
    final options = [
      'Clear conversation',
      'Export chat',
      'Share conversation',
      'Settings',
    ];

    if (isIOS) {
      showCupertinoModalPopup(
        context: context,
        builder: (context) => CupertinoActionSheet(
          actions: options
              .map((option) => CupertinoActionSheetAction(
                    onPressed: () => _handleChatOption(context, option),
                    child: Text(option),
                  ))
              .toList(),
          cancelButton: CupertinoActionSheetAction(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
        ),
      );
    } else {
      showModalBottomSheet(
        context: context,
        builder: (context) => Column(
          mainAxisSize: MainAxisSize.min,
          children: options
              .map((option) => ListTile(
                    title: Text(option),
                    onTap: () => _handleChatOption(context, option),
                  ))
              .toList(),
        ),
      );
    }
  }

  void _handleChatOption(BuildContext context, String option) {
    Navigator.pop(context);
    
    switch (option) {
      case 'Clear conversation':
        _clearConversation();
        break;
      case 'Export chat':
        _exportChat();
        break;
      case 'Share conversation':
        _shareConversation();
        break;
      case 'Settings':
        Navigator.pushNamed(context, '/settings');
        break;
    }
  }

  void _clearConversation() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear Conversation'),
        content: const Text('Are you sure you want to clear this conversation? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              ref.read(chatProvider.notifier).clearMessages();
            },
            child: const Text('Clear'),
          ),
        ],
      ),
    );
  }

  void _exportChat() {
    // Implement chat export functionality
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Export feature coming soon!')),
    );
  }

  void _shareConversation() {
    // Implement chat sharing functionality
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Share feature coming soon!')),
    );
  }

  void _showPermissionDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Microphone Permission'),
        content: const Text('Please grant microphone permission to use voice features.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              // Open app settings
            },
            child: const Text('Settings'),
          ),
        ],
      ),
    );
  }
}