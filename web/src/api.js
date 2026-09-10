// Backend base URL. Override without a rebuild by adding
// ?api=https://other-host to the page URL.
const DEFAULT_API = 'https://learning-api-1mag.onrender.com';

export const API_URL =
  new URLSearchParams(location.search).get('api') || DEFAULT_API;

export const API_HOST = new URL(API_URL).host;

async function request(path, options) {
  const res = await fetch(API_URL + path, options);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).error || detail;
    } catch {
      /* response had no JSON body */
    }
    throw new Error(detail);
  }
  return res.status === 204 ? null : res.json();
}

const json = (body) => ({
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

export const health = () => request('/api/health');

export const listFiles = () => request('/api/files');

export const saveFile = (name, content) =>
  request('/api/files/' + encodeURIComponent(name), json({ content }));

export const deleteFile = (name) =>
  request('/api/files/' + encodeURIComponent(name), { method: 'DELETE' });

export const runCode = (code) =>
  request('/api/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
