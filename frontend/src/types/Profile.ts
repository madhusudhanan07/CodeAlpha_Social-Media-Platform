export interface UserProfile {
  firebase_uid: string;
  full_name: string;
  username: string;
  email: string;
  bio: string;
  profile_picture: string;
  joined_date: string;
  total_posts: number;
  followers: number;
  following: number;
  likes_received: number;
  location?: string;
  website?: string;
}
