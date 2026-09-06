// Hardcoded reference data for the 13-step property wizard. Mirrored in
// frontend/lib/propertyOptions.js — this repo has no shared-types setup
// (see properties.controller.js's own PROPERTY_TYPES duplication), so these
// lists are kept in sync by hand rather than through a shared package.

const PROPERTY_CATEGORIES = ['cabin', 'cottage', 'farmstay', 'villa', 'treehouse', 'apartment'];

const BOOKING_MODELS = ['entire', 'room_based', 'mixed'];

const VACATION_TYPES = [
  'Beach Getaway',
  'Hill Station',
  'Farm Stay',
  'Adventure',
  'Wildlife',
  'Heritage',
  'Weekend Retreat',
  'Family Vacation',
];

const EXPERIENCE_TYPES = [
  { value: 'overnight_stay', label: 'Overnight Stay' },
  { value: 'day_picnic', label: 'Day Picnic' },
  { value: 'corporate_outing', label: 'Corporate Outing' },
  { value: 'team_building', label: 'Team Building' },
  { value: 'school_group', label: 'School Group' },
  { value: 'family_event', label: 'Family Event' },
  { value: 'custom_package', label: 'Custom Package' },
];

const PRICING_MODELS = ['per_person', 'per_room', 'per_group', 'fixed_package'];

const ROOM_TYPES = ['Standard Room', 'Deluxe Room', 'Suite', 'Family Room', 'Dormitory', 'Cottage Room', 'Tent'];

const ROOM_VIEWS = ['Garden View', 'Mountain View', 'Pool View', 'Ocean View', 'City View', 'No View'];

const BED_TYPES = ['Single Bed', 'Double Bed', 'Queen Bed', 'King Bed', 'Bunk Bed', 'Sofa Bed'];

const PRICE_TYPES = ['per_room', 'per_person', 'per_villa'];

const PRICING_TIERS = ['budget', 'standard', 'premium', 'luxury'];

const MEAL_PLAN_LABELS = [
  { plan_type: 'No Meal', label: 'No meals included' },
  { plan_type: 'Breakfast Only', label: 'Breakfast included' },
  { plan_type: 'Breakfast + Lunch/Dinner', label: 'Breakfast + one meal (Lunch or Dinner)' },
  { plan_type: 'All Inclusive', label: 'All meals included (Breakfast, Lunch, Dinner)' },
];

const DIETARY_OPTIONS = ['Veg', 'Non-Veg', 'Vegan', 'Jain'];

const ACTIVITIES = [
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

const EVENT_TYPES = ['Corporate Event', 'Wedding', 'Birthday', 'School Trip', 'Conference'];

const KYC_ID_TYPES = [
  { value: 'PAN', label: 'PAN Card' },
  { value: 'AADHAAR', label: 'Aadhaar Card' },
  { value: 'GSTIN', label: 'GSTIN' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'DRIVING_LICENSE', label: 'Driving License' },
];

const COMMISSION_TYPES = [
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'fixed', label: 'Fixed Amount (₹)' },
];

// Trimmed subset — enough states/cities for a demo dropdown, not the full
// India dataset the main project uses.
const INDIA_STATES = {
  Maharashtra: ['Mumbai', 'Pune', 'Lonavala', 'Nashik', 'Mahabaleshwar'],
  Goa: ['Panaji', 'Calangute', 'Anjuna', 'Margao'],
  Karnataka: ['Bengaluru', 'Coorg', 'Chikmagalur', 'Mysuru'],
  Kerala: ['Munnar', 'Alleppey', 'Wayanad', 'Kochi'],
  Rajasthan: ['Udaipur', 'Jaipur', 'Jaisalmer', 'Pushkar'],
  'Himachal Pradesh': ['Manali', 'Shimla', 'Dharamshala', 'Kasol'],
  Uttarakhand: ['Rishikesh', 'Nainital', 'Mussoorie', 'Auli'],
  'Tamil Nadu': ['Ooty', 'Kodaikanal', 'Chennai', 'Coonoor'],
};

module.exports = {
  PROPERTY_CATEGORIES,
  BOOKING_MODELS,
  VACATION_TYPES,
  EXPERIENCE_TYPES,
  PRICING_MODELS,
  ROOM_TYPES,
  ROOM_VIEWS,
  BED_TYPES,
  PRICE_TYPES,
  PRICING_TIERS,
  MEAL_PLAN_LABELS,
  DIETARY_OPTIONS,
  ACTIVITIES,
  EVENT_TYPES,
  KYC_ID_TYPES,
  COMMISSION_TYPES,
  INDIA_STATES,
};
