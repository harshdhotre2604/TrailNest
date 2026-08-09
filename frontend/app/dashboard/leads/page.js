'use client';

import { useEffect, useState } from 'react';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { api } from '@/lib/api';
import Card from '@/components/ui/Card';
import styles from './page.module.css';

const STATUSES = ['new', 'contacted', 'closed'];

export default function LeadsPage() {
  const { ready, token } = useRequireAuth();
  const [leads, setLeads] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready) return;
    api
      .listLeads(token)
      .then((data) => setLeads(data.leads))
      .catch((err) => setError(err.message));
  }, [ready, token]);

  async function handleStatusChange(leadId, status) {
    const previous = leads;
    setLeads((current) => current.map((l) => (l.id === leadId ? { ...l, status } : l)));
    try {
      await api.updateLeadStatus(leadId, status, token);
    } catch (err) {
      setLeads(previous);
      setError(err.message);
    }
  }

  if (!ready || leads === null) {
    return error ? <p className={styles.empty}>{error}</p> : null;
  }

  if (leads.length === 0) {
    return <p className={styles.empty}>No inquiries yet — they&apos;ll show up here as guests reach out.</p>;
  }

  return (
    <div className={styles.list}>
      {leads.map((lead) => (
        <Card key={lead.id} padded className={styles.row}>
          <div className={styles.who}>
            <span className={styles.name}>{lead.name}</span>
            <span className={styles.email}>{lead.email}</span>
            <span className={styles.property}>{lead.property_name}</span>
          </div>

          <p className={styles.message}>{lead.message}</p>

          <div className={styles.meta}>
            <span className={styles.date}>{new Date(lead.created_at).toLocaleDateString()}</span>
            <select
              className={styles.select}
              value={lead.status}
              onChange={(event) => handleStatusChange(lead.id, event.target.value)}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </Card>
      ))}
    </div>
  );
}
