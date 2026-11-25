import api from './api';

/** Drop empty values so the URL (and the backend cache key) stays minimal. */
const cleanParams = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null));

export const taskApi = {
  /** @returns {Promise<{ data: Task[], pagination }>} */
  async getTasks(params, { signal } = {}) {
    const res = await api.get('/tasks', { params: cleanParams(params), signal });
    return { data: res.data.data, pagination: res.data.pagination };
  },

  async getStats({ signal } = {}) {
    const res = await api.get('/tasks/stats', { signal });
    return res.data.data;
  },

  async getTask(id, { signal } = {}) {
    const res = await api.get(`/tasks/${id}`, { signal });
    return res.data.data;
  },

  async createTask(data) {
    const res = await api.post('/tasks', data);
    return res.data.data;
  },

  async updateTask(id, data) {
    const res = await api.patch(`/tasks/${id}`, data);
    return res.data.data;
  },

  async deleteTask(id) {
    await api.delete(`/tasks/${id}`);
  },
};
