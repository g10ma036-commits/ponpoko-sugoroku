import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { sfx } from '../../audio/sound';
import { CharSvg } from '../../characters/Characters';
import { CHARACTERS } from '../../data/characters';
import { PROP } from '../../data/properties';
import { decide } from '../../engine/ai';
import { stationName } from '../../engine/game';
import { reachableEnds } from '../../engine/graph';
import type { GameState, Msg } from '../../engine/types';
import { useApp } from '../../store/gameStore';
import { Board } from '../board/Board';
import { Btn, CharFace, Sheet } from '../common';
import { DiceOverlay } from '../hud/DiceOverlay';
import { MessageDialog } from '../hud/MessageDialog';
import { BuySheet, CardSheet, PlayerSheet, SellSheet, ShopSheet, SquareSheet } from '../hud/Sheets';
import { TopBar } from '../hud/TopBar';
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

  const [overview, setOverview] = useState(false);
  const [sheet, setSheet] = useState<null | 'cards' | 'menu' | { player: number } | { node: string }>(null);
  const [handoffDone, setHandoffDone] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: number; text: string; color: string }[]>([]);

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

  // 人間の移動中は、止まれるマスを計算して光らせる
  const moveKey = ph.t === 'moving' && !p.isCpu && ph.steps > 0 ? `${p.pos}|${ph.prev}|${ph.steps}|${game.destination}` : '';
  const ends = useMemo(() => {
    if (!moveKey || ph.t !== 'moving') return [];
    return [...reachableEnds(p.pos, ph.prev, ph.steps, game.destination)];
  }, [moveKey]);

  // ---- ゲームを自動で進める（CPUの考え、1マスずつの移動、メッセージの自動送り）
  useEffect(() => {
    if (gameOver || paused) return;
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
  }, [game, msg, needHandoff, speed, dispatch, p.isCpu, ph, gameOver, paused]);

  // ---- 1マス進むたびに音、CPUが物件を買ったらお知らせ
  const prev = useRef(game);
  useEffect(() => {
    const before = prev.current;
    prev.current = game;
    if (before === game) return;
    const bp = before.players[before.turn];
    if (game.phase.t === 'moving' && bp.id === p.id && bp.pos !== p.pos) sfx.step();
    const bought = Object.keys(game.owner).filter((id) => before.owner[id] === undefined);
    if (bought.length > 0 && p.isCpu) {
      sfx.buy();
      const id = Date.now();
      const text = `${p.name}が「${PROP[bought[0]].name}」を買った！`;
      setToasts((ts) => [...ts.slice(-2), { id, text, color: CHARACTERS[p.charId].color }]);
      window.setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 2200);
    }
  }, [game, p]);

  // 手番が変わったら全体マップを閉じる
  useEffect(() => setOverview(false), [game.turn]);

  if (gameOver) return <ResultScreen game={game} />;

  const lastRollDice = ph.t === 'moving' ? ph.dice : [];

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
            if (dispatch({ t: 'GOAL', to })) {
              sfx.card();
              setOverview(false);
            }
          }}
          onInspect={(node) => {
            sfx.tap();
            setSheet({ node });
          }}
          onPlayer={(id) => {
            sfx.tap();
            setSheet({ player: id });
          }}
        />
        <BoardTools overview={overview} onOverview={() => setOverview((v) => !v)} onMenu={() => setSheet('menu')} />
        <div className="toasts">
          {toasts.map((t) => (
            <div key={t.id} className="toast" style={{ borderColor: t.color }}>
              {t.text}
            </div>
          ))}
        </div>
      </div>

      <ActionBar
        game={game}
        humanTurn={humanTurn}
        ends={ends.length}
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
      {humanTurn && ph.t === 'action' && sheet === 'cards' && <CardSheet game={game} dispatch={dispatch} onClose={() => setSheet(null)} />}
      {sheet && typeof sheet === 'object' && 'player' in sheet && !msg && <PlayerSheet game={game} player={sheet.player} onClose={() => setSheet(null)} />}
      {sheet && typeof sheet === 'object' && 'node' in sheet && !msg && <SquareSheet game={game} node={sheet.node} onClose={() => setSheet(null)} />}
      {sheet === 'menu' && (
        <Sheet title="メニュー" onClose={() => setSheet(null)}>
          <div className="menu-list">
            <Btn onClick={() => setPrefs({ bgm: !prefs.bgm })}>BGM：{prefs.bgm ? 'ON' : 'OFF'}</Btn>
            <Btn onClick={() => setPrefs({ sfx: !prefs.sfx })}>効果音：{prefs.sfx ? 'ON' : 'OFF'}</Btn>
            <Btn onClick={() => setPrefs({ speed: ((prefs.speed % 3) + 1) as 1 | 2 | 3 })}>
              進むはやさ：{['', 'ゆっくり', 'ふつう', 'はやい'][prefs.speed]}
            </Btn>
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

      {msg && <MessageDialog game={game} msg={msg} auto={isAuto(game, msg)} onNext={() => dispatch({ t: 'ACK' })} />}
    </div>
  );
}

interface ActionBarProps {
  game: GameState;
  humanTurn: boolean;
  /** 止まれるマスの数 */
  ends: number;
  fastForward: boolean;
  onRoll: () => void;
  onCards: () => void;
  onFast: () => void;
}

function ActionBar({ game, humanTurn, ends, fastForward, onRoll, onCards, onFast }: ActionBarProps) {
  const p = game.players[game.turn];
  const ph = game.phase;
  const color = CHARACTERS[p.charId].color;

  let center: ReactNode;
  if (p.isCpu) {
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

/** 盤面の右上に浮かぶボタン（全体マップ・メニュー） */
function BoardTools({ overview, onOverview, onMenu }: { overview: boolean; onOverview: () => void; onMenu: () => void }) {
  return (
    <div className="board-tools">
      <button type="button" className="icon-btn" onClick={onOverview} aria-label="全体マップ">
        {overview ? '📍' : '🗺️'}
      </button>
      <button type="button" className="icon-btn" onClick={onMenu} aria-label="メニュー">
        ☰
      </button>
    </div>
  );
}
