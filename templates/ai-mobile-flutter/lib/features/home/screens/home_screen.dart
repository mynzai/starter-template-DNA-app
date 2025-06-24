import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/ai_service.dart';
import '../../../core/services/voice_service.dart';
import '../../../core/providers/connectivity_provider.dart';
import '../widgets/feature_card.dart';
import '../widgets/quick_actions.dart';
import '../widgets/recent_conversations.dart';
import '../widgets/ai_insights_card.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> with TickerProviderStateMixin {
  late AnimationController _fadeController;
  late AnimationController _slideController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _initializeAnimations();
    _initializeServices();
  }

  void _initializeAnimations() {
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _slideController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _fadeController, curve: Curves.easeOut),
    );
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _slideController, curve: Curves.easeOut));

    _fadeController.forward();
    _slideController.forward();
  }

  void _initializeServices() {
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!AIService.instance.isInitialized) {
        await AIService.instance.init();
      }
      if (!VoiceService.instance.isInitialized) {
        await VoiceService.instance.init();
      }
    });
  }

  @override
  void dispose() {
    _fadeController.dispose();
    _slideController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isConnected = ref.watch(connectivityProvider);
    final theme = Theme.of(context);
    final isIOS = theme.platform == TargetPlatform.iOS;

    return Scaffold(
      body: SafeArea(
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: SlideTransition(
            position: _slideAnimation,
            child: CustomScrollView(
              slivers: [
                // App Bar
                SliverAppBar(
                  expandedHeight: 120,
                  floating: true,
                  snap: true,
                  backgroundColor: theme.scaffoldBackgroundColor,
                  elevation: 0,
                  flexibleSpace: FlexibleSpaceBar(
                    titlePadding: const EdgeInsets.only(left: 20, bottom: 16),
                    title: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'AI Assistant',
                          style: theme.textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: isConnected ? Colors.green : Colors.orange,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              isConnected ? 'Online' : 'Offline',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: isConnected ? Colors.green : Colors.orange,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  actions: [
                    IconButton(
                      icon: Icon(isIOS ? CupertinoIcons.settings : Icons.settings),
                      onPressed: () => Navigator.pushNamed(context, '/settings'),
                    ),
                  ],
                ),

                // Quick Actions
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Quick Actions',
                          style: theme.textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 16),
                        const QuickActions(),
                      ],
                    ),
                  ),
                ),

                // AI Insights
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'AI Insights',
                          style: theme.textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 16),
                        const AIInsightsCard(),
                      ],
                    ),
                  ),
                ),

                // Features Grid
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Features',
                          style: theme.textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 16),
                        _buildFeaturesGrid(context, isIOS),
                      ],
                    ),
                  ),
                ),

                // Recent Conversations
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Recent Conversations',
                              style: theme.textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            TextButton(
                              onPressed: () => Navigator.pushNamed(context, '/chat'),
                              child: const Text('View All'),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        const RecentConversations(),
                      ],
                    ),
                  ),
                ),

                // Bottom padding
                const SliverToBoxAdapter(
                  child: SizedBox(height: 100),
                ),
              ],
            ),
          ),
        ),
      ),
      floatingActionButton: _buildFloatingActionButton(context, isIOS),
    );
  }

  Widget _buildFeaturesGrid(BuildContext context, bool isIOS) {
    final features = [
      FeatureData(
        title: 'AI Chat',
        description: 'Intelligent conversations',
        icon: isIOS ? CupertinoIcons.chat_bubble_2 : Icons.chat,
        color: Colors.blue,
        onTap: () => Navigator.pushNamed(context, '/chat'),
      ),
      FeatureData(
        title: 'Voice Assistant',
        description: 'Hands-free interaction',
        icon: isIOS ? CupertinoIcons.mic : Icons.mic,
        color: Colors.green,
        onTap: () => _startVoiceChat(),
      ),
      FeatureData(
        title: 'Image Analysis',
        description: 'AI-powered vision',
        icon: isIOS ? CupertinoIcons.camera : Icons.camera_alt,
        color: Colors.purple,
        onTap: () => Navigator.pushNamed(context, '/camera'),
      ),
      FeatureData(
        title: 'Smart Search',
        description: 'Find anything quickly',
        icon: isIOS ? CupertinoIcons.search : Icons.search,
        color: Colors.orange,
        onTap: () => _showSearchDialog(),
      ),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
        childAspectRatio: 1.2,
      ),
      itemCount: features.length,
      itemBuilder: (context, index) {
        return FeatureCard(feature: features[index]);
      },
    );
  }

  Widget _buildFloatingActionButton(BuildContext context, bool isIOS) {
    return FloatingActionButton.extended(
      onPressed: () => _startVoiceChat(),
      icon: Icon(isIOS ? CupertinoIcons.mic : Icons.mic),
      label: const Text('Ask AI'),
      backgroundColor: Theme.of(context).primaryColor,
    );
  }

  void _startVoiceChat() async {
    try {
      final hasPermission = await VoiceService.instance.requestPermissions();
      if (!hasPermission) {
        _showPermissionDialog();
        return;
      }

      await VoiceService.instance.startListening();
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Listening... Speak now!'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Voice error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showPermissionDialog() {
    final theme = Theme.of(context);
    final isIOS = theme.platform == TargetPlatform.iOS;

    showDialog(
      context: context,
      builder: (context) => isIOS
          ? CupertinoAlertDialog(
              title: const Text('Microphone Permission'),
              content: const Text('Please grant microphone permission to use voice features.'),
              actions: [
                CupertinoDialogAction(
                  child: const Text('Cancel'),
                  onPressed: () => Navigator.pop(context),
                ),
                CupertinoDialogAction(
                  child: const Text('Settings'),
                  onPressed: () {
                    Navigator.pop(context);
                    // Open app settings
                  },
                ),
              ],
            )
          : AlertDialog(
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

  void _showSearchDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Smart Search'),
        content: TextField(
          decoration: const InputDecoration(
            hintText: 'Search conversations, images, or ask a question...',
            border: OutlineInputBorder(),
          ),
          onSubmitted: (value) {
            Navigator.pop(context);
            if (value.isNotEmpty) {
              Navigator.pushNamed(context, '/chat', arguments: {'initialMessage': value});
            }
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }
}

class FeatureData {
  final String title;
  final String description;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const FeatureData({
    required this.title,
    required this.description,
    required this.icon,
    required this.color,
    required this.onTap,
  });
}