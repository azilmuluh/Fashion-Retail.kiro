/**
 * Component Showcase
 * Demo page displaying all design system components with Neo-Brutalist styling
 */

import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { 
  Button, 
  Card, 
  Input, 
  Badge, 
  Typography, 
  CodeBlock, 
  GradientButton,
  Heading1,
  Heading2,
  Heading3,
  BodyText,
  Caption,
  Label,
} from '../components';
import { colors, spacing } from '../tokens';

export const ComponentShowcase: React.FC = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        
        {/* Header */}
        <View style={styles.section}>
          <Heading1>DESIGN SYSTEM</Heading1>
          <BodyText style={styles.subtitle}>
            Neo-Brutalist, Retro-Futuristic Components
          </BodyText>
        </View>

        {/* Color Palette Section */}
        <Card variant="brutal" style={styles.section}>
          <Heading2 style={styles.sectionTitle}>COLOR PALETTE</Heading2>
          <BodyText style={styles.sectionDescription}>
            60/30/10 Rule: 60% Ivory, 30% Black, 10% Safety Orange
          </BodyText>
          
          <View style={styles.colorGrid}>
            <View style={styles.colorItem}>
              <View style={[styles.colorBox, { backgroundColor: colors.neutral.ivory }]} />
              <Caption>CREAM (60%)</Caption>
              <Caption>{colors.neutral.ivory}</Caption>
            </View>
            
            <View style={styles.colorItem}>
              <View style={[styles.colorBox, { backgroundColor: colors.black }]} />
              <Caption>BLACK (30%)</Caption>
              <Caption>{colors.black}</Caption>
            </View>
            
            <View style={styles.colorItem}>
              <View style={[styles.colorBox, { backgroundColor: colors.primary.green }]} />
              <Caption>GREEN (10%)</Caption>
              <Caption>{colors.primary.green}</Caption>
            </View>
          </View>
        </Card>

        {/* Typography Section */}
        <Card variant="default" style={styles.section}>
          <Heading2 style={styles.sectionTitle}>TYPOGRAPHY</Heading2>
          
          <View style={styles.typographySection}>
            <Heading1>DISPLAY LARGE</Heading1>
            <Heading2>DISPLAY MEDIUM</Heading2>
            <Heading3>DISPLAY SMALL</Heading3>
            <BodyText style={styles.spacedText}>
              Body text uses geometric sans-serif for readability. 
              Clean, modern, and professional appearance.
            </BodyText>
            <Label style={styles.spacedText}>LABEL TEXT (UPPERCASE)</Label>
            <Caption>Caption text for small details and metadata</Caption>
          </View>
        </Card>

        {/* Buttons Section */}
        <Card variant="default" style={styles.section}>
          <Heading2 style={styles.sectionTitle}>BUTTONS</Heading2>
          
          <View style={styles.buttonGrid}>
            <Button variant="primary" size="large">
              PRIMARY LARGE
            </Button>
            
            <Button variant="primary" size="medium">
              PRIMARY
            </Button>
            
            <Button variant="primary" size="small">
              SMALL
            </Button>
            
            <Button variant="secondary">
              SECONDARY
            </Button>
            
            <Button variant="outline">
              OUTLINE
            </Button>
            
            <Button variant="ghost">
              GHOST
            </Button>
            
            <GradientButton size="large">
              GRADIENT CTA
            </GradientButton>
            
            <Button variant="primary" disabled>
              DISABLED
            </Button>
            
            <Button variant="primary" loading>
              LOADING
            </Button>
          </View>
        </Card>

        {/* Badges Section */}
        <Card variant="default" style={styles.section}>
          <Heading2 style={styles.sectionTitle}>BADGES</Heading2>
          
          <View style={styles.badgeGrid}>
            <Badge variant="default">DEFAULT</Badge>
            <Badge variant="accent">ACCENT</Badge>
            <Badge variant="success">SUCCESS</Badge>
            <Badge variant="warning">WARNING</Badge>
            <Badge variant="error">ERROR</Badge>
            <Badge variant="info">INFO</Badge>
          </View>
          
          <View style={styles.badgeGrid}>
            <Badge variant="accent" size="small">SMALL</Badge>
            <Badge variant="accent" size="medium">MEDIUM</Badge>
            <Badge variant="accent" size="large">LARGE</Badge>
          </View>
        </Card>

        {/* Cards Section */}
        <Card variant="default" style={styles.section}>
          <Heading2 style={styles.sectionTitle}>CARDS</Heading2>
          
          <Card variant="default" style={styles.exampleCard}>
            <Heading3>DEFAULT CARD</Heading3>
            <BodyText>Standard card with black border and rounded corners</BodyText>
          </Card>
          
          <Card variant="elevated" style={styles.exampleCard}>
            <Heading3>ELEVATED CARD</Heading3>
            <BodyText>Card with subtle shadow for depth</BodyText>
          </Card>
          
          <Card variant="brutal" style={styles.exampleCard}>
            <Heading3>BRUTAL CARD</Heading3>
            <BodyText>Neo-Brutalist card with hard shadow offset</BodyText>
          </Card>
        </Card>

        {/* Inputs Section */}
        <Card variant="default" style={styles.section}>
          <Heading2 style={styles.sectionTitle}>INPUTS</Heading2>
          
          <Input
            label="PRODUCT NAME"
            placeholder="Enter product name"
            helperText="This will be visible to customers"
          />
          
          <Input
            label="EMAIL ADDRESS"
            placeholder="email@example.com"
            keyboardType="email-address"
          />
          
          <Input
            label="PRICE"
            placeholder="0.00"
            keyboardType="numeric"
            error="Price must be greater than 0"
          />
        </Card>

        {/* Code Block Section */}
        <Card variant="default" style={styles.section}>
          <Heading2 style={styles.sectionTitle}>CODE BLOCKS</Heading2>
          
          <CodeBlock language="typescript">
{`import { Button, Card } from '@fashion-retail/design-system';

function ProductCard() {
  return (
    <Card variant="brutal">
      <Button variant="primary">
        ADD TO CART
      </Button>
    </Card>
  );
}`}
          </CodeBlock>
        </Card>

        {/* Layout Example */}
        <Card variant="brutal" style={styles.section}>
          <Heading2 style={styles.sectionTitle}>LAYOUT EXAMPLE</Heading2>
          
          <View style={styles.layoutExample}>
            <View style={styles.layoutHeader}>
              <Heading3>PRODUCT INVENTORY</Heading3>
              <Badge variant="accent">24 ITEMS</Badge>
            </View>
            
            <View style={styles.statsGrid}>
              <Card variant="default" padding={4}>
                <Label>TOTAL STOCK</Label>
                <Typography variant="displaySmall">1,234</Typography>
              </Card>
              
              <Card variant="default" padding={4}>
                <Label>LOW STOCK</Label>
                <Typography variant="displaySmall" color={colors.status.warning}>
                  12
                </Typography>
              </Card>
              
              <Card variant="default" padding={4}>
                <Label>OUT OF STOCK</Label>
                <Typography variant="displaySmall" color={colors.status.error}>
                  3
                </Typography>
              </Card>
            </View>
            
            <GradientButton fullWidth size="large">
              ADD NEW PRODUCT
            </GradientButton>
          </View>
        </Card>

        {/* Design Principles */}
        <Card variant="default" style={styles.section}>
          <Heading2 style={styles.sectionTitle}>DESIGN PRINCIPLES</Heading2>
          
          <View style={styles.principlesList}>
            <View style={styles.principleItem}>
              <Badge variant="accent">1</Badge>
              <View style={styles.principleText}>
                <Label>60/30/10 COLOR RULE</Label>
                <Caption>Maintain color distribution for visual balance</Caption>
              </View>
            </View>
            
            <View style={styles.principleItem}>
              <Badge variant="accent">2</Badge>
              <View style={styles.principleText}>
                <Label>STRONG BORDERS</Label>
                <Caption>Black borders define structure and hierarchy</Caption>
              </View>
            </View>
            
            <View style={styles.principleItem}>
              <Badge variant="accent">3</Badge>
              <View style={styles.principleText}>
                <Label>ALL-CAPS HEADERS</Label>
                <Caption>Display font with extra-wide spacing for impact</Caption>
              </View>
            </View>
            
            <View style={styles.principleItem}>
              <Badge variant="accent">4</Badge>
              <View style={styles.principleText}>
                <Label>MINIMAL SHADOWS</Label>
                <Caption>Rely on borders for depth, not shadows</Caption>
              </View>
            </View>
          </View>
        </Card>

      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.cream,
  },
  content: {
    padding: spacing[6],
  },
  section: {
    marginBottom: spacing[8],
  },
  subtitle: {
    marginTop: spacing[2],
    color: colors.text.secondary,
  },
  sectionTitle: {
    marginBottom: spacing[4],
  },
  sectionDescription: {
    marginBottom: spacing[4],
    color: colors.text.secondary,
  },
  
  // Color Palette
  colorGrid: {
    flexDirection: 'row',
    gap: spacing[4],
    flexWrap: 'wrap',
  },
  colorItem: {
    alignItems: 'center',
    gap: spacing[2],
  },
  colorBox: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.black,
  },
  
  // Typography
  typographySection: {
    gap: spacing[4],
  },
  spacedText: {
    marginTop: spacing[2],
  },
  
  // Buttons
  buttonGrid: {
    gap: spacing[3],
  },
  
  // Badges
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  
  // Cards
  exampleCard: {
    marginBottom: spacing[4],
  },
  
  // Layout Example
  layoutExample: {
    gap: spacing[4],
  },
  layoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing[3],
    flexWrap: 'wrap',
  },
  
  // Design Principles
  principlesList: {
    gap: spacing[4],
  },
  principleItem: {
    flexDirection: 'row',
    gap: spacing[3],
    alignItems: 'flex-start',
  },
  principleText: {
    flex: 1,
    gap: spacing[1],
  },
});
