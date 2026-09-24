import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Soup, RotateCcw, Home, Flag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Page from '../components/Page';
import GuessInputBar from '../components/GuessInputBar';
import SoupLog from '../components/SoupLog';
import { PlayerInfoTable } from '../components/AnswerOverlay';
import { useConfirm } from '../components/ConfirmDialog';
import { useAuth } from '../store/auth';
import { useTurtleSoup } from '../hooks/useTurtleSoup';
import { AVAILABLE_DIFFICULTIES } from '../config/difficulties';
import { difficultyLabel } from '../utils/difficulty';
import { countryLabel, regionLabel } from '../utils/playerGeography';
import { playerRoleLabel } from '../utils/playerRoles';
import { SOUP_FIELDS, type SoupField } from '../turtleSoup';

export default function TurtleSoupGame() {
  const { mode = 'beginner' } = useParams();
  const identity = useAuth((s) => s.user?.id ?? 'guest');
  const initialized = useAuth((s) => s.initialized);
  const { t } = useTranslation();
  if (!AVAILABLE_DIFFICULTIES.some((d) => d.key === mode)) return <Navigate to="/turtle-soup" replace />;
  if (!initialized) return <Page title={t('soup.title')}><p role="status">{t('common.loading')}</p></Page>;
  return <SoupGamePage key={`${identity}:${mode}`} mode={mode} />;
}

function SoupGamePage({ mode }: { mode: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { game, options, busy, error, expired, pending, load, submit, exit } = useTurtleSoup(mode);
  const [values, setValues] = useState<Partial<Record<SoupField, string>>>({});
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setValues({}); }, [game?.gameId]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [game?.events.length]);

  const leaveOrRestart = async (restart: boolean) => {
    if (busy || pending) return;
    if (!expired && game?.status === 'playing' && !await confirm({
      title: t(restart ? 'game.restartTitle' : 'game.leaveTitle'),
      message: t('soup.exitMessage'),
      confirmLabel: t(restart ? 'game.restart' : 'game.leaveConfirm'), tone: 'danger',
    })) return;
    if (await exit()) {
      if (restart) await load(); else navigate('/');
    }
  };

  const giveup = async () => {
    if (busy || pending || !game || game.status !== 'playing') return;
    if (await confirm({ title: t('game.revealTitle'), message: t('soup.giveupMessage'), confirmLabel: t('soup.giveup'), tone: 'danger' })) {
      await submit('giveup', {});
    }
  };
  const disabled = busy || expired || Boolean(error) || Boolean(pending) || game?.status !== 'playing';
  const questionDisabled = disabled || !options || !game?.remainingQuestions;
  const hint = !game?.guessUnlocked ? t('soup.locked') : game.remainingQuestions === 0 ? t('soup.lastGuess') : t('soup.unlocked');
  const regions = [...new Set(options?.countries.map((c) => c.region) ?? [])].sort();

  return <Page title={`${t('soup.title')} · ${difficultyLabel(t, mode)}`} icon={<Soup size={18} />} className="soup-page" showHome={false}
    actions={<>
      <button className="btn btn-ghost btn-sm" disabled={busy || Boolean(pending)} onClick={() => void leaveOrRestart(true)} aria-label={t('game.restart')}><RotateCcw size={15} /><span className="btn-text">{t('game.restart')}</span></button>
      <button className="btn btn-ghost btn-sm" disabled={busy || Boolean(pending)} onClick={() => void leaveOrRestart(false)} aria-label={t('common.home')}><Home size={15} /><span className="btn-text">{t('common.home')}</span></button>
    </>}
    statusBar={<><span>{t('soup.remaining')}</span><strong className="soup-counter" aria-live="polite">{game?.remainingQuestions ?? 18}<small> / 18</small></strong><span className="muted">{t('soup.description')}</span></>}
    dock={game?.status === 'playing' && <GuessInputBar key={game.gameId} disabled={disabled || !game.guessUnlocked}
      onPick={(player) => submit('guess', { playerId: player.id })} buttonText={t('soup.guess')} statusText={hint} />}>
    {error && !pending && <div className="card" role="alert"><p>{expired ? t('soup.expired') : error}</p><button className="btn" onClick={() => void load()} disabled={busy}>{t(expired ? 'game.restart' : 'common.retry')}</button></div>}
    {pending && !busy && <div className="card soup-pending" role="alert"><p>{t('soup.pending')}</p><button className="btn" disabled={busy} onClick={() => void load()}>{t('soup.retry')}</button></div>}
    {!game && busy && <p role="status">{t('common.loading')}</p>}
    {game && <div className="soup-layout">
      <section className="card soup-history"><div className="soup-section-heading"><h2>{t('soup.log')}</h2><span className="muted">{game.questionCount} / 18</span></div>
        <SoupLog events={game.events} />
        {game.answer && <section className={`soup-result soup-${game.status === 'won' ? 'correct' : 'wrong'}`} aria-live="polite">
          <h2>{t(game.status === 'won' ? 'soup.win' : 'soup.loss')}</h2><h3>{game.answer.nickname}</h3>
          <p>{t('soup.result', { questions: game.questionCount, guesses: game.guessCount })}</p>
          <PlayerInfoTable answer={game.answer} /><p>{t('soup.age')}: {game.answer.age} · {t(game.answer.isActive ? 'soup.active' : 'soup.retired')}</p>
          {game.recorded === false && <p className="muted">{t('soup.unrecorded')}</p>}
          <div className="btns"><button className="btn btn-green" disabled={busy} onClick={() => void leaveOrRestart(true)}>{t('game.restart')}</button><Link className="btn" to="/stats?variant=turtle-soup">{t('soup.stats')}</Link><Link className="btn" to="/leaderboard?mode=turtle-soup">{t('soup.leaderboard')}</Link></div>
        </section>}
        <div ref={endRef} />
      </section>
      <aside className="card soup-questions"><h2>{t('soup.questions')}</h2>
        {SOUP_FIELDS.map((field) => <form className="soup-question" key={field} onSubmit={(event) => {
          event.preventDefault();
          if (questionDisabled || values[field] === undefined || (values[field] === '' && field !== 'team')) return;
          const raw = values[field]!;
          if (field === 'team' && !options?.teams.includes(raw)) return;
          const value = field === 'isActive' ? raw === 'true' : ['age', 'majorChampionships', 'majorAppearances'].includes(field) ? Number(raw) : raw;
          void submit('question', { field, value });
        }}>
          <label htmlFor={`soup-${field}`}>{t(`soup.${field}`)}</label>
          <div className="soup-question-controls">
            {field === 'nationality' ? <select className="input" id={`soup-${field}`} disabled={Boolean(questionDisabled)} value={values[field] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))} required>
              <option value="">{t('soup.select')}</option>{regions.map((region) => <optgroup key={region} label={regionLabel(t, region)}>{options?.countries.filter((c) => c.region === region).map((c) => <option key={c.nationality} value={c.nationality}>{countryLabel(t, c.nationality)}</option>)}</optgroup>)}
            </select> : field === 'role' || field === 'isActive' ? <select className="input" id={`soup-${field}`} disabled={Boolean(questionDisabled)} value={values[field] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))} required>
              <option value="">{t('soup.select')}</option>{(field === 'role' ? ['Rifler', 'AWPer', 'Coach'] : ['true', 'false']).map((v) => <option key={v} value={v}>{field === 'role' ? playerRoleLabel(v) : t(v === 'true' ? 'soup.active' : 'soup.retired')}</option>)}
            </select> : <input className="input" id={`soup-${field}`} type={field === 'team' ? 'text' : 'number'}
              list={field === 'team' ? 'soup-teams' : undefined} placeholder={field === 'team' ? t('soup.searchTeam') : field === 'age' ? '25' : '0'}
              disabled={Boolean(questionDisabled)} value={values[field] ?? ''} required={field !== 'team'}
              min={field === 'age' ? 1 : 0} max={field === 'age' ? 120 : 1000} step={1}
              onChange={(e) => {
                e.target.setCustomValidity(field === 'team' && !options?.teams.includes(e.target.value) ? t('errors.SOUP_INVALID_OPTION') : '');
                setValues((v) => ({ ...v, [field]: e.target.value }));
              }} />}
            <button className="btn" disabled={Boolean(questionDisabled) || values[field] === undefined} aria-label={`${t('soup.ask')} · ${t(`soup.${field}`)}`}>{t('soup.ask')}</button>
          </div>
          {field === 'team' && options?.teams.includes('') && <button className="soup-no-team" type="button" disabled={Boolean(questionDisabled)} onClick={() => { setValues((v) => ({ ...v, team: '' })); (document.getElementById('soup-team') as HTMLInputElement)?.setCustomValidity(''); }}>{t('soup.noTeam')}</button>}
        </form>)}
        <datalist id="soup-teams">{options?.teams.filter(Boolean).map((team) => <option key={team} value={team} />)}</datalist>
        <button className="btn btn-warning soup-giveup" disabled={disabled} onClick={() => void giveup()}><Flag size={15} />{t('soup.giveup')}</button>
        <details className="soup-rules"><summary>{t('soup.rules')}</summary><p>{t('soup.rulesText')}</p></details>
      </aside>
    </div>}
  </Page>;
}
