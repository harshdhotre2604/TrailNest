// Hardcoded reference data for the 13-step property wizard. Mirrors
// backend/src/constants/propertyOptions.js — kept in sync by hand, same as
// this repo's existing PROPERTY_TYPES duplication between frontend/backend.

export const PROPERTY_CATEGORIES = ['cabin', 'cottage', 'farmstay', 'villa', 'treehouse', 'apartment'];

export const BOOKING_MODELS = [
  { value: 'entire', label: 'Entire property' },
  { value: 'room_based', label: 'Room-based' },
  { value: 'mixed', label: 'Mixed' },
];

export const VACATION_TYPES = [
  'Beach Getaway',
  'Hill Station',
  'Farm Stay',
  'Adventure',
  'Wildlife',
  'Heritage',
  'Weekend Retreat',
  'Family Vacation',
];

export const EXPERIENCE_TYPES = [
  { value: 'overnight_stay', label: 'Overnight Stay' },
  { value: 'day_picnic', label: 'Day Picnic' },
  { value: 'corporate_outing', label: 'Corporate Outing' },
  { value: 'team_building', label: 'Team Building' },
  { value: 'school_group', label: 'School Group' },
  { value: 'family_event', label: 'Family Event' },
  { value: 'custom_package', label: 'Custom Package' },
];

export function experienceLabel(value) {
  return EXPERIENCE_TYPES.find((type) => type.value === value)?.label || value;
}

export const PRICING_MODELS = [
  { value: 'per_person', label: 'Per person' },
  { value: 'per_room', label: 'Per room' },
  { value: 'per_group', label: 'Per group' },
  { value: 'fixed_package', label: 'Fixed package' },
];

export const ROOM_TYPES = ['Standard Room', 'Deluxe Room', 'Suite', 'Family Room', 'Dormitory', 'Cottage Room', 'Tent'];

export const ROOM_VIEWS = ['Garden View', 'Mountain View', 'Pool View', 'Ocean View', 'City View', 'No View'];

export const BED_TYPES = ['Single Bed', 'Double Bed', 'Queen Bed', 'King Bed', 'Bunk Bed', 'Sofa Bed'];

export const PRICE_TYPES = [
  { value: 'per_room', label: 'Per room, per night' },
  { value: 'per_person', label: 'Per person, per night' },
  { value: 'per_villa', label: 'Entire villa, per night' },
];

export const PRICING_TIERS = ['budget', 'standard', 'premium', 'luxury'];

export const MEAL_PLAN_LABELS = [
  { plan_type: 'No Meal', label: 'No meals included' },
  { plan_type: 'Breakfast Only', label: 'Breakfast included' },
  { plan_type: 'Breakfast + Lunch/Dinner', label: 'Breakfast + one meal (Lunch or Dinner)' },
  { plan_type: 'All Inclusive', label: 'All meals included (Breakfast, Lunch, Dinner)' },
];

export const DIETARY_OPTIONS = ['Veg', 'Non-Veg', 'Vegan', 'Jain'];

export const ACTIVITIES = [
  { key: 'trekking', name: 'Trekking', category: 'Adventure' },
  { key: 'bonfire', name: 'Bonfire Night', category: 'Leisure' },
  { key: 'boating', name: 'Boating', category: 'Water' },
  { key: 'fishing', name: 'Fishing', category: 'Water' },
  { key: 'cycling', name: 'Cycling', category: 'Adventure' },
  { key: 'nature_walk', name: 'Guided Nature Walk', category: 'Leisure' },
  { key: 'campfire_bbq', name: 'Campfire BBQ', category: 'Leisure' },
  { key: 'stargazing', name: 'Stargazing', category: 'Leisure' },
  { key: 'farm_tour', name: 'Farm Tour', category: 'Family' },
  { key: 'yoga', name: 'Sunrise Yoga', category: 'Wellness' },
];

export const EVENT_TYPES = ['Corporate Event', 'Wedding', 'Birthday', 'School Trip', 'Conference'];

export const KYC_ID_TYPES = [
  { value: 'PAN', label: 'PAN Card' },
  { value: 'AADHAAR', label: 'Aadhaar Card' },
  { value: 'GSTIN', label: 'GSTIN' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'DRIVING_LICENSE', label: 'Driving License' },
];

export const COMMISSION_TYPES = [
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'fixed', label: 'Fixed Amount (₹)' },
];

export const INDIA_STATES = {
  Maharashtra: ['Mumbai', 'Pune', 'Lonavala', 'Nashik', 'Mahabaleshwar'],
  Goa: ['Panaji', 'Calangute', 'Anjuna', 'Margao'],
  Karnataka: ['Bengaluru', 'Coorg', 'Chikmagalur', 'Mysuru'],
  Kerala: ['Munnar', 'Alleppey', 'Wayanad', 'Kochi'],
  Rajasthan: ['Udaipur', 'Jaipur', 'Jaisalmer', 'Pushkar'],
  'Himachal Pradesh': ['Manali', 'Shimla', 'Dharamshala', 'Kasol'],
  Uttarakhand: ['Rishikesh', 'Nainital', 'Mussoorie', 'Auli'],
  'Tamil Nadu': ['Ooty', 'Kodaikanal', 'Chennai', 'Coonoor'],
};

export function getCitiesForState(state) {
  return INDIA_STATES[state] || [];
}

export const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
