// Firebase Cloud Functions for Subscription Billing
// Deploy to: firebase deploy --only functions

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

const db = admin.firestore();

// Environment variables - set these in Firebase Console
const TOSS_PAYMENTS_SECRET_KEY = process.env.TOSS_PAYMENTS_SECRET_KEY || '';
const TOSS_PAYMENTS_BASE_URL = 'https://api.tosspayments.com/v1';

interface SubscriptionData {
  ownerId: string;
  plan: string;
  billingCycle: 'MONTHLY' | 'YEARLY';
  status: string;
  billingKeyId: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string;
}

interface BillingKeyData {
  ownerId: string;
  customerKey: string;
  cardNumber?: string;
  cardCompany?: string;
  isDefault: boolean;
  createdAt: string;
}

interface PaymentHistoryData {
  ownerId: string;
  subscriptionId: string;
  billingKeyId: string;
  orderId: string;
  amount: number;
  billingCycle: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  failureReason?: string;
  paidAt: string;
  nextRetryAt?: string;
  createdAt: string;
}

// Plan pricing (in KRW - Korean Won)
const PLAN_PRICES: Record<string, Record<string, number>> = {
  STARTER: { MONTHLY: 19900, YEARLY: 199000 },
  PRO: { MONTHLY: 39000, YEARLY: 390000 },
  ENTERPRISE: { MONTHLY: 89000, YEARLY: 890000 },
};

/**
 * Scheduled function to process daily billing for subscriptions due today
 * Run daily at 02:00 UTC (11:00 KST)
 */
export const processDailySubscriptionBilling = functions
  .region('asia-northeast1')
  .pubsub.schedule('0 2 * * *') // Daily at 02:00 UTC
  .timeZone('Asia/Seoul')
  .onRun(async (context) => {
    console.log('Starting daily subscription billing process...');

    try {
      const today = new Date().toISOString().split('T')[0];
      const subscriptionsRef = db.collection('subscriptions');
      const dueBillings = await subscriptionsRef
        .where('status', '==', 'ACTIVE')
        .where('nextBillingDate', '<=', today)
        .get();

      console.log(`Found ${dueBillings.size} subscriptions due for billing`);

      for (const doc of dueBillings.docs) {
        const subscription = doc.data() as SubscriptionData;
        await processSubscriptionBilling(doc.id, subscription);
      }

      return { processed: dueBillings.size };
    } catch (error) {
      console.error('Error in processDailySubscriptionBilling:', error);
      throw error;
    }
  });

/**
 * Process billing for a single subscription
 */
async function processSubscriptionBilling(subscriptionId: string, subscription: SubscriptionData) {
  try {
    // Get billing key
    const billingKeyDoc = await db.collection('billingKeys').doc(subscription.billingKeyId).get();
    if (!billingKeyDoc.exists) {
      console.error(`Billing key not found: ${subscription.billingKeyId}`);
      return;
    }

    const billingKey = billingKeyDoc.data() as BillingKeyData;
    const amount = PLAN_PRICES[subscription.plan]?.[subscription.billingCycle] || 0;

    if (!amount) {
      console.error(`Invalid plan or billing cycle: ${subscription.plan} ${subscription.billingCycle}`);
      return;
    }

    // Create order ID
    const orderId = `SUB-${subscriptionId}-${Date.now()}`;

    // Request billing from Toss Payments
    const paymentResult = await requestBillingFromToss(
      billingKey.customerKey,
      amount,
      orderId,
      subscription.plan,
      subscription.billingCycle
    );

    // Record payment history
    const paymentHistory: PaymentHistoryData = {
      ownerId: subscription.ownerId,
      subscriptionId: subscriptionId,
      billingKeyId: subscription.billingKeyId,
      orderId: orderId,
      amount: amount,
      billingCycle: subscription.billingCycle,
      status: paymentResult.success ? 'SUCCESS' : 'FAILED',
      failureReason: paymentResult.error,
      paidAt: new Date().toISOString(),
      nextRetryAt: paymentResult.success ? undefined : getNextRetryDate(),
      createdAt: new Date().toISOString(),
    };

    await db.collection('paymentHistory').add(paymentHistory);

    if (paymentResult.success) {
      // Update subscription with new billing period
      const newPeriodStart = new Date();
      const newPeriodEnd = new Date();

      if (subscription.billingCycle === 'MONTHLY') {
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
      } else {
        newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
      }

      await db.collection('subscriptions').doc(subscriptionId).update({
        currentPeriodStart: newPeriodStart.toISOString(),
        currentPeriodEnd: newPeriodEnd.toISOString(),
        nextBillingDate: newPeriodEnd.toISOString(),
        status: 'ACTIVE',
      });

      console.log(`Billing successful for subscription ${subscriptionId}`);
    } else {
      console.error(`Billing failed for subscription ${subscriptionId}: ${paymentResult.error}`);
      
      // After 3 failed attempts, suspend subscription
      const failedPayments = await db.collection('paymentHistory')
        .where('subscriptionId', '==', subscriptionId)
        .where('status', '==', 'FAILED')
        .orderBy('createdAt', 'desc')
        .limit(3)
        .get();

      if (failedPayments.size >= 3) {
        await db.collection('subscriptions').doc(subscriptionId).update({
          status: 'SUSPENDED',
        });
        console.log(`Subscription suspended after 3 failed attempts: ${subscriptionId}`);
      }
    }
  } catch (error) {
    console.error(`Error processing subscription billing for ${subscriptionId}:`, error);
  }
}

/**
 * Request billing from Toss Payments using billing key (빌링키)
 */
async function requestBillingFromToss(
  customerKey: string,
  amount: number,
  orderId: string,
  plan: string,
  billingCycle: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = Buffer.from(`${TOSS_PAYMENTS_SECRET_KEY}:`).toString('base64');

    const response = await axios.post(
      `${TOSS_PAYMENTS_BASE_URL}/billing/authorizations/${customerKey}/payments`,
      {
        amount: amount,
        orderId: orderId,
        orderName: `${plan} Plan (${billingCycle})`,
        successUrl: 'https://tireplan.kr/subscription-success',
        failUrl: 'https://tireplan.kr/subscription-failed',
      },
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status === 200) {
      return { success: true };
    } else {
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error: any) {
    console.error('Toss Payments API error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
}

/**
 * Calculate next retry date (24 hours later)
 */
function getNextRetryDate(): string {
  const nextRetry = new Date();
  nextRetry.setHours(nextRetry.getHours() + 24);
  return nextRetry.toISOString();
}

/**
 * HTTP function to initiate subscription
 * Called when user selects a plan
 */
export const createSubscription = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { plan, billingCycle, billingKeyId } = data;
    const ownerId = context.auth.uid;

    try {
      // Validate plan and billingCycle
      if (!['FREE', 'STARTER', 'PRO', 'ENTERPRISE'].includes(plan)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid plan');
      }

      if (!['MONTHLY', 'YEARLY'].includes(billingCycle)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid billing cycle');
      }

      // For paid plans, verify billing key
      if (plan !== 'FREE' && !billingKeyId) {
        throw new functions.https.HttpsError('failed-precondition', 'Billing key required for paid plans');
      }

      // Check existing subscription
      const existingSubscription = await db.collection('subscriptions')
        .where('ownerId', '==', ownerId)
        .where('status', 'in', ['ACTIVE', 'INACTIVE'])
        .limit(1)
        .get();

      // Create new subscription
      const now = new Date();
      const periodEnd = new Date();

      if (billingCycle === 'MONTHLY') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      const newSubscription: SubscriptionData = {
        ownerId: ownerId,
        plan: plan,
        billingCycle: billingCycle,
        status: 'ACTIVE',
        billingKeyId: billingKeyId || '',
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: periodEnd.toISOString(),
        nextBillingDate: periodEnd.toISOString(),
      };

      let subscriptionRef;
      if (existingSubscription.empty) {
        // Create new subscription
        subscriptionRef = await db.collection('subscriptions').add(newSubscription);
        console.log(`New subscription created: ${subscriptionRef.id}`);
      } else {
        // Update existing subscription (upgrade/downgrade)
        const existingId = existingSubscription.docs[0].id;
        await db.collection('subscriptions').doc(existingId).update(newSubscription);
        subscriptionRef = existingSubscription.docs[0].ref;
        console.log(`Subscription updated: ${existingId}`);
      }

      // For paid plans, process first payment immediately
      if (plan !== 'FREE' && billingKeyId) {
        const amount = PLAN_PRICES[plan]?.[billingCycle] || 0;
        if (amount > 0) {
          // Get billing key details
          const billingKeyDoc = await db.collection('billingKeys').doc(billingKeyId).get();
          if (billingKeyDoc.exists) {
            const billingKey = billingKeyDoc.data() as BillingKeyData;
            const paymentResult = await requestBillingFromToss(
              billingKey.customerKey,
              amount,
              `SUB-${subscriptionRef.id}-INIT`,
              plan,
              billingCycle
            );

            if (!paymentResult.success) {
              // Revert subscription creation if payment fails
              await subscriptionRef.delete();
              throw new functions.https.HttpsError('failed-precondition', `Payment failed: ${paymentResult.error}`);
            }
          }
        }
      }

      return {
        success: true,
        subscriptionId: subscriptionRef.id,
        message: `${plan} 플랜 구독이 시작되었습니다.`,
      };
    } catch (error: any) {
      console.error('Error in createSubscription:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to create subscription');
    }
  });

/**
 * HTTP function to cancel subscription
 */
export const cancelSubscription = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const ownerId = context.auth.uid;

    try {
      const subscriptions = await db.collection('subscriptions')
        .where('ownerId', '==', ownerId)
        .where('status', '==', 'ACTIVE')
        .limit(1)
        .get();

      if (subscriptions.empty) {
        throw new functions.https.HttpsError('not-found', 'No active subscription found');
      }

      const subscriptionDoc = subscriptions.docs[0];
      await subscriptionDoc.ref.update({
        status: 'CANCELED',
        canceledAt: new Date().toISOString(),
      });

      console.log(`Subscription canceled: ${subscriptionDoc.id}`);

      return {
        success: true,
        message: '구독이 취소되었습니다. 무료 플랜으로 전환됩니다.',
      };
    } catch (error: any) {
      console.error('Error in cancelSubscription:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to cancel subscription');
    }
  });
