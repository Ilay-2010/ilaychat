
export interface Message {
  id: number;
  created_at: string;
  username: string;
  content: string;
  user_id: string;
  receiver_id?: string;
  ip?: string;
  reactions?: Record<string, string[]>;
  reply_to_id?: number | null;
  image_url?: string | null;
}

export interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
}

export interface ChatUser {
  id: string;
  email: string;
  username: string;
}
