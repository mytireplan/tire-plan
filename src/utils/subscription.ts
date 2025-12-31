// Subscription utility functions for frontend
// src/utils/subscription.ts

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { httpsCallable, getFunctions } from 'firebase/functions';
import type {
  Subscription,
  BillingKey,
  PaymentHistory,
  SubscriptionPlan,
  UsageMetrics,
} from '../types';

const firestore = getFirestore();
const auth = getAuth();
const functions = getFunctions();

/**
 * Get user's current subscription
 */
export async function getCurrentSubscription(ownerId: string): Promise<Subscription | null> {
  try {
    const q = query(
      collection(firestore, 'subscriptions'),
      where('ownerId', '==', ownerId),
      where('status', 'in', ['ACTIVE', 'INACTIVE'])
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as Subscription;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }
}

/**
 * Get all billing keys for user
 */
export async function getBillingKeys(ownerId: string): Promise<BillingKey[]> {
  try {
    const q = query(collection(firestore, 'billingKeys'), where('ownerId', '==', ownerId));

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as BillingKey[];
  } catch (error) {
    console.error('Error fetching billing keys:', error);
    return [];
  }
}

/**
 * Get payment history for user
 */
export async function getPaymentHistory(ownerId: string): Promise<PaymentHistory[]> {
  try {
    const q = query(
      collection(firestore, 'paymentHistory'),
      where('ownerId', '==', ownerId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PaymentHistory[];
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return [];
  }
}

/**
 * Add new billing key (after Toss Payments successful registration)
 */
export async function addBillingKey(
  ownerId: string,
  customerKey: string,
  cardNumber: string,
  cardCompany: string,
  isDefault: boolean = true
): Promise<BillingKey> {
  try {
    // If setting as default, unset others
    if (isDefault) {
      const q = query(
        collection(firestore, 'billingKeys'),
        where('ownerId', '==', ownerId)
      );
      const snapshot = await getDocs(q);
      const batch = writeBatch(firestore);

      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { isDefault: false });
      });

      await batch.commit();
    }

    const billingKeyRef = doc(collection(firestore, 'billingKeys'));
    const billingKeyData: BillingKey = {
      id: billingKeyRef.id,
      ownerId,
      customerKey,
      cardNumber,
      cardCompany,
      isDefault,
      createdAt: new Date().toISOString(),
    };

    await setDoc(billingKeyRef, billingKeyData);
    return billingKeyData;
  } catch (error) {
    console.error('Error adding billing key:', error);
    throw error;
  }
}

/**
 * Create or update subscription via Cloud Function
 */
export async function createOrUpdateSubscription(
  plan: SubscriptionPlan,
  billingCycle: 'MONTHLY' | 'YEARLY',
  billingKeyId?: string
): Promise<{ subscriptionId: string; message: string }> {
  const createSubscriptionFn = httpsCallable(functions, 'createSubscription');

  try {
    const result = await createSubscriptionFn({
      plan,
      billingCycle,
      billingKeyId,
    });

    return result.data as { subscriptionId: string; message: string };
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    throw new Error(error.message || 'Failed to create subscription');
  }
}

/**
 * Cancel subscription via Cloud Function
 */
export async function cancelSubscriptionFn(): Promise<{ message: string }> {
  const cancelSubscriptionFn = httpsCallable(functions, 'cancelSubscription');

  try {
    const result = await cancelSubscriptionFn({});
    return result.data as { message: string };
  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    throw new Error(error.message || 'Failed to cancel subscription');
  }
}

/**
 * Get current usage metrics
 */
export async function getUsageMetrics(ownerId: string): Promise<UsageMetrics | null> {
  try {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const q = query(
      collection(firestore, 'usageMetrics'),
      where('ownerId', '==', ownerId),
      where('periodStart', '>=', monthStart.toISOString()),
      where('periodEnd', '<=', monthEnd.toISOString())
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    return {
      ...snapshot.docs[0].data(),
    } as UsageMetrics;
  } catch (error) {
    console.error('Error fetching usage metrics:', error);
    return null;
  }
}

/**
 * Check if user has feature access based on subscription
 */
export async function checkFeatureAccess(
  ownerId: string,
  feature: keyof Subscription['plan']
): Promise<boolean> {
  const subscription = await getCurrentSubscription(ownerId);
  if (!subscription) return false;

  const PLAN_FEATURES: Record<SubscriptionPlan, Record<string, boolean>> = {
    FREE: {
      taxInvoice: false,
      advancedAnalytics: false,
      staffManagement: false,
      multiStore: false,
      reservationSystem: false,
      leaveManagement: false,
    },
    STARTER: {
      taxInvoice: true,
      advancedAnalytics: false,
      staffManagement: true,
      multiStore: false,
      reservationSystem: false,
      leaveManagement: false,
    },
    PRO: {
      taxInvoice: true,
      advancedAnalytics: true,
      staffManagement: true,
      multiStore: true,
      reservationSystem: true,
      leaveManagement: false,
    },
    ENTERPRISE: {
      taxInvoice: true,
      advancedAnalytics: true,
      staffManagement: true,
      multiStore: true,
      reservationSystem: true,
      leaveManagement: true,
    },
  };

  return PLAN_FEATURES[subscription.plan][feature] || false;
}

/**
 * Format price to KRW
 */
export function formatPrice(price: number): string {
  return `${(price / 1000).toFixed(0)}K`;
}

/**
 * Get days remaining in current billing period
 */
export function getDaysRemaining(nextBillingDate: string): number {
  const today = new Date();
  const nextBilling = new Date(nextBillingDate);
  const diffTime = Math.abs(nextBilling.getTime() - today.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Record usage metrics (called from components)
 */
export async function recordUsage(ownerId: string, type: 'SALE' | 'PRODUCT'): Promise<void> {
  try {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const metricsId = `${ownerId}-${today.getFullYear()}-${today.getMonth()}`;
    const metricsRef = doc(firestore, 'usageMetrics', metricsId);

    const metricsDoc = await getDoc(metricsRef);

    if (metricsDoc.exists()) {
      const data = metricsDoc.data();
      const increment = type === 'SALE' ? { salesCount: data.salesCount + 1 } : { productsCount: data.productsCount + 1 };
      await updateDoc(metricsRef, increment);
    } else {
      const newMetrics = {
        ownerId,
        periodStart: monthStart.toISOString(),
        periodEnd: monthEnd.toISOString(),
        salesCount: type === 'SALE' ? 1 : 0,
        productsCount: type === 'PRODUCT' ? 1 : 0,
      };
      await setDoc(metricsRef, newMetrics);
    }
  } catch (error) {
    console.error('Error recording usage:', error);
    // Don't throw - usage tracking should not block operations
  }
}
