import axios from 'axios';
import { API_URL } from '../config/api';
import { auth } from '../config/firebase';

const POSTS_URL    = `${API_URL}/posts`;
const LIKES_URL    = `${API_URL}/likes`;
const COMMENTS_URL = `${API_URL}/comments`;

export const getAuthToken = async () => {
  if (auth.currentUser) {
    return await auth.currentUser.getIdToken();
  }
  return null;
};

export const fetchPosts = async (limit: number = 10, offset: number = 0) => {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const response = await axios.get(`${POSTS_URL}?limit=${limit}&offset=${offset}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data.posts;
};

export const createPost = async (content: string, imageUrl: string = '', images: string[] = []) => {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const response = await axios.post(
    POSTS_URL,
    { content, image_url: imageUrl, images },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data.post;
};

export const updatePost = async (id: number, content: string) => {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');
  const response = await axios.put(`${POSTS_URL}/${id}`, { content }, { headers: { Authorization: `Bearer ${token}` } });
  return response.data.post;
};

export const deletePost = async (id: number) => {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');
  await axios.delete(`${POSTS_URL}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return true;
};

export const toggleLike = async (postId: number) => {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');
  const response = await axios.post(`${LIKES_URL}/${postId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
  return response.data.liked;
};

export const fetchComments = async (postId: number) => {
  const response = await axios.get(`${COMMENTS_URL}/${postId}`);
  return response.data.comments;
};

export const createComment = async (postId: number, content: string) => {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');
  const response = await axios.post(`${COMMENTS_URL}/${postId}`, { content }, { headers: { Authorization: `Bearer ${token}` } });
  return response.data.comment;
};
