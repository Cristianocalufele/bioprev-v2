const DEFAULT_ADMIN_BASE_PATH = "/bp-gestao-9x4k";

function normalizeAdminPath(raw?: string): string {
  const cleaned = (raw ?? "").trim().replace(/^\/+|\/+$/g, "");
  if (!cleaned || !/^[a-z0-9/_-]+$/i.test(cleaned) || cleaned.includes("..")) {
    return DEFAULT_ADMIN_BASE_PATH;
  }
  return `/${cleaned}`;
}

export const ADMIN_BASE_PATH = normalizeAdminPath(import.meta.env.VITE_ADMIN_PATH);
export const ADMIN_LOGIN_PATH = `${ADMIN_BASE_PATH}/acesso`;
