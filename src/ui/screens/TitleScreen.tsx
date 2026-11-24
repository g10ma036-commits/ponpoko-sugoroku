import { CharSvg } from '../../characters/Characters';
import { PLAYABLE } from '../../data/characters';
import { useApp } from '../../store/gameStore';
import { Btn } from '../common';

export function TitleScreen() {
  const hasSave = useApp((s) => s.hasSave);
  const setScreen = useApp((s) => s.setScreen);
  const continueGame = useApp((s) => s.continueGame);

  return (
    <div className="title">
      <div className="title-sky">
        <div className="sun" />
        <div className="cloud c1" />
        <div className="cloud c2" />
      </div>
      <div className="title-logo">
        <div className="logo-sub">どうぶつたちの列島めぐり</div>
        <h1 className="logo">
          <span>ぽんぽこ</span>
          <span className="logo-2">列島すごろく</span>
        </h1>
      </div>
      <div className="title-chars">
        {PLAYABLE.map((id, i) => (
          <div key={id} className="title-char" style={{ animationDelay: `${i * 0.12}s` }}>
            <CharSvg id={id} expr={i % 2 === 0 ? 'happy' : 'normal'} size={64} />
          </div>
        ))}
      </div>
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
        <div className="title-row">
          <Btn onClick={() => setScreen('howto')}>あそびかた</Btn>
          <Btn onClick={() => setScreen('settings')}>せってい</Btn>
        </div>
      </div>
      <div className="title-foot">無料・広告なし ／ オフラインでも遊べます</div>
    </div>
  );
}
