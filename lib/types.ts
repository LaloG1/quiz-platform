// lib/types.ts
// Tipos TypeScript correspondientes al esquema de supabase-schema.sql

export type AnswerColor = 'red' | 'blue' | 'yellow' | 'green';
export type GameStatus = 'waiting' | 'playing' | 'finished';

export interface Profile {
  id: string;
  username: string;
  avatar: string;
  created_at: string;
}

export interface Quiz {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  created_at: string;
}

export interface Question {
  id: string;
  quiz_id: string;
  question: string;
  time_limit_seconds: number;
  order_index: number;
}

export interface Answer {
  id: string;
  question_id: string;
  answer: string;
  is_correct: boolean;
  color: AnswerColor;
}

export interface Game {
  id: string;
  quiz_id: string;
  code: string;
  status: GameStatus;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface GamePlayer {
  id: string;
  game_id: string;
  profile_id: string | null;
  nickname: string;
  avatar: string;
  joined_at: string;
}

export interface GameAnswer {
  id: string;
  game_id: string;
  player_id: string;
  question_id: string;
  answer_id: string;
  time_ms: number;
  points: number;
  answered_at: string;
}

// Fila calculada para el ranking (no existe como tabla, se agrega desde game_answers)
export interface RankingEntry {
  player_id: string;
  nickname: string;
  avatar: string;
  total_points: number;
  position: number;
}