export interface SubscriptionCapabilities {
  canEditCustomSessions: boolean;
  canSaveCustomSessions: boolean;
  canCreateMultipleCustomSessions: boolean;
}

const currentCapabilities: SubscriptionCapabilities = {
  canEditCustomSessions: true,
  canSaveCustomSessions: true,
  canCreateMultipleCustomSessions: true,
};

export function getSubscriptionCapabilities(): SubscriptionCapabilities {
  return currentCapabilities;
}

export function canEditCustomSessions(): boolean {
  return getSubscriptionCapabilities().canEditCustomSessions;
}

export function canSaveCustomSessions(): boolean {
  return getSubscriptionCapabilities().canSaveCustomSessions;
}

export function canCreateMultipleCustomSessions(): boolean {
  return getSubscriptionCapabilities().canCreateMultipleCustomSessions;
}
