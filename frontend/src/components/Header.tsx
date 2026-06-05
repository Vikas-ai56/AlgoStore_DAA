import { useStore } from '../store';
import { Sun, Moon, Database, HardDrive } from 'lucide-react';

export default function Header() {
  const { theme, toggleTheme } = useStore();
  const dark = theme === 'dark';

  const bd = dark ? '#27272a' : '#e2e8f0';
  const bg = dark ? '#0c0c0e' : '#ffffff';
  const text2 = dark ? '#71717a' : '#64748b';
  const text3 = dark ? '#52525b' : '#94a3b8';

  return (
    <header style={{
      height: 52,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px',
      borderBottom: `1px solid ${bd}`,
      background: bg,
      flexShrink: 0,
    }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: dark ? '#f8fafc' : '#0f172a', letterSpacing: '-0.01em' }}>
          AlgoStore
        </span>
        <span style={{ color: dark ? '#3f3f46' : '#cbd5e1', fontSize: 16, lineHeight: 1 }}>/</span>
        <span style={{ fontSize: 14, color: text2 }}>
          Compression Profiler
        </span>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Infrastructure indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {[
            { Icon: Database, label: 'PostgreSQL' },
            { Icon: HardDrive, label: 'MinIO' },
          ].map(({ Icon, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon size={13} color={text3} />
              <span style={{ fontSize: 12, color: text2 }}>{label}</span>
              <span style={{
                display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                background: dark ? '#10b981' : '#059669',
              }} />
            </div>
          ))}
        </div>

        <div style={{ width: 1, height: 18, background: bd }} />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 11px',
            border: `1px solid ${bd}`,
            borderRadius: 6,
            background: 'transparent',
            color: text2,
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: 'inherit',
            transition: 'background 0.15s',
          }}
        >
          {dark ? <Sun size={13} /> : <Moon size={13} />}
          {dark ? 'Light' : 'Dark'}
        </button>
      </div>
    </header>
  );
}
