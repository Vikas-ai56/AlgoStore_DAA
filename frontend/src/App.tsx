import { useEffect } from 'react';
import { useStore } from './store';
import Header from './components/Header';
import Column1 from './components/Column1';
import Column2 from './components/Column2';
import Column3 from './components/Column3';

export default function App() {
  const theme = useStore((s) => s.theme);
  const dark = theme === 'dark';

  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', dark);
  }, [dark]);

  const bd = dark ? '#27272a' : '#e2e8f0';

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', flexDirection: 'column',
      background: dark ? '#09090b' : '#ffffff',
      color: dark ? '#f8fafc' : '#0f172a',
      overflow: 'hidden',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    }}>
      <Header />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', borderTop: `1px solid ${bd}` }}>
        {/* Column 1 — 22% — Upload / Queue / Log */}
        <div style={{
          width: '22%', minWidth: 240,
          borderRight: `1px solid ${bd}`,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          background: dark ? '#09090b' : '#ffffff',
        }}>
          <Column1 />
        </div>

        {/* Column 2 — center — Visualizer */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          background: dark ? '#09090b' : '#ffffff',
        }}>
          <Column2 />
        </div>

        {/* Column 3 — 25% — Analytics */}
        <div style={{
          width: '25%', minWidth: 260,
          borderLeft: `1px solid ${bd}`,
          overflowY: 'auto', overflowX: 'hidden',
          background: dark ? '#0c0c0e' : '#f8fafc',
        }}>
          <Column3 />
        </div>
      </div>
    </div>
  );
}
