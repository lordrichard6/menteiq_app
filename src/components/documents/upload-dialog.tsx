'use client';

import * as React from 'react';
import { useDropzone } from 'react-dropzone';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Upload, File, FileText, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { type DocVisibility } from '@/lib/types/schema';
import { toast } from 'sonner';

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: () => void;
  projectId?: string | null;
  contactId?: string | null;
}

interface UploadFile {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  id?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = {
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

export function UploadDialog({ open, onOpenChange, onUploadComplete, projectId, contactId }: UploadDialogProps) {
  const [files, setFiles] = React.useState<UploadFile[]>([]);
  const [visibility, setVisibility] = React.useState<DocVisibility>('internal');
  const [isUploading, setIsUploading] = React.useState(false);

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large — maximum size is 10MB`);
        return false;
      }
      return true;
    });

    const uploadFiles: UploadFile[] = validFiles.map(file => ({
      file,
      status: 'pending',
      progress: 0,
    }));

    setFiles(prev => [...prev, ...uploadFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALLOWED_TYPES,
    maxSize: MAX_FILE_SIZE,
    disabled: isUploading,
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const uploadFile = files[i];

      if (uploadFile.status !== 'pending') continue;

      // Update status to uploading
      setFiles(prev => prev.map((f, idx) =>
        idx === i ? { ...f, status: 'uploading' as const, progress: 0 } : f
      ));

      try {
        const formData = new FormData();
        formData.append('file', uploadFile.file);
        formData.append('visibility', visibility);
        if (projectId) formData.append('project_id', projectId);
        if (contactId) formData.append('contact_id', contactId);

        // Upload with progress tracking
        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const result = await response.json();

        // Mark as success
        setFiles(prev => prev.map((f, idx) =>
          idx === i ? { ...f, status: 'success' as const, progress: 100, id: result.id } : f
        ));
      } catch (error) {
        // Mark as error
        setFiles(prev => prev.map((f, idx) =>
          idx === i ? {
            ...f,
            status: 'error' as const,
            error: error instanceof Error ? error.message : 'Upload failed'
          } : f
        ));
      }
    }

    setIsUploading(false);

    // Check if all succeeded
    const allSucceeded = files.every(f => f.status === 'success');
    if (allSucceeded && onUploadComplete) {
      onUploadComplete();
      // Reset after delay
      setTimeout(() => {
        setFiles([]);
        onOpenChange(false);
      }, 1500);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    return <File className="h-5 w-5 text-slate-500" />;
  };

  const canUpload = files.length > 0 && !isUploading && files.some(f => f.status === 'pending');
  const allComplete = files.length > 0 && files.every(f => f.status === 'success');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
          <DialogDescription>
            Upload PDFs, text files, or Markdown documents to your vault. Max 10MB per file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Visibility Selection */}
          <div className="space-y-3">
            <Label>Visibility</Label>
            <RadioGroup value={visibility} onValueChange={(val) => setVisibility(val as DocVisibility)} disabled={isUploading}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="internal" id="internal" />
                <Label htmlFor="internal" className="font-normal cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span>Internal</span>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                      AI Only
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    Document is used by AI but not visible to clients
                  </p>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="shared" id="shared" />
                <Label htmlFor="shared" className="font-normal cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span>Shared</span>
                    <Badge className="bg-green-100 text-green-800">
                      Client Visible
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    Document is visible in client portal and used by AI
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Drop Zone */}
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-slate-400'}
              ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto text-slate-400 mb-4" />
            {isDragActive ? (
              <p className="text-slate-600 font-medium">Drop files here...</p>
            ) : (
              <div>
                <p className="text-slate-600 font-medium mb-1">
                  Drag & drop files here, or click to select
                </p>
                <p className="text-sm text-slate-500">
                  Supports PDF, TXT, MD, DOCX (max 10MB)
                </p>
              </div>
            )}
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Files ({files.length})</Label>
              <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-3">
                {files.map((uploadFile, index) => (
                  <div key={index} className="flex items-center justify-between gap-3 p-2 bg-slate-50 rounded">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getFileIcon(uploadFile.file.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{uploadFile.file.name}</p>
                        <p className="text-xs text-slate-500">{formatFileSize(uploadFile.file.size)}</p>
                        {uploadFile.status === 'uploading' && (
                          <Progress value={uploadFile.progress} className="h-1 mt-1" />
                        )}
                        {uploadFile.status === 'error' && (
                          <p className="text-xs text-red-600 mt-1">{uploadFile.error}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {uploadFile.status === 'success' && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                      {uploadFile.status === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      {uploadFile.status === 'pending' && !isUploading && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
            >
              {allComplete ? 'Close' : 'Cancel'}
            </Button>
            <Button
              onClick={uploadFiles}
              disabled={!canUpload}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Uploading...' : `Upload ${files.filter(f => f.status === 'pending').length} file(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
