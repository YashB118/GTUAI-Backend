"use client";

import { useCallback, useState } from "react";
import { Upload, File, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FileUploaderProps {
  onUpload: (file: File) => Promise<void>;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
}

type UploadState = "idle" | "dragging" | "uploading" | "success" | "error";

export function FileUploader({
  onUpload,
  accept = "application/pdf",
  maxSizeMB = 10,
  label = "Upload PDF",
}: FileUploaderProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>("");
  const [progress, setProgress] = useState(0);

  const validate = (f: File): string | null => {
    if (accept && !accept.split(",").some((t) => f.type === t.trim())) {
      return "Only PDF files are allowed";
    }
    if (f.size > maxSizeMB * 1024 * 1024) {
      return `File must be under ${maxSizeMB}MB`;
    }
    return null;
  };

  const handleFile = useCallback(
    async (f: File) => {
      const err = validate(f);
      if (err) {
        setError(err);
        setState("error");
        return;
      }

      setFile(f);
      setError("");
      setState("uploading");
      setProgress(0);

      const interval = setInterval(() => {
        setProgress((p) => Math.min(p + 10, 90));
      }, 200);

      try {
        await onUpload(f);
        clearInterval(interval);
        setProgress(100);
        setState("success");
      } catch (e) {
        clearInterval(interval);
        setError(e instanceof Error ? e.message : "Upload failed");
        setState("error");
      }
    },
    [onUpload]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setState("idle");
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile]
  );

  const reset = () => {
    setState("idle");
    setFile(null);
    setError("");
    setProgress(0);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setState("dragging"); }}
        onDragLeave={() => setState("idle")}
        onDrop={onDrop}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200",
          state === "dragging" && "border-accent bg-accent/5",
          state === "idle" && "border-border hover:border-accent/50 hover:bg-bg-elevated/50",
          state === "success" && "border-green-500/50 bg-green-500/5",
          state === "error" && "border-red-500/50 bg-red-500/5",
          state === "uploading" && "border-accent/50 bg-accent/5"
        )}
      >
        {state === "uploading" ? (
          <div className="space-y-3">
            <div className="w-10 h-10 mx-auto border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-text-secondary">Uploading {file?.name}...</p>
            <div className="w-full bg-bg-elevated rounded-full h-1.5">
              <div
                className="h-1.5 bg-accent rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : state === "success" ? (
          <div className="space-y-2">
            <CheckCircle className="w-10 h-10 mx-auto text-green-400" />
            <p className="text-sm text-green-400 font-medium">Upload complete</p>
            <p className="text-xs text-text-muted">{file?.name}</p>
            <Button variant="ghost" size="sm" onClick={reset}>Upload another</Button>
          </div>
        ) : state === "error" ? (
          <div className="space-y-2">
            <AlertCircle className="w-10 h-10 mx-auto text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
            <Button variant="ghost" size="sm" onClick={reset}>Try again</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="w-10 h-10 mx-auto text-text-muted" />
            <div>
              <p className="text-sm text-text-primary font-medium">{label}</p>
              <p className="text-xs text-text-muted mt-1">
                Drag & drop or{" "}
                <label className="text-accent cursor-pointer hover:underline">
                  browse
                  <input
                    type="file"
                    className="hidden"
                    accept={accept}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
                </label>
              </p>
              <p className="text-xs text-text-muted mt-1">PDF only · Max {maxSizeMB}MB</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
