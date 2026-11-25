// 図鑑・記録。行った駅・買った物件・ひとりじめした駅を集めて、何度遊んでも残る。
import { useState } from 'react';
import { CHARACTERS } from '../../data/characters';
import { NODE, REGIONS, STATION_IDS } from '../../data/map';
import { CATEGORY_LABEL, PROPS_BY_STATION } from '../../data/properties';
import { formatRyo } from '../../engine/format';
import type { RegionId } from '../../engine/types';
import { useApp } from '../../store/gameStore';
import { CharFace, Segmented } from '../common';

type Tab = 'stations' | 'props' | 'records';

const REGION_IDS = Object.keys(REGIONS) as RegionId[];
const stationsOf = (r: RegionId) => STATION_IDS.filter((id) => NODE[id].region === r);
const ALL_PROPS = STATION_IDS.flatMap((id) => PROPS_BY_STATION[id]);

function Progress({ have, total }: { have: number; total: number }) {
  return (
    <div className="zk-progress">
      <div className="zk-bar">
        <div style={{ width: `${(have / Math.max(total, 1)) * 100}%` }} />
      </div>
      <span>
        {have} / {total}
      </span>
    </div>
  );
}

export function ZukanScreen() {
  const setScreen = useApp((s) => s.setScreen);
  const r = useApp((s) => s.records);
  const [tab, setTab] = useState<Tab>('stations');
  const visited = new Set(r.stations);
  const owned = new Set(r.props);
  const monos = new Set(r.monopolies);

  return (
    <div className="page zukan">
      <header className="page-head">
        <button type="button" className="back" onClick={() => setScreen('title')}>
          ‹ もどる
        </button>
        <h2>📖 図鑑・記録</h2>
      </header>

      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'stations', label: '🚉 駅' },
          { value: 'props', label: '🏠 物件' },
          { value: 'records', label: '🏆 記録' },
        ]}
      />

      {tab === 'stations' && (
        <section className="panel">
          <h3>行ったことのある駅</h3>
          <Progress have={STATION_IDS.filter((id) => visited.has(id)).length} total={STATION_IDS.length} />
          {REGION_IDS.map((reg) => {
            const list = stationsOf(reg);
            const have = list.filter((id) => visited.has(id)).length;
            return (
              <div key={reg} className="zk-region">
                <div className="zk-region-head" style={{ ['--rc' as string]: REGIONS[reg].color }}>
                  {REGIONS[reg].name}
                  <span>
                    {have}/{list.length}
                  </span>
                </div>
                <div className="zk-chips">
                  {list.map((id) => (
                    <span key={id} className={`zk-chip ${visited.has(id) ? 'on' : ''}`}>
                      {visited.has(id) ? NODE[id].name : '？？？'}
                      {monos.has(id) && <span title="ひとりじめしたことがある">👑</span>}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
          <p className="note">通りすぎた駅も「行った」になるよ。👑 は ひとりじめしたことのある駅。</p>
        </section>
      )}

      {tab === 'props' && (
        <section className="panel">
          <h3>買ったことのある物件</h3>
          <Progress have={ALL_PROPS.filter((p) => owned.has(p.id)).length} total={ALL_PROPS.length} />
          {REGION_IDS.map((reg) => (
            <div key={reg} className="zk-region">
              <div className="zk-region-head" style={{ ['--rc' as string]: REGIONS[reg].color }}>
                {REGIONS[reg].name}
                <span>
                  {stationsOf(reg).flatMap((id) => PROPS_BY_STATION[id]).filter((p) => owned.has(p.id)).length}/
                  {stationsOf(reg).flatMap((id) => PROPS_BY_STATION[id]).length}
                </span>
              </div>
              {stationsOf(reg).map((id) => (
                <div key={id} className="zk-station">
                  <div className="zk-st-name">{visited.has(id) ? NODE[id].name : '？？？'}</div>
                  <div className="zk-props">
                    {PROPS_BY_STATION[id].map((p) => (
                      <span key={p.id} className={`zk-prop ${owned.has(p.id) ? 'on' : ''}`}>
                        <i style={{ background: owned.has(p.id) ? CATEGORY_LABEL[p.cat].color : '#d8cbb3' }} />
                        {owned.has(p.id) ? p.name : '？？？'}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </section>
      )}

      {tab === 'records' && (
        <section className="panel">
          <h3>これまでの記録</h3>
          <div className="stats">
            <div>
              遊んだ回数<b>{r.games}回</b>
            </div>
            <div>
              優勝<b>{r.wins}回</b>
            </div>
            <div>
              一番のり<b>{r.arrivals}回</b>
            </div>
            <div>
              ひとりじめ<b>{r.monopolies.length}駅</b>
            </div>
          </div>
          <h3>最高の総資産</h3>
          {r.best ? (
            <div className="zk-best" style={{ ['--pc' as string]: CHARACTERS[r.best.charId].color }}>
              <CharFace id={r.best.charId} size={48} expr="happy" />
              <div>
                <div className="zk-best-money">{formatRyo(r.best.value)}</div>
                <div className="note">
                  {r.best.name}さん（{r.best.years}年のゲーム・{r.best.date}）
                </div>
              </div>
            </div>
          ) : (
            <p className="note">まだ記録がありません。最後まで遊ぶと のこるよ。</p>
          )}
          <p className="note">記録は 人間のプレイヤーのぶんだけ 数えます（CPUだけの対戦は数えません）。</p>
        </section>
      )}
    </div>
  );
}
