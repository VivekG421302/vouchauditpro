import { useEffect, useRef, useState } from 'react';
import AppShell from '../../components/layout/AppShell.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { toast } from '../../store/useToastStore.js';

function iconFor(name) {
  if (name.endsWith('.pdf')) return 'file-text';
  if (/\.(xlsx|csv)$/.test(name)) return 'file-spreadsheet';
  return 'file';
}

export default function CompanyIngestion() {
  const api = useVouchStore((s) => s.api);
  const [files, setFiles] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.getCompanyProgress().then((data) => setFiles(data.uploadedFiles || []));
  }, [api]);

  function handleFiles(fileList) {
    const names = Array.from(fileList).map((f) => f.name);
    if (!names.length) return;
    Promise.all(names.map((name) => api.addUploadedFile(name))).then(() => {
      setFiles((prev) => [...(prev || []), ...names]);
      toast(`${names.length} file(s) uploaded for auditor cross-reference`, 'upload-cloud', 'emerald');
    });
  }

  return (
    <AppShell role="company" title="Data Ingestion">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink-950">Data Ingestion</h1>
        <p className="text-slate-500 text-sm mt-0.5">Upload inventory sheets, price lists, or reference documents for auditors to cross-check against.</p>
      </div>

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition mb-6 ${
          dragOver ? 'border-brand-400 bg-brand-50/40' : 'border-slate-300 bg-white'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
          <Icon name="upload-cloud" className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-ink-950">Drop files here, or click to browse</p>
        <p className="text-xs text-slate-500 mt-1">PDF, XLSX, CSV, or images</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
        <h3 className="font-display font-semibold text-ink-950 mb-3">Uploaded Files</h3>
        <div id="uploadedFiles" className="space-y-2">
          {files && files.length === 0 && <p className="text-xs text-slate-400">No files uploaded yet.</p>}
          {files &&
            files.map((name, i) => (
              <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-3.5 py-2.5 fade-in">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon name={iconFor(name)} className="w-4 h-4 text-brand-600 shrink-0" />
                  <span className="text-xs font-medium text-ink-950 truncate">{name}</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-600 flex items-center gap-1 shrink-0">
                  <Icon name="check" className="w-3 h-3" />
                  Uploaded
                </span>
              </div>
            ))}
        </div>
      </div>
    </AppShell>
  );
}
