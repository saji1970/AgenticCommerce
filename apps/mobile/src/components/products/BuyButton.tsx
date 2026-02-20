import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, MandateType, AgentCartRequest } from '@agentic-commerce/shared-types';
import { useMandate } from '../../contexts/MandateContext';
import { useCart } from '../../contexts/CartContext';
import { acpService } from '../../services/acp.service';
import { cartService, isCartDemoMode } from '../../services/cart.service';
import { MandateFlowManager } from '../mandate/MandateFlowManager';
import { BuyConfirmationModal } from './BuyConfirmationModal';
import { validateAgainstCartMandate } from '../../utils/mandateValidation';

const PENDING_CART_ITEM_KEY = 'pending_demo_cart_item';

interface BuyButtonProps {
  product: Product;
  variant?: 'full' | 'compact' | 'icon';
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * BuyButton
 * Handles agent-assisted cart addition with mandate flow
 */
export const BuyButton: React.FC<BuyButtonProps> = ({
  product,
  variant = 'full',
  onSuccess,
  onError,
}) => {
  const { getActiveMandateByType, loadMandates } = useMandate();
  const { refreshCart } = useCart();
  const [showMandateFlow, setShowMandateFlow] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  /**
   * Handle buy button press
   */
  const handlePress = async () => {
    try {
      console.log('[BuyButton] Pressed for product:', product.id, product.name);

      if (!product || !product.id) {
        console.error('[BuyButton] Invalid product:', product);
        Alert.alert('Error', 'Invalid product data');
        return;
      }

      // Save product info for the deep link callback to add to cart after approval
      const pendingItem = {
        productId: product.id,
        productName: product.name,
        productImage: product.imageUrl || product.image || '',
        quantity: 1,
        price: product.price,
      };
      await AsyncStorage.setItem(PENDING_CART_ITEM_KEY, JSON.stringify(pendingItem));
      console.log('[BuyButton] Saved pending cart item:', pendingItem.productName);

      // Always show mandate signing UI for user consent, even if mandate exists
      console.log('[BuyButton] Starting mandate flow for user consent');
      setShowMandateFlow(true);
    } catch (error: any) {
      console.error('[BuyButton] Error in handlePress:', error);
      Alert.alert('Error', `Failed to process buy action: ${error.message || 'Unknown error'}`);
    }
  };

  /**
   * Handle mandate ready (created or already exists)
   */
  const handleMandateReady = async () => {
    setShowMandateFlow(false);
    // Reload mandates and use returned value directly to avoid React state timing issues
    const freshMandates = await loadMandates();
    const mandate = freshMandates.cart;
    console.log('[BuyButton] handleMandateReady - freshMandates:', freshMandates, 'cart mandate:', mandate);
    if (mandate) {
      // Validate product against mandate constraints
      const validation = validateAgainstCartMandate(product, mandate);
      if (!validation.valid) {
        console.warn('[BuyButton] Validation failed:', validation.errors);
        Alert.alert('Mandate Constraint Violation', validation.errors.join('\n'), [{ text: 'OK' }]);
        return;
      }
      setShowConfirmation(true);
    } else {
      console.warn('[BuyButton] No cart mandate found after loading mandates');
    }
  };

  /**
   * Handle mandate flow cancellation
   */
  const handleMandateCancel = async () => {
    setShowMandateFlow(false);
    await AsyncStorage.removeItem(PENDING_CART_ITEM_KEY);
  };

  /**
   * Handle confirmation and add to cart via agent
   * When in demo mode, cart is stored locally - use cartService directly.
   * Otherwise use ACP (backend) which validates mandate and adds to backend cart.
   */
  const handleConfirm = async (reasoning: string) => {
    setLoading(true);

    try {
      const mandate = getActiveMandateByType(MandateType.CART);
      if (!mandate) {
        throw new Error('Cart mandate not found');
      }

      // Validate and prepare request
      const productPrice = product.price && product.price > 0 ? product.price : 0;
      if (productPrice <= 0) {
        throw new Error('Product price is required and must be greater than 0');
      }

      // Retrieve per-mandate token if available
      let mandateToken: string | undefined;
      try {
        const token = await AsyncStorage.getItem(`mandate_token_${mandate.id}`);
        if (!token) {
          const globalToken = await AsyncStorage.getItem('mandate_token');
          mandateToken = globalToken || undefined;
        } else {
          mandateToken = token;
        }
      } catch {}

      if (isCartDemoMode()) {
        // Demo mode: cart is stored locally - add via cartService so it matches getCart
        await cartService.addToCart({
          productId: product.id,
          productName: product.name,
          productImage: product.imageUrl || product.image || '',
          quantity: 1,
          price: productPrice,
          mandateId: mandate.id,
          mandateToken,
        });
      } else {
        // Production: use ACP to add via backend (validates mandate and adds to backend cart)
        const request: AgentCartRequest = {
          mandateId: mandate.id,
          agentId: mandate.agentId,
          productId: product.id,
          productName: product.name,
          ...(product.imageUrl &&
              product.imageUrl.trim() !== '' &&
              (product.imageUrl.startsWith('http://') || product.imageUrl.startsWith('https://')) && {
            productImage: product.imageUrl,
          }),
          quantity: 1,
          price: productPrice,
          reasoning: reasoning || `User requested via Buy button for ${product.name}`,
        };
        await acpService.agentAddToCart(request);
      }

      // Refresh cart to show new item
      await refreshCart();

      setShowConfirmation(false);
      Alert.alert('Success', `${product.name} added to cart by ${mandate.agentName}`);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Failed to add to cart:', error);
      const errorMessage =
        error.response?.data?.error?.message || error.message || 'Failed to add to cart';
      Alert.alert('Error', errorMessage);

      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle confirmation cancellation
   */
  const handleCancel = () => {
    setShowConfirmation(false);
  };

  /**
   * Render button based on variant
   */
  const renderButton = () => {
    if (variant === 'icon') {
      return (
        <TouchableOpacity
          style={styles.iconButton}
          onPress={handlePress}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Text style={styles.iconText}>🛒</Text>
          )}
        </TouchableOpacity>
      );
    }

    if (variant === 'compact') {
      return (
        <TouchableOpacity
          style={[styles.compactButton, loading && styles.buttonDisabled]}
          onPress={handlePress}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.compactButtonText}>Buy</Text>
          )}
        </TouchableOpacity>
      );
    }

    // Full variant (default)
    return (
      <TouchableOpacity
        style={[styles.fullButton, loading && styles.buttonDisabled]}
        onPress={handlePress}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.fullButtonIcon}>🛒</Text>
            <Text style={styles.fullButtonText}>Buy Now</Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  const mandate = getActiveMandateByType(MandateType.CART);

  return (
    <>
      {renderButton()}

      {/* Mandate Flow Manager */}
      {showMandateFlow && (
        <MandateFlowManager
          mandateType={MandateType.CART}
          onMandateReady={handleMandateReady}
          onCancel={handleMandateCancel}
          autoCheck={true}
          product={product}
        />
      )}

      {/* Confirmation Modal */}
      {showConfirmation && mandate && (
        <BuyConfirmationModal
          visible={showConfirmation}
          product={product}
          mandate={mandate}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          loading={loading}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  // Full Button (default)
  fullButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fullButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  fullButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },

  // Compact Button
  compactButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Icon Button
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  iconText: {
    fontSize: 20,
  },

  // Common
  buttonDisabled: {
    opacity: 0.6,
  },
});
