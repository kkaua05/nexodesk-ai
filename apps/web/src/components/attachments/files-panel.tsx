import { useRef } from "react";
import { toast } from "sonner";
import { File as FileIcon, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAttachments, useUploadAttachment, useDeleteAttachment, attachmentDownloadUrl } from "@/hooks/use-attachments";
import { ApiError } from "@/lib/api-client";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilesPanel({ entityType, entityId }: { entityType: string; entityId: string | undefined }) {
  const { data: files } = useAttachments(entityType, entityId);
  const upload = useUploadAttachment(entityType, entityId);
  const remove = useDeleteAttachment(entityType, entityId);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await upload.mutateAsync(file);
      toast.success("Arquivo enviado");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível enviar o arquivo");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
      <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
        <Upload className="h-4 w-4" />
        {upload.isPending ? "Enviando..." : "Enviar arquivo"}
      </Button>

      <div className="space-y-2">
        {(!files || files.length === 0) && <p className="text-sm text-muted-foreground">Nenhum arquivo ainda.</p>}
        {files?.map((file) => (
          <div key={file.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 p-3 text-sm">
            <a href={attachmentDownloadUrl(file.id)} className="flex items-center gap-2 hover:underline" download>
              <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{file.fileName}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{formatSize(file.sizeBytes)}</span>
            </a>
            <button onClick={() => remove.mutate(file.id)} className="shrink-0 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
