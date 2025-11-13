export enum SubscriptionPlan {
  FREE = 'free',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

export enum GenerationType {
  WORKOUT = 'workout',
  MEAL = 'meal',
}

export const SUBSCRIPTION_LIMITS = {
  [SubscriptionPlan.FREE]: {
    workout: 3, // 3 workout AI generations per month
    meal: 3, // 3 meal AI generations per month
  },
  [SubscriptionPlan.PREMIUM]: {
    workout: 50, // 50 workout AI generations per month
    meal: 50, // 50 meal AI generations per month
  },
  [SubscriptionPlan.ENTERPRISE]: {
    workout: -1, // Unlimited
    meal: -1, // Unlimited
  },
};
