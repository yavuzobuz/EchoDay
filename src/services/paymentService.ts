// Mock Payment Service for Demo
export interface PaymentPlan {
  id: string;
  name: string;
  price: number;
  period: 'monthly' | 'yearly';
}

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  message: string;
  planId: string;
}

const PLANS: Record<string, PaymentPlan> = {
  free: { id: 'free', name: 'Free', price: 0, period: 'monthly' },
  pro_monthly: { id: 'pro_monthly', name: 'Pro (Monthly)', price: 79, period: 'monthly' },
  pro_yearly: { id: 'pro_yearly', name: 'Pro (Yearly)', price: 828, period: 'yearly' },
  'pro-plus_monthly': { id: 'pro-plus_monthly', name: 'Pro+ (Monthly)', price: 149, period: 'monthly' },
  'pro-plus_yearly': { id: 'pro-plus_yearly', name: 'Pro+ (Yearly)', price: 1548, period: 'yearly' },
};

/**
 * Process a demo payment (no actual payment processing)
 */
export const processPayment = async (
  planId: string,
  _billingPeriod: 'monthly' | 'yearly'
): Promise<PaymentResult> => {
  return new Promise((resolve) => {
    // Simulate payment processing delay
    setTimeout(() => {
      const plan = PLANS[planId];
      
      if (!plan) {
        resolve({
          success: false,
          transactionId: '',
          message: 'Plan not found',
          planId,
        });
        return;
      }

      // Simulate random success rate for demo (90% success)
      const isSuccess = Math.random() < 0.9;

      if (isSuccess) {
        const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        resolve({
          success: true,
          transactionId,
          message: `Payment of ${plan.price}₺ processed successfully for ${plan.name}`,
          planId,
        });
      } else {
        resolve({
          success: false,
          transactionId: '',
          message: 'Payment failed. Please try again.',
          planId,
        });
      }
    }, 2000);
  });
};

/**
 * Get plan details
 */
export const getPlanDetails = (planId: string): PaymentPlan | null => {
  return PLANS[planId] || null;
};

/**
 * Store subscription in localStorage for demo
 */
export const saveSubscription = (
  userId: string,
  planId: string,
  transactionId: string
): void => {
  const subscription = {
    userId,
    planId,
    transactionId,
    startDate: new Date().toISOString(),
    status: 'active',
  };
  localStorage.setItem(`subscription_${userId}`, JSON.stringify(subscription));
};

/**
 * Get user's current subscription
 */
export const getSubscription = (userId: string) => {
  const subscription = localStorage.getItem(`subscription_${userId}`);
  return subscription ? JSON.parse(subscription) : null;
};

/**
 * Check if user has access to premium features
 */
export const hasPremiumAccess = (userId: string): boolean => {
  const subscription = getSubscription(userId);
  if (!subscription) return false;
  return subscription.planId !== 'free' && subscription.status === 'active';
};
