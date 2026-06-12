const API_URL = import.meta.env.VITE_API_URL || '';

const fileUrl = (path) => path ? `${API_URL}${path}` : '';

export { API_URL, fileUrl };