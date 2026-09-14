import { useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  FileJson,
  AlertTriangle,
} from 'lucide-react';

interface ImportExportResult {
  count: number;
  duplicatesSkipped: number;
  scriptsImported?: number;
  scriptsSkipped?: number;
  scriptsProgressImported?: number;
}

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportJSON: () => string;
  onImportJSON: (jsonStr: string, mode: 'merge' | 'replace') => ImportExportResult;
  totalCardsCount: number;
  totalScriptsCount?: number;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  onExportJSON,
  onImportJSON,
  totalCardsCount,
  totalScriptsCount = 0,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [copied, setCopied] = useState<boolean>(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importText, setImportText] = useState<string>('');
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleDownload = () => {
    const jsonString = onExportJSON();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `anki4devs_backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyClipboard = async () => {
    const jsonString = onExportJSON();
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportText(content);
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setImportResult(null);

    if (!importText.trim()) {
      setImportResult({ success: false, message: 'Please paste JSON or upload a file first.' });
      return;
    }

    try {
      const res = onImportJSON(importText, importMode);
      const messages: string[] = [];

      if (res.count > 0 || res.duplicatesSkipped > 0) {
        messages.push(`${res.count} flashcard${res.count === 1 ? '' : 's'} (${res.duplicatesSkipped} duplicates skipped)`);
      }

      if (
        (res.scriptsImported !== undefined && res.scriptsImported > 0) ||
        (res.scriptsSkipped !== undefined && res.scriptsSkipped > 0)
      ) {
        messages.push(`${res.scriptsImported || 0} speaking script${(res.scriptsImported || 0) === 1 ? '' : 's'} (${res.scriptsSkipped || 0} duplicates skipped)`);
      }

      const summaryText = messages.length > 0 ? messages.join(' and ') : `${res.count} items`;

      setImportResult({
        success: true,
        message: `Successfully imported ${summaryText}.`,
      });
      setImportText('');
    } catch (err: any) {
      setImportResult({
        success: false,
        message: err.message || 'Failed to parse JSON file.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Data Backup & Sync (JSON)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                100% offline portable backup for cards & speaking scripts.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 pt-2">
          <button
            onClick={() => {
              setActiveTab('export');
              setImportResult(null);
            }}
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'export'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            Export Deck
          </button>
          <button
            onClick={() => {
              setActiveTab('import');
              setImportResult(null);
            }}
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'import'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            Import Deck
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {activeTab === 'export' ? (
            <div className="space-y-4 text-center sm:text-left">
              <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Backup Summary
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800/80">
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Flashcards</div>
                    <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {totalCardsCount}
                    </div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800/80">
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Speaking Scripts</div>
                    <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {totalScriptsCount}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Includes all phrases, definitions, example meeting sentences, SM-2 repetitions, dialogue scripts, lines, and speaking evaluations.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="p-3.5 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .JSON Backup</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyClipboard}
                  className="p-3.5 rounded-xl font-semibold text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Raw JSON'}</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleImportSubmit} className="space-y-4">
              {importResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    importResult.success
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {importResult.success ? (
                    <Check className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{importResult.message}</span>
                </div>
              )}

              {/* Merge vs Replace Mode */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Import Behavior
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setImportMode('merge')}
                    className={`p-3 rounded-xl text-xs font-medium text-left border transition-all cursor-pointer ${
                      importMode === 'merge'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div>Merge & Skip Duplicates</div>
                    <div className="text-[10px] font-normal opacity-80 mt-0.5">
                      Safely appends new cards & scripts
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={`p-3 rounded-xl text-xs font-medium text-left border transition-all cursor-pointer ${
                      importMode === 'replace'
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-bold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div>Replace Entire Library</div>
                    <div className="text-[10px] font-normal opacity-80 mt-0.5">
                      Overwrites current cards & scripts
                    </div>
                  </button>
                </div>
              </div>

              {/* Upload File Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Upload Backup File
                </label>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-950/60 file:text-indigo-600 dark:file:text-indigo-400 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>

              {/* Paste JSON text area */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Or Paste JSON Content
                </label>
                <textarea
                  rows={4}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste exported JSON (cards and/or scripts) here..."
                  className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  Process Import
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
