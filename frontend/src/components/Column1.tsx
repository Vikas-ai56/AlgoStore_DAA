import { useCallback, useEffect, useRef, useState } from 'react';
import { UploadCloud, CheckCircle2, XCircle, Clock, Loader2, ChevronRight } from 'lucide-react';
import { useStore } from '../store';
import { useJobPoller, uploadImage } from '../api/hooks';
import type { JobEntry } from '../types';

// ─── Dropzone ────────────────────────────────────────────────────────────────
function Dropzone({ onJobStarted }: { onJobStarted: (jobId: string) => void }) {
  const { theme, addJob, updateJob, addLog } = useStore();
  const dark = theme === 'dark';
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      const tempId = `pending_${Date.now().toString(36)}`;
      const entry: JobEntry = {
        id: tempId,
        filename: file.name,
        status: 'PENDING',
        progress: 0,
        stage: 'Queued',
        createdAt: Date.now(),
      };
      addJob(entry);
      addLog(`[${new Date().toISOString().slice(11, 23)}] API: Received — ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

      setUploading(true);
      try {
        const { job_id } = await uploadImage(file);
        // Replace temp id with the real Celery task id
        updateJob(tempId, { id: job_id, status: 'STARTED', stage: 'Processing' });
        addLog(`[${new Date().toISOString().slice(11, 23)}] CELERY: Task enqueued — ${job_id.slice(0, 8)}`);
        onJobStarted(job_id);
      } catch (err) {
        updateJob(tempId, { status: 'FAILURE', stage: 'Upload failed', error: String(err) });
        addLog(`[ERR] Upload failed: ${err}`);
      } finally {
        setUploading(false);
      }
    },
    [addJob, addLog, updateJob, onJobStarted]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const bd = dark ? '#27272a' : '#e4e4e7';
  const hover = dragging
    ? { borderColor: '#f59e0b', background: dark ? '#1c1a0f' : '#fffbeb' }
    : { borderColor: bd, background: 'transparent' };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      style={{
        margin: 12,
        padding: '20px 16px',
        border: `1.5px dashed ${hover.borderColor}`,
        borderRadius: 6,
        background: hover.background,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        transition: 'all 0.18s ease',
        flexShrink: 0,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      {uploading
        ? <Loader2 size={22} color="#f59e0b" style={{ animation: 'spin 1s linear infinite' }} />
        : <UploadCloud size={22} color={dragging ? '#f59e0b' : dark ? '#52525b' : '#a1a1aa'} />
      }
      <span style={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 10,
        letterSpacing: '0.08em',
        color: dragging ? '#f59e0b' : dark ? '#71717a' : '#a1a1aa',
        textAlign: 'center',
        textTransform: 'uppercase',
      }}>
        {uploading ? 'Uploading...' : 'DRAG OR SELECT IMAGE SOURCE'}
      </span>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ job }: { job: JobEntry }) {
  if (job.status === 'SUCCESS') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: '#052e16', color: '#10b981',
        fontSize: 9, fontFamily: '"JetBrains Mono", monospace',
        padding: '2px 7px', borderRadius: 3, letterSpacing: '0.06em',
      }}>
        <CheckCircle2 size={9} /> SUCCESS
      </span>
    );
  }
  if (job.status === 'FAILURE') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: '#2d0e0e', color: '#ef4444',
        fontSize: 9, fontFamily: '"JetBrains Mono", monospace',
        padding: '2px 7px', borderRadius: 3, letterSpacing: '0.06em',
      }}>
        <XCircle size={9} /> FAILURE
      </span>
    );
  }
  if (job.status === 'PENDING') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: '#2d1f00', color: '#f59e0b',
        fontSize: 9, fontFamily: '"JetBrains Mono", monospace',
        padding: '2px 7px', borderRadius: 3, letterSpacing: '0.06em',
      }}>
        <Clock size={9} /> PENDING
      </span>
    );
  }
  // STARTED
  return (
    <span
      className="pulse-badge"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: '#2d1f00', color: '#f59e0b',
        fontSize: 9, fontFamily: '"JetBrains Mono", monospace',
        padding: '2px 7px', borderRadius: 3, letterSpacing: '0.06em',
      }}
    >
      <Loader2 size={9} style={{ animation: 'spin 1s linear infinite' }} />
      PROCESSING
    </span>
  );
}

// ─── Queue Manager ────────────────────────────────────────────────────────────
function QueueManager() {
  const { jobs, theme } = useStore();
  const dark = theme === 'dark';
  const bd = dark ? '#27272a' : '#e4e4e7';

  if (jobs.length === 0) {
    return (
      <div style={{
        padding: '16px 12px',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 11,
        color: dark ? '#3f3f46' : '#d4d4d8',
        textAlign: 'center',
      }}>
        No jobs queued
      </div>
    );
  }

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {/* Table header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr auto',
        padding: '6px 12px',
        borderBottom: `1px solid ${bd}`,
        background: dark ? '#111113' : '#f0f0f0',
        gap: 8,
      }}>
        {['JOB ID', 'STAGE', 'STATUS'].map(h => (
          <span key={h} style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 9,
            color: dark ? '#52525b' : '#a1a1aa',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>{h}</span>
        ))}
      </div>

      {jobs.map((job) => (
        <div
          key={job.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr auto',
            padding: '8px 12px',
            borderBottom: `1px solid ${bd}`,
            gap: 8,
            alignItems: 'start',
          }}
        >
          <div>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 10,
              color: dark ? '#a1a1aa' : '#71717a',
              wordBreak: 'break-all',
            }}>
              {job.id.slice(0, 14)}
            </div>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 9,
              color: dark ? '#52525b' : '#d4d4d8',
              marginTop: 2,
            }}>
              {job.filename}
            </div>
          </div>
          <div>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 10,
              color: dark ? '#e4e4e7' : '#27272a',
            }}>
              {job.status === 'STARTED' ? `[${Math.round(job.progress)}%] ` : ''}
              {job.stage}
            </div>
            {job.status === 'STARTED' && (
              <div style={{
                marginTop: 4,
                height: 2,
                background: dark ? '#27272a' : '#e4e4e7',
                borderRadius: 1,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${job.progress}%`,
                  background: '#f59e0b',
                  transition: 'width 0.3s ease',
                  borderRadius: 1,
                }} />
              </div>
            )}
            {job.error && (
              <div style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 9,
                color: '#ef4444',
                marginTop: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                cursor: 'pointer',
              }}>
                <ChevronRight size={9} /> trace
              </div>
            )}
          </div>
          <StatusBadge job={job} />
        </div>
      ))}
    </div>
  );
}

// ─── Terminal Log ─────────────────────────────────────────────────────────────
function TerminalLog() {
  const { logs, theme } = useStore();
  const endRef = useRef<HTMLDivElement>(null);
  const dark = theme === 'dark';

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div style={{
      flexShrink: 0,
      borderTop: `1px solid ${dark ? '#27272a' : '#e4e4e7'}`,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        padding: '5px 12px',
        background: dark ? '#0a0a0c' : '#f0f0f0',
        borderBottom: `1px solid ${dark ? '#1a1a1e' : '#e4e4e7'}`,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#ef4444', '#f59e0b', '#22c55e'].map((c) => (
            <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c, opacity: 0.8 }} />
          ))}
        </div>
        <span style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 9,
          color: dark ? '#3f3f46' : '#a1a1aa',
          letterSpacing: '0.08em',
        }}>
          PIPELINE STDOUT
        </span>
      </div>

      <div
        style={{
          height: 180,
          overflowY: 'auto',
          background: '#020204',
          padding: '8px 12px',
          position: 'relative',
        }}
      >
        <div className="terminal-scanlines" style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          {logs.length === 0 ? (
            <span style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 11,
              color: '#1a3a1a',
            }}>
              Awaiting input stream...
            </span>
          ) : (
            logs.map((line, i) => {
              const isError = line.includes('[ERR]') || line.includes('FAIL');
              const isSuccess = line.includes('SUCCESS') || line.includes('COMPLETE');
              const isStage = line.includes('STAGE');
              let color = '#4ade80';
              if (isError) color = '#ef4444';
              else if (isSuccess) color = '#10b981';
              else if (isStage) color = '#f59e0b';
              return (
                <div
                  key={i}
                  className="log-line"
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 10,
                    color,
                    lineHeight: 1.7,
                    textShadow: isSuccess ? '0 0 8px rgba(16, 185, 129, 0.4)' : undefined,
                  }}
                >
                  {line}
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>
        {logs.length > 0 && (
          <span
            className="cursor-blink"
            style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11 }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Column 1 root ────────────────────────────────────────────────────────────
export default function Column1() {
  const { theme, updateJob, setDataset, addLog } = useStore();
  const dark = theme === 'dark';
  const bd = dark ? '#27272a' : '#e4e4e7';

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  const { data: pollData } = useJobPoller(activeJobId, polling);

  useEffect(() => {
    if (!pollData || !activeJobId) return;

    if (pollData.status === 'STARTED') {
      updateJob(activeJobId, {
        status: 'STARTED',
        progress: pollData.progress,
        stage: pollData.current_stage,
      });
      addLog(`[${new Date().toISOString().slice(11, 23)}] STAGE: ${pollData.current_stage} — ${pollData.progress}%`);
    }

    if (pollData.status === 'SUCCESS') {
      updateJob(activeJobId, { status: 'SUCCESS', stage: 'Complete', progress: 100, payload: pollData.payload });
      if (pollData.payload) setDataset(pollData.payload);
      addLog(`[${new Date().toISOString().slice(11, 23)}] SUCCESS: Pipeline complete`);
      setPolling(false);
      setActiveJobId(null);
    }

    if (pollData.status === 'FAILURE') {
      updateJob(activeJobId, { status: 'FAILURE', stage: 'Failed', error: pollData.error_traceback });
      addLog(`[ERR] Task failed: ${pollData.error_traceback?.slice(0, 80)}`);
      setPolling(false);
      setActiveJobId(null);
    }
  }, [pollData, activeJobId, updateJob, setDataset, addLog]);

  const handleJobStarted = useCallback((jobId: string) => {
    setActiveJobId(jobId);
    setPolling(true);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Section header */}
      <div style={{
        padding: '8px 12px',
        borderBottom: `1px solid ${bd}`,
        background: dark ? '#0d0d0f' : '#f0f0f0',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 9,
          letterSpacing: '0.12em',
          color: dark ? '#52525b' : '#a1a1aa',
          textTransform: 'uppercase',
        }}>
          Task Pipeline / Queue Engine
        </span>
      </div>

      <Dropzone onJobStarted={handleJobStarted} />

      {/* Queue Manager header */}
      <div style={{
        padding: '6px 12px',
        borderTop: `1px solid ${bd}`,
        borderBottom: `1px solid ${bd}`,
        background: dark ? '#0d0d0f' : '#f0f0f0',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 9,
          letterSpacing: '0.12em',
          color: dark ? '#52525b' : '#a1a1aa',
          textTransform: 'uppercase',
        }}>
          Async Queue Manager
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <QueueManager />
      </div>

      <TerminalLog />
    </div>
  );
}
