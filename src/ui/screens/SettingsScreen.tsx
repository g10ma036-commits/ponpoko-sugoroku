import { useState } from 'react';
import { useApp } from '../../store/gameStore';
import { Btn, Segmented } from '../common';

export function SettingsScreen() {
  const prefs = useApp((s) => s.prefs);
  const setPrefs = useApp((s) => s.setPrefs);
  const setScreen = useApp((s) => s.setScreen);
  const hasSave = useApp((s) => s.hasSave);
  const deleteSave = useApp((s) => s.deleteSave);
  const resetTips = useApp((s) => s.resetTips);
  const tipsSeen = useApp((s) => s.tipsSeen);
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="page settings">
      <header className="page-head">
        <button type="button" className="back" onClick={() => setScreen('title')}>
          ‹ もどる
        </button>
        <h2>せってい</h2>
      </header>

      <section className="panel">
        <h3>BGM</h3>
        <Segmented<string> value={prefs.bgm ? 'on' : 'off'} onChange={(v) => setPrefs({ bgm: v === 'on' })} options={[{ value: 'on', label: 'ON' }, { value: 'off', label: 'OFF' }]} />
        <h3>効果音</h3>
        <Segmented<string> value={prefs.sfx ? 'on' : 'off'} onChange={(v) => setPrefs({ sfx: v === 'on' })} options={[{ value: 'on', label: 'ON' }, { value: 'off', label: 'OFF' }]} />
        <h3>進むはやさ</h3>
        <Segmented<1 | 2 | 3>
          value={prefs.speed}
          onChange={(v) => setPrefs({ speed: v })}
          options={[
            { value: 1, label: 'ゆっくり' },
            { value: 2, label: 'ふつう' },
            { value: 3, label: 'はやい' },
          ]}
        />
      </section>

      <section className="panel">
        <h3>はじめての案内</h3>
        <Segmented<string>
          value={prefs.tutorial ? 'on' : 'off'}
          onChange={(v) => setPrefs({ tutorial: v === 'on' })}
          options={[
            { value: 'on', label: 'ON' },
            { value: 'off', label: 'OFF' },
          ]}
        />
        <p className="note">ゲーム中に ホー博士が 遊び方を 少しずつ 教えてくれます。</p>
        {tipsSeen.length > 0 && <Btn onClick={resetTips}>案内を 最初から もう一度見る</Btn>}
      </section>

      <section className="panel">
        <h3>セーブデータ</h3>
        {!hasSave && <p className="note">とちゅうのゲームはありません。</p>}
        {hasSave && !confirm && (
          <Btn variant="danger" onClick={() => setConfirm(true)}>
            とちゅうのゲームを消す
          </Btn>
        )}
        {hasSave && confirm && (
          <div className="confirm">
            <p>本当に消しますか？ もとにもどせません。</p>
            <Btn
              variant="danger"
              onClick={() => {
                deleteSave();
                setConfirm(false);
              }}
            >
              消す
            </Btn>
            <Btn onClick={() => setConfirm(false)}>やめる</Btn>
          </div>
        )}
      </section>

      <section className="panel">
        <h3>このゲームについて</h3>
        <p className="note">
          「ぽんぽこ列島すごろく」は無料・広告なしのオリジナルゲームです。キャラクター・地図・音楽はすべてこのゲームのために作りました。
          <br />
          フォント：Zen Maru Gothic（SIL Open Font License 1.1）
        </p>
        <p className="note">ホーム画面に追加すると、アプリのように起動でき、オフラインでも遊べます。</p>
      </section>
    </div>
  );
}
