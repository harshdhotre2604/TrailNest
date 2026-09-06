'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import styles from '../../app/dashboard/properties/new/page.module.css';

const MAX_IMAGES = 5;
const MAX_PDFS = 2;
const MAX_DOCS = 2;

export default function AiFormHelper({ token, onCancel, onDraft }) {
  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const [images, setImages] = useState([]);
  const [pdfs, setPdfs] = useState([]);
  const [docs, setDocs] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const hasInput = text.trim() || link.trim() || images.length > 0 || pdfs.length > 0 || docs.length > 0;

  function pickFiles(setter, max) {
    return (event) => {
      const files = Array.from(event.target.files || []).slice(0, max);
      setter(files);
    };
  }

  async function handleGenerate() {
    setStatus('loading');
    setError('');
    try {
      const formData = new FormData();
      if (text.trim()) formData.append('text', text.trim());
      if (link.trim()) formData.append('link', link.trim());
      images.forEach((f) => formData.append('images', f));
      pdfs.forEach((f) => formData.append('pdfs', f));
      docs.forEach((f) => formData.append('docs', f));

      const result = await api.draftPropertyFromAi(formData, token);
      setStatus('idle');
      onDraft(result);
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span>AI Form Helper</span>
      </div>
      <p className={styles.aiPanelText}>
        Share whatever you already have — a rough description, photos, a PDF, a link to where this property is
        listed elsewhere, or a document — and it&apos;ll draft a starting point for you to review and edit. Pricing
        and payout details always stay something you fill in yourself.
      </p>

      <Input
        label="Tell us about your property (optional)"
        as="textarea"
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. A three-bedroom farmstay near Lonavala with a pool, mountain views, and a big kitchen the whole group can use..."
      />

      <Input
        label="Link to this property elsewhere (optional)"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="https://..."
      />

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>Photos (up to {MAX_IMAGES})</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={pickFiles(setImages, MAX_IMAGES)} />
          {images.length > 0 && <span className={styles.aiPanelText}>{images.length} photo(s) selected</span>}
        </div>
        <div className={styles.field}>
          <label className={styles.label}>PDF (up to {MAX_PDFS})</label>
          <input type="file" accept="application/pdf" multiple onChange={pickFiles(setPdfs, MAX_PDFS)} />
          {pdfs.length > 0 && <span className={styles.aiPanelText}>{pdfs.length} PDF(s) selected</span>}
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Other documents (.docx, .txt — up to {MAX_DOCS})</label>
          <input type="file" accept=".docx,.txt,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple onChange={pickFiles(setDocs, MAX_DOCS)} />
          {docs.length > 0 && <span className={styles.aiPanelText}>{docs.length} document(s) selected</span>}
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.navRow}>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={status === 'loading'}>
          Back
        </Button>
        <Button type="button" onClick={handleGenerate} disabled={!hasInput || status === 'loading'}>
          {status === 'loading' ? 'Drafting…' : '✨ Generate draft'}
        </Button>
      </div>
    </div>
  );
}
