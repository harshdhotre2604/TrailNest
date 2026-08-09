'use client';

import { useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { api } from '@/lib/api';
import styles from './InquiryForm.module.css';

const initialForm = { name: '', email: '', message: '' };

export default function InquiryForm({ propertyId, propertyName }) {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState('idle'); // idle | submitting | sent | error
  const [error, setError] = useState('');

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('submitting');
    setError('');

    try {
      await api.createLead(propertyId, form);
      setStatus('sent');
      setForm(initialForm);
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  }

  if (status === 'sent') {
    return (
      <div className={styles.form}>
        <h3 className={styles.title}>Message sent</h3>
        <p className={`${styles.status} ${styles.statusOk}`}>
          Your note about {propertyName} is on its way to the host. They reply directly by
          email.
        </p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h3 className={styles.title}>Ask about this stay</h3>
      <Input
        label="Your name"
        name="name"
        value={form.name}
        onChange={handleChange}
        placeholder="Priya Menon"
        required
      />
      <Input
        label="Email"
        name="email"
        type="email"
        value={form.email}
        onChange={handleChange}
        placeholder="you@example.com"
        required
      />
      <Input
        label="Message"
        name="message"
        as="textarea"
        rows={4}
        value={form.message}
        onChange={handleChange}
        placeholder={`Ask about dates, pets, or anything else about ${propertyName}...`}
        required
      />
      {status === 'error' && <p className={`${styles.status} ${styles.statusError}`}>{error}</p>}
      <Button type="submit" disabled={status === 'submitting'} fullWidth>
        {status === 'submitting' ? 'Sending…' : 'Send inquiry'}
      </Button>
    </form>
  );
}
