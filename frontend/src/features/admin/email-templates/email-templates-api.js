import api from '../../../axios-instance';

export const emailTemplatesApi = {
  list: () => api.get('/admin/email-templates').then((res) => res.data),
  setTheme: (theme) => api.put('/admin/email-templates/settings', { theme }).then((res) => res.data),
  save: (type, copy) => api.put(`/admin/email-templates/${type}`, copy).then((res) => res.data),
  reset: (type) => api.delete(`/admin/email-templates/${type}`).then((res) => res.data),
  preview: (type, body) => api.post(`/admin/email-templates/${type}/preview`, body).then((res) => res.data),
  test: (type, body) => api.post(`/admin/email-templates/${type}/test`, body).then((res) => res.data),
};
