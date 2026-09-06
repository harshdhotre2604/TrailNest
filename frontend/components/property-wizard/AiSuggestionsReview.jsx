'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import styles from '../../app/dashboard/properties/new/page.module.css';

function Field({ label, value, checked, onToggle }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <label className={styles.amenityOption}>
      <input type="checkbox" checked={checked} onChange={onToggle} />
      <strong>{label}:</strong>&nbsp;{String(value)}
    </label>
  );
}

export default function AiSuggestionsReview({ result, onBack, onApply, onSkip }) {
  const [basicFields, setBasicFields] = useState({
    title: true,
    description: true,
    category: true,
    isPureVeg: true,
    propertyType: true,
    vacationType: true,
  });
  const [locationAccepted, setLocationAccepted] = useState((result.city || result.state) && result.locationConfidence !== 'none');
  const [propertyAmenities, setPropertyAmenities] = useState(new Set(result.propertyAmenities || []));
  const [roomAmenities, setRoomAmenities] = useState(new Set(result.roomAmenities || []));
  const [dietaryOptions, setDietaryOptions] = useState(new Set(result.dietaryOptions || []));
  const [experiences, setExperiences] = useState((result.experiences || []).map(() => true));
  const [rooms, setRooms] = useState((result.rooms || []).map(() => true));

  function toggleInSet(setFn, value) {
    setFn((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function handleApply() {
    const applied = {};
    for (const [key, accepted] of Object.entries(basicFields)) {
      if (accepted && result[key] !== undefined && result[key] !== '') applied[key] = result[key];
    }
    if (locationAccepted) {
      applied.city = result.city;
      applied.state = result.state;
    }
    applied.propertyAmenities = [...propertyAmenities];
    applied.roomAmenities = [...roomAmenities];
    applied.dietaryOptions = [...dietaryOptions];
    applied.experiences = (result.experiences || []).filter((_, i) => experiences[i]);
    applied.rooms = (result.rooms || []).filter((_, i) => rooms[i]);
    onApply(applied);
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span>Review the AI&apos;s draft</span>
      </div>
      <p className={styles.aiPanelText}>
        Nothing is saved yet — uncheck anything you don&apos;t want, then continue to fill in the rest (pricing and
        payout details always stay manual).
      </p>

      {result.warnings?.length > 0 && (
        <div className={styles.aiPanel}>
          <p className={styles.aiPanelLabel}>Heads up</p>
          <ul className={styles.aiAmenityList}>
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.subcard}>
        <p className={styles.subcardTitle}>Basic info</p>
        <Field label="Title" value={result.title} checked={basicFields.title} onToggle={() => setBasicFields((p) => ({ ...p, title: !p.title }))} />
        <Field label="Description" value={result.description} checked={basicFields.description} onToggle={() => setBasicFields((p) => ({ ...p, description: !p.description }))} />
        <Field label="Category" value={result.category} checked={basicFields.category} onToggle={() => setBasicFields((p) => ({ ...p, category: !p.category }))} />
        <Field label="Pure veg" value={result.isPureVeg === undefined ? undefined : result.isPureVeg ? 'Yes' : 'No'} checked={basicFields.isPureVeg} onToggle={() => setBasicFields((p) => ({ ...p, isPureVeg: !p.isPureVeg }))} />
        <Field label="Booking model" value={result.propertyType} checked={basicFields.propertyType} onToggle={() => setBasicFields((p) => ({ ...p, propertyType: !p.propertyType }))} />
        <Field label="Vacation type" value={result.vacationType} checked={basicFields.vacationType} onToggle={() => setBasicFields((p) => ({ ...p, vacationType: !p.vacationType }))} />
      </div>

      {(result.city || result.state) && (
        <div className={styles.subcard}>
          <p className={styles.subcardTitle}>Location {result.locationConfidence && `(${result.locationConfidence} confidence)`}</p>
          <label className={styles.amenityOption}>
            <input type="checkbox" checked={locationAccepted} onChange={() => setLocationAccepted((v) => !v)} />
            {[result.city, result.state].filter(Boolean).join(', ')}
          </label>
        </div>
      )}

      {result.propertyAmenities?.length > 0 && (
        <div className={styles.subcard}>
          <p className={styles.subcardTitle}>Property amenities</p>
          <div className={styles.chipGroup}>
            {result.propertyAmenities.map((name) => (
              <label key={name} className={`${styles.chip} ${propertyAmenities.has(name) ? styles.chipActive : ''}`}>
                <input type="checkbox" className={styles.chipInput} checked={propertyAmenities.has(name)} onChange={() => toggleInSet(setPropertyAmenities, name)} />
                {name}
              </label>
            ))}
          </div>
        </div>
      )}

      {result.roomAmenities?.length > 0 && (
        <div className={styles.subcard}>
          <p className={styles.subcardTitle}>Room amenities</p>
          <div className={styles.chipGroup}>
            {result.roomAmenities.map((name) => (
              <label key={name} className={`${styles.chip} ${roomAmenities.has(name) ? styles.chipActive : ''}`}>
                <input type="checkbox" className={styles.chipInput} checked={roomAmenities.has(name)} onChange={() => toggleInSet(setRoomAmenities, name)} />
                {name}
              </label>
            ))}
          </div>
        </div>
      )}

      {result.dietaryOptions?.length > 0 && (
        <div className={styles.subcard}>
          <p className={styles.subcardTitle}>Dietary options</p>
          <div className={styles.chipGroup}>
            {result.dietaryOptions.map((name) => (
              <label key={name} className={`${styles.chip} ${dietaryOptions.has(name) ? styles.chipActive : ''}`}>
                <input type="checkbox" className={styles.chipInput} checked={dietaryOptions.has(name)} onChange={() => toggleInSet(setDietaryOptions, name)} />
                {name}
              </label>
            ))}
          </div>
        </div>
      )}

      {result.experiences?.length > 0 && (
        <div className={styles.subcard}>
          <p className={styles.subcardTitle}>Suggested experiences</p>
          {result.experiences.map((exp, i) => (
            <label key={i} className={styles.amenityOption}>
              <input type="checkbox" checked={experiences[i]} onChange={() => setExperiences((prev) => prev.map((v, idx) => (idx === i ? !v : v)))} />
              <strong>{exp.title}</strong>
              {exp.description ? ` — ${exp.description}` : ''}
            </label>
          ))}
        </div>
      )}

      {result.rooms?.length > 0 && (
        <div className={styles.subcard}>
          <p className={styles.subcardTitle}>Suggested rooms</p>
          {result.rooms.map((room, i) => (
            <label key={i} className={styles.amenityOption}>
              <input type="checkbox" checked={rooms[i]} onChange={() => setRooms((prev) => prev.map((v, idx) => (idx === i ? !v : v)))} />
              <strong>{room.roomName}</strong>
              {room.description ? ` — ${room.description}` : ''}
            </label>
          ))}
        </div>
      )}

      <div className={styles.navRow}>
        <Button type="button" variant="secondary" onClick={onBack}>Back</Button>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Button type="button" variant="secondary" onClick={onSkip}>Discard, start from scratch</Button>
          <Button type="button" onClick={handleApply}>Use these suggestions</Button>
        </div>
      </div>
    </div>
  );
}
