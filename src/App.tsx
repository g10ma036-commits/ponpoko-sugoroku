import { useEffect } from 'react';
import { unlockAudio } from './audio/sound';
import { useApp } from './store/gameStore';
import { GameScreen } from './ui/screens/GameScreen';
import { HowToScreen } from './ui/screens/HowToScreen';
import { SettingsScreen } from './ui/screens/SettingsScreen';
import { SetupScreen } from './ui/screens/SetupScreen';
import { TitleScreen } from './ui/screens/TitleScreen';

export function App() {
  const screen = useApp((s) => s.screen);
  const hasGame = useApp((s) => s.game !== null);

  // iPhone は画面にふれるまで音を出せないので、最初のタップで音をオンにする
  useEffect(() => {
    const on = () => unlockAudio();
    window.addEventListener('pointerdown', on);
    return () => window.removeEventListener('pointerdown', on);
  }, []);

  return (
    <div className="app">
      {screen === 'title' && <TitleScreen />}
      {screen === 'setup' && <SetupScreen />}
      {screen === 'howto' && <HowToScreen />}
      {screen === 'settings' && <SettingsScreen />}
      {screen === 'game' && hasGame && <GameScreen />}
    </div>
  );
}
