import { useState } from 'react';
import { CHARACTERS, PERSONA, PLAYABLE } from '../../data/characters';
import type { CharId, CpuLevel, PlayerConfig } from '../../engine/types';
import { useApp } from '../../store/gameStore';
import { Btn, CharFace, Segmented } from '../common';

type SlotKind = 'human' | 'cpu' | 'none';
interface Slot {
  kind: SlotKind;
  charId: CharId;
  name: string;
  cpuLevel: CpuLevel;
}

function defaultSlots(last: PlayerConfig[] | undefined): Slot[] {
  const base: Slot[] = [
    { kind: 'human', charId: 'pokota', name: 'ポコ太', cpuLevel: 2 },
    { kind: 'cpu', charId: 'mikeko', name: 'ミケ子', cpuLevel: 2 },
    { kind: 'cpu', charId: 'shibamaru', name: 'シバまる', cpuLevel: 2 },
    { kind: 'cpu', charId: 'penkichi', name: 'ペン吉', cpuLevel: 2 },
  ];
  if (!last) return base;
  return base.map((b, i) => {
    const l = last[i];
    return l ? { kind: l.isCpu ? 'cpu' : 'human', charId: l.charId, name: l.name, cpuLevel: l.cpuLevel } : { ...b, kind: 'none' };
  });
}

export function SetupScreen() {
  const lastConfig = useApp((s) => s.lastConfig);
  const startGame = useApp((s) => s.startGame);
  const setScreen = useApp((s) => s.setScreen);
  const [years, setYears] = useState(lastConfig?.years ?? 3);
  const [kumosuke, setKumosuke] = useState(lastConfig?.kumosuke ?? true);
  const [slots, setSlots] = useState<Slot[]>(() => defaultSlots(lastConfig?.players));
  const [picking, setPicking] = useState<number | null>(null);

  const active = slots.filter((s) => s.kind !== 'none');
  const update = (i: number, patch: Partial<Slot>) => setSlots((ss) => ss.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  const pickChar = (i: number, id: CharId) => {
    setSlots((ss) => {
      const other = ss.findIndex((s, j) => j !== i && s.charId === id);
      return ss.map((s, j) => {
        if (j === i) return { ...s, charId: id, name: s.name === CHARACTERS[s.charId].name || !s.name ? CHARACTERS[id].name : s.name };
        // ほかの人と同じキャラなら入れかえる
        if (j === other) return { ...s, charId: ss[i].charId, name: s.name === CHARACTERS[s.charId].name ? CHARACTERS[ss[i].charId].name : s.name };
        return s;
      });
    });
    setPicking(null);
  };

  const start = () => {
    // 同じキャラが2人いたら、空いているキャラにかえる
    const used = new Set<CharId>();
    const players = active.map((s) => {
      let charId = s.charId;
      if (used.has(charId)) charId = PLAYABLE.find((c) => !used.has(c) && !active.some((a) => a.charId === c)) ?? charId;
      used.add(charId);
      return { name: s.name.trim() || CHARACTERS[charId].name, charId, isCpu: s.kind === 'cpu', cpuLevel: s.cpuLevel };
    });
    startGame({ years, kumosuke, players });
  };

  return (
    <div className="page setup">
      <header className="page-head">
        <button type="button" className="back" onClick={() => setScreen('title')}>
          ‹ もどる
        </button>
        <h2>ゲームのじゅんび</h2>
      </header>

      <section className="panel">
        <h3>あそぶ年数</h3>
        <Segmented
          value={years}
          onChange={setYears}
          options={[
            { value: 1, label: '1年' },
            { value: 3, label: '3年' },
            { value: 5, label: '5年' },
            { value: 10, label: '10年' },
          ]}
        />
        <p className="note">1年は12か月。みんなが1回ずつサイコロをふると1か月すすみます。</p>
      </section>

      <section className="panel">
        <h3>プレイヤー（{active.length}人）</h3>
        {slots.map((s, i) => (
          <div key={i} className={`slot ${s.kind === 'none' ? 'off' : ''}`} style={{ ['--pc' as string]: CHARACTERS[s.charId].color }}>
            <div className="slot-top">
              <span className="slot-no">{i + 1}P</span>
              <Segmented<SlotKind>
                value={s.kind}
                onChange={(k) => update(i, { kind: k })}
                options={i === 0 ? [{ value: 'human', label: '人間' }, { value: 'cpu', label: 'CPU' }] : [{ value: 'human', label: '人間' }, { value: 'cpu', label: 'CPU' }, { value: 'none', label: 'なし' }]}
              />
            </div>
            {s.kind !== 'none' && (
              <div className="slot-body">
                <button type="button" className="slot-face" onClick={() => setPicking(picking === i ? null : i)} aria-label="キャラをえらぶ">
                  <CharFace id={s.charId} size={54} expr="happy" />
                  <span className="change">かえる</span>
                </button>
                <div className="slot-fields">
                  <input className="name-input" value={s.name} maxLength={6} onChange={(e) => update(i, { name: e.target.value })} aria-label="なまえ" />
                  {s.kind === 'cpu' && <div className="persona">性格：{PERSONA[s.charId].label}</div>}
                  {s.kind === 'cpu' && (
                    <Segmented<CpuLevel>
                      value={s.cpuLevel}
                      onChange={(v) => update(i, { cpuLevel: v })}
                      options={[
                        { value: 1, label: 'よわい' },
                        { value: 2, label: 'ふつう' },
                        { value: 3, label: 'つよい' },
                      ]}
                    />
                  )}
                </div>
              </div>
            )}
            {picking === i && (
              <div className="char-picker">
                {PLAYABLE.map((id) => (
                  <button type="button" key={id} className={`pick ${s.charId === id ? 'on' : ''}`} onClick={() => pickChar(i, id)}>
                    <CharFace id={id} size={46} />
                    <span>{CHARACTERS[id].name}</span>
                  </button>
                ))}
                <p className="note">
                  {CHARACTERS[s.charId].intro}
                  {s.kind === 'cpu' && `（CPUの性格：${PERSONA[s.charId].label}…${PERSONA[s.charId].desc}）`}
                </p>
              </div>
            )}
          </div>
        ))}
        <p className="note">人間が2人以上いるときは、1台のスマホを順番にわたして遊びます。</p>
      </section>

      <section className="panel">
        <h3>いたずら雨雲「くもすけ」</h3>
        <div className="kumo-row">
          <CharFace id="kumo" size={48} expr="happy" />
          <Segmented<string>
            value={kumosuke ? 'on' : 'off'}
            onChange={(v) => setKumosuke(v === 'on')}
            options={[
              { value: 'on', label: 'でてくる' },
              { value: 'off', label: 'でてこない' },
            ]}
          />
        </div>
        <p className="note">だれかがおまつり会場に着くと、一番遠くにいる人にくっついて いたずらをします。</p>
      </section>

      <div className="setup-start">
        <Btn variant="primary" big disabled={active.length < 2} onClick={start}>
          {active.length < 2 ? '2人以上で遊べます' : 'ゲームスタート！'}
        </Btn>
      </div>
    </div>
  );
}
