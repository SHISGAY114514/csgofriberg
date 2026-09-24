import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderAtRoute } from '../render';
import TurtleSoupGame from '../../src/pages/TurtleSoupGame';
import { useAuth } from '../../src/store/auth';
import type { SoupGame } from '../../src/turtleSoup';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../src/api/client', () => ({ api: { get, post }, errMsg: () => 'request failed' }));
vi.mock('../../src/api/session', () => ({ ensureGuestSession: vi.fn(async () => {}) }));
vi.mock('../../src/api/playerList', () => ({
  getPlayerList: vi.fn(async () => [{ id: 1, nickname: 'Guess' }]),
  subscribePlayerList: vi.fn(() => () => {}),
  searchPlayerList: (list: unknown[]) => list,
}));
const key = 'csgofriberg_soup_session_guest_beginner';
const base: SoupGame = { gameId: 'soup1', mode: 'beginner', variant: 'turtle-soup', version: 0,
  status: 'playing', maxQuestions: 18, remainingQuestions: 18, questionCount: 0, guessCount: 0, guessUnlocked: false, events: [] };
const answer = { id: 2, nickname: 'Snapshot Answer', team: 'Team', nationality: 'CN', region: 'Asia', age: 25, role: 'Rifler', isActive: true, majorChampionships: 1, majorAppearances: 5 };
const options = { teams: ['Team', ''], countries: [{ nationality: 'CN', region: 'Asia' }] };
let state: SoupGame;
function renderGame(mode = 'beginner') {
  return renderAtRoute(<TurtleSoupGame />, { route: `/turtle-soup/${mode}`, path: '/turtle-soup/:mode',
    extraRoutes: <><Route path="/turtle-soup" element={<p>lobby</p>} /><Route path="/" element={<p>home</p>} /></> });
}
async function ready() { await waitFor(() => expect(screen.getByLabelText('年龄')).toBeEnabled()); }
async function ask() {
  fireEvent.change(screen.getByLabelText('年龄'), { target: { value: '25' } });
  fireEvent.submit(screen.getByLabelText('年龄').closest('form')!);
}
async function guess() {
  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText('输入选手昵称...'), 'Guess');
  await user.keyboard('{Enter}');
}

describe('Turtle Soup interactions', () => {
  beforeEach(() => {
    get.mockReset(); post.mockReset(); state = { ...base };
    useAuth.setState({ user: null, initialized: true });
    get.mockImplementation(async (url: string) => ({ data: url.endsWith('question-options') ? options : state }));
    post.mockImplementation(async () => ({ data: state }));
  });

  it('rejects invalid routes before starting a game', async () => {
    renderGame('hard');
    expect(await screen.findByText('lobby')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('unlocks guessing from server feedback and locks again after a wrong guess', async () => {
    renderGame(); await ready();
    expect(screen.getByPlaceholderText('输入选手昵称...')).toBeDisabled();
    state = { ...base, version: 1, remainingQuestions: 17, questionCount: 1, guessUnlocked: true,
      events: [{ type: 'question', field: 'age', value: 25, level: 'close', requestId: 'q', elapsedMs: 1 }] };
    await ask();
    await waitFor(() => expect(screen.getByPlaceholderText('输入选手昵称...')).toBeEnabled());
    expect(screen.getByText('是也不是')).toBeInTheDocument();
    expect(post).toHaveBeenLastCalledWith('/game/soup1/question', { field: 'age', value: 25, version: 0, requestId: expect.any(String) });
    state = { ...state, version: 2, guessCount: 1, guessUnlocked: false };
    await guess();
    await waitFor(() => expect(screen.getByPlaceholderText('输入选手昵称...')).toBeDisabled());
    expect(post).toHaveBeenLastCalledWith('/game/soup1/guess', { playerId: 1, version: 1, requestId: expect.any(String) });
  });

  it('keeps the final guess after question 18, then shows the losing receipt', async () => {
    state = { ...base, version: 18, questionCount: 18, remainingQuestions: 0, guessUnlocked: true };
    renderGame();
    await waitFor(() => expect(screen.getByPlaceholderText('输入选手昵称...')).toBeEnabled());
    expect(screen.getByLabelText('年龄')).toBeDisabled();
    expect(screen.getByText('提问已用完，还有最后一次免费猜名机会。')).toBeInTheDocument();
    state = { ...state, version: 19, status: 'lost', answer, guessCount: 1, guessUnlocked: false };
    await guess();
    expect(await screen.findByRole('heading', { name: '本局结束' })).toBeInTheDocument();
    expect(screen.getByText('使用 18 次提问 · 1 次猜名')).toBeInTheDocument();
  });

  it.each([new Error('offline'), { isAxiosError: true, response: { status: 503 } }])('persists the exact operation for retry and suppresses double submits (%j)', async (failure) => {
    renderGame(); await ready();
    let reject!: (err: unknown) => void;
    post.mockReturnValueOnce(new Promise((_, fail) => { reject = fail; }));
    await ask(); await ask();
    const operation = post.mock.calls.at(-1)!;
    expect(post.mock.calls.filter(([url]) => url.endsWith('/question'))).toHaveLength(1);
    await act(async () => reject(failure));
    expect(await screen.findByText('上次操作尚未确认，请重试以同步结果。')).toBeInTheDocument();
    expect(screen.getByLabelText('年龄')).toBeDisabled();
    expect(JSON.parse(sessionStorage.getItem(key)!).pending.body).toEqual(operation[1]);
    state = { ...base, version: 1, remainingQuestions: 17, questionCount: 1, guessUnlocked: true };
    await userEvent.click(screen.getByRole('button', { name: '重试上次操作' }));
    await ready();
    expect(post.mock.calls.at(-1)).toEqual(operation);
    expect(JSON.parse(sessionStorage.getItem(key)!).pending).toBeUndefined();
  });

  it('restores a lost terminal response before replaying any pending write or starting', async () => {
    sessionStorage.setItem(key, JSON.stringify({ gameId: base.gameId, pending: { gameId: base.gameId, action: 'giveup', body: { requestId: 'done', version: 0 } } }));
    state = { ...base, status: 'lost', version: 1, answer, events: [{ type: 'giveup', requestId: 'done', elapsedMs: 10 }] };
    renderGame();
    expect(await screen.findByRole('heading', { name: '本局结束' })).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
    expect(get).toHaveBeenCalledTimes(1); // No options endpoint for a terminal receipt.
  });

  it('restores an unaccepted pending request after refresh with the original payload', async () => {
    const operation = { gameId: base.gameId, action: 'question', body: { field: 'isActive', value: false, requestId: 'saved', version: 0 } };
    sessionStorage.setItem(key, JSON.stringify({ gameId: base.gameId, pending: operation }));
    renderGame(); await ready();
    expect(get.mock.invocationCallOrder[0]).toBeLessThan(post.mock.invocationCallOrder[0]);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/game/soup1/question', operation.body);
  });

  it('discards stale writes and loads the newer version without re-executing', async () => {
    renderGame(); await ready();
    post.mockRejectedValueOnce({ isAxiosError: true, response: { status: 409, data: { code: 'SOUP_STALE_STATE' } } });
    state = { ...base, version: 4, questionCount: 3, remainingQuestions: 15 };
    await ask();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('request failed'));
    expect(JSON.parse(sessionStorage.getItem(key)!).pending).toBeUndefined();
    await userEvent.click(screen.getByRole('button', { name: '重试' })); await ready();
    expect(post.mock.calls.filter(([url]) => url.endsWith('/question'))).toHaveLength(1);
    await ask();
    await waitFor(() => expect(post.mock.calls.at(-1)![1].version).toBe(4));
  });

  it('shows expiry without silently starting a new game', async () => {
    sessionStorage.setItem(key, JSON.stringify({ gameId: base.gameId }));
    get.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } });
    renderGame();
    expect(await screen.findByRole('alert')).toHaveTextContent('本局已过期');
    expect(post).not.toHaveBeenCalled();
    await userEvent.click(within(screen.getByRole('alert')).getByRole('button'));
    await ready();
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/game/start', { mode: 'beginner', variant: 'turtle-soup' });
  });

  it('reloads missing question options without creating another game', async () => {
    get.mockRejectedValueOnce(new Error('offline'));
    renderGame();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    act(() => window.dispatchEvent(new Event('focus')));
    await waitFor(() => expect(get).toHaveBeenCalledWith('/game/soup1/state'));
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '重试' })); await ready();
    expect(post).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenLastCalledWith('/game/soup1/question-options');
  });

  it('does not let an older background read clear an unconfirmed write', async () => {
    renderGame(); await ready();
    let resolve!: (value: unknown) => void;
    get.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    act(() => window.dispatchEvent(new Event('focus')));
    post.mockRejectedValueOnce(new Error('offline'));
    await ask();
    await screen.findByText('上次操作尚未确认，请重试以同步结果。');
    const saved = sessionStorage.getItem(key);
    await act(async () => resolve({ data: base }));
    expect(sessionStorage.getItem(key)).toBe(saved);
    expect(screen.getByRole('button', { name: '重试上次操作' })).toBeInTheDocument();
  });

  it('does not retry a definitively rejected write after refresh', async () => {
    const operation = { gameId: base.gameId, action: 'question', body: { field: 'age', value: 25, requestId: 'denied', version: 0 } };
    sessionStorage.setItem(key, JSON.stringify({ gameId: base.gameId, pending: operation }));
    post.mockRejectedValueOnce({ isAxiosError: true, response: { status: 403 } });
    renderGame();
    await screen.findByText('request failed');
    await userEvent.click(screen.getByRole('button', { name: '重试' })); await ready();
    expect(post).toHaveBeenCalledTimes(1);
    expect(JSON.parse(sessionStorage.getItem(key)!).pending).toBeUndefined();
  });

  it('syncs another tab through storage events and focus', async () => {
    renderGame(); await ready();
    state = { ...base, version: 3, questionCount: 2, remainingQuestions: 16, guessUnlocked: true };
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'csgofriberg_soup_update', newValue: 'updated' })));
    await waitFor(() => expect(screen.getByPlaceholderText('输入选手昵称...')).toBeEnabled());
    state = { ...state, guessUnlocked: false, version: 4 };
    act(() => window.dispatchEvent(new Event('focus')));
    await waitFor(() => expect(screen.getByPlaceholderText('输入选手昵称...')).toBeDisabled());
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('gives up at zero questions only after confirmation, and shows unrecorded results', async () => {
    renderGame(); await ready();
    await userEvent.click(screen.getByRole('button', { name: '认输看答案' }));
    expect(post).toHaveBeenCalledTimes(1);
    state = { ...base, status: 'lost', version: 1, answer, recorded: false };
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '认输看答案' }));
    expect(await screen.findByText('使用 0 次提问 · 0 次猜名')).toBeInTheDocument();
    expect(screen.getByText(/未计入战绩/)).toBeInTheDocument();
  });

  it('exits before restarting and never sends giveup', async () => {
    renderGame(); await ready();
    await userEvent.click(screen.getByRole('button', { name: '重新开始' }));
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '重新开始' }));
    await ready();
    expect(post.mock.calls.map(([url]) => url)).toEqual(['/game/start', '/game/soup1/exit', '/game/start']);
  });

  it('clears pending writes on account change and ignores their late response', async () => {
    renderGame(); await ready();
    let resolve!: (data: unknown) => void;
    post.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    await ask();
    act(() => useAuth.getState().setUser({ id: 42, username: 'test', role: 'user' }));
    await act(async () => resolve({ data: { ...base, status: 'won', answer } }));
    expect(sessionStorage.getItem(key)).toBeNull();
    expect(screen.queryByText('推理成功')).not.toBeInTheDocument();
  });
});
