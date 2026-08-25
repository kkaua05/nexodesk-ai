import { useEffect, useState } from "react";
import { FileText, Download } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { mediaUrl } from "@/hooks/use-conversations";
import { cn } from "@/lib/utils";

/**
 * Media endpoints require the Bearer token, so a plain <img src> / <a href> can't hit
 * them directly (the browser sends no Authorization header for those). Fetch the file
 * as an authenticated blob once and hand the resulting object URL to the native
 * element — this is what makes "abrir arquivos" actually work instead of 401ing.
 */
function useAuthenticatedBlobUrl(messageId: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    const token = useAuthStore.getState().token;
    fetch(mediaUrl(messageId), { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => !cancelled && setError(true));

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [messageId]);

  return { url, error };
}

export function MediaMessage({ messageId, type, fileName, outbound }: { messageId: string; type: string; fileName?: string; outbound: boolean }) {
  const { url, error } = useAuthenticatedBlobUrl(messageId);

  if (error) return <p className="text-xs italic opacity-70">Não foi possível carregar o arquivo.</p>;
  if (!url) return <div className={cn("h-32 w-48 animate-pulse rounded-lg", outbound ? "bg-primary-foreground/20" : "bg-muted-foreground/10")} />;

  if (type === "imagem") {
    return <img src={url} alt="Imagem enviada" className="max-h-72 max-w-full rounded-lg object-contain" />;
  }

  if (type === "sticker") {
    return <img src={url} alt="Figurinha" className="h-32 w-32 object-contain" />;
  }

  if (type === "audio") {
    return <audio controls src={url} className="h-10 max-w-full" />;
  }

  if (type === "video") {
    return <video controls src={url} className="max-h-72 max-w-full rounded-lg" />;
  }

  return (
    <a
      href={url}
      download={fileName ?? "arquivo"}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:opacity-80",
        outbound ? "border-primary-foreground/30" : "border-border",
      )}
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate">{fileName ?? "Documento"}</span>
      <Download className="ml-auto h-3.5 w-3.5 shrink-0" />
    </a>
  );
}
