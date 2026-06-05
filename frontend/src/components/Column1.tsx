import { useCallback, useEffect, useRef, useState } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';
import { useStore } from '../store';
import { useJobPoller, uploadImage } from '../api/hooks';
import type { JobEntry, ProfilerDataset, StorageJobResult } from '../types';

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ label, dark }: { label: string; dark: boolean }) {
  return (
    <div style={{
      padding: '6px 14px',
      borderBottom: `1px solid ${dark ? '#27272a' : '#e2e8f0'}`,
      background: dark ? '#111113' : '#f8fafc',
      flexShrink: 0,
    }}>
      <span style={{
        fontSize: 10, fontWeight: 500,
        color: dark ? '#52525b' : '#94a3b8',
        textTransform: 'uppercase', letterSpacing: '0.07em',
      }}>
        {label}
      </span>
    </div>
  );
}

// ─── Dropzone ─────────────────────────────────────────────────────────────────
function Dropzone({ onJobStarted, dark }: { onJobStarted: (jobId: string, storageJobId?: string) => void; dark: boolean }) {
  const { addJob, updateJob, addLog } = useStore();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    const tempId = `pending_${Date.now().toString(36)}`;
    addJob({ id: tempId, filename: file.name, status: 'PENDING', progress: 0, stage: 'Queued', createdAt: Date.now() });
    addLog(`[${new Date().toISOString().slice(11, 23)}] Received — ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    setUploading(true);
    try {
      const { job_id, storage_job_id } = await uploadImage(file);
      updateJob(tempId, { id: job_id, status: 'STARTED', stage: 'Processing', storageJobId: storage_job_id, storageStatus: 'PENDING' });
      addLog(`[${new Date().toISOString().slice(11, 23)}] Enqueued — ${job_id.slice(0, 8)}`);
      onJobStarted(job_id, storage_job_id);
    } catch (err) {
      updateJob(tempId, { status: 'FAILURE', stage: 'Upload failed', error: String(err) });
      addLog(`[ERR] Upload failed: ${err}`);
    } finally {
      setUploading(false);
    }
  }, [addJob, addLog, updateJob, onJobStarted]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const borderColor = dragging
    ? '#2563eb'
    : dark ? '#27272a' : '#e2e8f0';
  const bg = dragging
    ? (dark ? '#0c1a3a' : '#eff6ff')
    : 'transparent';

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      style={{
        margin: 14,
        padding: '22px 16px',
        border: `1.5px dashed ${borderColor}`,
        borderRadius: 8,
        background: bg,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 9,
        transition: 'all 0.15s',
        flexShrink: 0,
      }}
    >
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

      {uploading
        ? <Loader2 size={20} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />
        : <UploadCloud size={20} color={dragging ? '#2563eb' : dark ? '#52525b' : '#94a3b8'} />
      }

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: dark ? '#a1a1aa' : '#475569' }}>
          {uploading ? 'Uploading…' : 'Drop an image here'}
        </div>
        {!uploading && (
          <div style={{ fontSize: 12, color: dark ? '#52525b' : '#94a3b8', marginTop: 2 }}>
            PNG, JPEG, WEBP — up to 20 MB
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Status indicator ─────────────────────────────────────────────────────────
function StatusDot({ status }: { status: JobEntry['status'] }) {
  const map: Record<JobEntry['status'], { color: string; label: string }> = {
    SUCCESS: { color: '#059669', label: 'Done' },
    FAILURE: { color: '#dc2626', label: 'Failed' },
    PENDING: { color: '#d97706', label: 'Queued' },
    STARTED: { color: '#2563eb', label: 'Running' },
  };
  const { color, label } = map[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
      <span style={{ color, fontWeight: 500 }}>{label}</span>
    </span>
  );
}

// ─── Storage status indicator ─────────────────────────────────────────────────
function StorageDot({ storageStatus }: { storageStatus: JobEntry['storageStatus'] }) {
  if (!storageStatus) return null;
  const map: Record<NonNullable<JobEntry['storageStatus']>, { color: string; label: string }> = {
    SUCCESS: { color: '#059669', label: 'Stored' },
    FAILURE: { color: '#dc2626', label: 'Store fail' },
    PENDING: { color: '#d97706', label: 'Storing' },
    STARTED: { color: '#d97706', label: 'Storing' },
  };
  const { color, label } = map[storageStatus];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
      <span style={{ color, fontWeight: 400 }}>{label}</span>
    </span>
  );
}

// ─── Queue ────────────────────────────────────────────────────────────────────
function QueueManager({ dark }: { dark: boolean }) {
  const { jobs } = useStore();
  const bd = dark ? '#27272a' : '#e2e8f0';
  const subtleBd = dark ? '#1a1a1e' : '#f1f5f9';

  if (jobs.length === 0) {
    return (
      <div style={{ padding: '24px 14px', fontSize: 12, color: dark ? '#3f3f46' : '#cbd5e1', textAlign: 'center' }}>
        No jobs yet
      </div>
    );
  }

  return (
    <div>
      {/* Column headers */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto auto',
        padding: '5px 14px', gap: 8,
        background: dark ? '#111113' : '#f8fafc',
        borderBottom: `1px solid ${bd}`,
      }}>
        {['File', 'Stage', 'Status'].map(h => (
          <span key={h} style={{
            fontSize: 10, fontWeight: 500,
            color: dark ? '#52525b' : '#94a3b8',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {h}
          </span>
        ))}
      </div>

      {jobs.map((job) => (
        <div key={job.id} style={{
          display: 'grid', gridTemplateColumns: '1fr auto auto',
          padding: '8px 14px', gap: 8,
          borderBottom: `1px solid ${subtleBd}`,
          alignItems: 'start',
        }}>
          {/* File */}
          <div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, color: dark ? '#a1a1aa' : '#64748b',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {job.filename.length > 22 ? job.filename.slice(0, 22) + '…' : job.filename}
            </div>
          </div>

          {/* Stage + progress bar */}
          <div>
            <div style={{ fontSize: 11, color: dark ? '#e4e4e7' : '#334155', whiteSpace: 'nowrap' }}>
              {job.stage}
            </div>
            {job.status === 'STARTED' && (
              <div style={{ marginTop: 4, height: 2, background: dark ? '#27272a' : '#e2e8f0', borderRadius: 1, width: 64, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${job.progress}%`, background: '#2563eb', transition: 'width 0.3s', borderRadius: 1 }} />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
            <StatusDot status={job.status} />
            {job.storageJobId && <StorageDot storageStatus={job.storageStatus} />}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Log panel ────────────────────────────────────────────────────────────────
function LogPanel() {
  const { logs } = useStore();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div style={{ flexShrink: 0 }}>
      {/* Panel titlebar */}
      <div style={{
        padding: '5px 14px',
        background: '#0f172a',
        borderTop: '1px solid #1e293b',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: '#475569' }}>Pipeline log</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#334155' }}>
          {logs.length} lines
        </span>
      </div>

      {/* Output */}
      <div style={{
        height: 172,
        overflowY: 'auto',
        background: '#020617',
        padding: '8px 12px',
      }}>
        {logs.length === 0 ? (
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#1e3a5f' }}>
            Awaiting input…
          </span>
        ) : (
          logs.map((line, i) => {
            const isError = line.includes('[ERR]') || line.includes('FAIL');
            const isSuccess = line.includes('Complete') || line.includes('SUCCESS');
            const color = isError ? '#f87171' : isSuccess ? '#4ade80' : '#475569';
            return (
              <div key={i} className="log-line" style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, color, lineHeight: 1.8,
              }}>
                {line}
              </div>
            );
          })
        )}
        <div ref={endRef} />
        {logs.length > 0 && (
          <span className="cursor-blink" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }} />
        )}
      </div>
    </div>
  );
}

// ─── Column 1 root ────────────────────────────────────────────────────────────
export default function Column1() {
  const { theme, updateJob, setDataset, addLog, setCurrentJobId } = useStore();
  const dark = theme === 'dark';

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const { data: pollData } = useJobPoller(activeJobId, polling);

  const [storageJobId, setStorageJobId] = useState<string | null>(null);
  const [storagePolling, setStoragePolling] = useState(false);
  const { data: storagePollData } = useJobPoller(storageJobId, storagePolling);
  const profileJobIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pollData || !activeJobId) return;

    if (pollData.status === 'STARTED') {
      updateJob(activeJobId, { status: 'STARTED', progress: pollData.progress, stage: pollData.current_stage });
      addLog(`[${new Date().toISOString().slice(11, 23)}] ${pollData.current_stage} — ${pollData.progress}%`);
    }
    if (pollData.status === 'SUCCESS') {
      updateJob(activeJobId, { status: 'SUCCESS', stage: 'Complete', progress: 100, payload: pollData.payload as ProfilerDataset | undefined });
      if (pollData.payload) setDataset(pollData.payload as ProfilerDataset);
      addLog(`[${new Date().toISOString().slice(11, 23)}] Complete`);
      setPolling(false);
      setActiveJobId(null);
    }
    if (pollData.status === 'FAILURE') {
      updateJob(activeJobId, { status: 'FAILURE', stage: 'Failed', error: pollData.error_traceback });
      addLog(`[ERR] ${pollData.error_traceback?.slice(0, 80)}`);
      setPolling(false);
      setActiveJobId(null);
    }
  }, [pollData, activeJobId, updateJob, setDataset, addLog]);

  useEffect(() => {
    if (!storagePollData || !storageJobId) return;

    if (storagePollData.status === 'SUCCESS') {
      const result = storagePollData.payload as StorageJobResult | undefined;
      const imageId = result?.upload_response?.image_id;
      if (profileJobIdRef.current) {
        updateJob(profileJobIdRef.current, { storageStatus: 'SUCCESS', imageId });
      }
      addLog(`[${new Date().toISOString().slice(11, 23)}] Stored — id:${imageId?.slice(0, 8) ?? '?'}`);
      setStoragePolling(false);
      setStorageJobId(null);
    }
    if (storagePollData.status === 'FAILURE') {
      if (profileJobIdRef.current) {
        updateJob(profileJobIdRef.current, { storageStatus: 'FAILURE' });
      }
      addLog(`[ERR] Storage task failed`);
      setStoragePolling(false);
      setStorageJobId(null);
    }
  }, [storagePollData, storageJobId, updateJob, addLog]);

  const handleJobStarted = useCallback((jobId: string, sJobId?: string) => {
    setActiveJobId(jobId);
    setPolling(true);
    profileJobIdRef.current = jobId;
    setCurrentJobId(jobId);
    if (sJobId) {
      setStorageJobId(sJobId);
      setStoragePolling(true);
    }
  }, [setCurrentJobId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <SectionLabel label="Upload" dark={dark} />
      <Dropzone onJobStarted={handleJobStarted} dark={dark} />

      <SectionLabel label="Queue" dark={dark} />
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <QueueManager dark={dark} />
      </div>

      <SectionLabel label="Log" dark={dark} />
      <LogPanel />
    </div>
  );
}
