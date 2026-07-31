export const POLICY_TYPES = ['motor', 'health', 'life', 'non_motor', 'other'];
export const MOTOR_VEHICLE_CLASSES = ['TW', 'PCV', 'PVT', 'GCV', 'Misc_D', 'CPM', 'Fire', 'Public_Liability', 'SAOD_TW', 'SAOD_PVT', 'CPA', 'Others'];
export const NON_MOTOR_VEHICLE_CLASSES = ['RAK_Policy', 'Home_Insurance', 'Fire', 'Public_Liability', 'CPM', 'Others'];
export const VEHICLE_CLASSES = ['TW', 'PCV', 'PVT', 'GCV', 'Misc_D', 'CPM', 'Fire', 'Public_Liability', 'SAOD_TW', 'SAOD_PVT', 'CPA', 'Home_Insurance', 'RAK_Policy', 'Others'];
export const PREMIUM_MODES = ['monthly', 'quarterly', 'halfYearly', 'yearly', 'single'];

export const POLICY_STATUSES = ['active', 'expired', 'cancelled']; // expired is read-only (auto-calculated)
export const EDITABLE_POLICY_STATUSES = ['active', 'cancelled'];   // only these can be set manually
export const PAYMENT_STATUSES = ['pending', 'paid', 'partial'];
export const CLAIM_STATUSES = ['filed', 'approved', 'rejected', 'settled'];
export const FOLLOWUP_STATUSES = ['pending', 'completed', 'cancelled'];
export const LEAD_STATUSES = ['new', 'contacted', 'interested', 'converted', 'lost'];