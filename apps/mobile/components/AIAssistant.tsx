/**
 * AI Assistant Modal Component
 * Helps retailers perform tasks quickly through voice or text commands
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MessageCircle, X, Send, Mic, Sparkles, Loader } from 'lucide-react-native';
import { colors, spacing } from '@fashion-retail/design-system';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface AIAssistantProps {
  visible: boolean;
  onClose: () => void;
}

export default function AIAssistant({ visible, onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm your AI assistant. I can help you with:\n\n• Adding products quickly\n• Checking inventory status\n• Finding customer information\n• Creating orders\n• Viewing analytics\n\nWhat would you like to do?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsProcessing(true);

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Simulate AI processing (replace with actual AI API call)
    setTimeout(() => {
      const aiResponse = generateAIResponse(userMessage.text);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsProcessing(false);

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 1500);
  };

  const generateAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();

    // Simple keyword-based responses (replace with actual AI)
    if (input.includes('product') || input.includes('add')) {
      return "I can help you add a product! Please provide:\n\n1. Product name\n2. Price\n3. Stock quantity\n4. Category\n\nOr say 'start adding product' to begin the guided flow.";
    }

    if (input.includes('inventory') || input.includes('stock')) {
      return "Let me check your inventory status...\n\nYou have:\n• 45 products in stock\n• 8 products low on stock\n• 3 products out of stock\n\nWould you like to see details about any category?";
    }

    if (input.includes('customer')) {
      return "I can help you find customer information. Would you like to:\n\n• Search by name\n• Search by phone number\n• View recent customers\n• Check customer loyalty points";
    }

    if (input.includes('order')) {
      return "I can help with orders! You can:\n\n• Create a new order\n• Check order status\n• View pending orders\n• Update order status\n\nWhat would you like to do?";
    }

    if (input.includes('analytics') || input.includes('sales')) {
      return "Here's a quick overview:\n\n📊 Today's Sales: 125,000 XAF\n📦 Orders: 12 completed, 5 pending\n👥 New Customers: 3\n⭐ Top Product: Summer Dress\n\nWould you like detailed analytics?";
    }

    return "I understand you're asking about: " + userInput + "\n\nI'm still learning! Here are some things I can help with:\n\n• Adding products\n• Checking inventory\n• Managing orders\n• Customer lookup\n• Sales analytics\n\nCould you rephrase your request?";
  };

  const handleVoiceInput = () => {
    // Placeholder for voice input functionality
    setIsListening(!isListening);
    
    // Simulate voice recognition
    if (!isListening) {
      setTimeout(() => {
        setIsListening(false);
        setInputText("Show me today's sales");
      }, 2000);
    }
  };

  const suggestedActions = [
    "Add a product",
    "Check inventory",
    "View pending orders",
    "Show analytics",
  ];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <Animated.View
            style={[
              styles.container,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Sparkles size={24} color={colors.primary.green} />
                <Text style={styles.headerTitle}>AI Assistant</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.messageBubble,
                    message.isUser ? styles.userBubble : styles.aiBubble,
                  ]}
                >
                  {!message.isUser && (
                    <View style={styles.aiIcon}>
                      <Sparkles size={16} color={colors.primary.green} />
                    </View>
                  )}
                  <View style={styles.messageContent}>
                    <Text
                      style={[
                        styles.messageText,
                        message.isUser ? styles.userText : styles.aiText,
                      ]}
                    >
                      {message.text}
                    </Text>
                    <Text style={styles.timestamp}>
                      {message.timestamp.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
              ))}

              {isProcessing && (
                <View style={[styles.messageBubble, styles.aiBubble]}>
                  <View style={styles.aiIcon}>
                    <Sparkles size={16} color={colors.primary.green} />
                  </View>
                  <View style={styles.messageContent}>
                    <View style={styles.typingIndicator}>
                      <Loader size={16} color={colors.text.secondary} />
                      <Text style={styles.typingText}>Thinking...</Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Suggested Actions */}
            {messages.length === 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.suggestionsContainer}
                contentContainerStyle={styles.suggestionsContent}
              >
                {suggestedActions.map((action, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionChip}
                    onPress={() => setInputText(action)}
                  >
                    <Text style={styles.suggestionText}>{action}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Input Area */}
            <View style={styles.inputContainer}>
              <TouchableOpacity
                style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
                onPress={handleVoiceInput}
              >
                <Mic
                  size={20}
                  color={isListening ? colors.neutral.white : colors.primary.green}
                />
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder="Ask me anything..."
                placeholderTextColor={colors.text.secondary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                onSubmitEditing={handleSend}
              />

              <TouchableOpacity
                style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={!inputText.trim() || isProcessing}
              >
                <Send
                  size={20}
                  color={inputText.trim() ? colors.neutral.white : colors.text.secondary}
                />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  keyboardView: {
    width: '100%',
    maxWidth: 500,
  },
  container: {
    backgroundColor: colors.neutral.white,
    borderRadius: 24,
    maxHeight: '80%',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  messagesContainer: {
    maxHeight: 400,
  },
  messagesContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  messageBubble: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  userBubble: {
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
  },
  aiBubble: {
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
  },
  aiIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContent: {
    maxWidth: '75%',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    backgroundColor: colors.primary.green,
    color: colors.neutral.white,
    padding: spacing.md,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    fontWeight: '500',
  },
  aiText: {
    backgroundColor: colors.primary.cream,
    color: colors.text.primary,
    padding: spacing.md,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  typingIndicator: {
    backgroundColor: colors.primary.cream,
    padding: spacing.md,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typingText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  suggestionsContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
    paddingVertical: spacing.md,
  },
  suggestionsContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  suggestionChip: {
    backgroundColor: colors.accent.light,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.primary.green,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary.green,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceButtonActive: {
    backgroundColor: colors.primary.green,
  },
  input: {
    flex: 1,
    backgroundColor: colors.primary.cream,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.border.primary,
  },
});
