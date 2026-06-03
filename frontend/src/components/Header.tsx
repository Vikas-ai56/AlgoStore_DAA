import { useStore } from '../store';
import { Sun, Moon, Database, Cpu } from 'lucide-react';

const WORKER_COUNT = 8;

export default function Header() {
  const { theme, toggleTheme } = useStore();
  const dark = theme === 'dark';

  const bd = dark ? '#27272a' : '#e4e4e7';
  const bg = dark ? '#0c0c0e' : '#f4f4f5';
  const muted = dark ? '#a1a1aa' : '#71717a';

  return (
    <header
      style={{
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: `1px solid ${bd}`,
        background: bg,
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      {/* Left — title + workers */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.12em',
            color: dark ? '#f4f4f5' : '#09090b',
            textTransform: 'uppercase',
          }}
        >
          ALGOSTORE{' '}
          <span style={{ color: '#52525b', fontWeight: 400 }}>//</span>
          {' '}COMPRESSION PROFILER
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#10b981',
              marginLeft: 10,
              verticalAlign: 'middle',
              boxShadow: '0 0 6px #10b981',
            }}
            className="pulse-dot"
          />
        </span>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 10px',
            border: `1px solid ${bd}`,
            borderRadius: 4,
            background: dark ? '#18181b' : '#ffffff',
          }}
        >
          <Cpu size={12} color={dark ? '#10b981' : '#059669'} />
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: dark ? '#10b981' : '#059669' }}>
            Worker Pool:&nbsp;
          </span>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, fontWeight: 600, color: dark ? '#f4f4f5' : '#09090b' }}>
            {WORKER_COUNT}/{WORKER_COUNT}&nbsp;
          </span>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: muted }}>Active</span>
          <div style={{ display: 'flex', gap: 3, marginLeft: 4 }}>
            {Array.from({ length: WORKER_COUNT }).map((_, i) => (
              <span
                key={i}
                className="pulse-dot"
                style={{
                  display: 'inline-block',
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: '#10b981',
                  animationDelay: `${i * 0.22}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right — DB status + theme toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 10px',
            border: `1px solid ${bd}`,
            borderRadius: 4,
            background: dark ? '#18181b' : '#ffffff',
          }}
        >
          <Database size={12} color={muted} />
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: muted }}>
            PostgreSQL
          </span>
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 4px #10b981',
            }}
          />
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: muted }}>
            | MinIO
          </span>
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 4px #10b981',
            }}
          />
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            border: `1px solid ${bd}`,
            borderRadius: 4,
            background: dark ? '#18181b' : '#ffffff',
            color: dark ? '#a1a1aa' : '#71717a',
            cursor: 'pointer',
            fontSize: 11,
            fontFamily: '"JetBrains Mono", monospace',
            transition: 'all 0.15s',
          }}
        >
          {dark
            ? <><Sun size={12} /><span>LIGHT</span></>
            : <><Moon size={12} /><span>DARK</span></>
          }
        </button>
      </div>
    </header>
  );
}
