export function saveToken(token) {
  localStorage.setItem('admin_token', token);
}

export function getToken() {
  return localStorage.getItem('admin_token');
}

export function isAuthenticated() {
  return !!getToken();
}

export function logout() {
  localStorage.removeItem('admin_token');
}
