'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { api } from '@/lib/api';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import styles from './page.module.css';

const PROPERTY_TYPES = ['cabin', 'cottage', 'farmstay', 'villa', 'treehouse', 'apartment'];

const initialForm = {
  name: '',
  type: 'cabin',
  location: '',
  price_per_night: '',
  cover_image_url: '',
  description: '',
};

export default function NewPropertyPage() {
  const { ready, token } = useRequireAuth();
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const data = await api.createProperty(form, token);
      router.push(`/property/${data.property.id}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (!ready) return null;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Input
        label="Property name"
        name="name"
        value={form.name}
        onChange={handleChange}
        placeholder="Ridgeview Cabin"
        required
      />

      <div className={styles.row}>
        <Input label="Type" name="type" as="select" value={form.type} onChange={handleChange}>
          {PROPERTY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Input>
        <Input
          label="Price per night ($)"
          name="price_per_night"
          type="number"
          min="1"
          step="1"
          value={form.price_per_night}
          onChange={handleChange}
          placeholder="145"
          required
        />
      </div>

      <Input
        label="Location"
        name="location"
        value={form.location}
        onChange={handleChange}
        placeholder="Blue Ridge, NC"
        required
      />

      <Input
        label="Cover image URL"
        name="cover_image_url"
        value={form.cover_image_url}
        onChange={handleChange}
        placeholder="https://…"
      />

      <Input
        label="Description"
        name="description"
        as="textarea"
        rows={5}
        value={form.description}
        onChange={handleChange}
        placeholder="What makes this stay worth the drive?"
      />

      {error && <p className={styles.error}>{error}</p>}

      <Button type="submit" disabled={submitting}>
        {submitting ? 'Publishing…' : 'Publish listing'}
      </Button>
    </form>
  );
}
