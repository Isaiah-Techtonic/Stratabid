// Small fetch wrapper that attaches the JWT and talks to /api.
const TOKEN_KEY = 'stratabid_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.message || `Request failed (${res.status})`;
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }
  return data;
}

export const api = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email, full_name, password) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ email, full_name, password }) }),
  changePassword: (current_password, new_password) =>
    request('/auth/change-password', { method: 'POST', body: JSON.stringify({ current_password, new_password }) }),
  me: () => request('/me'),
  auctions: () => request('/auctions'),
  createAuction: (payload) =>
    request('/auctions', { method: 'POST', body: JSON.stringify(payload) }),
  companies: () => request('/companies'),
  createCompany: (payload) =>
    request('/companies', { method: 'POST', body: JSON.stringify(payload) }),
  listings: (auctionId) => request(`/listings?auction_id=${encodeURIComponent(auctionId)}`),
  createListing: (payload) =>
    request('/listings', { method: 'POST', body: JSON.stringify(payload) }),
  setListingStatus: (id, status) =>
    request(`/listings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  myCompanies: () => request('/my-companies'),
  assignOwner: (companyId, email) =>
    request(`/companies/${companyId}/owner`, { method: 'POST', body: JSON.stringify({ email }) }),
  companyTeam: (companyId) => request(`/companies/${companyId}/users`),
  addMember: (companyId, email, role) =>
    request(`/companies/${companyId}/users`, { method: 'POST', body: JSON.stringify({ email, role }) }),
  changeMemberRole: (companyId, membershipId, role) =>
    request(`/companies/${companyId}/users/${membershipId}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  removeMember: (companyId, membershipId) =>
    request(`/companies/${companyId}/users/${membershipId}`, { method: 'DELETE' }),
};
