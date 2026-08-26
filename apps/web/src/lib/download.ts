import { useAuthStore } from "@/stores/auth-store";
import { API_BASE_URL } from "@/lib/api-client";

/** Downloads an authenticated API endpoint as a file (spec §72 CSV export). */
export async function downloadFromApi(path: string, filename: string) {
  const token = useAuthStore.getState().token;
  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) throw new Error(`Falha ao exportar (${response.status})`);

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
