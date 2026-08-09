const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

export const api = {
  listProperties: () => request('/properties'),
  getProperty: (id) => request(`/properties/${id}`),
  listMyProperties: (token) => request('/properties/mine', { token }),
  createProperty: (payload, token) =>
    request('/properties', { method: 'POST', body: payload, token }),
  createLead: (propertyId, payload) =>
    request(`/properties/${propertyId}/leads`, { method: 'POST', body: payload }),
  listLeads: (token) => request('/leads', { token }),
  updateLeadStatus: (id, status, token) =>
    request(`/leads/${id}`, { method: 'PATCH', body: { status }, token }),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  me: (token) => request('/auth/me', { token }),
};
