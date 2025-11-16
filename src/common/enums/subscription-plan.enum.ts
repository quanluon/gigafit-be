export enum SubscriptionPlan {
  FREE = 'free',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

export enum GenerationType {
  WORKOUT = 'workout',
  MEAL = 'meal',
  INBODY = 'inbody',
  BODY_PHOTO = 'bodyPhoto',
}

export const UNLIMITED_LIMIT = -1;

export const SUBSCRIPTION_LIMITS = {
  [SubscriptionPlan.FREE]: {
    workout: 2, // 2 workout AI generations per month
    meal: 2, // 2 meal AI generations per month
    inbody: 1, // 1 inbody scan per month
    bodyPhoto: 3, // 3 body photo analyses per month
  },
  [SubscriptionPlan.PREMIUM]: {
    workout: 10, // 10 workout AI generations per month
    meal: 10, // 10 meal AI generations per month
    inbody: 4, // 4 inbody scans per month
    bodyPhoto: 10, // 10 body photo analyses per month
  },
  [SubscriptionPlan.ENTERPRISE]: {
    workout: UNLIMITED_LIMIT, // Unlimited
    meal: UNLIMITED_LIMIT, // Unlimited
    inbody: UNLIMITED_LIMIT,
    bodyPhoto: UNLIMITED_LIMIT,
  },
};
