import { useEffect } from 'react';
import { useStore } from './store';
import Header from './components/Header';
import Column1 from './components/Column1';
import Column2 from './components/Column2';
import Column3 from './components/Column3';

export default function App() {
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('light-mode', theme === 'light');
  }, [theme]);

  const dark = theme === 'dark';

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: dark ? '#09090b' : '#fafafa',
        color: dark ? '#f4f4f5' : '#09090b',
        overflow: 'hidden',
        fontFamily: 'Geist, system-ui, -apple-system, sans-serif',
      }}
    >
      <Header />
      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          borderTop: `1px solid ${dark ? '#27272a' : '#e4e4e7'}`,
        }}
      >
        {/* Column 1 — 22% — Task Pipeline */}
        <div
          style={{
            width: '22%',
            minWidth: 240,
            borderRight: `1px solid ${dark ? '#27272a' : '#e4e4e7'}`,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            overflowX: 'hidden',
            background: dark ? '#09090b' : '#fafafa',
          }}
        >
          <Column1 />
        </div>

        {/* Column 2 — 53% — Core Visualizer */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: dark ? '#09090b' : '#fafafa',
          }}
        >
          <Column2 />
        </div>

        {/* Column 3 — 25% — Analytics */}
        <div
          style={{
            width: '25%',
            minWidth: 260,
            borderLeft: `1px solid ${dark ? '#27272a' : '#e4e4e7'}`,
            overflowY: 'auto',
            overflowX: 'hidden',
            background: dark ? '#0c0c0e' : '#f4f4f5',
          }}
        >
          <Column3 />
        </div>
      </div>
    </div>
  );
}
