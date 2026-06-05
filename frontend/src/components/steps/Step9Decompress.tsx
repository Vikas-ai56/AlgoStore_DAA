import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useStoredImages } from '../../api/hooks';

interface Step9DecompressProps {
  imageId: string | undefined;
  storageStatus: 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE' | undefined;
  theme: 'dark' | 'light';
}

type ReconState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; blobUrl: string; sizeBytes: number; filename: string }
  | { kind: 'error'; message: string };

export default function Step9Decompress({ imageId, storageStatus, theme }: Step9DecompressProps) {
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [reconState, setReconState] = useState<ReconState>({ kind: 'idle' });
  const prevBlobRef = useRef<string | null>(null);
  const downloadRef = useRef<HTMLAnchorElement>(null);
  const prevStorageStatusRef = useRef<string | undefined>(undefined);
  const dark = theme === 'dark';

  const bg = dark ? '#0d0d0f' : '#ffffff';
  const border = dark ? '#27272a' : '#e2e8f0';
  const text = dark ? '#e4e4e7' : '#334155';
  const muted = dark ? '#52525b' : '#94a3b8';
  const accent = dark ? '#60a5fa' : '#2563eb';

  const { data: galleryData, refetch: refetchGallery, isLoading: galleryLoading } = useStoredImages(50);

  // Auto-refresh gallery when a new image finishes storing
  useEffect(() => {
    if (prevStorageStatusRef.current !== 'SUCCESS' && storageStatus === 'SUCCESS') {
      refetchGallery();
    }
    prevStorageStatusRef.current = storageStatus;
  }, [storageStatus, refetchGallery]);

  const fetchImage = useCallback(async (id: string) => {
    setSelectedImageId(id);
    setReconState({ kind: 'loading' });
    try {
      const res = await fetch(`/api/images/${id}/decompress`);
      if (!res.ok) {
        const errText = await res.text().catch(() => `HTTP ${res.status}`);
        setReconState({ kind: 'error', message: errText || `HTTP ${res.status}` });
        return;
      }
      const blob = await res.blob();
      if (prevBlobRef.current) URL.revokeObjectURL(prevBlobRef.current);
      const blobUrl = URL.createObjectURL(blob);
      prevBlobRef.current = blobUrl;
      const cd = res.headers.get('Content-Disposition') ?? '';
      const fnMatch = cd.match(/filename="([^"]+)"/);
      const filename = fnMatch?.[1] ?? `${id.slice(0, 8)}.jpg`;
      setReconState({ kind: 'success', blobUrl, sizeBytes: blob.size, filename });
    } catch (err) {
      setReconState({ kind: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (prevBlobRef.current) URL.revokeObjectURL(prevBlobRef.current);
    };
  }, []);

  const handleDownload = useCallback(() => {
    downloadRef.current?.click();
  }, []);

  // ─── Left pane content ──────────────────────────────────────────────────────
  const renderLeft = () => {
    if (reconState.kind === 'idle') {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 10, padding: 24, textAlign: 'center',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 8,
            border: `1.5px dashed ${border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 15l4-4 3 3 4-5 4 6H3z" stroke={muted} strokeWidth="1.2" strokeLinejoin="round" />
              <circle cx="6" cy="6" r="2" stroke={muted} strokeWidth="1.2" />
            </svg>
          </div>
          <span style={{ fontSize: 12, color: muted }}>
            Select an image from the panel →
          </span>
        </div>
      );
    }

    if (reconState.kind === 'loading') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <Loader2 size={24} style={{ color: accent, animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 13, color: muted }}>Fetching from MinIO…</span>
        </div>
      );
    }

    if (reconState.kind === 'error') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{
            padding: '10px 14px',
            background: '#fef2f2', border: '1px solid #dc2626',
            borderRadius: 6, color: '#dc2626',
            fontSize: 13, maxWidth: 320, textAlign: 'center',
          }}>
            {reconState.message}
          </div>
          <button
            onClick={() => { setReconState({ kind: 'idle' }); setSelectedImageId(null); }}
            style={{
              background: 'transparent', color: '#dc2626',
              border: '1px solid #dc2626', borderRadius: 6,
              padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    // success
    return (
      <>
        <img
          src={reconState.blobUrl}
          alt="Reconstructed"
          style={{
            maxWidth: '100%', maxHeight: 'calc(100% - 52px)',
            objectFit: 'contain', display: 'block',
          }}
        />
        {/* Hidden download anchor */}
        <a
          ref={downloadRef}
          href={reconState.blobUrl}
          download={reconState.filename}
          style={{ display: 'none' }}
        />
        {/* Metadata bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '8px 14px',
          background: dark ? 'rgba(0,0,0,0.80)' : 'rgba(255,255,255,0.90)',
          backdropFilter: 'blur(4px)',
          borderTop: `1px solid ${border}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{
            flex: 1, fontSize: 11, color: text,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {reconState.filename}
          </span>
          <span style={{ fontSize: 11, color: muted, flexShrink: 0 }}>
            {(reconState.sizeBytes / 1024).toFixed(1)} KB
          </span>
          <button
            onClick={handleDownload}
            style={{
              background: '#2563eb', color: '#fff', border: 'none',
              borderRadius: 5, padding: '5px 12px', fontSize: 11,
              fontWeight: 600, cursor: 'pointer', flexShrink: 0,
            }}
          >
            Download
          </button>
          <button
            onClick={() => selectedImageId && fetchImage(selectedImageId)}
            style={{
              background: 'transparent', color: accent,
              border: `1px solid ${accent}`, borderRadius: 5,
              padding: '5px 12px', fontSize: 11,
              fontWeight: 600, cursor: 'pointer', flexShrink: 0,
            }}
          >
            Re-fetch
          </button>
        </div>
      </>
    );
  };

  // ─── Right pane: current session section ────────────────────────────────────
  const renderCurrentSession = () => {
    const isLoaded = selectedImageId === imageId && reconState.kind === 'success';

    if (!imageId) {
      if (storageStatus === 'FAILURE') {
        return (
          <div style={{
            fontSize: 11, color: '#dc2626',
            padding: '6px 8px', border: '1px solid #dc2626',
            borderRadius: 4, background: '#fef2f2',
          }}>
            Storage failed
          </div>
        );
      }
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: muted }}>
          {storageStatus === 'PENDING' || storageStatus === 'STARTED' ? (
            <>
              <Loader2 size={12} style={{ color: accent, animation: 'spin 1s linear infinite', flexShrink: 0 }} />
              Storing to MinIO…
            </>
          ) : (
            <span>No active session</span>
          )}
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          onClick={() => fetchImage(imageId)}
          style={{
            background: '#2563eb', color: '#fff', border: 'none',
            borderRadius: 6, padding: '8px 12px',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%',
          }}
        >
          Reconstruct Image
        </button>
        {isLoaded && (
          <span style={{ fontSize: 10, color: '#059669', textAlign: 'center' }}>
            ✓ Loaded
          </span>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: bg, color: text }}>
      {/* LEFT PANE — image viewer */}
      <div style={{
        flex: 1, overflow: 'hidden', position: 'relative',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {renderLeft()}
      </div>

      {/* DIVIDER */}
      <div style={{ width: 1, background: border, flexShrink: 0 }} />

      {/* RIGHT PANE */}
      <div style={{
        width: 240, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Section 1: Current session */}
        <div style={{
          padding: '12px 12px 14px',
          borderBottom: `1px solid ${border}`,
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: 10, fontWeight: 600, color: muted,
            textTransform: 'uppercase', letterSpacing: '0.07em',
            display: 'block', marginBottom: 10,
          }}>
            Current session
          </span>
          {renderCurrentSession()}
        </div>

        {/* Section 2: Stored images gallery */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            padding: '10px 12px 6px',
            fontSize: 10, fontWeight: 600, color: muted,
            textTransform: 'uppercase', letterSpacing: '0.07em',
            flexShrink: 0,
          }}>
            Stored Images{galleryData ? ` (${galleryData.total})` : ''}
          </div>

          {galleryLoading && (
            <div style={{ padding: '8px 12px', fontSize: 12, color: muted }}>Loading…</div>
          )}

          {galleryData?.images.length === 0 && !galleryLoading && (
            <div style={{ padding: '16px 12px', fontSize: 12, color: muted, textAlign: 'center' }}>
              No images stored yet
            </div>
          )}

          {galleryData?.images.map((img) => {
            const isActive = selectedImageId === img.image_id;
            const isLoaded = isActive && reconState.kind === 'success';
            return (
              <div
                key={img.image_id}
                onClick={() => fetchImage(img.image_id)}
                style={{
                  padding: '8px 12px',
                  background: isActive ? (dark ? '#172554' : '#eff6ff') : 'transparent',
                  borderLeft: `3px solid ${isActive ? '#2563eb' : 'transparent'}`,
                  borderBottom: `1px solid ${dark ? '#18181b' : '#f1f5f9'}`,
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  fontSize: 11, fontWeight: 500, color: text,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {img.filename}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                  <span style={{ fontSize: 10, color: muted }}>
                    {img.width}×{img.height}
                  </span>
                  <span style={{ fontSize: 10, color: muted }}>
                    {(img.file_size / 1024).toFixed(0)} KB
                  </span>
                </div>
                {img.compression_ratio != null && (
                  <div style={{ fontSize: 10, color: accent, marginTop: 2 }}>
                    {img.compression_ratio.toFixed(2)}× compression
                  </div>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); fetchImage(img.image_id); }}
                  style={{
                    marginTop: 6, width: '100%',
                    background: isActive ? '#2563eb' : (dark ? '#27272a' : '#f1f5f9'),
                    color: isActive ? '#fff' : (dark ? '#a1a1aa' : '#64748b'),
                    border: 'none', borderRadius: 4,
                    padding: '4px 0', fontSize: 11, fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {isLoaded ? 'Loaded ✓' : 'Decompress'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
