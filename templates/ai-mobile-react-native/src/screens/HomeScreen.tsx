import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Button, Chip, Surface } from 'react-native-paper';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

import { RootState } from '../store';
import { initializeAI } from '../store/slices/aiSlice';
import { setInitialized as setVoiceInitialized } from '../store/slices/voiceSlice';
import { setInitialized as setCameraInitialized } from '../store/slices/cameraSlice';

const { width } = Dimensions.get('window');

const HomeScreen: React.FC = () => {
  const dispatch = useDispatch();
  const ai = useSelector((state: RootState) => state.ai);
  const voice = useSelector((state: RootState) => state.voice);
  const camera = useSelector((state: RootState) => state.camera);
  const conversations = useSelector((state: RootState) => state.conversations);

  useEffect(() => {
    // Initialize services if not already done
    if (!ai.isInitialized) {
      dispatch(initializeAI() as any);
    }
  }, [dispatch, ai.isInitialized]);

  const quickActions = [
    {
      id: 'new-chat',
      title: 'New Chat',
      subtitle: 'Start AI conversation',
      icon: 'chat',
      color: '#4CAF50',
      action: () => console.log('Navigate to new chat'),
    },
    {
      id: 'voice-assistant',
      title: 'Voice Assistant',
      subtitle: 'Talk to AI',
      icon: 'mic',
      color: '#2196F3',
      action: () => console.log('Navigate to voice'),
    },
    {
      id: 'camera-ai',
      title: 'Camera AI',
      subtitle: 'Analyze images',
      icon: 'camera-alt',
      color: '#FF9800',
      action: () => console.log('Navigate to camera'),
    },
    {
      id: 'conversations',
      title: 'Conversations',
      subtitle: `${conversations.conversations.length} chats`,
      icon: 'history',
      color: '#9C27B0',
      action: () => console.log('Navigate to conversations'),
    },
  ];

  const features = [
    {
      title: 'Smart AI Chat',
      description: 'Advanced conversations with multiple AI providers',
      icon: 'psychology',
      status: ai.isInitialized ? 'Ready' : 'Initializing...',
      isReady: ai.isInitialized,
    },
    {
      title: 'Voice Interaction',
      description: 'Speech-to-text and text-to-speech capabilities',
      icon: 'record-voice-over',
      status: voice.isInitialized ? 'Ready' : 'Setup Required',
      isReady: voice.isInitialized,
    },
    {
      title: 'Image Analysis',
      description: 'AI-powered image recognition and analysis',
      icon: 'image-search',
      status: camera.isInitialized ? 'Ready' : 'Setup Required',
      isReady: camera.isInitialized,
    },
    {
      title: 'Offline Mode',
      description: 'Basic functionality without internet',
      icon: 'offline-bolt',
      status: 'Available',
      isReady: true,
    },
  ];

  const stats = {
    totalConversations: conversations.conversations.length,
    totalMessages: conversations.conversations.reduce((sum, conv) => sum + conv.messages.length, 0),
    tokensUsed: conversations.totalTokensUsed,
    online: ai.isOnline,
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={['#2196F3', '#21CBF3']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <Text style={styles.headerSubtitle}>
            Your intelligent mobile companion
          </Text>
          <View style={styles.statusContainer}>
            <Chip
              icon={ai.isOnline ? 'wifi' : 'wifi-off'}
              style={[
                styles.statusChip,
                { backgroundColor: ai.isOnline ? '#4CAF50' : '#FF5722' },
              ]}
              textStyle={styles.statusText}
            >
              {ai.isOnline ? 'Online' : 'Offline'}
            </Chip>
          </View>
        </View>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickActionCard}
              onPress={action.action}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
                <MaterialIcons name={action.icon} size={24} color="white" />
              </View>
              <Text style={styles.quickActionTitle}>{action.title}</Text>
              <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Usage Stats</Text>
        <Surface style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalConversations}</Text>
            <Text style={styles.statLabel}>Conversations</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalMessages}</Text>
            <Text style={styles.statLabel}>Messages</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.tokensUsed.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Tokens Used</Text>
          </View>
        </Surface>
      </View>

      {/* Features Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Features</Text>
        {features.map((feature, index) => (
          <Card key={index} style={styles.featureCard}>
            <View style={styles.featureContent}>
              <View style={styles.featureIcon}>
                <MaterialIcons
                  name={feature.icon}
                  size={24}
                  color={feature.isReady ? '#4CAF50' : '#FF9800'}
                />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
              <View style={styles.featureStatus}>
                <Chip
                  style={[
                    styles.featureStatusChip,
                    {
                      backgroundColor: feature.isReady ? '#E8F5E8' : '#FFF3E0',
                    },
                  ]}
                  textStyle={[
                    styles.featureStatusText,
                    {
                      color: feature.isReady ? '#4CAF50' : '#FF9800',
                    },
                  ]}
                >
                  {feature.status}
                </Chip>
              </View>
            </View>
          </Card>
        ))}
      </View>

      {/* Recent Activity */}
      {conversations.conversations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {conversations.conversations.slice(0, 3).map((conversation) => (
            <Card key={conversation.id} style={styles.activityCard}>
              <TouchableOpacity
                style={styles.activityContent}
                onPress={() => console.log('Navigate to conversation', conversation.id)}
              >
                <View style={styles.activityIcon}>
                  <MaterialIcons name="chat-bubble" size={20} color="#2196F3" />
                </View>
                <View style={styles.activityText}>
                  <Text style={styles.activityTitle} numberOfLines={1}>
                    {conversation.title}
                  </Text>
                  <Text style={styles.activityTime}>
                    {new Date(conversation.updatedAt).toLocaleDateString()}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#ccc" />
              </TouchableOpacity>
            </Card>
          ))}
          <Button
            mode="outlined"
            style={styles.viewAllButton}
            onPress={() => console.log('Navigate to all conversations')}
          >
            View All Conversations
          </Button>
        </View>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusChip: {
    paddingHorizontal: 12,
  },
  statusText: {
    color: 'white',
    fontWeight: '600',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: (width - 60) / 2,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16,
  },
  featureCard: {
    marginBottom: 12,
    elevation: 1,
  },
  featureContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
  },
  featureStatus: {
    marginLeft: 12,
  },
  featureStatusChip: {
    paddingHorizontal: 8,
  },
  featureStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activityCard: {
    marginBottom: 8,
    elevation: 1,
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityText: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
  },
  viewAllButton: {
    marginTop: 12,
  },
  bottomPadding: {
    height: 20,
  },
});

export default HomeScreen;