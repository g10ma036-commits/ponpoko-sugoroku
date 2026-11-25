import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { setBgmMode, sfx, type BgmMode } from '../../audio/sound';
import { CharSvg } from '../../characters/Characters';
import { CHARACTERS, quipFor } from '../../data/characters';
import { PROP } from '../../data/properties';
import { decide } from '../../engine/ai';
import { stationName } from '../../engine/game';
import { dist, reachableEnds } from '../../engine/graph';
import type { GameState, Msg } from '../../engine/types';
import { useApp } from '../../store/gameStore';
import { Board, type VoyageInfo } from '../board/Board';
import { Btn, CharFace, Sheet } from '../common';
import { DiceOverlay } from '../hud/DiceOverlay';
import { MessageDialog } from '../hud/MessageDialog';
import { BuySheet, CardSheet, FerrySheet, NewsSheet, PlayerSheet, SellSheet, ShopSheet, SquareSheet } from '../hud/Sheets';
import { TopBar } from '../hud/TopBar';
import { TutorialBubble, currentTip } from '../hud/Tutorial';
import { ResultScreen } from './ResultScreen';

const SPEED = [0, 0.6, 1, 1.7];

/** CPUの番のメッセージは自動で進める（人間がいない対戦なら全部） */
function isAuto(game: GameState, msg: Msg) {
  const allCpu = game.players.every((p) => p.isCpu);
  if (allCpu) return true;
  if (msg.settlement || game.phase.t === 'gameOver') return false;
  return game.players[game.turn].isCpu;
}

export function GameScreen() {
  const game = useApp((s) => s.game)!;
  const dispatch = useApp((s) => s.dispatch);
  const prefs = useApp((s) => s.prefs);
  const fastForward = useApp((s) => s.fastForward);
  const setFastForward = useApp((s) => s.setFastForward);
  const quitToTitle = useApp((s) => s.quitToTitle);
  const setPrefs = useApp((s) => s.setPrefs);
  const tipsSeen = useApp((s) => s.tipsSeen);
  const markTip = useApp((s) => s.markTip);
  const zukanNews = useApp((s) => s.zukanNews);

  const [overview, setOverview] = useState(false);
  // node の go が true なら「光るマス」を押したとき（そこへ行くか聞く）
  const [sheet, setSheet] = useState<null | 'cards' | 'menu' | 'news' | { player: number } | { node: string; go?: boolean }>(null);
  const [voyage, setVoyage] = useState<VoyageInfo | null>(null);
  const [handoffDone, setHandoffDone] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: number; text: string; sub?: string; color: string }[]>([]);
  const toast = (text: string, color: string, sub?: string, ms = 2400) => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts.slice(-2), { id, text, sub, color }]);
    window.setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), ms);
  };

  const p = game.players[game.turn];
  const ph = game.phase;
  const msg = game.queue[0];
  const humans = game.players.filter((q) => !q.isCpu).length;
  const turnKey = `${game.year}-${game.month}-${game.turn}`;
  const needHandoff = !p.isCpu && humans >= 2 && !msg && ph.t === 'action' && handoffDone !== turnKey;
  const speed = fastForward && p.isCpu ? 5 : SPEED[prefs.speed];
  const humanTurn = !p.isCpu && !msg && !needHandoff;
  const gameOver = ph.t === 'gameOver' && !msg;
  // 説明やメニューを見ているあいだは、人間の番を止めておく
  const paused = sheet !== null && !p.isCpu;

  // ---- 場面に合わせてBGMを切りかえる（決算・くもすけの番・だれかが おまつり会場の近く）
  const nearGoal = game.players.some((q) => dist(q.pos, game.destination) <= 6);
  const bgm: BgmMode = gameOver || msg?.settlement ? 'festival' : game.kumo !== null && game.kumo === game.turn ? 'kumo' : nearGoal ? 'near' : 'normal';
  useEffect(() => setBgmMode(bgm), [bgm]);
  useEffect(() => () => setBgmMode('normal'), []);

  // 人間の移動中は、止まれるマスを計算して光らせる
  const moveKey = ph.t === 'moving' && !p.isCpu && ph.steps > 0 ? `${p.pos}|${ph.prev}|${ph.steps}|${game.destination}` : '';
  const ends = useMemo(() => {
    if (!moveKey || ph.t !== 'moving') return [];
    return [...reachableEnds(p.pos, ph.prev, ph.steps, game.destination)];
  }, [moveKey]);

  // ---- ゲームを自動で進める（CPUの考え、1マスずつの移動、メッセージの自動送り）
  useEffect(() => {
    if (gameOver || paused || voyage) return;
    let t: number | undefined;
    if (msg) {
      if (isAuto(game, msg)) t = window.setTimeout(() => dispatch({ t: 'ACK' }), (msg.settlement ? 3200 : 1500) / speed);
    } else if (!needHandoff) {
      if (ph.t === 'moving' && !ph.options) {
        t = window.setTimeout(() => dispatch({ t: 'STEP' }), (ph.walked === 0 ? 1350 : 240) / speed);
      } else if (p.isCpu) {
        const a = decide(game);
        if (a) t = window.setTimeout(() => dispatch(a), (ph.t === 'moving' ? (ph.walked === 0 ? 1350 : 500) : ph.t === 'action' ? 900 : 650) / speed);
      }
    }
    return () => window.clearTimeout(t);
  }, [game, msg, needHandoff, speed, dispatch, p.isCpu, ph, gameOver, paused, voyage]);

  // ---- 1マス進むたびに音、CPUが物件を買ったらお知らせ
  const prev = useRef(game);
  useEffect(() => {
    const before = prev.current;
    prev.current = game;
    if (before === game) return;
    const bp = before.players[before.turn];
    if (game.phase.t === 'moving' && bp.id === p.id && bp.pos !== p.pos) sfx.step();
    // フェリーに乗った → 船が航路をわたるあいだ、ゲームを止めておく
    if (before.phase.t === 'ferry' && game.players[before.turn].pos !== bp.pos) {
      const ms = 2600 / speed;
      setVoyage({ player: bp.id, from: bp.pos, ms, key: Date.now() });
      sfx.horn();
      window.setTimeout(() => setVoyage(null), ms + 200);
    }
    const bought = Object.keys(game.owner).filter((id) => before.owner[id] === undefined);
    if (bought.length > 0 && p.isCpu) {
      sfx.buy();
      const quip = quipFor(p.charId, 'buy', bought[0]);
      toast(`${p.name}が「${PROP[bought[0]].name}」を買った！`, CHARACTERS[p.charId].color, quip ? `「${quip}」` : undefined);
    }
  }, [game, p, speed]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- はじめて買った物件は図鑑にのる
  useEffect(() => {
    if (!zukanNews) return;
    sfx.card();
    const names = zukanNews.props.map((id) => PROP[id]?.name).filter(Boolean);
    toast(`📖 図鑑に のった！`, '#e0a800', names.map((n) => `「${n}」`).join(''));
  }, [zukanNews?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 手番が変わったら全体マップを閉じる
  useEffect(() => setOverview(false), [game.turn]);

  if (gameOver) return <ResultScreen game={game} />;

  const lastRollDice = ph.t === 'moving' ? ph.dice : [];
  const tip = prefs.tutorial && !paused ? currentTip(game, humanTurn, ends.length, tipsSeen) : null;

  return (
    <div className="game">
      <TopBar game={game} onPlayer={(id) => setSheet({ player: id })} onDest={() => setSheet({ node: game.destination })} />
      <div className="board-wrap">
        <Board
          game={game}
          overview={overview}
          canChoose={humanTurn}
          ends={ends}
          onChoose={(to) => {
            if (dispatch({ t: 'DIR', to })) sfx.step();
          }}
          onGoal={(to) => {
            sfx.tap();
            setSheet({ node: to, go: true });
          }}
          onInspect={(node) => {
            sfx.tap();
            setSheet({ node });
          }}
          onPlayer={(id) => {
            sfx.tap();
            setSheet({ player: id });
          }}
          voyage={voyage}
        />
        <BoardTools
          overview={overview}
          onOverview={() => setOverview((v) => !v)}
          onMenu={() => setSheet('menu')}
          onNews={() => {
            sfx.tap();
            setSheet('news');
          }}
        />
        {tip && <TutorialBubble tip={tip} onOk={() => markTip(tip)} onStop={() => setPrefs({ tutorial: false })} />}
        <div className={`toasts ${tip ? 'below-tip' : ''}`}>
          {toasts.map((t) => (
            <div key={t.id} className="toast" style={{ borderColor: t.color }}>
              {t.text}
              {t.sub && <span className="toast-sub">{t.sub}</span>}
            </div>
          ))}
        </div>
      </div>

      <ActionBar
        game={game}
        humanTurn={humanTurn}
        ends={ends.length}
        sailing={voyage !== null}
        fastForward={fastForward}
        onRoll={() => dispatch({ t: 'ROLL' })}
        onCards={() => setSheet('cards')}
        onFast={() => setFastForward(!fastForward)}
      />

      <DiceOverlay rollId={game.rollId} dice={lastRollDice} speed={speed} />

      {/* 人間の番の操作パネル */}
      {humanTurn && ph.t === 'buy' && <BuySheet game={game} station={ph.station} dispatch={dispatch} />}
      {humanTurn && ph.t === 'shop' && <ShopSheet game={game} items={ph.items} dispatch={dispatch} />}
      {humanTurn && ph.t === 'sell' && <SellSheet game={game} dispatch={dispatch} />}
      {humanTurn && ph.t === 'ferry' && !voyage && !sheet && <FerrySheet game={game} to={ph.to} dispatch={dispatch} />}
      {humanTurn && ph.t === 'action' && sheet === 'cards' && <CardSheet game={game} dispatch={dispatch} onClose={() => setSheet(null)} />}
      {sheet && typeof sheet === 'object' && 'player' in sheet && !msg && <PlayerSheet game={game} player={sheet.player} onClose={() => setSheet(null)} />}
      {sheet && typeof sheet === 'object' && 'node' in sheet && !msg && (
        <SquareSheet
          game={game}
          node={sheet.node}
          onClose={() => setSheet(null)}
          onGo={
            sheet.go
              ? () => {
                  const to = sheet.node;
                  setSheet(null);
                  if (dispatch({ t: 'GOAL', to })) {
                    sfx.card();
                    setOverview(false);
                  }
                }
              : undefined
          }
        />
      )}
      {sheet === 'news' && !msg && <NewsSheet game={game} onClose={() => setSheet(null)} />}
      {sheet === 'menu' && (
        <Sheet title="メニュー" onClose={() => setSheet(null)}>
          <div className="menu-list">
            <Btn onClick={() => setPrefs({ bgm: !prefs.bgm })}>BGM：{prefs.bgm ? 'ON' : 'OFF'}</Btn>
            <Btn onClick={() => setPrefs({ sfx: !prefs.sfx })}>効果音：{prefs.sfx ? 'ON' : 'OFF'}</Btn>
            <Btn onClick={() => setPrefs({ speed: ((prefs.speed % 3) + 1) as 1 | 2 | 3 })}>
              進むはやさ：{['', 'ゆっくり', 'ふつう', 'はやい'][prefs.speed]}
            </Btn>
            <Btn onClick={() => setPrefs({ tutorial: !prefs.tutorial })}>はじめての案内：{prefs.tutorial ? 'ON' : 'OFF'}</Btn>
            <Btn variant="danger" onClick={quitToTitle}>
              タイトルにもどる
            </Btn>
            <p className="note">とちゅうの状態は自動で保存されます。タイトルの「つづきから」で再開できます。</p>
          </div>
        </Sheet>
      )}

      {needHandoff && (
        <div className="handoff" onClick={() => setHandoffDone(turnKey)}>
          <div className="handoff-card" style={{ ['--pc' as string]: CHARACTERS[p.charId].color }}>
            <CharSvg id={p.charId} expr="happy" size={120} className="bob" />
            <div className="handoff-name">{p.name}さんの番です</div>
            <div className="handoff-sub">スマホを {p.name}さんに わたしてね</div>
            <Btn variant="primary" big onClick={() => setHandoffDone(turnKey)}>
              スタート！
            </Btn>
          </div>
        </div>
      )}

      {msg && !voyage && <MessageDialog game={game} msg={msg} auto={isAuto(game, msg)} onNext={() => dispatch({ t: 'ACK' })} />}
    </div>
  );
}

interface ActionBarProps {
  game: GameState;
  humanTurn: boolean;
  /** 止まれるマスの数 */
  ends: number;
  /** フェリーで移動中 */
  sailing: boolean;
  fastForward: boolean;
  onRoll: () => void;
  onCards: () => void;
  onFast: () => void;
}

function ActionBar({ game, humanTurn, ends, sailing, fastForward, onRoll, onCards, onFast }: ActionBarProps) {
  const p = game.players[game.turn];
  const ph = game.phase;
  const color = CHARACTERS[p.charId].color;

  let center: ReactNode;
  if (sailing) {
    center = <div className="ab-status big">⛴ フェリーで 移動中…</div>;
  } else if (p.isCpu) {
    center = (
      <div className="ab-status">
        <span className="thinking">{p.name}（CPU）の番</span>
        <Btn variant={fastForward ? 'primary' : 'secondary'} onClick={onFast}>
          ⏩ {fastForward ? 'はやおくり中' : 'はやおくり'}
        </Btn>
      </div>
    );
  } else if (ph.t === 'action' && humanTurn) {
    center = (
      <div className="ab-actions">
        <Btn variant="primary" big className="roll-btn" onClick={onRoll}>
          🎲 サイコロをふる
        </Btn>
        <Btn onClick={onCards} className="cards-btn">
          🃏 カード<span className="badge">{p.cards.length}</span>
        </Btn>
      </div>
    );
  } else if (ph.t === 'moving') {
    let sub: string | null = null;
    let main = `のこり ${ph.steps} マス`;
    if (humanTurn && ph.goal) {
      main = `🚩 えらんだマスへ すすみ中（のこり ${ph.steps}）`;
    } else if (humanTurn && ph.options) {
      main = '✨ 光るマスを押すと 一気に進むよ';
      sub = '矢印で 1マスずつ 道をえらんでもOK';
    } else if (humanTurn && ends > 1) {
      sub = '✨ 光るマスを押すと そこまで一気に進むよ';
    }
    center = (
      <div className="ab-status big">
        <span>
          {main}
          {sub && <span className="ab-sub">{sub}</span>}
        </span>
      </div>
    );
  } else if (ph.t === 'buy') {
    center = <div className="ab-status">{stationName(ph.station)}で 物件を見ています</div>;
  } else if (ph.t === 'ferry') {
    center = <div className="ab-status big">⛴ フェリーに 乗る？</div>;
  } else {
    center = <div className="ab-status">…</div>;
  }

  return (
    <div className="actionbar" style={{ ['--pc' as string]: color }}>
      <div className="ab-who">
        <CharFace id={p.charId} size={40} expr="happy" />
        <span>{p.name}</span>
      </div>
      <div className="ab-center">{center}</div>
    </div>
  );
}

/** 盤面の右上に浮かぶボタン（全体マップ・景気ニュース・メニュー） */
function BoardTools({ overview, onOverview, onMenu, onNews }: { overview: boolean; onOverview: () => void; onMenu: () => void; onNews: () => void }) {
  return (
    <div className="board-tools">
      <button type="button" className="icon-btn" onClick={onOverview} aria-label="全体マップ">
        {overview ? '📍' : '🗺️'}
      </button>
      <button type="button" className="icon-btn" onClick={onNews} aria-label="景気ニュース">
        📰
      </button>
      <button type="button" className="icon-btn" onClick={onMenu} aria-label="メニュー">
        ☰
      </button>
    </div>
  );
}
