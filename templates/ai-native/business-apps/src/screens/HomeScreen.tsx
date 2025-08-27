import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import {
  Text,
  Card,
  FAB,
  Appbar,
  useTheme,
  Surface,
  ProgressBar,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';

import { RootState } from '../store/store';
import { logout } from '../store/slices/authSlice';

interface HomeScreenProps {
  navigation: any;
}

const { width } = Dimensions.get('window');

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState({
    totalSales: 125430,
    activeUsers: 2847,
    completedTasks: 89,
    pendingTasks: 23,
  });

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setMetrics(prev => ({
      ...prev,
      totalSales: prev.totalSales + Math.floor(Math.random() * 1000),
      activeUsers: prev.activeUsers + Math.floor(Math.random() * 50),
    }));
    setRefreshing(false);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigation.replace('Login');
  };

  const MetricCard = ({ title, value, subtitle, color }: any) => (
    <Card style={[styles.metricCard, { width: (width - 60) / 2 }]}>
      <Card.Content style={styles.metricContent}>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {title}
        </Text>
        <Text variant="headlineSmall" style={{ color: color || theme.colors.primary }}>
          {value}
        </Text>
        {subtitle && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {subtitle}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  const TaskCard = ({ title, description, status, priority }: any) => (
    <Card style={styles.taskCard}>
      <Card.Content>
        <View style={styles.taskHeader}>
          <Text variant="titleMedium">{title}</Text>
          <Chip 
            mode="outlined" 
            compact
            style={[
              styles.statusChip,
              { backgroundColor: status === 'completed' ? theme.colors.primaryContainer : theme.colors.secondaryContainer }
            ]}
          >
            {status}
          </Chip>
        </View>
        <Text variant="bodyMedium" style={styles.taskDescription}>
          {description}
        </Text>
        <View style={styles.taskFooter}>
          <Chip size={16} compact>
            {priority} Priority
          </Chip>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.Content title={`Welcome, ${user?.name}`} />
        <Appbar.Action icon="account" onPress={() => navigation.navigate('Profile')} />
        <Appbar.Action icon="cog" onPress={() => navigation.navigate('Settings')} />
        <Appbar.Action icon="logout" onPress={handleLogout} />
      </Appbar.Header>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Surface style={styles.welcomeCard} elevation={2}>
          <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
            Dashboard Overview
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Monitor your business metrics and tasks
          </Text>
        </Surface>

        {/* Metrics Section */}
        <View style={styles.section}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Key Metrics
          </Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Total Sales"
              value={`$${metrics.totalSales.toLocaleString()}`}
              subtitle="+12% from last month"
              color={theme.colors.primary}
            />
            <MetricCard
              title="Active Users"
              value={metrics.activeUsers.toLocaleString()}
              subtitle="+5% this week"
              color={theme.colors.secondary}
            />
            <MetricCard
              title="Completed"
              value={metrics.completedTasks}
              subtitle="Tasks this month"
              color={theme.colors.tertiary}
            />
            <MetricCard
              title="Pending"
              value={metrics.pendingTasks}
              subtitle="Tasks remaining"
              color={theme.colors.error}
            />
          </View>
        </View>

        {/* Progress Section */}
        <View style={styles.section}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Monthly Progress
          </Text>
          <Card style={styles.progressCard}>
            <Card.Content>
              <Text variant="bodyMedium">Sales Target Progress</Text>
              <ProgressBar 
                progress={0.75} 
                style={styles.progressBar}
                color={theme.colors.primary}
              />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                75% of $200,000 target achieved
              </Text>
            </Card.Content>
          </Card>
        </View>

        {/* Recent Tasks */}
        <View style={styles.section}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Recent Tasks
          </Text>
          <TaskCard
            title="Review Q4 Reports"
            description="Analyze quarterly performance metrics and prepare summary"
            status="pending"
            priority="High"
          />
          <TaskCard
            title="Client Meeting Follow-up"
            description="Send follow-up emails and schedule next meetings"
            status="completed"
            priority="Medium"
          />
          <TaskCard
            title="Update Security Policies"
            description="Review and update company security guidelines"
            status="pending"
            priority="High"
          />
        </View>
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => {
          // Handle new task creation
          console.log('Create new task');
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  welcomeCard: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    marginBottom: 12,
  },
  metricContent: {
    alignItems: 'center',
  },
  progressCard: {
    padding: 4,
  },
  progressBar: {
    marginVertical: 8,
  },
  taskCard: {
    marginBottom: 8,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskDescription: {
    marginBottom: 12,
    opacity: 0.8,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  statusChip: {
    height: 28,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default HomeScreen;