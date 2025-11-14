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
    workout: 2, // 2 workout AI generations per month
    meal: 2, // 2 meal AI generations per month
  },
  [SubscriptionPlan.PREMIUM]: {
    workout: 10, // 10 workout AI generations per month
    meal: 10, // 10 meal AI generations per month
  },
  [SubscriptionPlan.ENTERPRISE]: {
    workout: -1, // Unlimited
    meal: -1, // Unlimited
  },
};
