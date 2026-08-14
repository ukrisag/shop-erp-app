export const environment = {
  production: false,
  // Point straight at the HTTPS port. The backend's UseHttpsRedirection() would
  // otherwise 307-redirect http://localhost:5259 -> https://localhost:7148, and
  // browsers strip the Authorization header when a fetch/XHR follows a redirect
  // across origins (scheme+port change counts) - so calling :5259 directly silently
  // drops the auth token on every request. Calling :7148 avoids the redirect entirely.
  apiUrl: 'https://localhost:7148',
  appName: 'ร้านเครื่องครัวแสงทอง/ใจกล้า (Dev)',
  version: '1.0.0-dev'
};
