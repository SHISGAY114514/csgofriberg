import { randomUUID } from 'crypto';
import { describe, expect, it } from 'vitest';
import type { Player } from '../../src/types';
import { compareGuess, compareQuestion } from '../../src/services/gameService';
import { askSoup, createSoup, guessSoup, soupQuestionSchema, soupView } from '../../src/services/turtleSoup';

const target: Player = {
  id: 1, nickname: 'target', nationality: '瑞典', region: '欧洲', team: 'Current',
  team_history: ['Former'], age: 25, role: 'Rifler', major_championships: 2,
  major_appearances: 10, is_active: true, is_enabled: true, created_at: '',
};

describe('turtle soup rules', () => {
  it.each([
    ['age', 25, 'correct'], ['age', 22, 'close'], ['age', 28, 'close'], ['age', 21, 'wrong'], ['age', 29, 'wrong'],
    ['majorChampionships', 2, 'correct'], ['majorChampionships', 1, 'close'], ['majorChampionships', 4, 'wrong'],
    ['majorAppearances', 10, 'correct'], ['majorAppearances', 11, 'close'], ['majorAppearances', 8, 'wrong'],
    ['team', 'Current', 'correct'], ['team', 'Former', 'close'], ['team', 'Other', 'wrong'],
    ['nationality', '瑞典', 'correct'], ['nationality', '丹麦', 'close'],
    ['role', 'Rifler', 'correct'], ['role', 'Coach', 'wrong'],
    ['isActive', true, 'correct'], ['isActive', false, 'wrong'],
  ] as const)('compares %s=%s with classic thresholds, without hints', (field, value, expected) => {
    expect(compareQuestion(target, field, value, '欧洲')).toBe(expected);
  });

  it('does not treat unknown or different regions as close', () => {
    expect(compareQuestion(target, 'nationality', '美国', '北美洲')).toBe('wrong');
    expect(compareQuestion({ ...target, region: '' }, 'nationality', '丹麦', '')).toBe('wrong');
  });

  it('uses the same team and age feedback as classic comparison', () => {
    const guess = { ...target, id: 2, team: 'Former', age: 28 };
    const classic = compareGuess(guess, target);
    expect(compareQuestion(target, 'team', guess.team)).toBe(classic.attributes.team.level);
    expect(compareQuestion(target, 'age', guess.age)).toBe(classic.attributes.age.level);
  });

  it('allows the final guess after 18 questions and never accumulates guess credits', () => {
    const soup = createSoup(target, [target]);
    expect(() => guessSoup(soup, target, randomUUID(), 0)).toThrow('SOUP_GUESS_LOCKED');
    for (let index = 0; index < 18; index++) {
      askSoup(soup, { requestId: randomUUID(), version: index, field: 'age', value: 25 }, index * 1000);
    }
    expect(soup.status).toBe('playing');
    expect(soup.guessUnlocked).toBe(true);
    expect(() => askSoup(soup, { requestId: randomUUID(), version: 18, field: 'age', value: 25 }, 20000)).toThrow('SOUP_QUESTION_LIMIT');
    const winning = structuredClone(soup);
    guessSoup(winning, target, randomUUID(), 21000);
    expect(winning.status).toBe('won');
    guessSoup(soup, { ...target, id: 2 }, randomUUID(), 21000);
    expect(soup.status).toBe('lost');
    expect(soup.guessUnlocked).toBe(false);
  });

  it('locks guessing after a wrong name and snapshots data independently', () => {
    const original = structuredClone(target);
    const soup = createSoup(original, [original]);
    original.age = 99;
    original.team_history.push('New');
    askSoup(soup, { requestId: randomUUID(), version: 0, field: 'age', value: 25 }, 0);
    askSoup(soup, { requestId: randomUUID(), version: 1, field: 'team', value: 'Former' }, 0);
    expect(soup.events[0]).toMatchObject({ level: 'correct' });
    expect(soup.options.teams).not.toContain('New');
    guessSoup(soup, { ...target, id: 2 }, randomUUID(), 1);
    expect(() => guessSoup(soup, target, randomUUID(), 2)).toThrow('SOUP_GUESS_LOCKED');
    expect(soupView({ id: 'test', mode: 'easy', soup })).not.toHaveProperty('answer');
    expect(JSON.stringify(soupView({ id: 'test', mode: 'easy', soup }))).not.toContain('team_history');
  });

  it.each([
    { field: 'age', value: 2.5 }, { field: 'age', value: 0 }, { field: 'age', value: '25' },
    { field: 'majorChampionships', value: -1 }, { field: 'majorAppearances', value: Infinity },
    { field: 'role', value: 'IGL' }, { field: 'isActive', value: 'true' }, { field: 'unknown', value: 1 },
  ])('rejects malformed question $field=$value', (question) => {
    expect(soupQuestionSchema.safeParse({ ...question, version: 0, requestId: randomUUID() }).success).toBe(false);
  });
});
