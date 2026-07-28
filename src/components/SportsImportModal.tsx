import React, { useMemo, useState } from 'react';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { logActivity } from '../utils/logger';
import { toast } from 'sonner';
import { X, Upload, Download, AlertCircle, AlertTriangle, CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react';
import { SportsEvent } from '../types';
import {
  ImportRow, SPORT_OPTIONS,
  parseImportCsv, revalidateRow, getMissingRequiredHeaders,
  planImport, dateRangeOf, ImportPlan,
  CSV_TEMPLATE, CSV_EXAMPLE, downloadTextFile,
} from '../utils/sportsImport';

const S = {
  label: {
    fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 11, letterSpacing: '0.12em',
    textTransform: 'uppercase' as const, color: '#6b7280', display: 'block', marginBottom: 7,
  } as React.CSSProperties,
  input: {
    background: '#ffffff', border: '1px solid #d1d5db', borderRadius: 2, color: '#111827',
    fontFamily: 'var(--font-sans)', fontSize: 13, padding: '6px 8px', width: '100%',
    outline: 'none', boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px',
    background: '#1DA0A8', color: '#ffffff', border: '2px solid #1DA0A8', borderRadius: 2,
    fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 13, letterSpacing: '0.08em',
    textTransform: 'uppercase' as const, cursor: 'pointer', lineHeight: 1,
  } as React.CSSProperties,
  btnGhost: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px',
    background: 'transparent', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 2,
    fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 12, letterSpacing: '0.06em',
    textTransform: 'uppercase' as const, cursor: 'pointer', lineHeight: 1,
  } as React.CSSProperties,
};

type Step = 'upload' | 'preview' | 'confirm' | 'result';
type Mode = 'merge' | 'replace';

const StatusBadge = ({ row }: { row: ImportRow }) => {
  if (row.excluded) {
    return <span style={{ ...badgeStyle, background: '#f3f4f6', color: '#9ca3af' }}>Excluded</span>;
  }
  if (row.status === 'error') return <span style={{ ...badgeStyle, background: '#fee2e2', color: '#b91c1c' }}><AlertCircle size={11} /> Error</span>;
  if (row.status === 'warning') return <span style={{ ...badgeStyle, background: '#fef3c7', color: '#92400e' }}><AlertTriangle size={11} /> Warning</span>;
  return <span style={{ ...badgeStyle, background: '#dcfce7', color: '#15803d' }}><CheckCircle2 size={11} /> Valid</span>;
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 2,
  fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase',
};

// A row is actually importable if it validates cleanly (or only has warnings) and hasn't been excluded.
const isIncludable = (row: ImportRow) => row.status !== 'error' && !row.excluded;

export default function SportsImportModal({
  existingEvents, onClose,
}: {
  existingEvents: SportsEvent[];
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [mode, setMode] = useState<Mode>('merge');
  const [range, setRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ added: number; updated: number; skipped: number; deleted: number } | null>(null);

  const includable = useMemo(() => rows.filter(isIncludable), [rows]);
  const counts = useMemo(() => ({
    valid: rows.filter(r => r.status === 'valid' && !r.excluded).length,
    warning: rows.filter(r => r.status === 'warning' && !r.excluded).length,
    error: rows.filter(r => r.status === 'error').length,
    excluded: rows.filter(r => r.excluded).length,
  }), [rows]);

  const plan: ImportPlan = useMemo(
    () => planImport(includable, existingEvents, mode, mode === 'replace' ? range : undefined),
    [includable, existingEvents, mode, range]
  );

  const handleFile = async (file: File) => {
    setUploadError(null);
    setFileName(file.name);
    const text = await file.text();
    const missing = getMissingRequiredHeaders(text);
    if (missing.length > 0) {
      setUploadError(`This file is missing required column(s): ${missing.join(', ')}. Download the template below to see the expected header row.`);
      return;
    }
    const parsed = parseImportCsv(text);
    if (parsed.length === 0) {
      setUploadError('No data rows found in this file.');
      return;
    }
    setRows(parsed);
    const detectedRange = dateRangeOf(parsed.filter(isIncludable));
    if (detectedRange) setRange(detectedRange);
    setStep('preview');
  };

  const updateRow = (rowNumber: number, patch: Partial<ImportRow>) => {
    setRows(prev => prev.map(r => (r.rowNumber === rowNumber ? revalidateRow({ ...r, ...patch }) : r)));
  };

  const toggleExclude = (rowNumber: number) => {
    setRows(prev => prev.map(r => (r.rowNumber === rowNumber ? { ...r, excluded: !r.excluded } : r)));
  };

  const handleConfirm = async () => {
    setImporting(true);
    try {
      const ops: { type: 'set' | 'update' | 'delete'; ref: ReturnType<typeof doc>; data?: any }[] = [];
      plan.toAdd.forEach(({ data }) => ops.push({ type: 'set', ref: doc(collection(db, 'sports_schedule')), data }));
      plan.toUpdate.forEach(({ id, data }) => ops.push({ type: 'update', ref: doc(db, 'sports_schedule', id), data }));
      plan.toDelete.forEach(ev => ev.id && ops.push({ type: 'delete', ref: doc(db, 'sports_schedule', ev.id) }));

      // Firestore batches cap at 500 writes; chunk defensively even though a
      // weekly import is realistically well under that.
      for (let i = 0; i < ops.length; i += 400) {
        const batch = writeBatch(db);
        ops.slice(i, i + 400).forEach(op => {
          if (op.type === 'set') batch.set(op.ref, op.data);
          else if (op.type === 'update') batch.update(op.ref, op.data);
          else batch.delete(op.ref);
        });
        await batch.commit();
      }

      const rangeLabel = mode === 'replace' && range.start ? ` (${range.start} to ${range.end})` : '';
      await logActivity(
        'Sports Fixtures Imported',
        `${fileName || 'CSV'}: ${mode} import${rangeLabel} — ${plan.toAdd.length} added, ${plan.toUpdate.length} updated, ${plan.toSkip.length} skipped, ${plan.toDelete.length} removed`,
        'menu'
      );

      setResult({ added: plan.toAdd.length, updated: plan.toUpdate.length, skipped: plan.toSkip.length, deleted: plan.toDelete.length });
      setStep('result');
      toast.success('Import complete');
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Import failed — nothing extra was changed beyond what you see below. Check the console for details and try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '4px', boxShadow: '0 8px 32px rgba(0,0,0,0.14)', width: '100%', maxWidth: 960, maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 22, color: '#111827', textTransform: 'uppercase' }}>
            Import Fixtures
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
          {step === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: '#374151', margin: 0 }}>
                Upload the weekly fixtures CSV. Nothing is written to the schedule until you review a preview and confirm.
              </p>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" style={S.btnGhost} onClick={() => downloadTextFile('sports-fixtures-template.csv', CSV_TEMPLATE)}>
                  <Download size={13} /> Download Template
                </button>
                <button type="button" style={S.btnGhost} onClick={() => downloadTextFile('sports-fixtures-example.csv', CSV_EXAMPLE)}>
                  <Download size={13} /> Download Example
                </button>
              </div>

              <label
                style={{
                  border: '2px dashed #d1d5db', borderRadius: 4, padding: '40px 24px', textAlign: 'center',
                  cursor: 'pointer', color: '#6b7280', fontFamily: 'var(--font-sans)', fontSize: 14,
                }}
              >
                <Upload size={28} style={{ marginBottom: 10 }} />
                <div>{fileName ? `Selected: ${fileName}` : 'Click to choose a .csv file, or drag it here'}</div>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
                />
              </label>

              {uploadError && (
                <div style={{ padding: '12px 16px', background: 'rgba(225,30,21,0.1)', border: '1px solid var(--red-500)', borderRadius: 2, display: 'flex', gap: 10, color: 'var(--red-400)', fontFamily: 'var(--font-sans)', fontSize: 13 }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} /> {uploadError}
                </div>
              )}

              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#9ca3af' }}>
                Columns: date (YYYY-MM-DD, required), time (24h HH:mm Thailand time, required), sport (required),
                competition (optional), participants (required), display_order (optional, default 0),
                source_id (optional — lets you safely re-import the same file without duplicates).
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontFamily: 'var(--font-sans)', fontSize: 13, color: '#374151' }}>
                <span>{counts.valid} valid</span>
                <span style={{ color: '#92400e' }}>{counts.warning} warning</span>
                <span style={{ color: '#b91c1c' }}>{counts.error} error{counts.error === 1 ? '' : 's'} (won't be imported unless fixed)</span>
                <span style={{ color: '#9ca3af' }}>{counts.excluded} excluded</span>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 4 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans)', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                      {['#', 'Status', 'Date', 'Time', 'Sport', 'Competition', 'Participants', 'Order', 'Source ID', ''].map(h => (
                        <th key={h} style={{ padding: '8px 10px', fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6b7280', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <React.Fragment key={row.rowNumber}>
                        <tr style={{ opacity: row.excluded ? 0.5 : 1 }}>
                          <td style={cellStyle}>{row.rowNumber}</td>
                          <td style={cellStyle}><StatusBadge row={row} /></td>
                          <td style={cellStyle}><input style={{ ...S.input, minWidth: 100 }} value={row.date} onChange={e => updateRow(row.rowNumber, { date: e.target.value })} /></td>
                          <td style={cellStyle}><input style={{ ...S.input, minWidth: 70 }} value={row.time} onChange={e => updateRow(row.rowNumber, { time: e.target.value })} /></td>
                          <td style={cellStyle}>
                            <input style={{ ...S.input, minWidth: 110 }} value={row.sport} onChange={e => updateRow(row.rowNumber, { sport: e.target.value })} list="sports-import-sport-options" />
                          </td>
                          <td style={cellStyle}><input style={{ ...S.input, minWidth: 120 }} value={row.competition} onChange={e => updateRow(row.rowNumber, { competition: e.target.value })} /></td>
                          <td style={cellStyle}><input style={{ ...S.input, minWidth: 160 }} value={row.participants} onChange={e => updateRow(row.rowNumber, { participants: e.target.value })} /></td>
                          <td style={cellStyle}><input style={{ ...S.input, minWidth: 60 }} value={row.display_order} onChange={e => updateRow(row.rowNumber, { display_order: e.target.value })} /></td>
                          <td style={cellStyle}><input style={{ ...S.input, minWidth: 120 }} value={row.source_id} onChange={e => updateRow(row.rowNumber, { source_id: e.target.value })} /></td>
                          <td style={cellStyle}>
                            <button type="button" onClick={() => toggleExclude(row.rowNumber)} style={{ ...S.btnGhost, padding: '4px 10px', fontSize: 10 }}>
                              {row.excluded ? 'Include' : 'Exclude'}
                            </button>
                          </td>
                        </tr>
                        {row.issues.length > 0 && (
                          <tr>
                            <td></td>
                            <td colSpan={9} style={{ padding: '0 10px 8px', fontSize: 12, color: row.status === 'error' ? '#b91c1c' : '#92400e' }}>
                              {row.issues.join(' · ')}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
                <datalist id="sports-import-sport-options">
                  {SPORT_OPTIONS.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
            </div>
          )}

          {(step === 'preview' || step === 'confirm') && (
            <div style={{ marginTop: 20, borderTop: '1px solid #e5e7eb', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={S.label}>Import mode</label>
              <div style={{ display: 'flex', gap: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-sans)', fontSize: 14, color: '#111827', cursor: step === 'confirm' ? 'default' : 'pointer' }}>
                  <input type="radio" checked={mode === 'merge'} disabled={step === 'confirm'} onChange={() => setMode('merge')} />
                  Merge — add new fixtures, update matching ones, never remove anything
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-sans)', fontSize: 14, color: '#111827', cursor: step === 'confirm' ? 'default' : 'pointer' }}>
                  <input type="radio" checked={mode === 'replace'} disabled={step === 'confirm'} onChange={() => setMode('replace')} />
                  Replace a date range — fixtures in that range not in this file are removed
                </label>
              </div>

              {mode === 'replace' && (
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
                  <div>
                    <label style={S.label}>From</label>
                    <input type="date" style={S.input} value={range.start} disabled={step === 'confirm'} onChange={e => setRange(r => ({ ...r, start: e.target.value }))} />
                  </div>
                  <div>
                    <label style={S.label}>To</label>
                    <input type="date" style={S.input} value={range.end} disabled={step === 'confirm'} onChange={e => setRange(r => ({ ...r, end: e.target.value }))} />
                  </div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#9ca3af', paddingBottom: 6 }}>
                    Defaults to the date range found in this file. Only fixtures dated inside this range are ever removed.
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'confirm' && (
            <div style={{ marginTop: 20, borderTop: '1px solid #e5e7eb', paddingTop: 20 }}>
              <h3 style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 15, textTransform: 'uppercase', color: '#111827', marginBottom: 12 }}>
                This import will:
              </h3>
              <ul style={{ margin: 0, paddingLeft: 20, fontFamily: 'var(--font-sans)', fontSize: 14, color: '#374151', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li><strong>{plan.toAdd.length}</strong> fixture{plan.toAdd.length === 1 ? '' : 's'} added</li>
                <li><strong>{plan.toUpdate.length}</strong> fixture{plan.toUpdate.length === 1 ? '' : 's'} updated</li>
                <li><strong>{plan.toSkip.length}</strong> fixture{plan.toSkip.length === 1 ? '' : 's'} skipped (already up to date)</li>
                {mode === 'replace' && (
                  <li><strong>{plan.toDelete.length}</strong> existing fixture{plan.toDelete.length === 1 ? '' : 's'} in {range.start} to {range.end} removed (not present in this file)</li>
                )}
              </ul>
              {plan.toDelete.length > 0 && (
                <div style={{ marginTop: 14, padding: '10px 14px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 2, fontFamily: 'var(--font-sans)', fontSize: 13, color: '#92400e' }}>
                  Fixtures to be removed: {plan.toDelete.map(e => e.participants).join(', ')}
                </div>
              )}
            </div>
          )}

          {step === 'result' && result && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <CheckCircle2 size={40} color="#15803d" style={{ marginBottom: 16 }} />
              <h3 style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 18, textTransform: 'uppercase', color: '#111827', marginBottom: 10 }}>
                Import complete
              </h3>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: '#374151' }}>
                {result.added} added · {result.updated} updated · {result.skipped} skipped{result.deleted > 0 ? ` · ${result.deleted} removed` : ''}
              </p>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            {step === 'preview' && (
              <button type="button" style={S.btnGhost} onClick={() => setStep('upload')}>
                <ArrowLeft size={13} /> Back
              </button>
            )}
            {step === 'confirm' && (
              <button type="button" style={S.btnGhost} onClick={() => setStep('preview')} disabled={importing}>
                <ArrowLeft size={13} /> Back
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" style={S.btnGhost} onClick={onClose}>
              {step === 'result' ? 'Close' : 'Cancel'}
            </button>
            {step === 'preview' && (
              <button
                type="button"
                style={{ ...S.btnPrimary, opacity: includable.length === 0 || (mode === 'replace' && !range.start) ? 0.5 : 1 }}
                disabled={includable.length === 0 || (mode === 'replace' && !range.start)}
                onClick={() => setStep('confirm')}
              >
                Review Import <ArrowRight size={15} />
              </button>
            )}
            {step === 'confirm' && (
              <button type="button" style={{ ...S.btnPrimary, opacity: importing ? 0.6 : 1 }} disabled={importing} onClick={handleConfirm}>
                {importing ? 'Importing…' : 'Confirm Import'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const cellStyle: React.CSSProperties = { padding: '6px 10px', borderBottom: '1px solid #f0f0f0', verticalAlign: 'top' };
