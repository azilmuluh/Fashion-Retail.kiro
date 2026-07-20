import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Customer, Message } from '@fashion-retail/shared';
import { colors, spacing, typography } from '@fashion-retail/design-system';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [newTag, setNewTag] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    fetchCustomer();
    fetchMessages();
    subscribeToMessages();
  }, [id]);

  const fetchCustomer = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setCustomer(data);
      setNotes(data.notes || '');
    } catch (error) {
      console.error('Error fetching customer:', error);
      Alert.alert('Error', 'Failed to load customer details');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const subscribeToMessages = () => {
    const subscription = supabase
      .channel(`messages-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `customer_id=eq.${id}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const saveNotes = async () => {
    if (!customer) return;

    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({ notes })
        .eq('id', customer.id);

      if (error) throw error;

      setEditingNotes(false);
      Alert.alert('Success', 'Notes saved successfully');
      fetchCustomer();
    } catch (error) {
      console.error('Error saving notes:', error);
      Alert.alert('Error', 'Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const addTag = async () => {
    if (!customer || !newTag.trim()) return;

    const currentTags = customer.tags || [];
    if (currentTags.includes(newTag.trim())) {
      Alert.alert('Error', 'Tag already exists');
      return;
    }

    try {
      const { error } = await supabase
        .from('customers')
        .update({ tags: [...currentTags, newTag.trim()] })
        .eq('id', customer.id);

      if (error) throw error;

      setNewTag('');
      fetchCustomer();
    } catch (error) {
      console.error('Error adding tag:', error);
      Alert.alert('Error', 'Failed to add tag');
    }
  };

  const removeTag = async (tagToRemove: string) => {
    if (!customer) return;

    const currentTags = customer.tags || [];
    const updatedTags = currentTags.filter((tag) => tag !== tagToRemove);

    try {
      const { error } = await supabase
        .from('customers')
        .update({ tags: updatedTags })
        .eq('id', customer.id);

      if (error) throw error;

      fetchCustomer();
    } catch (error) {
      console.error('Error removing tag:', error);
      Alert.alert('Error', 'Failed to remove tag');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} XAF`;
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageCard,
        item.direction === 'outbound' && styles.messageCardOutbound,
      ]}
    >
      <View style={styles.messageHeader}>
        <Text
          style={[
            styles.messageDirection,
            item.direction === 'outbound' && styles.messageDirectionOutbound,
          ]}
        >
          {item.direction === 'inbound' ? '← FROM CUSTOMER' : '→ TO CUSTOMER'}
        </Text>
        <Text style={styles.messageDate}>{formatDate(item.created_at)}</Text>
      </View>
      <Text style={styles.messageContent}>{item.content}</Text>
      <View style={styles.messageFooter}>
        <Text style={styles.messageType}>{item.message_type.toUpperCase()}</Text>
        <Text style={styles.messageStatus}>{item.status.toUpperCase()}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary.orange} />
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Customer not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Customer Info Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>CUSTOMER INFO</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name:</Text>
          <Text style={styles.infoValue}>{customer.name || 'Unknown'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone:</Text>
          <Text style={styles.infoValue}>{customer.phone}</Text>
        </View>
        {customer.whatsapp_number && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>WhatsApp:</Text>
            <Text style={styles.infoValue}>{customer.whatsapp_number}</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>First Contact:</Text>
          <Text style={styles.infoValue}>{formatDate(customer.created_at)}</Text>
        </View>
      </View>

      {/* Stats Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>STATISTICS</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>TOTAL ORDERS</Text>
            <Text style={styles.statValue}>{customer.total_orders || 0}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>TOTAL SPENT</Text>
            <Text style={styles.statValue}>
              {formatCurrency(customer.total_spent || 0)}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>LAST ORDER</Text>
            <Text style={styles.statValue}>
              {customer.last_order_date
                ? formatDate(customer.last_order_date)
                : 'Never'}
            </Text>
          </View>
        </View>
      </View>

      {/* Tags Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>TAGS</Text>
        <View style={styles.tagsContainer}>
          {customer.tags && customer.tags.length > 0 ? (
            customer.tags.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={styles.tag}
                onPress={() => removeTag(tag)}
              >
                <Text style={styles.tagText}>{tag}</Text>
                <Text style={styles.tagRemove}>×</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyTagsText}>No tags yet</Text>
          )}
        </View>
        <View style={styles.addTagContainer}>
          <TextInput
            style={styles.tagInput}
            placeholder="Add a tag..."
            placeholderTextColor={colors.neutral.gray}
            value={newTag}
            onChangeText={setNewTag}
            onSubmitEditing={addTag}
          />
          <TouchableOpacity
            style={styles.addTagButton}
            onPress={addTag}
            disabled={!newTag.trim()}
          >
            <Text style={styles.addTagButtonText}>ADD</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notes Card */}
      <View style={styles.card}>
        <View style={styles.notesHeader}>
          <Text style={styles.sectionTitle}>NOTES</Text>
          {!editingNotes ? (
            <TouchableOpacity onPress={() => setEditingNotes(true)}>
              <Text style={styles.editButton}>EDIT</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.notesActions}>
              <TouchableOpacity
                onPress={() => {
                  setEditingNotes(false);
                  setNotes(customer.notes || '');
                }}
              >
                <Text style={styles.cancelButton}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveNotes} disabled={savingNotes}>
                <Text style={styles.saveButton}>
                  {savingNotes ? 'SAVING...' : 'SAVE'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {editingNotes ? (
          <TextInput
            style={styles.notesInput}
            placeholder="Add notes about this customer..."
            placeholderTextColor={colors.neutral.gray}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        ) : (
          <Text style={[styles.notesText, !customer.notes && styles.notesTextItalic]}>
            {customer.notes || 'No notes yet. Tap EDIT to add notes.'}
          </Text>
        )}
      </View>

      {/* Message History */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          MESSAGE HISTORY ({messages.length})
        </Text>
        {messages.length > 0 ? (
          <FlatList
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.messagesList}
          />
        ) : (
          <Text style={styles.emptyMessagesText}>No messages yet</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.ivory,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral.ivory,
  },
  errorText: {
    fontSize: typography.sizes.lg,
    fontWeight: '800',
    color: colors.primary.black,
  },
  card: {
    backgroundColor: colors.neutral.white,
    borderWidth: 4,
    borderColor: colors.primary.black,
    margin: spacing.md,
    padding: spacing.md,
    shadowColor: colors.primary.black,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '800',
    color: colors.primary.black,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 3,
    borderBottomColor: colors.primary.black,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  infoLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.neutral.gray,
  },
  infoValue: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.primary.black,
  },
  statsGrid: {
    gap: spacing.sm,
  },
  statBox: {
    backgroundColor: colors.neutral.ivory,
    borderWidth: 3,
    borderColor: colors.primary.black,
    padding: spacing.md,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: '800',
    color: colors.neutral.gray,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.sizes.lg,
    fontWeight: '800',
    color: colors.primary.black,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tag: {
    backgroundColor: colors.primary.orange,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  tagText: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  tagRemove: {
    fontSize: typography.sizes.lg,
    fontWeight: '800',
    color: colors.neutral.white,
  },
  emptyTagsText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.neutral.gray,
    fontStyle: 'italic',
  },
  addTagContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tagInput: {
    flex: 1,
    backgroundColor: colors.neutral.ivory,
    borderWidth: 3,
    borderColor: colors.primary.black,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
  addTagButton: {
    backgroundColor: colors.primary.orange,
    borderWidth: 3,
    borderColor: colors.primary.black,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  addTagButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: '800',
    color: colors.neutral.white,
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 3,
    borderBottomColor: colors.primary.black,
  },
  notesActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  editButton: {
    fontSize: typography.sizes.sm,
    fontWeight: '800',
    color: colors.primary.orange,
  },
  cancelButton: {
    fontSize: typography.sizes.sm,
    fontWeight: '800',
    color: colors.neutral.gray,
  },
  saveButton: {
    fontSize: typography.sizes.sm,
    fontWeight: '800',
    color: colors.primary.orange,
  },
  notesInput: {
    backgroundColor: colors.neutral.ivory,
    borderWidth: 3,
    borderColor: colors.primary.black,
    padding: spacing.sm,
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    minHeight: 100,
  },
  notesText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.primary.black,
  },
  notesTextItalic: {
    fontStyle: 'italic',
  },
  messagesList: {
    gap: spacing.sm,
  },
  messageCard: {
    backgroundColor: colors.neutral.ivory,
    borderWidth: 3,
    borderColor: colors.primary.black,
    borderLeftWidth: 6,
    borderLeftColor: colors.primary.orange,
    padding: spacing.sm,
  },
  messageCardOutbound: {
    borderLeftColor: colors.primary.black,
    borderRightWidth: 6,
    borderRightColor: colors.primary.orange,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  messageDirection: {
    fontSize: typography.sizes.xs,
    fontWeight: '800',
    color: colors.primary.orange,
  },
  messageDirectionOutbound: {
    color: colors.primary.black,
  },
  messageDate: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    color: colors.neutral.gray,
  },
  messageContent: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.primary.black,
    marginBottom: spacing.xs,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  messageType: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.neutral.gray,
  },
  messageStatus: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.neutral.gray,
  },
  emptyMessagesText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.neutral.gray,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});
