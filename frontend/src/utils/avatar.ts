import { BASE_URL } from '../config/api';

/**
 * Returns a full URL for user avatar pictures, handling full URLs, relative upload paths,
 * and falling back to a clean initial avatar when missing.
 */
export function getAvatarUrl(path?: string | null, name: string = 'User'): string {
  if (!path || path.trim() === '' || path === 'null' || path === 'undefined') {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D6EFD&color=fff`;
  }
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_URL}${cleanPath}`;
}

/**
 * Image onError handler to fallback to a UI avatar if the image fails to load.
 */
export function handleAvatarError(e: React.SyntheticEvent<HTMLImageElement, Event>, name: string = 'User') {
  const target = e.currentTarget;
  target.onerror = null; // Prevent infinite loop
  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D6EFD&color=fff`;
}
