import { clerkClient, getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { StoreError } from "./storeDatabase";

export type AdminRequest = Request & { storeAdminEmail?: string };

function configuredAdminEmails(): Set<string> {
  const values = [process.env.ADMIN_EMAIL, process.env.ADMIN_EMAILS]
    .filter(Boolean)
    .flatMap((value) => (value ?? "").split(","));
  return new Set(values.map((email) => email.trim().toLowerCase()).filter(Boolean));
}

export async function requireStoreAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = getAuth(req).userId;
  if (!userId) {
    return res.status(401).json({ message: "Inicie sessão para aceder à área de administração.", code: "AUTHENTICATION_REQUIRED" });
  }

  const allowedEmails = configuredAdminEmails();
  if (allowedEmails.size === 0) {
    return res.status(503).json({ message: "A conta administradora ainda não foi configurada.", code: "ADMIN_CONFIGURATION_REQUIRED" });
  }

  const origin = req.get("origin");
  if (origin && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const requestHost = (req.get("x-forwarded-host") || req.get("host") || "").split(",")[0].trim().toLowerCase();
    try {
      if (new URL(origin).host.toLowerCase() !== requestHost) {
        return res.status(403).json({ message: "Pedido de origem não autorizado.", code: "ORIGIN_NOT_ALLOWED" });
      }
    } catch {
      return res.status(403).json({ message: "Pedido de origem não autorizado.", code: "ORIGIN_NOT_ALLOWED" });
    }
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    const matchingAddress = user.emailAddresses.find(
      (address) => allowedEmails.has(address.emailAddress.trim().toLowerCase()) &&
        address.verification?.status === "verified",
    );
    if (!matchingAddress) {
      return res.status(403).json({ message: "Esta conta não tem autorização para gerir a loja.", code: "ADMIN_ACCESS_DENIED" });
    }
    (req as AdminRequest).storeAdminEmail = matchingAddress.emailAddress;
    return next();
  } catch (error) {
    if (error instanceof StoreError) {
      return res.status(error.status).json({ message: error.message, code: error.code });
    }
    return res.status(503).json({ message: "Não foi possível confirmar a conta administradora neste momento.", code: "ADMIN_VERIFICATION_FAILED" });
  }
}
