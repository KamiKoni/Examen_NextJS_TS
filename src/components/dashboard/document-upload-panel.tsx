'use client';

import { FormEvent, useRef, useState, useCallback } from 'react';

// Client-side upload panel for validating files before handing them to the document API.
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_FILE_TYPES = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
} as const;

const ALLOWED_EXTENSIONS = '.pdf,.xlsx,.csv';
const ALLOWED_TYPES_ARRAY: string[] = Object.values(ALLOWED_FILE_TYPES);

interface DocumentUploadPanelProps {
  onUpload?: () => void;
  disabled?: boolean;
}

export function DocumentUploadPanel({
  onUpload,
  disabled = false,
}: DocumentUploadPanelProps) {
  // Keep access to the native input so we can clear it after a successful upload.
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload state drives validation, progress feedback and post-processing results.
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [processingResult, setProcessingResult] = useState<{
    schedulesCreated: number;
    errors: string[];
  } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Validation stays local so invalid files never hit the network.
  const isValidFileType = useCallback((file: File): boolean => {
    return ALLOWED_TYPES_ARRAY.includes(file.type);
  }, []);

  const isValidFileSize = useCallback((file: File): boolean => {
    return file.size <= MAX_FILE_SIZE;
  }, []);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!isValidFileType(file)) {
        setError('Solo se permiten archivos PDF, XLSX y CSV.');
        setSelectedFile(null);
        return;
      }

      if (!isValidFileSize(file)) {
        setError('El archivo no debe superar 50MB.');
        setSelectedFile(null);
        return;
      }

      setError(null);
      setSelectedFile(file);
    },
    [isValidFileType, isValidFileSize]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFile) {
      setError('Por favor selecciona un archivo.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);
    setProcessingResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Error al subir el archivo.');
      }

      setSuccess(true);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Surface any schedules created by the backend import flow.
      if (result.processingResult) {
        setProcessingResult(result.processingResult);
      }

      onUpload?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido.');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    return (bytes / 1024 / 1024).toFixed(2);
  };

  return (
    <form className="panel space-y-4" onSubmit={handleSubmit}>
      <div>
        <p className="section-kicker">Análisis de documentos</p>
        <h2 className="section-title">Carga y analiza archivos</h2>
      </div>

      {/* Validation and API failures are shown inline to keep the upload flow self-contained. */}
      {error && (
        <div
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}

      {/* Success confirmation appears even when no schedules were imported from the file. */}
      {success && (
        <div
          className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-700"
          role="status"
          aria-live="polite"
        >
          ✓ Archivo procesado correctamente.
        </div>
      )}

      {/* Spreadsheet uploads can return row-level import results from the backend. */}
      {processingResult && (
        <div className="rounded-lg border border-blue-300 bg-blue-50 p-4 text-sm">
          <h4 className="font-medium text-blue-800 mb-2">
            Resultado del procesamiento:
          </h4>
          <div className="space-y-1">
            <p className="text-blue-700">
              ✓ <strong>{processingResult.schedulesCreated}</strong> horario(s)
              creado(s) exitosamente
            </p>
            {processingResult.errors.length > 0 && (
              <div className="text-red-600">
                <p className="font-medium">Errores encontrados:</p>
                <ul className="list-disc list-inside ml-4 mt-1">
                  {processingResult.errors.map((error, index) => (
                    <li key={index} className="text-xs">
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Native file input is kept visible for clarity and accessibility. */}
      <div className="space-y-2">
        <label
          htmlFor="file-upload"
          className="block text-sm font-medium text-stone-700"
        >
          Selecciona un archivo (PDF, XLSX o CSV)
        </label>
        <input
          ref={fileInputRef}
          id="file-upload"
          type="file"
          accept={ALLOWED_EXTENSIONS}
          onChange={handleFileSelect}
          disabled={uploading || disabled}
          title="Selecciona un archivo PDF, XLSX o CSV para analizar"
          aria-describedby={selectedFile ? 'file-info' : undefined}
          className="block w-full text-sm text-stone-500 file:mr-4 file:rounded-lg file:border-0 file:bg-stone-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-stone-700 hover:file:bg-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2"
        />
        {selectedFile && (
          <p
            id="file-info"
            className="text-xs text-stone-500"
            aria-live="polite"
          >
            Archivo: {selectedFile.name} ({formatFileSize(selectedFile.size)}MB)
          </p>
        )}
      </div>

      {/* Submission stays disabled until there is a valid file and the panel is not busy. */}
      <button
        type="submit"
        disabled={!selectedFile || uploading || disabled}
        className="primary-button w-full disabled:opacity-50 disabled:cursor-not-allowed"
        aria-describedby={!selectedFile ? 'file-required' : undefined}
      >
        {uploading ? 'Procesando...' : 'Subir y analizar'}
      </button>

      {/* Hidden error message for screen readers */}
      {!selectedFile && (
        <div id="file-required" className="sr-only">
          Debes seleccionar un archivo antes de continuar
        </div>
      )}
    </form>
  );
}
