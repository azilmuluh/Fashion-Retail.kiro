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
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography } from '@fashion-retail/design-system';

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
        <ActivityIndicator size="large" color={colors.primary.orange} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile Info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>PROFILE</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Business Name:</Text>
          <Text style={styles.infoValue}>{retailer?.business_name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>{retailer?.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone:</Text>
          <Text style={styles.infoValue}>{retailer?.phone_number}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>WhatsApp:</Text>
          <Text style={styles.infoValue}>{retailer?.whatsapp_number}</Text>
        </View>
      </View>

      {/* Loyalty Program Settings */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🎁 LOYALTY PROGRAM</Text>
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Active</Text>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: colors.neutral.gray, true: colors.primary.orange }}
              thumbColor={colors.neutral.white}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Program Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. VIP Rewards"
            placeholderTextColor={colors.neutral.gray}
            value={programName}
            onChangeText={setProgramName}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Points Per 1 XAF Spent</Text>
          <TextInput
            style={styles.input}
            placeholder="0.1"
            placeholderTextColor={colors.neutral.gray}
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
            placeholderTextColor={colors.neutral.gray}
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
            placeholderTextColor={colors.neutral.gray}
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
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'SAVING...' : 'SAVE SETTINGS'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Redemption Guide */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>💎 REDEMPTION GUIDE</Text>
        <Text style={styles.helpText}>
          Current redemption rates (shown to customers):
        </Text>
        <View style={styles.redemptionList}>
          <Text style={styles.redemptionItem}>• 100 points = 1,000 XAF discount</Text>
          <Text style={styles.redemptionItem}>• 200 points = 2,500 XAF discount</Text>
          <Text style={styles.redemptionItem}>• 500 points = 7,500 XAF discount</Text>
          <Text style={styles.redemptionItem}>• 1000 points = 20,000 XAF discount</Text>
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>SIGN OUT</Text>
      </TouchableOpacity>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 3,
    borderBottomColor: colors.primary.black,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '800',
    color: colors.primary.black,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  switchLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.primary.black,
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
    flex: 1,
    textAlign: 'right',
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  formLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '800',
    color: colors.primary.black,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.neutral.ivory,
    borderWidth: 3,
    borderColor: colors.primary.black,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.primary.black,
  },
  helpText: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    color: colors.neutral.gray,
    marginTop: spacing.xs,
  },
  saveButton: {
    backgroundColor: colors.primary.orange,
    borderWidth: 3,
    borderColor: colors.primary.black,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: '800',
    color: colors.neutral.white,
  },
  redemptionList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  redemptionItem: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.primary.black,
  },
  signOutButton: {
    backgroundColor: '#F44336',
    borderWidth: 3,
    borderColor: colors.primary.black,
    margin: spacing.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  signOutButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: '800',
    color: colors.neutral.white,
  },
});
