/**
 * AI Chat Assistant Component
 * Floating chat widget for dashboard help and insights
 */

import { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Text,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { MessageCircle, X, Send, Sparkles, TrendingUp } from 'lucide-react-native';
import { colors, spacing } from '@fashion-retail/design-system';
import { supabase } from '../lib/supabase';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatAssistantProps {
  visible?: boolean;
  onClose?: () => void;
}

export default function AIChatAssistant({ visible = true, onClose }: AIChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! 👋 I'm your AI assistant. I can help you understand the platform, analyze your business metrics, or answer any questions. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isOpen ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [isOpen]);

  async function sendMessage() {
    if (!inputText.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      // Get conversation history (last 6 messages for context)
      const conversationHistory = messages.slice(-6).map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/ai-chat-assistant`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: inputText,
            conversationHistory,
            includeBusinessContext: true, // Always include business data for better insights
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const result = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: result.message,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        role: 'assistant',
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  const quickActions = [
    { icon: '📊', label: 'Analyze my sales', query: 'Analyze my sales performance and give me insights' },
    { icon: '📦', label: 'Inventory tips', query: 'What should I do about my low stock items?' },
    { icon: '💬', label: 'WhatsApp help', query: 'How does the WhatsApp integration work?' },
    { icon: '✨', label: 'AI features', query: 'What AI features are available on this platform?' },
  ];

  function handleQuickAction(query: string) {
    setInputText(query);
  }

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Chat Widget Button */}
      {!isOpen && (
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() => setIsOpen(true)}
          activeOpacity={0.8}
        >
          <View style={styles.fabContent}>
            <Sparkles size={24} color={colors.neutral.white} />
            <View style={styles.fabBadge}>
              <Text style={styles.fabBadgeText}>AI</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Animated.View
          style={[
            styles.chatWindow,
            {
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [500, 0],
                  }),
                },
              ],
              opacity: slideAnim,
            },
          ]}
        >
          <KeyboardAvoidingView
            style={styles.chatContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.avatarContainer}>
                  <Sparkles size={20} color={colors.neutral.white} />
                </View>
                <View>
                  <Text style={styles.headerTitle}>AI Assistant</Text>
                  <Text style={styles.headerSubtitle}>Always here to help</Text>
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setIsOpen(false);
                  onClose?.();
                }}
              >
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.map((msg, index) => (
                <View
                  key={index}
                  style={[
                    styles.messageBubble,
                    msg.role === 'user' ? styles.userMessage : styles.assistantMessage,
                  ]}
                >
                  {msg.role === 'assistant' && (
                    <View style={styles.assistantAvatar}>
                      <Sparkles size={12} color={colors.primary.green} />
                    </View>
                  )}
                  
                  <View style={styles.messageContent}>
                    <Text
                      style={[
                        styles.messageText,
                        msg.role === 'user' && styles.userMessageText,
                      ]}
                    >
                      {msg.content}
                    </Text>
                    <Text style={styles.messageTime}>
                      {msg.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </Text>
                  </View>
                </View>
              ))}

              {loading && (
                <View style={[styles.messageBubble, styles.assistantMessage]}>
                  <View style={styles.assistantAvatar}>
                    <Sparkles size={12} color={colors.primary.green} />
                  </View>
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary.green} />
                    <Text style={styles.loadingText}>Thinking...</Text>
                  </View>
                </View>
              )}

              {/* Quick Actions */}
              {messages.length <= 1 && !loading && (
                <View style={styles.quickActionsContainer}>
                  <Text style={styles.quickActionsTitle}>Quick Actions:</Text>
                  <View style={styles.quickActions}>
                    {quickActions.map((action, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.quickActionButton}
                        onPress={() => handleQuickAction(action.query)}
                      >
                        <Text style={styles.quickActionEmoji}>{action.icon}</Text>
                        <Text style={styles.quickActionText}>{action.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Ask me anything..."
                  placeholderTextColor={colors.text.secondary}
                  multiline
                  maxLength={500}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!inputText.trim() || loading) && styles.sendButtonDisabled,
                  ]}
                  onPress={sendMessage}
                  disabled={!inputText.trim() || loading}
                >
                  <Send size={20} color={colors.neutral.white} />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? spacing.xl : spacing.lg,
    right: Platform.OS === 'web' ? spacing.xl : spacing.lg,
    zIndex: 9999,
  },
  fabButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary.green,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(46, 204, 113, 0.4)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  fabContent: {
    position: 'relative',
  },
  fabBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.accent.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary.green,
  },
  fabBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.neutral.white,
  },
  chatWindow: {
    width: Platform.OS === 'web' ? 400 : 340,
    height: Platform.OS === 'web' ? 600 : 500,
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
  chatContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.primary.green,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: colors.primary.cream,
  },
  messagesContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  messageBubble: {
    flexDirection: 'row',
    gap: spacing.xs,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
  },
  assistantAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  messageContent: {
    flex: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.primary,
    backgroundColor: colors.neutral.white,
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  userMessageText: {
    backgroundColor: colors.primary.green,
    color: colors.neutral.white,
    borderColor: colors.primary.green,
  },
  messageTime: {
    fontSize: 10,
    color: colors.text.secondary,
    marginTop: 4,
    marginLeft: spacing.xs,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.neutral.white,
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  loadingText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  quickActionsContainer: {
    marginTop: spacing.md,
  },
  quickActionsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.neutral.white,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  quickActionEmoji: {
    fontSize: 14,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
  },
  inputContainer: {
    padding: spacing.md,
    backgroundColor: colors.neutral.white,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: colors.primary.cream,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text.primary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
