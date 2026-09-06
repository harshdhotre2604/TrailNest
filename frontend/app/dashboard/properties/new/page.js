'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { api } from '@/lib/api';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { usePropertyDraft } from '@/lib/usePropertyDraft';
import AiFormHelper from '@/components/property-wizard/AiFormHelper';
import AiSuggestionsReview from '@/components/property-wizard/AiSuggestionsReview';
import { MAX_PROPERTY_IMAGES, validatePropertyImages, validateVideos } from '@/lib/propertyMedia';
import {
  PROPERTY_CATEGORIES,
  BOOKING_MODELS,
  VACATION_TYPES,
  EXPERIENCE_TYPES,
  experienceLabel,
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
  getCitiesForState,
  WEEKDAY_NAMES,
} from '@/lib/propertyOptions';
import styles from './page.module.css';

const DRAFT_KEY = 'trailnest_add_property_draft';

const STEPS = [
  'Basic Info',
  'Location',
  'Property Type & Vacation',
  'Experience Builder',
  'Package Builder',
  'Room Configuration',
  'Amenities',
  'Activities',
  'Media Center',
  'Pricing',
  'Corporate & Event',
  'Compliance & Payouts',
  'Review & Submit',
];

function createWholePropertyRoom() {
  return {
    is_whole_property: true,
    room_type: '',
    room_view: '',
    room_name: 'Whole Property',
    description: '',
    price_type: 'per_villa',
    weekday_price: '',
    weekend_price: '',
    tax_included: true,
    tax_percentage: '',
    weekday_extra_adult_rate: '',
    weekend_extra_adult_rate: '',
    max_adults: 2,
    max_children: 0,
    min_guests: '',
    check_in_time: '12:00',
    check_out_time: '10:00',
    availability_scope: 'always',
    beds: [],
    amenity_ids: [],
    experience_types: [],
    images: [],
  };
}

function createCategoryRoom() {
  return {
    is_whole_property: false,
    room_type: '',
    room_view: '',
    room_name: '',
    description: '',
    price_type: 'per_room',
    weekday_price: '',
    weekend_price: '',
    tax_included: true,
    tax_percentage: '',
    weekday_extra_adult_rate: '',
    weekend_extra_adult_rate: '',
    max_adults: 2,
    max_children: 0,
    min_guests: '',
    check_in_time: '12:00',
    check_out_time: '10:00',
    availability_scope: 'always',
    beds: [],
    amenity_ids: [],
    experience_types: [],
    images: [],
  };
}

function createExperienceDraft(type = 'overnight_stay') {
  return {
    experience_type: type,
    title: experienceLabel(type),
    description: '',
    availability_note: '',
    pricing_model: 'per_person',
    price: '',
    inclusions: '',
    exclusions: '',
  };
}

function createPackageDraft(experienceType = '') {
  return {
    package_name: '',
    experience_type: experienceType,
    duration: '',
    meal_plan_note: '',
    inclusions: '',
    exclusions: '',
    price: '',
  };
}

function createEmptyDraft() {
  return {
    stepIndex: 0,
    property: {
      name: '',
      type: 'cabin',
      description: '',
      property_type: 'entire',
      vacation_type: '',
      is_day_picnic: false,
      is_pure_veg: false,
      country: 'India',
      location_type: 'existing',
      state: '',
      city: '',
      address: '',
      custom_location_name: '',
      cleaning_fee: '',
      service_fee: '',
      pricing_type: 'standard',
      max_guests: '',
      bedroom_count: '',
      weekend_days: ['Saturday', 'Sunday'],
      child_pricing_enabled: false,
      price_per_child: '',
      terms_and_conditions: '',
      whatsapp_share_note: '',
    },
    rooms: [createWholePropertyRoom()],
    bedrooms: [],
    meal_plans: {
      'No Meal': { included: true, extra_cost: 0 },
      'Breakfast Only': { included: false, extra_cost: '' },
      'Breakfast + Lunch/Dinner': { included: false, extra_cost: '' },
      'All Inclusive': { included: false, extra_cost: '' },
    },
    dietary_options: [],
    amenities: { property_allowed: [], property_not_allowed: [] },
    activities: [],
    custom_activities_note: '',
    experiences: [createExperienceDraft('overnight_stay')],
    packages: [],
    event_facilities: {
      conference_hall: false,
      meeting_room: false,
      lawn_capacity: '',
      banquet_capacity: '',
      parking_capacity: '',
    },
    event_capacities: [],
    event_types: [],
    compliance: {
      owner_name: '',
      owner_phone: '',
      owner_email: '',
      id_type: '',
      id_number: '',
      account_name: '',
      account_number: '',
      ifsc_code: '',
      commission_type: '',
      commission_value: '',
    },
    images: [],
    videos: [],
    consentAccepted: false,
  };
}

function ToggleGroup({ options, value, onChange, name }) {
  return (
    <div className={styles.toggleGroup} role="group">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          className={`${styles.toggleOption} ${value === opt.value ? styles.toggleOptionActive : ''}`}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          data-group={name}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Chip({ label, checked, onChange }) {
  return (
    <label className={`${styles.chip} ${checked ? styles.chipActive : ''}`}>
      <input type="checkbox" checked={checked} onChange={onChange} className={styles.chipInput} />
      {label}
    </label>
  );
}

function toggleInArray(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

// The AI Form Helper isn't given our hardcoded state/city vocabulary (it's
// too small a list to constrain a real address to), so its guess may not
// match any option in the Location step's dropdowns. Fall back to the
// custom-location path when it doesn't, rather than silently losing data.
function matchLocation(city, state) {
  const stateKey = Object.keys(INDIA_STATES).find((s) => s.toLowerCase() === (state || '').toLowerCase());
  if (!stateKey) {
    return { location_type: 'custom', state: '', custom_location_name: [city, state].filter(Boolean).join(', ') };
  }
  const cityMatch = getCitiesForState(stateKey).find((c) => c.toLowerCase() === (city || '').toLowerCase());
  return { location_type: 'existing', state: stateKey, city: cityMatch || '' };
}

export default function NewPropertyPage() {
  const { ready, token } = useRequireAuth();
  const router = useRouter();
  const { draft, setDraft, restored, clearDraft } = usePropertyDraft(DRAFT_KEY, createEmptyDraft);

  const [amenitiesCatalog, setAmenitiesCatalog] = useState([]);
  const [amenitiesStatus, setAmenitiesStatus] = useState('idle');
  const [stepError, setStepError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  const [imageError, setImageError] = useState('');
  const [videoError, setVideoError] = useState('');

  const [aiState, setAiState] = useState({ status: 'idle', description: '', suggestedAmenities: [], error: '' });

  // AI Form Helper (whole-form draft, distinct from the per-field "Polish
  // with AI" above) — session-local UI state, not part of the persisted
  // draft. 'intro' only shows before the owner has typed anything.
  const [aiHelperStage, setAiHelperStage] = useState('intro');
  const [aiDraftResult, setAiDraftResult] = useState(null);

  useEffect(() => {
    api
      .listAmenities()
      .then((data) => {
        setAmenitiesCatalog(data.amenities || []);
        setAmenitiesStatus('ready');
      })
      .catch(() => setAmenitiesStatus('error'));
  }, []);

  const stepIndex = draft.stepIndex;
  const setStepIndex = (updater) =>
    setDraft((prev) => ({ ...prev, stepIndex: typeof updater === 'function' ? updater(prev.stepIndex) : updater }));

  function updateProperty(patch) {
    setDraft((prev) => ({ ...prev, property: { ...prev.property, ...patch } }));
  }

  const propertyAmenities = useMemo(() => amenitiesCatalog.filter((a) => a.type === 'property'), [amenitiesCatalog]);
  const restrictedAmenities = useMemo(() => amenitiesCatalog.filter((a) => a.type === 'restricted'), [amenitiesCatalog]);
  const roomAmenitiesCatalog = useMemo(() => amenitiesCatalog.filter((a) => a.type === 'room'), [amenitiesCatalog]);

  const wholePropertyRoom = draft.rooms.find((r) => r.is_whole_property) || createWholePropertyRoom();
  const categoryRooms = draft.rooms.filter((r) => !r.is_whole_property);

  function updateWholePropertyRoom(patch) {
    setDraft((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => (r.is_whole_property ? { ...r, ...patch } : r)),
    }));
  }

  function updateCategoryRoom(index, patch) {
    setDraft((prev) => {
      const catRooms = prev.rooms.filter((r) => !r.is_whole_property);
      const wholeRoom = prev.rooms.filter((r) => r.is_whole_property);
      catRooms[index] = { ...catRooms[index], ...patch };
      return { ...prev, rooms: [...wholeRoom, ...catRooms] };
    });
  }

  function addCategoryRoom() {
    setDraft((prev) => ({ ...prev, rooms: [...prev.rooms, createCategoryRoom()] }));
  }

  function removeCategoryRoom(index) {
    setDraft((prev) => {
      const catRooms = prev.rooms.filter((r) => !r.is_whole_property);
      const wholeRoom = prev.rooms.filter((r) => r.is_whole_property);
      catRooms.splice(index, 1);
      return { ...prev, rooms: [...wholeRoom, ...catRooms] };
    });
  }

  function setBookingModel(mode) {
    setDraft((prev) => {
      let rooms = prev.rooms;
      const hasWhole = rooms.some((r) => r.is_whole_property);
      const hasCategory = rooms.some((r) => !r.is_whole_property);
      if ((mode === 'entire' || mode === 'mixed') && !hasWhole) {
        rooms = [createWholePropertyRoom(), ...rooms];
      }
      if (mode === 'entire') {
        rooms = rooms.filter((r) => r.is_whole_property);
      }
      if ((mode === 'room_based' || mode === 'mixed') && !hasCategory) {
        rooms = [...rooms, createCategoryRoom()];
      }
      if (mode === 'room_based') {
        rooms = rooms.filter((r) => !r.is_whole_property);
      }
      return { ...prev, property: { ...prev.property, property_type: mode }, rooms };
    });
  }

  // Merges the fields the owner accepted on the AI review screen into the
  // draft. Pricing, media, and compliance are never part of `applied` —
  // the AI response schema has no fields for them (see ai_service.js).
  function mergeAiDraft(applied) {
    setDraft((prev) => {
      const nextPropertyType = applied.propertyType || prev.property.property_type;
      const locationPatch = applied.city || applied.state ? matchLocation(applied.city, applied.state) : {};

      const property = {
        ...prev.property,
        ...(applied.title ? { name: applied.title } : {}),
        ...(applied.description ? { description: applied.description } : {}),
        ...(applied.category ? { type: applied.category } : {}),
        ...(applied.isPureVeg !== undefined ? { is_pure_veg: applied.isPureVeg } : {}),
        ...(applied.vacationType ? { vacation_type: applied.vacationType } : {}),
        property_type: nextPropertyType,
        ...locationPatch,
      };

      // Same restructuring setBookingModel does — ensure a whole-property
      // row exists for entire/mixed and a category row for room_based/mixed.
      let rooms = prev.rooms;
      if (nextPropertyType !== prev.property.property_type) {
        const hasWhole = rooms.some((r) => r.is_whole_property);
        const hasCategory = rooms.some((r) => !r.is_whole_property);
        if ((nextPropertyType === 'entire' || nextPropertyType === 'mixed') && !hasWhole) {
          rooms = [createWholePropertyRoom(), ...rooms];
        }
        if (nextPropertyType === 'entire') rooms = rooms.filter((r) => r.is_whole_property);
        if ((nextPropertyType === 'room_based' || nextPropertyType === 'mixed') && !hasCategory) {
          rooms = [...rooms, createCategoryRoom()];
        }
        if (nextPropertyType === 'room_based') rooms = rooms.filter((r) => !r.is_whole_property);
      }

      const roomAmenityIds = (applied.roomAmenities || [])
        .map((name) => amenitiesCatalog.find((a) => a.type === 'room' && a.name === name)?.id)
        .filter(Boolean);
      if (roomAmenityIds.length > 0 && rooms.length > 0) {
        rooms = rooms.map((r, i) => (i === 0 ? { ...r, amenity_ids: Array.from(new Set([...r.amenity_ids, ...roomAmenityIds])) } : r));
      }

      let bedrooms = prev.bedrooms;
      if ((applied.rooms || []).length > 0) {
        if (nextPropertyType === 'entire') {
          bedrooms = [...bedrooms, ...applied.rooms.map((r) => ({ name: r.roomName, bed_config: '', description: r.description || '' }))];
        } else {
          rooms = [...rooms, ...applied.rooms.map((r) => ({ ...createCategoryRoom(), room_name: r.roomName, description: r.description || '' }))];
        }
      }

      const propertyAmenityIds = (applied.propertyAmenities || [])
        .map((name) => amenitiesCatalog.find((a) => a.type === 'property' && a.name === name)?.id)
        .filter(Boolean);

      const experiences =
        (applied.experiences || []).length > 0
          ? applied.experiences.map((e) => ({ ...createExperienceDraft(e.experienceType || 'custom_package'), title: e.title, description: e.description || '' }))
          : prev.experiences;

      return {
        ...prev,
        property,
        rooms,
        bedrooms,
        amenities: { ...prev.amenities, property_allowed: Array.from(new Set([...prev.amenities.property_allowed, ...propertyAmenityIds])) },
        dietary_options: applied.dietaryOptions?.length > 0 ? applied.dietaryOptions : prev.dietary_options,
        experiences,
      };
    });
    setAiHelperStage('dismissed');
  }

  // ---- Basic Info: existing "Polish with AI" per-field assist ----
  async function handleAnalyze() {
    setAiState({ status: 'loading', description: '', suggestedAmenities: [], error: '' });
    try {
      const formData = new FormData();
      formData.append('name', draft.property.name);
      formData.append('type', draft.property.type);
      formData.append('location', draft.property.city || draft.property.custom_location_name || '');
      formData.append('description', draft.property.description);
      draft.images.slice(0, 5).forEach((file) => formData.append('images', file));

      const data = await api.analyzeProperty(formData, token);
      setAiState({
        status: 'ready',
        description: data.description || '',
        suggestedAmenities: Array.isArray(data.suggestedAmenities) ? data.suggestedAmenities : [],
        error: '',
      });
    } catch (err) {
      setAiState({ status: 'error', description: '', suggestedAmenities: [], error: err.message });
    }
  }

  function useAiDescription() {
    updateProperty({ description: aiState.description });
    setAiState((prev) => ({ ...prev, description: '' }));
  }

  function discardAiDescription() {
    setAiState((prev) => ({ ...prev, description: '' }));
  }

  function applyAiAmenities() {
    const matchedIds = propertyAmenities.filter((a) => aiState.suggestedAmenities.includes(a.name)).map((a) => a.id);
    setDraft((prev) => ({
      ...prev,
      amenities: {
        ...prev.amenities,
        property_allowed: Array.from(new Set([...prev.amenities.property_allowed, ...matchedIds])),
      },
    }));
    setAiState((prev) => ({ ...prev, suggestedAmenities: [] }));
  }

  function discardAiAmenities() {
    setAiState((prev) => ({ ...prev, suggestedAmenities: [] }));
  }

  // ---- Media handlers ----
  function handleImagesChange(event) {
    const files = Array.from(event.target.files || []);
    const combined = [...draft.images, ...files];
    const err = validatePropertyImages(combined);
    if (err) {
      setImageError(err);
      event.target.value = '';
      return;
    }
    setImageError('');
    setDraft((prev) => ({ ...prev, images: combined }));
    event.target.value = '';
  }

  function removeImage(index) {
    setDraft((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
    setPrimaryImageIndex((prev) => (prev === index ? 0 : prev > index ? prev - 1 : prev));
  }

  function handleVideosChange(event) {
    const files = Array.from(event.target.files || []);
    const combined = [...draft.videos, ...files];
    const err = validateVideos(combined);
    if (err) {
      setVideoError(err);
      event.target.value = '';
      return;
    }
    setVideoError('');
    setDraft((prev) => ({ ...prev, videos: combined }));
    event.target.value = '';
  }

  function removeVideo(index) {
    setDraft((prev) => ({ ...prev, videos: prev.videos.filter((_, i) => i !== index) }));
  }

  function handleRoomImagesChange(roomIndex, event) {
    const files = Array.from(event.target.files || []);
    updateCategoryRoom(roomIndex, { images: [...(categoryRooms[roomIndex]?.images || []), ...files] });
    event.target.value = '';
  }

  // ---- Validation ----
  function validateStep(idx) {
    const p = draft.property;
    if (idx === 0) {
      if (!p.name.trim()) return 'Property name is required.';
      if (!p.type) return 'Property category is required.';
      if (!p.description.trim()) return 'Description is required.';
    }
    if (idx === 1) {
      if (p.location_type === 'existing') {
        if (!p.state || !p.city) return 'State and city are required.';
      } else if (!p.custom_location_name.trim() || !p.state) {
        return 'Location name and state are required.';
      }
    }
    if (idx === 3) {
      if (draft.experiences.length === 0) return 'Add at least one experience.';
      const bad = draft.experiences.find((e) => !e.title.trim());
      if (bad) return 'Every experience needs a title.';
      const badPrice = draft.experiences.find((e) => e.price !== '' && Number(e.price) < 0);
      if (badPrice) return 'Experience prices cannot be negative.';
    }
    if (idx === 4 && draft.packages.length > 0) {
      const bad = draft.packages.find((pk) => !pk.package_name.trim() || !pk.experience_type);
      if (bad) return 'Every package needs a name and a linked experience.';
    }
    if (idx === 5 && p.property_type !== 'entire') {
      if (categoryRooms.length === 0) return 'Add at least one room category.';
      const bad = categoryRooms.find((r) => !r.room_name.trim() || !r.room_type);
      if (bad) return 'Every room needs a name and a room type.';
    }
    if (idx === 8) {
      const err = validatePropertyImages(draft.images);
      if (err) return err;
      const videoErr = validateVideos(draft.videos);
      if (videoErr) return videoErr;
    }
    if (idx === 9) {
      if (p.property_type === 'entire' || p.property_type === 'mixed') {
        if (!wholePropertyRoom.weekday_price || Number(wholePropertyRoom.weekday_price) <= 0) return 'Set a weekday price.';
        if (!wholePropertyRoom.weekend_price || Number(wholePropertyRoom.weekend_price) <= 0) return 'Set a weekend price.';
      }
      if (p.property_type === 'room_based' || p.property_type === 'mixed') {
        const badRoom = categoryRooms.find((r) => !r.weekday_price || Number(r.weekday_price) <= 0 || !r.weekend_price || Number(r.weekend_price) <= 0);
        if (badRoom) return 'Every room needs a weekday and weekend price.';
      }
      if (p.weekend_days.length === 0) return 'Pick at least one weekend day.';
    }
    if (idx === 12 && !draft.consentAccepted) {
      return 'You must accept the Privacy Policy to submit a property.';
    }
    return '';
  }

  function goNext() {
    const err = validateStep(stepIndex);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError('');
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function goBack() {
    setStepError('');
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function buildPayload() {
    const meal_plans = Object.entries(draft.meal_plans).map(([plan_type, v]) => ({
      plan_type,
      included: v.included,
      extra_cost: v.extra_cost === '' ? null : v.extra_cost,
    }));

    return {
      property: {
        ...draft.property,
        cleaning_fee: draft.property.cleaning_fee || null,
        service_fee: draft.property.service_fee || null,
        tax_percentage: draft.property.tax_percentage || null,
        max_guests: draft.property.max_guests || null,
        bedroom_count: draft.property.bedroom_count || null,
        price_per_child: draft.property.price_per_child || null,
        dietary_options: draft.dietary_options,
      },
      amenities: draft.amenities,
      rooms: draft.rooms.map(({ images: _images, ...room }) => room),
      bedrooms: draft.bedrooms,
      experiences: draft.experiences,
      packages: draft.packages,
      meal_plans,
      activities: draft.activities,
      event_facilities: draft.event_facilities,
      event_capacities: draft.event_capacities,
      event_types: draft.event_types,
      compliance: draft.compliance,
    };
  }

  async function handleSubmit() {
    const err = validateStep(12);
    if (err) {
      setStepError(err);
      return;
    }
    setSubmitError('');
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('data', JSON.stringify(buildPayload()));
      formData.append('primary_image_index', String(primaryImageIndex));
      draft.images.forEach((file) => formData.append('images', file));
      draft.videos.forEach((file) => formData.append('videos', file));
      draft.rooms.forEach((room, idx) => {
        (room.images || []).forEach((file) => formData.append(`room_images_${idx}`, file));
      });

      const data = await api.createProperty(formData, token);
      clearDraft();
      router.push(`/property/${data.property.id}`);
    } catch (err) {
      setSubmitError(err.message);
      setSubmitting(false);
    }
  }

  if (!ready || !restored) return null;

  const p = draft.property;

  return (
    <div className={styles.wizard}>
      <div className={styles.progressBar}>
        {STEPS.map((label, index) => (
          <button
            key={label}
            type="button"
            className={`${styles.progressStep} ${index === stepIndex ? styles.progressStepActive : ''} ${index < stepIndex ? styles.progressStepDone : ''}`}
            onClick={() => index < stepIndex && setStepIndex(index)}
            disabled={index > stepIndex}
          >
            <span className={styles.progressIndex}>{index + 1}</span>
            <span className={styles.progressLabel}>{label}</span>
          </button>
        ))}
      </div>

      <div className={styles.form}>
        {/* Step 0: Basic Info */}
        {stepIndex === 0 && aiHelperStage === 'intro' && (
          <div className={styles.aiPanel}>
            <p className={styles.aiPanelLabel}>New here?</p>
            <p className={styles.aiPanelText}>
              Let the AI Form Helper draft a starting point from a description, photos, a PDF, a link, or a document —
              you review and edit everything before it&apos;s saved.
            </p>
            <div className={styles.aiPanelActions}>
              <Button type="button" size="small" onClick={() => setAiHelperStage('intake')}>
                ✨ Use AI Form Helper
              </Button>
              <Button type="button" variant="secondary" size="small" onClick={() => setAiHelperStage('dismissed')}>
                Start from scratch
              </Button>
            </div>
          </div>
        )}

        {stepIndex === 0 && aiHelperStage === 'intake' && (
          <AiFormHelper
            token={token}
            onCancel={() => setAiHelperStage('intro')}
            onDraft={(result) => {
              setAiDraftResult(result);
              setAiHelperStage('reviewing');
            }}
          />
        )}

        {stepIndex === 0 && aiHelperStage === 'reviewing' && aiDraftResult && (
          <AiSuggestionsReview
            result={aiDraftResult}
            onBack={() => setAiHelperStage('intake')}
            onApply={mergeAiDraft}
            onSkip={() => setAiHelperStage('dismissed')}
          />
        )}

        {stepIndex === 0 && (aiHelperStage === 'dismissed' || aiHelperStage === 'intro') && (
          <>
            <Input label="Property name" name="name" value={p.name} onChange={(e) => updateProperty({ name: e.target.value })} placeholder="Ridgeview Cabin" required />
            <div className={styles.row}>
              <Input label="Category" name="type" as="select" value={p.type} onChange={(e) => updateProperty({ type: e.target.value })}>
                {PROPERTY_CATEGORIES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Input>
              <Input label="Country" value={p.country} disabled />
            </div>
            <Input label="Description" name="description" as="textarea" rows={5} value={p.description} onChange={(e) => updateProperty({ description: e.target.value })} placeholder="What makes this stay worth the drive?" required />

            <div className={styles.aiRow}>
              <Button type="button" variant="secondary" size="small" disabled={aiState.status === 'loading' || (!p.description.trim() && draft.images.length === 0)} onClick={handleAnalyze}>
                {aiState.status === 'loading' ? 'Analyzing…' : '✨ Polish with AI'}
              </Button>
              {aiState.status === 'error' && <p className={styles.error}>{aiState.error}</p>}
            </div>
            {aiState.description && (
              <div className={styles.aiPanel}>
                <p className={styles.aiPanelLabel}>Suggested description</p>
                <p className={styles.aiPanelText}>{aiState.description}</p>
                <div className={styles.aiPanelActions}>
                  <Button type="button" size="small" onClick={useAiDescription}>Use this</Button>
                  <Button type="button" variant="secondary" size="small" onClick={discardAiDescription}>Discard</Button>
                </div>
              </div>
            )}
            {aiState.suggestedAmenities.length > 0 && (
              <div className={styles.aiPanel}>
                <p className={styles.aiPanelLabel}>Suggested amenities</p>
                <ul className={styles.aiAmenityList}>
                  {aiState.suggestedAmenities.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
                <div className={styles.aiPanelActions}>
                  <Button type="button" size="small" onClick={applyAiAmenities}>Apply selected</Button>
                  <Button type="button" variant="secondary" size="small" onClick={discardAiAmenities}>Discard</Button>
                </div>
              </div>
            )}

            <Input label="Terms & conditions (optional)" as="textarea" rows={3} value={p.terms_and_conditions} onChange={(e) => updateProperty({ terms_and_conditions: e.target.value })} />
            <Input label="WhatsApp share note (optional)" as="textarea" rows={2} value={p.whatsapp_share_note} onChange={(e) => updateProperty({ whatsapp_share_note: e.target.value })} />

            <div className={styles.field}>
              <label className={styles.label}>Is this a pure veg property?</label>
              <ToggleGroup name="pure_veg" options={[{ value: true, label: 'Yes' }, { value: false, label: 'No' }]} value={p.is_pure_veg} onChange={(v) => updateProperty({ is_pure_veg: v })} />
            </div>
          </>
        )}

        {/* Step 1: Location */}
        {stepIndex === 1 && (
          <>
            <div className={styles.field}>
              <label className={styles.label}>Location type</label>
              <ToggleGroup
                name="location_type"
                options={[{ value: 'existing', label: 'Select from list' }, { value: 'custom', label: 'Add custom location' }]}
                value={p.location_type}
                onChange={(v) => updateProperty({ location_type: v })}
              />
            </div>

            {p.location_type === 'existing' ? (
              <div className={styles.row}>
                <Input label="State" as="select" value={p.state} onChange={(e) => updateProperty({ state: e.target.value, city: '' })}>
                  <option value="">Select a state</option>
                  {Object.keys(INDIA_STATES).map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </Input>
                <Input label="City" as="select" value={p.city} onChange={(e) => updateProperty({ city: e.target.value })} disabled={!p.state}>
                  <option value="">Select a city</option>
                  {getCitiesForState(p.state).map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </Input>
              </div>
            ) : (
              <div className={styles.row}>
                <Input label="Location name" value={p.custom_location_name} onChange={(e) => updateProperty({ custom_location_name: e.target.value })} placeholder="Blue Ridge Hollow" />
                <Input label="State" as="select" value={p.state} onChange={(e) => updateProperty({ state: e.target.value })}>
                  <option value="">Select a state</option>
                  {Object.keys(INDIA_STATES).map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </Input>
              </div>
            )}
            <Input label="Address (optional)" value={p.address} onChange={(e) => updateProperty({ address: e.target.value })} />
          </>
        )}

        {/* Step 2: Property Type & Vacation */}
        {stepIndex === 2 && (
          <>
            <div className={styles.field}>
              <label className={styles.label}>Property booking model</label>
              <ToggleGroup name="booking_model" options={BOOKING_MODELS} value={p.property_type} onChange={setBookingModel} />
            </div>
            {p.property_type !== 'room_based' && (
              <Input label="Number of bedrooms" type="number" min="0" value={p.bedroom_count} onChange={(e) => updateProperty({ bedroom_count: e.target.value })} />
            )}
            <div className={styles.field}>
              <label className={styles.label}>Is this a day picnic property?</label>
              <ToggleGroup name="day_picnic" options={[{ value: true, label: 'Yes' }, { value: false, label: 'No' }]} value={p.is_day_picnic} onChange={(v) => updateProperty({ is_day_picnic: v })} />
            </div>
            <Input label="Vacation type" as="select" value={p.vacation_type} onChange={(e) => updateProperty({ vacation_type: e.target.value })}>
              <option value="">Select a vacation type</option>
              {VACATION_TYPES.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </Input>
          </>
        )}

        {/* Step 3: Experience Builder */}
        {stepIndex === 3 && (
          <>
            {draft.experiences.map((exp, index) => (
              <div key={index} className={styles.card}>
                <div className={styles.cardHeader}>
                  <span>Experience {index + 1}</span>
                  {draft.experiences.length > 1 && (
                    <button type="button" className={styles.removeLink} onClick={() => setDraft((prev) => ({ ...prev, experiences: prev.experiences.filter((_, i) => i !== index) }))}>
                      Remove
                    </button>
                  )}
                </div>
                <div className={styles.row}>
                  <Input
                    label="Experience type"
                    as="select"
                    value={exp.experience_type}
                    onChange={(e) => {
                      const next = [...draft.experiences];
                      next[index] = { ...exp, experience_type: e.target.value, title: exp.title || experienceLabel(e.target.value) };
                      setDraft((prev) => ({ ...prev, experiences: next }));
                    }}
                  >
                    {EXPERIENCE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </Input>
                  <Input
                    label="Title"
                    value={exp.title}
                    onChange={(e) => {
                      const next = [...draft.experiences];
                      next[index] = { ...exp, title: e.target.value };
                      setDraft((prev) => ({ ...prev, experiences: next }));
                    }}
                  />
                </div>
                <Input
                  label="Description"
                  as="textarea"
                  rows={2}
                  value={exp.description}
                  onChange={(e) => {
                    const next = [...draft.experiences];
                    next[index] = { ...exp, description: e.target.value };
                    setDraft((prev) => ({ ...prev, experiences: next }));
                  }}
                />
                <div className={styles.row}>
                  <Input
                    label="Pricing model"
                    as="select"
                    value={exp.pricing_model}
                    onChange={(e) => {
                      const next = [...draft.experiences];
                      next[index] = { ...exp, pricing_model: e.target.value };
                      setDraft((prev) => ({ ...prev, experiences: next }));
                    }}
                  >
                    {PRICING_MODELS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </Input>
                  <Input
                    label="Base price (₹)"
                    type="number"
                    min="0"
                    value={exp.price}
                    onChange={(e) => {
                      const next = [...draft.experiences];
                      next[index] = { ...exp, price: e.target.value };
                      setDraft((prev) => ({ ...prev, experiences: next }));
                    }}
                  />
                </div>
                <Input
                  label="Availability (e.g. Weekends, All Days)"
                  value={exp.availability_note}
                  onChange={(e) => {
                    const next = [...draft.experiences];
                    next[index] = { ...exp, availability_note: e.target.value };
                    setDraft((prev) => ({ ...prev, experiences: next }));
                  }}
                />
                <div className={styles.row}>
                  <Input
                    label="Inclusions"
                    as="textarea"
                    rows={2}
                    value={exp.inclusions}
                    onChange={(e) => {
                      const next = [...draft.experiences];
                      next[index] = { ...exp, inclusions: e.target.value };
                      setDraft((prev) => ({ ...prev, experiences: next }));
                    }}
                  />
                  <Input
                    label="Exclusions"
                    as="textarea"
                    rows={2}
                    value={exp.exclusions}
                    onChange={(e) => {
                      const next = [...draft.experiences];
                      next[index] = { ...exp, exclusions: e.target.value };
                      setDraft((prev) => ({ ...prev, experiences: next }));
                    }}
                  />
                </div>
              </div>
            ))}
            <Button type="button" variant="secondary" size="small" onClick={() => setDraft((prev) => ({ ...prev, experiences: [...prev.experiences, createExperienceDraft()] }))}>
              + Add experience
            </Button>
          </>
        )}

        {/* Step 4: Package Builder */}
        {stepIndex === 4 && (
          <>
            {draft.packages.map((pkg, index) => (
              <div key={index} className={styles.card}>
                <div className={styles.cardHeader}>
                  <span>Package {index + 1}</span>
                  <button type="button" className={styles.removeLink} onClick={() => setDraft((prev) => ({ ...prev, packages: prev.packages.filter((_, i) => i !== index) }))}>
                    Remove
                  </button>
                </div>
                <div className={styles.row}>
                  <Input
                    label="Package name"
                    value={pkg.package_name}
                    onChange={(e) => {
                      const next = [...draft.packages];
                      next[index] = { ...pkg, package_name: e.target.value };
                      setDraft((prev) => ({ ...prev, packages: next }));
                    }}
                  />
                  <Input
                    label="Linked experience"
                    as="select"
                    value={pkg.experience_type}
                    onChange={(e) => {
                      const next = [...draft.packages];
                      next[index] = { ...pkg, experience_type: e.target.value };
                      setDraft((prev) => ({ ...prev, packages: next }));
                    }}
                  >
                    <option value="">Select an experience</option>
                    {draft.experiences.map((exp) => (
                      <option key={exp.experience_type} value={exp.experience_type}>{exp.title || experienceLabel(exp.experience_type)}</option>
                    ))}
                  </Input>
                </div>
                <div className={styles.row}>
                  <Input
                    label="Duration (e.g. 2D/1N)"
                    value={pkg.duration}
                    onChange={(e) => {
                      const next = [...draft.packages];
                      next[index] = { ...pkg, duration: e.target.value };
                      setDraft((prev) => ({ ...prev, packages: next }));
                    }}
                  />
                  <Input
                    label="Package price (₹)"
                    type="number"
                    min="0"
                    value={pkg.price}
                    onChange={(e) => {
                      const next = [...draft.packages];
                      next[index] = { ...pkg, price: e.target.value };
                      setDraft((prev) => ({ ...prev, packages: next }));
                    }}
                  />
                </div>
                <Input
                  label="Meal plan note"
                  value={pkg.meal_plan_note}
                  onChange={(e) => {
                    const next = [...draft.packages];
                    next[index] = { ...pkg, meal_plan_note: e.target.value };
                    setDraft((prev) => ({ ...prev, packages: next }));
                  }}
                />
                <div className={styles.row}>
                  <Input
                    label="Inclusions"
                    as="textarea"
                    rows={2}
                    value={pkg.inclusions}
                    onChange={(e) => {
                      const next = [...draft.packages];
                      next[index] = { ...pkg, inclusions: e.target.value };
                      setDraft((prev) => ({ ...prev, packages: next }));
                    }}
                  />
                  <Input
                    label="Exclusions"
                    as="textarea"
                    rows={2}
                    value={pkg.exclusions}
                    onChange={(e) => {
                      const next = [...draft.packages];
                      next[index] = { ...pkg, exclusions: e.target.value };
                      setDraft((prev) => ({ ...prev, packages: next }));
                    }}
                  />
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              size="small"
              disabled={draft.experiences.length === 0}
              onClick={() => setDraft((prev) => ({ ...prev, packages: [...prev.packages, createPackageDraft(prev.experiences[0]?.experience_type || '')] }))}
            >
              + Add package
            </Button>
          </>
        )}

        {/* Step 5: Room Configuration */}
        {stepIndex === 5 && (
          <>
            {(p.property_type === 'entire' || p.property_type === 'mixed') && (
              <div className={styles.card}>
                <div className={styles.cardHeader}><span>Whole property pricing basis</span></div>
                <Input label="Price calculation type" as="select" value={wholePropertyRoom.price_type} onChange={(e) => updateWholePropertyRoom({ price_type: e.target.value })}>
                  {PRICE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Input>
                {wholePropertyRoom.price_type === 'per_person' && (
                  <Input label="Minimum guests required" type="number" min="1" value={wholePropertyRoom.min_guests} onChange={(e) => updateWholePropertyRoom({ min_guests: e.target.value })} />
                )}
                <div className={styles.field}>
                  <label className={styles.label}>Available for experiences</label>
                  <div className={styles.chipGroup}>
                    {draft.experiences.map((exp) => (
                      <Chip
                        key={exp.experience_type}
                        label={exp.title || experienceLabel(exp.experience_type)}
                        checked={wholePropertyRoom.experience_types.includes(exp.experience_type)}
                        onChange={() => updateWholePropertyRoom({ experience_types: toggleInArray(wholePropertyRoom.experience_types, exp.experience_type) })}
                      />
                    ))}
                  </div>
                </div>

                {p.property_type === 'entire' && (
                  <>
                    <div className={styles.cardHeader}><span>Bedrooms</span></div>
                    {draft.bedrooms.map((bedroom, index) => (
                      <div key={index} className={styles.subcard}>
                        <div className={styles.row}>
                          <Input
                            label="Bedroom name"
                            value={bedroom.name}
                            onChange={(e) => {
                              const next = [...draft.bedrooms];
                              next[index] = { ...bedroom, name: e.target.value };
                              setDraft((prev) => ({ ...prev, bedrooms: next }));
                            }}
                          />
                          <Input
                            label="Bed configuration"
                            value={bedroom.bed_config}
                            onChange={(e) => {
                              const next = [...draft.bedrooms];
                              next[index] = { ...bedroom, bed_config: e.target.value };
                              setDraft((prev) => ({ ...prev, bedrooms: next }));
                            }}
                            placeholder="1 Queen, 1 Single"
                          />
                        </div>
                        <button type="button" className={styles.removeLink} onClick={() => setDraft((prev) => ({ ...prev, bedrooms: prev.bedrooms.filter((_, i) => i !== index) }))}>
                          Remove bedroom
                        </button>
                      </div>
                    ))}
                    <Button type="button" variant="secondary" size="small" onClick={() => setDraft((prev) => ({ ...prev, bedrooms: [...prev.bedrooms, { name: '', bed_config: '', description: '' }] }))}>
                      + Add bedroom
                    </Button>
                  </>
                )}
              </div>
            )}

            {(p.property_type === 'room_based' || p.property_type === 'mixed') && (
              <>
                {categoryRooms.map((room, index) => (
                  <div key={index} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <span>Room category {index + 1}</span>
                      <button type="button" className={styles.removeLink} onClick={() => removeCategoryRoom(index)}>Remove</button>
                    </div>
                    <div className={styles.row}>
                      <Input label="Room category name" value={room.room_name} onChange={(e) => updateCategoryRoom(index, { room_name: e.target.value })} />
                      <Input label="Room type" as="select" value={room.room_type} onChange={(e) => updateCategoryRoom(index, { room_type: e.target.value })}>
                        <option value="">Select a room type</option>
                        {ROOM_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </Input>
                    </div>
                    <div className={styles.row}>
                      <Input label="Check-in time" type="time" value={room.check_in_time} onChange={(e) => updateCategoryRoom(index, { check_in_time: e.target.value })} />
                      <Input label="Check-out time" type="time" value={room.check_out_time} onChange={(e) => updateCategoryRoom(index, { check_out_time: e.target.value })} />
                    </div>
                    <Input label="Room view (optional)" as="select" value={room.room_view} onChange={(e) => updateCategoryRoom(index, { room_view: e.target.value })}>
                      <option value="">Select a view</option>
                      {ROOM_VIEWS.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </Input>
                    <Input label="Description" as="textarea" rows={2} value={room.description} onChange={(e) => updateCategoryRoom(index, { description: e.target.value })} />
                    <div className={styles.row}>
                      <Input label="Max adults" type="number" min="1" value={room.max_adults} onChange={(e) => updateCategoryRoom(index, { max_adults: e.target.value })} />
                      <Input label="Max children" type="number" min="0" value={room.max_children} onChange={(e) => updateCategoryRoom(index, { max_children: e.target.value })} />
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>Bed configuration</label>
                      {room.beds.map((bed, bedIndex) => (
                        <div key={bedIndex} className={styles.row}>
                          <Input as="select" value={bed.bed_type} onChange={(e) => {
                            const beds = [...room.beds];
                            beds[bedIndex] = { ...bed, bed_type: e.target.value };
                            updateCategoryRoom(index, { beds });
                          }}>
                            <option value="">Select a bed type</option>
                            {BED_TYPES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </Input>
                          <Input type="number" min="1" value={bed.quantity} onChange={(e) => {
                            const beds = [...room.beds];
                            beds[bedIndex] = { ...bed, quantity: e.target.value };
                            updateCategoryRoom(index, { beds });
                          }} />
                        </div>
                      ))}
                      <Button type="button" variant="secondary" size="small" onClick={() => updateCategoryRoom(index, { beds: [...room.beds, { bed_type: '', quantity: 1 }] })}>
                        + Add bed
                      </Button>
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>Room amenities</label>
                      <div className={styles.chipGroup}>
                        {roomAmenitiesCatalog.map((a) => (
                          <Chip key={a.id} label={a.name} checked={room.amenity_ids.includes(a.id)} onChange={() => updateCategoryRoom(index, { amenity_ids: toggleInArray(room.amenity_ids, a.id) })} />
                        ))}
                      </div>
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>Available for experiences</label>
                      <div className={styles.chipGroup}>
                        {draft.experiences.map((exp) => (
                          <Chip
                            key={exp.experience_type}
                            label={exp.title || experienceLabel(exp.experience_type)}
                            checked={room.experience_types.includes(exp.experience_type)}
                            onChange={() => updateCategoryRoom(index, { experience_types: toggleInArray(room.experience_types, exp.experience_type) })}
                          />
                        ))}
                      </div>
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>Room images</label>
                      <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => handleRoomImagesChange(index, e)} />
                      {room.images.length > 0 && (
                        <div className={styles.thumbGrid}>
                          {room.images.map((file, i) => (
                            <div key={`${file.name}-${i}`} className={styles.thumb}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={URL.createObjectURL(file)} alt={file.name} />
                              <button type="button" className={styles.thumbRemove} onClick={() => updateCategoryRoom(index, { images: room.images.filter((_, i2) => i2 !== i) })}>×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <Button type="button" variant="secondary" size="small" onClick={addCategoryRoom}>+ Add room category</Button>
              </>
            )}
          </>
        )}

        {/* Step 6: Amenities */}
        {stepIndex === 6 && (
          <>
            {amenitiesStatus === 'error' && <p className={styles.error}>Couldn&apos;t load amenities. Try refreshing.</p>}
            <div className={styles.field}>
              <label className={styles.label}>Property amenities</label>
              <div className={styles.amenityGrid}>
                {propertyAmenities.map((a) => (
                  <label key={a.id} className={styles.amenityOption}>
                    <input
                      type="checkbox"
                      checked={draft.amenities.property_allowed.includes(a.id)}
                      onChange={() => setDraft((prev) => ({ ...prev, amenities: { ...prev.amenities, property_allowed: toggleInArray(prev.amenities.property_allowed, a.id) } }))}
                    />
                    {a.name}
                  </label>
                ))}
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Restrictions</label>
              <div className={styles.amenityGrid}>
                {restrictedAmenities.map((a) => (
                  <label key={a.id} className={styles.amenityOption}>
                    <input
                      type="checkbox"
                      checked={draft.amenities.property_not_allowed.includes(a.id)}
                      onChange={() => setDraft((prev) => ({ ...prev, amenities: { ...prev.amenities, property_not_allowed: toggleInArray(prev.amenities.property_not_allowed, a.id) } }))}
                    />
                    {a.name}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Step 7: Activities */}
        {stepIndex === 7 && (
          <>
            {Object.entries(
              ACTIVITIES.reduce((groups, activity) => {
                (groups[activity.category] ||= []).push(activity);
                return groups;
              }, {})
            ).map(([category, items]) => (
              <div key={category} className={styles.field}>
                <label className={styles.label}>{category}</label>
                {items.map((activity) => {
                  const selected = draft.activities.find((a) => a.activity_key === activity.key);
                  return (
                    <div key={activity.key} className={styles.subcard}>
                      <label className={styles.amenityOption}>
                        <input
                          type="checkbox"
                          checked={Boolean(selected)}
                          onChange={() =>
                            setDraft((prev) => ({
                              ...prev,
                              activities: selected
                                ? prev.activities.filter((a) => a.activity_key !== activity.key)
                                : [...prev.activities, { activity_key: activity.key, is_paid: false, pricing_type: 'per_person', price: '' }],
                            }))
                          }
                        />
                        {activity.name}
                      </label>
                      {selected && (
                        <div className={styles.row}>
                          <label className={styles.amenityOption}>
                            <input
                              type="checkbox"
                              checked={selected.is_paid}
                              onChange={() =>
                                setDraft((prev) => ({
                                  ...prev,
                                  activities: prev.activities.map((a) => (a.activity_key === activity.key ? { ...a, is_paid: !a.is_paid } : a)),
                                }))
                              }
                            />
                            Paid activity
                          </label>
                          {selected.is_paid && (
                            <>
                              <Input as="select" value={selected.pricing_type} onChange={(e) =>
                                setDraft((prev) => ({ ...prev, activities: prev.activities.map((a) => (a.activity_key === activity.key ? { ...a, pricing_type: e.target.value } : a)) }))
                              }>
                                <option value="per_person">Per person</option>
                                <option value="group">Group</option>
                              </Input>
                              <Input type="number" min="0" placeholder="Price (₹)" value={selected.price} onChange={(e) =>
                                setDraft((prev) => ({ ...prev, activities: prev.activities.map((a) => (a.activity_key === activity.key ? { ...a, price: e.target.value } : a)) }))
                              } />
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            <Input label="Other activities (notes)" as="textarea" rows={2} value={draft.custom_activities_note} onChange={(e) => setDraft((prev) => ({ ...prev, custom_activities_note: e.target.value }))} />
          </>
        )}

        {/* Step 8: Media Center */}
        {stepIndex === 8 && (
          <>
            <div className={styles.field}>
              <label className={styles.label}>Photos * (up to {MAX_PROPERTY_IMAGES})</label>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImagesChange} />
              {imageError && <p className={styles.error}>{imageError}</p>}
              {draft.images.length > 0 && (
                <div className={styles.thumbGrid}>
                  {draft.images.map((file, index) => (
                    <div key={`${file.name}-${index}`} className={styles.thumb}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={URL.createObjectURL(file)} alt={file.name} />
                      {index === primaryImageIndex && <span className={styles.primaryBadge}>Primary</span>}
                      <button type="button" className={styles.thumbRemove} onClick={() => removeImage(index)} aria-label={`Remove ${file.name}`}>×</button>
                      {index !== primaryImageIndex && (
                        <button type="button" className={styles.makePrimary} onClick={() => setPrimaryImageIndex(index)}>Set primary</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Property videos (optional, up to 5)</label>
              <input type="file" accept="video/mp4,video/quicktime,video/webm" multiple onChange={handleVideosChange} />
              {videoError && <p className={styles.error}>{videoError}</p>}
              {draft.videos.map((file, index) => (
                <div key={`${file.name}-${index}`} className={styles.videoRow}>
                  <span>{file.name} ({(file.size / (1024 * 1024)).toFixed(1)}MB)</span>
                  <button type="button" className={styles.removeLink} onClick={() => removeVideo(index)}>Remove</button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Step 9: Pricing */}
        {stepIndex === 9 && (
          <>
            <div className={styles.field}>
              <label className={styles.label}>Booking model</label>
              <ToggleGroup name="booking_model_pricing" options={BOOKING_MODELS} value={p.property_type} onChange={setBookingModel} />
            </div>

            {(p.property_type === 'entire' || p.property_type === 'mixed') && (
              <div className={styles.card}>
                <div className={styles.cardHeader}><span>Whole-property pricing</span></div>
                <div className={styles.row}>
                  <Input label="Weekday price (₹)" type="number" min="0" value={wholePropertyRoom.weekday_price} onChange={(e) => updateWholePropertyRoom({ weekday_price: e.target.value })} required />
                  <Input label="Weekend price (₹)" type="number" min="0" value={wholePropertyRoom.weekend_price} onChange={(e) => updateWholePropertyRoom({ weekend_price: e.target.value })} required />
                </div>
                <div className={styles.row}>
                  <Input label="Maximum guests" type="number" min="1" value={p.max_guests} onChange={(e) => updateProperty({ max_guests: e.target.value })} />
                  <Input label="Tax %" type="number" min="0" max="100" value={wholePropertyRoom.tax_percentage} onChange={(e) => updateWholePropertyRoom({ tax_percentage: e.target.value })} disabled={wholePropertyRoom.tax_included} />
                </div>
                <ToggleGroup name="tax_whole" options={[{ value: true, label: 'Tax included' }, { value: false, label: 'Tax extra' }]} value={wholePropertyRoom.tax_included} onChange={(v) => updateWholePropertyRoom({ tax_included: v })} />
              </div>
            )}

            {(p.property_type === 'room_based' || p.property_type === 'mixed') && (
              <div className={styles.card}>
                <div className={styles.cardHeader}><span>Per-room pricing</span></div>
                {categoryRooms.map((room, index) => (
                  <div key={index} className={styles.subcard}>
                    <p className={styles.subcardTitle}>{room.room_name || `Room ${index + 1}`}</p>
                    <div className={styles.row}>
                      <Input label="Weekday price (₹)" type="number" min="0" value={room.weekday_price} onChange={(e) => updateCategoryRoom(index, { weekday_price: e.target.value })} required />
                      <Input label="Weekend price (₹)" type="number" min="0" value={room.weekend_price} onChange={(e) => updateCategoryRoom(index, { weekend_price: e.target.value })} required />
                    </div>
                    <div className={styles.row}>
                      <Input label="Weekday extra adult rate (₹)" type="number" min="0" value={room.weekday_extra_adult_rate} onChange={(e) => updateCategoryRoom(index, { weekday_extra_adult_rate: e.target.value })} />
                      <Input label="Weekend extra adult rate (₹)" type="number" min="0" value={room.weekend_extra_adult_rate} onChange={(e) => updateCategoryRoom(index, { weekend_extra_adult_rate: e.target.value })} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.field}>
              <label className={styles.label}>Weekend days</label>
              <div className={styles.chipGroup}>
                {WEEKDAY_NAMES.map((day) => (
                  <Chip key={day} label={day} checked={p.weekend_days.includes(day)} onChange={() => updateProperty({ weekend_days: toggleInArray(p.weekend_days, day) })} />
                ))}
              </div>
            </div>

            <div className={styles.row}>
              <Input label="Cleaning fee (₹)" type="number" min="0" value={p.cleaning_fee} onChange={(e) => updateProperty({ cleaning_fee: e.target.value })} />
              <Input label="Service fee (₹)" type="number" min="0" value={p.service_fee} onChange={(e) => updateProperty({ service_fee: e.target.value })} />
            </div>

            <div className={styles.field}>
              <label className={styles.amenityOption}>
                <input type="checkbox" checked={p.child_pricing_enabled} onChange={(e) => updateProperty({ child_pricing_enabled: e.target.checked })} />
                Charge for children age 6+
              </label>
              {p.child_pricing_enabled && <Input type="number" min="0" placeholder="Price per child (₹)" value={p.price_per_child} onChange={(e) => updateProperty({ price_per_child: e.target.value })} />}
            </div>

            <Input label="Pricing tier" as="select" value={p.pricing_type} onChange={(e) => updateProperty({ pricing_type: e.target.value })}>
              {PRICING_TIERS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Input>

            <div className={styles.field}>
              <label className={styles.label}>Meal plans</label>
              {MEAL_PLAN_LABELS.map(({ plan_type, label }) => (
                <div key={plan_type} className={styles.row}>
                  <label className={styles.amenityOption}>
                    <input
                      type="radio"
                      name="included_meal_plan"
                      checked={draft.meal_plans[plan_type]?.included}
                      onChange={() =>
                        setDraft((prev) => ({
                          ...prev,
                          meal_plans: Object.fromEntries(Object.entries(prev.meal_plans).map(([k, v]) => [k, { ...v, included: k === plan_type }])),
                        }))
                      }
                    />
                    {label}
                  </label>
                  {plan_type !== 'No Meal' && !draft.meal_plans[plan_type]?.included && (
                    <Input
                      type="number"
                      min="0"
                      placeholder="Extra cost (₹)"
                      value={draft.meal_plans[plan_type]?.extra_cost}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, meal_plans: { ...prev.meal_plans, [plan_type]: { ...prev.meal_plans[plan_type], extra_cost: e.target.value } } }))
                      }
                    />
                  )}
                </div>
              ))}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Dietary options</label>
              <div className={styles.chipGroup}>
                {DIETARY_OPTIONS.map((d) => (
                  <Chip key={d} label={d} checked={draft.dietary_options.includes(d)} onChange={() => setDraft((prev) => ({ ...prev, dietary_options: toggleInArray(prev.dietary_options, d) }))} />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Step 10: Corporate & Event */}
        {stepIndex === 10 && (
          <>
            <div className={styles.row}>
              <label className={styles.amenityOption}>
                <input type="checkbox" checked={draft.event_facilities.conference_hall} onChange={(e) => setDraft((prev) => ({ ...prev, event_facilities: { ...prev.event_facilities, conference_hall: e.target.checked } }))} />
                Conference hall
              </label>
              <label className={styles.amenityOption}>
                <input type="checkbox" checked={draft.event_facilities.meeting_room} onChange={(e) => setDraft((prev) => ({ ...prev, event_facilities: { ...prev.event_facilities, meeting_room: e.target.checked } }))} />
                Meeting room
              </label>
            </div>
            <div className={styles.row}>
              <Input label="Lawn capacity (guests)" type="number" min="0" value={draft.event_facilities.lawn_capacity} onChange={(e) => setDraft((prev) => ({ ...prev, event_facilities: { ...prev.event_facilities, lawn_capacity: e.target.value } }))} />
              <Input label="Banquet capacity (guests)" type="number" min="0" value={draft.event_facilities.banquet_capacity} onChange={(e) => setDraft((prev) => ({ ...prev, event_facilities: { ...prev.event_facilities, banquet_capacity: e.target.value } }))} />
              <Input label="Parking capacity (cars)" type="number" min="0" value={draft.event_facilities.parking_capacity} onChange={(e) => setDraft((prev) => ({ ...prev, event_facilities: { ...prev.event_facilities, parking_capacity: e.target.value } }))} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Additional capacities</label>
              {draft.event_capacities.map((cap, index) => (
                <div key={index} className={styles.row}>
                  <Input placeholder="Capacity name" value={cap.capacity_name} onChange={(e) => {
                    const next = [...draft.event_capacities];
                    next[index] = { ...cap, capacity_name: e.target.value };
                    setDraft((prev) => ({ ...prev, event_capacities: next }));
                  }} />
                  <Input placeholder="Value" value={cap.capacity_value} onChange={(e) => {
                    const next = [...draft.event_capacities];
                    next[index] = { ...cap, capacity_value: e.target.value };
                    setDraft((prev) => ({ ...prev, event_capacities: next }));
                  }} />
                  <button type="button" className={styles.removeLink} onClick={() => setDraft((prev) => ({ ...prev, event_capacities: prev.event_capacities.filter((_, i) => i !== index) }))}>Remove</button>
                </div>
              ))}
              <Button type="button" variant="secondary" size="small" onClick={() => setDraft((prev) => ({ ...prev, event_capacities: [...prev.event_capacities, { capacity_name: '', capacity_value: '' }] }))}>
                + Add capacity
              </Button>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Supported event types</label>
              <div className={styles.chipGroup}>
                {EVENT_TYPES.map((t) => (
                  <Chip key={t} label={t} checked={draft.event_types.includes(t)} onChange={() => setDraft((prev) => ({ ...prev, event_types: toggleInArray(prev.event_types, t) }))} />
                ))}
                {draft.event_types.filter((t) => !EVENT_TYPES.includes(t)).map((t) => (
                  <Chip key={t} label={t} checked onChange={() => setDraft((prev) => ({ ...prev, event_types: prev.event_types.filter((et) => et !== t) }))} />
                ))}
              </div>
              <AddEventTypeControl onAdd={(name) => setDraft((prev) => ({ ...prev, event_types: [...prev.event_types, name] }))} />
            </div>
          </>
        )}

        {/* Step 11: Compliance & Payouts */}
        {stepIndex === 11 && (
          <>
            <div className={styles.card}>
              <div className={styles.cardHeader}><span>Owner details (optional)</span></div>
              <Input label="Owner name" value={draft.compliance.owner_name} onChange={(e) => setDraft((prev) => ({ ...prev, compliance: { ...prev.compliance, owner_name: e.target.value } }))} />
              <div className={styles.row}>
                <Input label="Owner email" type="email" value={draft.compliance.owner_email} onChange={(e) => setDraft((prev) => ({ ...prev, compliance: { ...prev.compliance, owner_email: e.target.value } }))} />
                <Input label="Owner phone" value={draft.compliance.owner_phone} onChange={(e) => setDraft((prev) => ({ ...prev, compliance: { ...prev.compliance, owner_phone: e.target.value } }))} />
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardHeader}><span>Compliance / KYC (optional)</span></div>
              <div className={styles.row}>
                <Input label="ID type" as="select" value={draft.compliance.id_type} onChange={(e) => setDraft((prev) => ({ ...prev, compliance: { ...prev.compliance, id_type: e.target.value } }))}>
                  <option value="">Select an ID type</option>
                  {KYC_ID_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Input>
                <Input label="ID number" value={draft.compliance.id_number} onChange={(e) => setDraft((prev) => ({ ...prev, compliance: { ...prev.compliance, id_number: e.target.value } }))} />
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardHeader}><span>Bank details for payouts (optional)</span></div>
              <Input label="Account holder name" value={draft.compliance.account_name} onChange={(e) => setDraft((prev) => ({ ...prev, compliance: { ...prev.compliance, account_name: e.target.value } }))} />
              <div className={styles.row}>
                <Input label="Account number" value={draft.compliance.account_number} onChange={(e) => setDraft((prev) => ({ ...prev, compliance: { ...prev.compliance, account_number: e.target.value } }))} />
                <Input label="IFSC code" value={draft.compliance.ifsc_code} onChange={(e) => setDraft((prev) => ({ ...prev, compliance: { ...prev.compliance, ifsc_code: e.target.value } }))} />
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardHeader}><span>Commission structure (internal)</span></div>
              <div className={styles.row}>
                <Input label="Commission type" as="select" value={draft.compliance.commission_type} onChange={(e) => setDraft((prev) => ({ ...prev, compliance: { ...prev.compliance, commission_type: e.target.value } }))}>
                  <option value="">Select a type</option>
                  {COMMISSION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Input>
                <Input label="Commission value" type="number" step="0.01" min="0" value={draft.compliance.commission_value} onChange={(e) => setDraft((prev) => ({ ...prev, compliance: { ...prev.compliance, commission_value: e.target.value } }))} />
              </div>
            </div>
          </>
        )}

        {/* Step 12: Review & Submit */}
        {stepIndex === 12 && (
          <>
            <div className={styles.card}>
              <div className={styles.cardHeader}><span>Property details</span></div>
              <p>{p.name} — {p.type} — {p.city || p.custom_location_name}, {p.state}</p>
              <p>Booking model: {p.property_type} · Pricing tier: {p.pricing_type} · Pure veg: {p.is_pure_veg ? 'Yes' : 'No'}</p>
            </div>
            {draft.experiences.length > 0 && (
              <div className={styles.card}>
                <div className={styles.cardHeader}><span>Experiences</span></div>
                {draft.experiences.map((exp, i) => (
                  <p key={i}>{exp.title} — ₹{exp.price || '—'} ({exp.availability_note || 'availability not set'})</p>
                ))}
              </div>
            )}
            {draft.packages.length > 0 && (
              <div className={styles.card}>
                <div className={styles.cardHeader}><span>Packages</span></div>
                {draft.packages.map((pkg, i) => (
                  <p key={i}>{pkg.package_name} — ₹{pkg.price || '—'} ({pkg.duration || 'duration not set'})</p>
                ))}
              </div>
            )}
            <div className={styles.card}>
              <div className={styles.cardHeader}><span>Rooms</span></div>
              {p.property_type !== 'room_based' ? (
                <p>Whole property — weekday ₹{wholePropertyRoom.weekday_price || '—'}, weekend ₹{wholePropertyRoom.weekend_price || '—'}. {draft.bedrooms.length} bedroom(s) listed.</p>
              ) : null}
              {categoryRooms.length > 0 && categoryRooms.map((room, i) => (
                <p key={i}>{room.room_name} ({room.room_type}) — weekday ₹{room.weekday_price || '—'}, weekend ₹{room.weekend_price || '—'}</p>
              ))}
            </div>
            {(draft.event_facilities.conference_hall || draft.event_facilities.meeting_room || draft.event_facilities.lawn_capacity) && (
              <div className={styles.card}>
                <div className={styles.cardHeader}><span>Corporate & event support</span></div>
                <p>{draft.event_types.join(', ') || 'No event types selected'}</p>
              </div>
            )}
            <div className={styles.card}>
              <div className={styles.cardHeader}><span>Media</span></div>
              <p>{draft.images.length} photo(s), {draft.videos.length} video(s)</p>
            </div>
            {(draft.compliance.owner_name || draft.compliance.account_number) && (
              <div className={styles.card}>
                <div className={styles.cardHeader}><span>Compliance & payouts</span></div>
                <p>Owner: {draft.compliance.owner_name || '—'} · Bank account on file: {draft.compliance.account_number ? 'Yes' : 'No'}</p>
              </div>
            )}

            <label className={styles.amenityOption}>
              <input type="checkbox" checked={draft.consentAccepted} onChange={(e) => setDraft((prev) => ({ ...prev, consentAccepted: e.target.checked }))} />
              I confirm the details above are accurate and accept the Privacy Policy.
            </label>

            {submitError && <p className={styles.error}>{submitError}</p>}
          </>
        )}

        {stepError && <p className={styles.error}>{stepError}</p>}

        <div className={styles.navRow}>
          <Button type="button" variant="secondary" onClick={goBack} disabled={stepIndex === 0}>Back</Button>
          {stepIndex < STEPS.length - 1 ? (
            <Button type="button" onClick={goNext}>Next</Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Publishing…' : 'Publish listing'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function AddEventTypeControl({ onAdd }) {
  const [value, setValue] = useState('');
  const [adding, setAdding] = useState(false);

  if (!adding) {
    return (
      <button type="button" className={styles.removeLink} onClick={() => setAdding(true)}>
        + Add custom event type
      </button>
    );
  }

  return (
    <div className={styles.row}>
      <Input placeholder="Custom event type" value={value} onChange={(e) => setValue(e.target.value)} />
      <Button
        type="button"
        size="small"
        onClick={() => {
          if (value.trim()) onAdd(value.trim());
          setValue('');
          setAdding(false);
        }}
      >
        Add
      </Button>
    </div>
  );
}
