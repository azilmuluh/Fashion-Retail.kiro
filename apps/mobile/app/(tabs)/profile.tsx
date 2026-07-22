import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { 
  User, 
  Mail, 
  Phone, 
  MessageCircle, 
  Gift, 
  Save, 
  LogOut,
  Zap,
  Star,
  Award,
} from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors, spacing } from '@fashion-retail/design-system';

export default function ProfileScreen() {
  const { retailer, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loyaltyProgram, setLoyaltyProgram] = useState<any>(null);
  const [isActive, setIsActive] = useState(false);
  const [programName, setProgramName] = useState('');
  const [pointsPerPurchase, setPointsPerPurchase] = useState('0.1');
  const [minimumPurchase, setMinimumPurchase] = useState('0');
  const [minimumRedemption, setMinimumRedemption] = useState('100');

  useEffect(() => {
    fetchLoyaltyProgram();
  }, []);

  const fetchLoyaltyProgram = async () => {
    try {
      const { data, error } = await supabase
        .from('loyalty_programs')
        .select('*')
        .eq('retailer_id', retailer?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setLoyaltyProgram(data);
        setIsActive(data.is_active);
        setProgramName(data.name || '');
        
        const rules = data.rules || {};
        const earnRules = rules.earn_rules || {};
        const redemptionRules = rules.redemption_rules || {};
        
        setPointsPerPurchase(String(earnRules.points_per_purchase || 0.1));
        setMinimumPurchase(String(earnRules.minimum_purchase_amount || 0));
        setMinimumRedemption(String(redemptionRules.minimum_points_to_redeem || 100));
      }
    } catch (error) {
      console.error('Error fetching loyalty program:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveLoyaltyProgram = async () => {
    setSaving(true);
    try {
      const rules = {
        earn_rules: {
          points_per_purchase: parseFloat(pointsPerPurchase) || 0.1,
          minimum_purchase_amount: parseInt(minimumPurchase) || 0,
        },
        redemption_rules: {
          minimum_points_to_redeem: parseInt(minimumRedemption) || 100,
        },
      };

      if (loyaltyProgram) {
        // Update existing
        const { error } = await supabase
          .from('loyalty_programs')
          .update({
            name: programName || 'Rewards Program',
            is_active: isActive,
            rules,
          })
          .eq('id', loyaltyProgram.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase.from('loyalty_programs').insert({
          retailer_id: retailer?.id,
          name: programName || 'Rewards Program',
          is_active: isActive,
          rules,
        });

        if (error) throw error;
      }

      Alert.alert('Success', 'Loyalty program settings saved!');
      fetchLoyaltyProgram();
    } catch (error) {
      console.error('Error saving loyalty program:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary.green} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const fadeAnim = new Animated.Value(0);
  Animated.timing(fadeAnim, {
    toValue: 1,
    duration: 400,
    useNativeDriver: true,
  }).start();

  return (
    <ScrollView style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Profile Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <User size={20} color={colors.primary.green} />
            <Text style={styles.sectionTitle}>Profile</Text>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoLabelRow}>
              <User size={16} color={colors.text.secondary} />
              <Text style={styles.infoLabel}>Business Name</Text>
            </View>
            <Text style={styles.infoValue}>{retailer?.business_name}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoLabelRow}>
              <Mail size={16} color={colors.text.secondary} />
              <Text style={styles.infoLabel}>Email</Text>
            </View>
            <Text style={styles.infoValue}>{retailer?.email}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoLabelRow}>
              <Phone size={16} color={colors.text.secondary} />
              <Text style={styles.infoLabel}>Phone</Text>
            </View>
            <Text style={styles.infoValue}>{retailer?.phone_number}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoLabelRow}>
              <MessageCircle size={16} color={colors.text.secondary} />
              <Text style={styles.infoLabel}>WhatsApp</Text>
            </View>
            <Text style={styles.infoValue}>{retailer?.whatsapp_number}</Text>
          </View>
        </View>

        {/* Loyalty Program Settings */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Gift size={20} color={colors.primary.green} />
            <Text style={styles.sectionTitle}>Loyalty Program</Text>
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Active</Text>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: colors.border.primary, true: colors.primary.green }}
                thumbColor={colors.neutral.white}
                ios_backgroundColor={colors.border.primary}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Program Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. VIP Rewards"
              placeholderTextColor={colors.text.secondary}
              value={programName}
              onChangeText={setProgramName}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Points Per 1 XAF Spent</Text>
            <TextInput
              style={styles.input}
              placeholder="0.1"
              placeholderTextColor={colors.text.secondary}
              value={pointsPerPurchase}
              onChangeText={setPointsPerPurchase}
              keyboardType="decimal-pad"
            />
            <Text style={styles.helpText}>
              Example: 0.1 means customer earns 10 points per 100 XAF spent
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Minimum Purchase Amount (XAF)</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.text.secondary}
              value={minimumPurchase}
              onChangeText={setMinimumPurchase}
              keyboardType="number-pad"
            />
            <Text style={styles.helpText}>Minimum order amount to earn points</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Minimum Points to Redeem</Text>
            <TextInput
              style={styles.input}
              placeholder="100"
              placeholderTextColor={colors.text.secondary}
              value={minimumRedemption}
              onChangeText={setMinimumRedemption}
              keyboardType="number-pad"
            />
            <Text style={styles.helpText}>Minimum points required for redemption</Text>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={saveLoyaltyProgram}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Save size={20} color={colors.neutral.white} />
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Redemption Guide */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Zap size={20} color={colors.primary.green} />
            <Text style={styles.sectionTitle}>Redemption Guide</Text>
          </View>
          
          <Text style={styles.helpText}>
            Current redemption rates (shown to customers):
          </Text>
          
          <View style={styles.redemptionList}>
            <View style={styles.redemptionItem}>
              <Star size={14} color={colors.primary.green} />
              <Text style={styles.redemptionItemText}>100 points = 1,000 XAF discount</Text>
            </View>
            <View style={styles.redemptionItem}>
              <Star size={14} color={colors.primary.green} />
              <Text style={styles.redemptionItemText}>200 points = 2,500 XAF discount</Text>
            </View>
            <View style={styles.redemptionItem}>
              <Star size={14} color={colors.primary.green} />
              <Text style={styles.redemptionItemText}>500 points = 7,500 XAF discount</Text>
            </View>
            <View style={styles.redemptionItem}>
              <Award size={14} color={colors.primary.green} />
              <Text style={styles.redemptionItemText}>1000 points = 20,000 XAF discount</Text>
            </View>
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity 
          style={styles.signOutButton} 
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <LogOut size={20} color={colors.neutral.white} />
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </Animated.View>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary.cream,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  card: {
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: 16,
    margin: spacing.lg,
    padding: spacing.lg,
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary.cream,
  },
  infoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
    textAlign: 'right',
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.primary.cream,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  helpText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.secondary,
    marginTop: spacing.xs,
    lineHeight: 16,
  },
  saveButton: {
    backgroundColor: colors.primary.green,
    borderRadius: 50,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    shadowColor: 'rgba(46, 204, 113, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  redemptionList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  redemptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.light,
    padding: spacing.sm,
    borderRadius: 8,
  },
  redemptionItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  signOutButton: {
    backgroundColor: colors.status.error,
    borderRadius: 50,
    margin: spacing.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    shadowColor: 'rgba(231, 76, 60, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  signOutButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral.white,
  },
});
