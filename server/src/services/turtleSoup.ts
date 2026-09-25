import { z } from 'zod';
import type { Player, AttributeFeedback } from '../types';
import { HttpError } from '../middleware/common';
import { compareQuestion } from './gameService';

export const MAX_QUESTIONS = 18;
export const soupMutationSchema = z.object({
  requestId: z.string().uuid(),
  version: z.number().int().nonnegative(),
});
export const soupQuestionSchema = soupMutationSchema.and(z.discriminatedUnion('field', [
  z.object({ field: z.literal('team'), value: z.string().trim().max(100) }),
  z.object({ field: z.literal('nationality'), value: z.string().trim().min(1).max(100) }),
  z.object({ field: z.literal('role'), value: z.enum(['Rifler', 'AWPer', 'Coach']) }),
  z.object({ field: z.literal('isActive'), value: z.boolean() }),
  z.object({ field: z.literal('age'), value: z.number().int().min(1).max(120) }),
  z.object({ field: z.literal('majorChampionships'), value: z.number().int().min(0).max(1000) }),
  z.object({ field: z.literal('majorAppearances'), value: z.number().int().min(0).max(1000) }),
]));
export type SoupQuestion = z.infer<typeof soupQuestionSchema>;
export interface SoupOptions {
  teams: string[];
  countries: Array<{ nationality: string; region: string }>;
}
export type SoupEvent = {
  requestId: string;
  elapsedMs: number;
} & (
  | { type: 'question'; field: SoupQuestion['field']; value: string | number | boolean; level: AttributeFeedback['level'] }
  | { type: 'guess'; playerId: number; nickname: string; correct: boolean }
  | { type: 'giveup' }
);
export interface SoupState {
  target: Player;
  options: SoupOptions;
  events: SoupEvent[];
  questionCount: number;
  guessCount: number;
  guessUnlocked: boolean;
  version: number;
  status: 'playing' | 'won' | 'lost';
  requests: Record<string, string>;
  recorded?: boolean;
}

export function createSoup(target: Player, players: readonly Player[]): SoupState {
  const countries = new Map<string, string>();
  for (const player of players) {
    if (!countries.has(player.nationality)) countries.set(player.nationality, player.region);
  }
  return {
    target: structuredClone(target),
    options: {
      teams: [...new Set(players.flatMap((p) => [p.team, ...p.team_history]))].sort(),
      countries: [...countries].map(([nationality, region]) => ({ nationality, region })),
    },
    events: [], questionCount: 0, guessCount: 0, guessUnlocked: false,
    version: 0, status: 'playing', requests: {},
  };
}

export function soupAnswer(target: Player) {
  return {
    id: target.id, nickname: target.nickname, nationality: target.nationality,
    region: target.region, team: target.team, age: target.age, role: target.role,
    majorChampionships: target.major_championships,
    majorAppearances: target.major_appearances, isActive: Boolean(target.is_active),
  };
}

export function soupView(game: { id: string; mode: string; soup?: SoupState }) {
  const soup = game.soup!;
  return {
    gameId: game.id, mode: game.mode, variant: 'turtle-soup' as const,
    maxQuestions: MAX_QUESTIONS, remainingQuestions: MAX_QUESTIONS - soup.questionCount,
    questionCount: soup.questionCount, guessCount: soup.guessCount,
    guessUnlocked: soup.guessUnlocked, version: soup.version, status: soup.status,
    events: soup.events, recorded: soup.recorded,
    ...(soup.status === 'playing' ? {} : { answer: soupAnswer(soup.target) }),
  };
}

export function soupReplay(game: {
  id: number; mode: string; status: string; question_count: number; guess_count: number;
  created_at: string; finished_at: string; answer_snapshot: string; soup_events: string;
}) {
  return {
    id: game.id, mode: game.mode, variant: 'turtle-soup' as const, status: game.status,
    questionCount: Number(game.question_count), guessCount: Number(game.guess_count),
    createdAt: game.created_at, finishedAt: game.finished_at,
    answer: JSON.parse(game.answer_snapshot), events: JSON.parse(game.soup_events), guesses: [],
  };
}

export function askSoup(soup: SoupState, question: SoupQuestion, elapsedMs: number): void {
  if (soup.questionCount >= MAX_QUESTIONS) throw new HttpError(400, 'SOUP_QUESTION_LIMIT');
  if (question.field === 'team' && !soup.options.teams.includes(question.value)) {
    throw new HttpError(400, 'SOUP_INVALID_OPTION');
  }
  const country = question.field === 'nationality'
    ? soup.options.countries.find((c) => c.nationality === question.value) : undefined;
  if (question.field === 'nationality' && !country) throw new HttpError(400, 'SOUP_INVALID_OPTION');
  const level = compareQuestion(soup.target, question.field, question.value, country?.region);
  soup.events.push({ type: 'question', requestId: question.requestId, elapsedMs,
    field: question.field, value: question.value, level });
  soup.questionCount += 1;
  soup.guessUnlocked = true;
}

export function guessSoup(soup: SoupState, player: Player, requestId: string, elapsedMs: number): void {
  if (!soup.guessUnlocked) throw new HttpError(400, 'SOUP_GUESS_LOCKED');
  const correct = player.id === soup.target.id;
  soup.events.push({ type: 'guess', playerId: player.id, nickname: player.nickname, correct, requestId, elapsedMs });
  soup.guessCount += 1;
  soup.guessUnlocked = false;
  if (correct) soup.status = 'won';
  else if (soup.questionCount === MAX_QUESTIONS) soup.status = 'lost';
}
