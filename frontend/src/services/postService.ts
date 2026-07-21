import axios from 'axios';
import { auth } from '../config/firebase';

const API_URL = '${import.meta.env.VITE_API_URL}/api/posts';

export const getAuthToken = async () => {
  if (auth.currentUser) {
    return await auth.currentUser.getIdToken();
  }
  return null;
};

export const fetchPosts = async (limit: number = 10, offset: number = 0) => {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const response = await axios.get(`${API_URL}?limit=${limit}&offset=${offset}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data.posts;
};

export const createPost = async (content: string, imageUrl: string = '', images: string[] = []) => {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const response = await axios.post(
    API_URL,
    { content, image_url: imageUrl, images },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data.post;
};

export const updatePost = async (id: number, content: string) => {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');
  const response = await axios.put(`${API_URL}/${id}`, { content }, { headers: { Authorization: `Bearer ${token}` }});
  return response.data.post;
};

export const deletePost = async (id: number) => {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');
  await axios.delete(`${API_URL}/${id}`, { headers: { Authorization: `Bearer ${token}` }});
  return true;
};

const LIKES_URL = '${import.meta.env.VITE_API_URL}/api/likes';

export const toggleLike = async (postId: number) => {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');
  const response = await axios.post(`${LIKES_URL}/${postId}`, {}, { headers: { Authorization: `Bearer ${token}` }});
  return response.data.liked;
};

const COMMENTS_URL = '${import.meta.env.VITE_API_URL}/api/comments';

export const fetchComments = async (postId: number) => {
  const response = await axios.get(`${COMMENTS_URL}/${postId}`);
  return response.data.comments;
};

export const createComment = async (postId: number, content: string) => {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');
  const response = await axios.post(`${COMMENTS_URL}/${postId}`, { content }, { headers: { Authorization: `Bearer ${token}` }});
  return response.data.comment;
};
