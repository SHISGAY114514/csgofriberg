import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, useParams } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { renderAtRoute } from '../render';
import TurtleSoupLobby from '../../src/pages/TurtleSoupLobby';

function Destination() { return <p>selected:{useParams().mode}</p>; }
function renderLobby() {
  return renderAtRoute(<TurtleSoupLobby />, { route: '/turtle-soup', path: '/turtle-soup',
    extraRoutes: <Route path="/turtle-soup/:mode" element={<Destination />} /> });
}
describe('Turtle Soup lobby', () => {
  it('defaults to beginner independently of the classic preference', async () => {
    localStorage.setItem('csgofriberg.single-difficulty', 'normal');
    renderLobby();
    await userEvent.click(screen.getByRole('button', { name: '开始游戏' }));
    expect(await screen.findByText('selected:beginner')).toBeInTheDocument();
    expect(localStorage.getItem('csgofriberg.single-difficulty')).toBe('normal');
  });
  it('saves and uses the selected soup difficulty', async () => {
    renderLobby();
    await userEvent.click(screen.getByRole('button', { name: /简单版/ }));
    expect(localStorage.getItem('csgofriberg_soup_difficulty')).toBe('easy');
    await userEvent.click(screen.getByRole('button', { name: '开始游戏' }));
    expect(await screen.findByText('selected:easy')).toBeInTheDocument();
  });
  it('restores the soup difficulty and keeps its rules available', async () => {
    localStorage.setItem('csgofriberg_soup_difficulty', 'normal');
    renderLobby();
    expect(screen.getByRole('button', { name: /完整版/ })).toHaveClass('active');
    await userEvent.click(screen.getByText('玩法规则'));
    expect(screen.getByText(/30 分钟无有效操作后过期/)).toBeVisible();
  });
});
