import { CharShape, CharSvg, VIEWBOX } from '../../characters/Characters';
import { useApp } from '../../store/gameStore';
import { Btn } from '../common';
import { Weather } from '../hud/Weather';

/**
 * タイトルの汽車「ぽんぽこ号」。運転するのは車掌さんのポン太、客車には みんなが乗る。
 * 左から入ってきて まん中で止まり、汽笛の煙を はいて 右へ出ていく（くり返し）。
 */
function TitleTrain() {
  const rider = (id: Parameters<typeof CharShape>[0]['id'], x: number, size = 44, delay = 0) => (
    <g className="rider" style={{ animationDelay: `${delay}s` }}>
      <svg x={x - size / 2} y={60 - size * 1.12} width={size} height={size * 1.12} viewBox={VIEWBOX} overflow="visible">
        <CharShape id={id} expr="happy" />
      </svg>
    </g>
  );
  const wheel = (x: number, r = 9) => (
    <g transform={`translate(${x} 74)`}>
      <g className="wheel">
        <circle r={r} fill="#4a3426" />
        <circle r={r - 3.5} fill="#f2b82e" />
        <path d={`M${-(r - 3.5)},0 L${r - 3.5},0 M0,${-(r - 3.5)} L0,${r - 3.5}`} stroke="#4a3426" strokeWidth={2} />
      </g>
    </g>
  );
  return (
    <div className="title-scene" aria-hidden="true">
      <div className="title-hills" />
      <div className="title-rail" />
      <div className="train">
        <svg viewBox="0 0 344 90" width={344} height={90} overflow="visible">
          {/* 煙 */}
          <g className="smoke">
            <circle cx={296} cy={0} r={9} />
            <circle cx={296} cy={0} r={11} />
            <circle cx={296} cy={0} r={8} />
          </g>
          {/* 客車2両（後ろから） */}
          <g>
            <rect x={4} y={30} width={118} height={38} rx={8} fill="#3d8bdb" stroke="#4a3426" strokeWidth={3.5} />
            <rect x={4} y={30} width={118} height={9} rx={4} fill="#7cc6e6" stroke="#4a3426" strokeWidth={3} />
            {rider('penkichi', 30, 42, 0.1)}
            {rider('usami', 63, 42, 0.3)}
            {rider('konko', 96, 42, 0.5)}
            <rect x={4} y={44} width={118} height={24} rx={6} fill="#3d8bdb" stroke="#4a3426" strokeWidth={3.5} />
            <path d="M12,56 L114,56" stroke="#ffd45a" strokeWidth={3} strokeLinecap="round" />
            {wheel(26)}
            {wheel(100)}
          </g>
          <rect x={120} y={56} width={10} height={5} fill="#4a3426" />
          <g>
            <rect x={128} y={44} width={92} height={24} rx={6} fill="#2fae86" stroke="#4a3426" strokeWidth={3.5} />
            {rider('mikeko', 152, 42, 0.2)}
            {rider('shibamaru', 192, 42, 0.4)}
            <rect x={128} y={50} width={92} height={18} rx={6} fill="#2fae86" stroke="#4a3426" strokeWidth={3.5} />
            <path d="M136,59 L212,59" stroke="#ffd45a" strokeWidth={3} strokeLinecap="round" />
            {wheel(148)}
            {wheel(200)}
          </g>
          <rect x={218} y={56} width={10} height={5} fill="#4a3426" />
          {/* 機関車 */}
          <g>
            <rect x={226} y={20} width={40} height={48} rx={6} fill="#ffe9c4" stroke="#4a3426" strokeWidth={3.5} />
            {rider('pokota', 246, 38, 0)}
            <rect x={226} y={44} width={40} height={24} rx={4} fill="#e0524a" stroke="#4a3426" strokeWidth={3.5} />
            <rect x={222} y={12} width={48} height={10} rx={4} fill="#4a3426" />
            <rect x={262} y={36} width={68} height={32} rx={14} fill="#f29a4a" stroke="#4a3426" strokeWidth={3.5} />
            <rect x={288} y={10} width={16} height={28} rx={3} fill="#4a3426" />
            <rect x={284} y={6} width={24} height={8} rx={3} fill="#4a3426" />
            <circle cx={330} cy={50} r={6} fill="#ffe27a" stroke="#4a3426" strokeWidth={3} />
            <path d="M330,68 L344,80 L314,80 Z" fill="#4a3426" />
            <text x={296} y={57} className="train-name">
              ぽんぽこ号
            </text>
            {wheel(244, 11)}
            {wheel(280, 9)}
            {wheel(312, 9)}
          </g>
        </svg>
      </div>
    </div>
  );
}

export function TitleScreen() {
  const hasSave = useApp((s) => s.hasSave);
  const setScreen = useApp((s) => s.setScreen);
  const continueGame = useApp((s) => s.continueGame);
  const fx = useApp((s) => s.prefs.fx);

  return (
    <div className="title">
      <div className="title-sky">
        <div className="sun" />
        <div className="cloud c1" />
        <div className="cloud c2" />
        <div className="bird b1" />
        <div className="bird b2" />
      </div>
      {fx && <Weather month={new Date().getMonth() + 1} className="title-weather" />}
      <div className="title-logo">
        <div className="logo-sub">どうぶつたちの列島めぐり</div>
        <h1 className="logo">
          <span>ぽんぽこ</span>
          <span className="logo-2">列島すごろく</span>
        </h1>
      </div>
      <TitleTrain />
      <div className="title-host">
        <CharSvg id="hoo" expr="happy" size={70} className="bob" />
        <div className="bubble">サイコロをふって、列島をめぐろう！</div>
      </div>
      <div className="title-menu">
        <Btn variant="primary" big onClick={() => setScreen('setup')}>
          はじめから
        </Btn>
        <Btn big disabled={!hasSave} onClick={continueGame}>
          つづきから
        </Btn>
        <div className="title-row three">
          <Btn onClick={() => setScreen('howto')}>あそびかた</Btn>
          <Btn onClick={() => setScreen('zukan')}>📖 図鑑</Btn>
          <Btn onClick={() => setScreen('settings')}>せってい</Btn>
        </div>
      </div>
      <div className="title-foot">無料・広告なし ／ オフラインでも遊べます</div>
    </div>
  );
}
