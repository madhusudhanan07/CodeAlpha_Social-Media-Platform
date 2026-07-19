import axios from 'axios';
import { getAuthToken } from './postService';

const API_URL = 'http://localhost:5000/api/upload';

export const uploadMultipleImages = async (files: File[]) => {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const formData = new FormData();
  files.forEach((file) => {
    formData.append('images', file);
  });

  const response = await axios.post(`${API_URL}/multiple`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data.urls;
};

export const uploadSingleImage = async (file: File) => {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const formData = new FormData();
  formData.append('image', file);

  const response = await axios.post(`${API_URL}/single`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data.url;
};
