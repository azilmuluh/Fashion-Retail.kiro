/**
 * WhatsApp Integration Dashboard
 * Shows message analytics, ghost shoppers, automated responses, conversation insights
 */

import { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { 
  MessageCircle, 
  Users, 
  Ghost, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertCircle,
  Zap,
} from 'lucide-react-native';
import { colors, spacing } from '@fashion-retail/design-system';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface WhatsAppAnalytics {
  totalMessages: number;
  messagesLast24h: number;
  messagesLast7Days: number;
  automationRate: number;
  avgResponseTime: number;
  ghostShoppers: number;
  conversions: number;
  conversionRate: number;
  topIntents: { intent: string; count: number }[];
  messagesByHour: { hour: number; count: number }[];
}

export default function WhatsAppDashboard() {
  const { retailer } = useAuth();
  const [analytics, setAnalytics] = useState<WhatsAppAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    loadAnalytics();
  }, [timeframe]);

  async function loadAnalytics() {
    if (!retailer?.id) return;

    try {
      const now = new Date();
      const timeframes = {
        '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
        '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      };

      const since = timeframes[timeframe];

      // Fetch messages
      const { data: messages, error: messagesError } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('retailer_id', retailer.id)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      // Fetch customer engagement metrics
      const { data: engagementMetrics, error: engagementError } = await supabase
        .from('customer_engagement_metrics')
        .select('*')
        .eq('retailer_id', retailer.id);

      if (engagementError) throw engagementError;

      // Calculate analytics
      const totalMessages = messages?.length || 0;
      
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const messagesLast24h = messages?.filter(m => 
        new Date(m.created_at) >= last24h
      ).length || 0;

      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const messagesLast7Days = messages?.filter(m =>
        new Date(m.created_at) >= last7d
      ).length || 0;

      // Calculate automation rate (messages with automated responses)
      const automatedMessages = messages?.filter(m =>
        m.direction === 'outbound' && m.metadata?.automated === true
      ).length || 0;
      const automationRate = totalMessages > 0 
        ? (automatedMessages / totalMessages) * 100 
        : 0;

      // Calculate average response time (in minutes)
      let totalResponseTime = 0;
      let responseCount = 0;
      
      const sortedMessages = messages?.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ) || [];

      for (let i = 1; i < sortedMessages.length; i++) {
        const current = sortedMessages[i];
        const previous = sortedMessages[i - 1];
        
        if (current.direction === 'outbound' && previous.direction === 'inbound') {
          const responseTime = (
            new Date(current.created_at).getTime() - 
            new Date(previous.created_at).getTime()
          ) / (1000 * 60); // Convert to minutes
          
          totalResponseTime += responseTime;
          responseCount++;
        }
      }

      const avgResponseTime = responseCount > 0 
        ? totalResponseTime / responseCount 
        : 0;

      // Ghost shoppers (high engagement score, low conversions)
      const ghostShoppers = engagementMetrics?.filter(m =>
        m.ghost_shopper_score >= 60
      ).length || 0;

      // Conversions (customers who made purchases)
      const conversions = engagementMetrics?.filter(m =>
        m.total_purchases > 0
      ).length || 0;

      const conversionRate = engagementMetrics && engagementMetrics.length > 0
        ? (conversions / engagementMetrics.length) * 100
        : 0;

      // Top intents
      const intentCounts: Record<string, number> = {};
      messages?.forEach(m => {
        if (m.intent) {
          intentCounts[m.intent] = (intentCounts[m.intent] || 0) + 1;
        }
      });

      const topIntents = Object.entries(intentCounts)
        .map(([intent, count]) => ({ intent, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Messages by hour
      const hourCounts: Record<number, number> = {};
      messages?.forEach(m => {
        const hour = new Date(m.created_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

      const messagesByHour = Object.entries(hourCounts)
        .map(([hour, count]) => ({ hour: parseInt(hour), count }))
        .sort((a, b) => a.hour - b.hour);

      setAnalytics({
        totalMessages,
        messagesLast24h,
        messagesLast7Days,
        automationRate,
        avgResponseTime,
        ghostShoppers,
        conversions,
        conversionRate,
        topIntents,
        messagesByHour,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleRefresh() {
    setRefreshing(true);
    loadAnalytics();
  }

  const formatTime = (minutes: number): string => {
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary.green} />
        <Text style={styles.loadingText}>Loading WhatsApp analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary.green}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <MessageCircle size={28} color={colors.primary.green} />
          <Text style={styles.headerTitle}>WhatsApp Business</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Message analytics and customer engagement insights
        </Text>
      </View>

      {/* Timeframe Selector */}
      <View style={styles.timeframeContainer}>
        {(['24h', '7d', '30d'] as const).map((tf) => (
          <TouchableOpacity
            key={tf}
            style={[
              styles.timeframeButton,
              timeframe === tf && styles.timeframeButtonActive,
            ]}
            onPress={() => setTimeframe(tf)}
          >
            <Text
              style={[
                styles.timeframeText,
                timeframe === tf && styles.timeframeTextActive,
              ]}
            >
              {tf === '24h' ? '24 Hours' : tf === '7d' ? '7 Days' : '30 Days'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Key Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overview</Text>
        
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, styles.primaryCard]}>
            <MessageCircle size={24} color={colors.primary.green} />
            <Text style={styles.metricValue}>{analytics?.totalMessages || 0}</Text>
            <Text style={styles.metricLabel}>Total Messages</Text>
          </View>

          <View style={styles.metricCard}>
            <Zap size={24} color={colors.accent.gold} />
            <Text style={styles.metricValue}>{analytics?.automationRate.toFixed(0)}%</Text>
            <Text style={styles.metricLabel}>Automation Rate</Text>
          </View>

          <View style={styles.metricCard}>
            <Clock size={24} color={colors.status.info} />
            <Text style={styles.metricValue}>
              {formatTime(analytics?.avgResponseTime || 0)}
            </Text>
            <Text style={styles.metricLabel}>Avg Response</Text>
          </View>

          <View style={styles.metricCard}>
            <TrendingUp size={24} color={colors.status.success} />
            <Text style={styles.metricValue}>{analytics?.conversionRate.toFixed(1)}%</Text>
            <Text style={styles.metricLabel}>Conversion Rate</Text>
          </View>
        </View>
      </View>

      {/* Customer Engagement */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Engagement</Text>
        
        <View style={styles.engagementCards}>
          <View style={[styles.engagementCard, styles.ghostCard]}>
            <View style={styles.engagementHeader}>
              <Ghost size={20} color={colors.status.warning} />
              <Text style={styles.engagementTitle}>Ghost Shoppers</Text>
            </View>
            <Text style={styles.engagementValue}>{analytics?.ghostShoppers || 0}</Text>
            <Text style={styles.engagementSubtext}>
              High engagement, no purchases
            </Text>
            <TouchableOpacity style={styles.engagementAction}>
              <Text style={styles.engagementActionText}>Re-engage →</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.engagementCard, styles.conversionCard]}>
            <View style={styles.engagementHeader}>
              <CheckCircle size={20} color={colors.status.success} />
              <Text style={styles.engagementTitle}>Conversions</Text>
            </View>
            <Text style={styles.engagementValue}>{analytics?.conversions || 0}</Text>
            <Text style={styles.engagementSubtext}>
              Customers who purchased
            </Text>
            <TouchableOpacity style={styles.engagementAction}>
              <Text style={styles.engagementActionText}>View Details →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Top Intents */}
      {analytics?.topIntents && analytics.topIntents.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Customer Intents</Text>
          
          <View style={styles.intentsList}>
            {analytics.topIntents.map((item, index) => (
              <View key={item.intent} style={styles.intentItem}>
                <View style={styles.intentRank}>
                  <Text style={styles.intentRankText}>#{index + 1}</Text>
                </View>
                <View style={styles.intentInfo}>
                  <Text style={styles.intentName}>
                    {item.intent.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Text>
                  <View style={styles.intentBar}>
                    <View
                      style={[
                        styles.intentBarFill,
                        {
                          width: `${(item.count / analytics.totalMessages) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
                <Text style={styles.intentCount}>{item.count}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Peak Hours */}
      {analytics?.messagesByHour && analytics.messagesByHour.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Peak Message Hours</Text>
          <Text style={styles.sectionSubtitle}>
            Best times to engage with customers
          </Text>
          
          <View style={styles.hoursChart}>
            {analytics.messagesByHour
              .sort((a, b) => b.count - a.count)
              .slice(0, 6)
              .map((item) => (
                <View key={item.hour} style={styles.hourItem}>
                  <Text style={styles.hourLabel}>
                    {item.hour === 0 ? '12 AM' : item.hour < 12 ? `${item.hour} AM` : item.hour === 12 ? '12 PM' : `${item.hour - 12} PM`}
                  </Text>
                  <View style={styles.hourBar}>
                    <View
                      style={[
                        styles.hourBarFill,
                        {
                          height: `${(item.count / Math.max(...analytics.messagesByHour.map(h => h.count))) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.hourCount}>{item.count}</Text>
                </View>
              ))}
          </View>
        </View>
      )}

      {/* Setup Instructions */}
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <AlertCircle size={20} color={colors.primary.green} />
          <Text style={styles.infoTitle}>WhatsApp Setup</Text>
        </View>
        <Text style={styles.infoText}>
          To enable WhatsApp integration:{'\n\n'}
          1. Configure your WhatsApp Business account{'\n'}
          2. Add webhook URL in WhatsApp settings{'\n'}
          3. Deploy Edge Functions to Supabase{'\n'}
          4. Test with a message{'\n\n'}
          See documentation for detailed instructions.
        </Text>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.cream,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.primary.cream,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  header: {
    backgroundColor: colors.neutral.white,
    padding: spacing.xl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  timeframeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 50,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.border.primary,
    alignItems: 'center',
  },
  timeframeButtonActive: {
    backgroundColor: colors.primary.green,
    borderColor: colors.primary.green,
  },
  timeframeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  timeframeTextActive: {
    color: colors.neutral.white,
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  primaryCard: {
    minWidth: '100%',
    backgroundColor: colors.accent.light,
    borderColor: colors.primary.green,
    borderWidth: 2,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text.primary,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    textAlign: 'center',
  },
  engagementCards: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  engagementCard: {
    flex: 1,
    backgroundColor: colors.neutral.white,
    borderWidth: 2,
    borderRadius: 16,
    padding: spacing.lg,
  },
  ghostCard: {
    borderColor: colors.status.warning,
    backgroundColor: '#FFF4E6',
  },
  conversionCard: {
    borderColor: colors.status.success,
    backgroundColor: '#E8F5E9',
  },
  engagementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  engagementTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  engagementValue: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  engagementSubtext: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  engagementAction: {
    paddingVertical: spacing.xs,
  },
  engagementActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary.green,
  },
  intentsList: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  intentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: 12,
    padding: spacing.md,
  },
  intentRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intentRankText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.neutral.white,
  },
  intentInfo: {
    flex: 1,
  },
  intentName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  intentBar: {
    height: 4,
    backgroundColor: colors.primary.cream,
    borderRadius: 2,
    overflow: 'hidden',
  },
  intentBarFill: {
    height: '100%',
    backgroundColor: colors.primary.green,
    borderRadius: 2,
  },
  intentCount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    minWidth: 40,
    textAlign: 'right',
  },
  hoursChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: 16,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  hourItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  hourLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.secondary,
    transform: [{ rotate: '-45deg' }],
    width: 40,
    textAlign: 'center',
  },
  hourBar: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.primary.cream,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  hourBarFill: {
    width: '100%',
    backgroundColor: colors.primary.green,
    borderRadius: 4,
    minHeight: 4,
  },
  hourCount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.primary,
  },
  infoCard: {
    margin: spacing.lg,
    backgroundColor: colors.accent.light,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary.green,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  infoText: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});
