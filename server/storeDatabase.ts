import { createClient, type Client } from "@libsql/client";

export class StoreError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "StoreError";
  }
}

let client: Client | undefined;

export function getStoreClient(): Client {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!url || !authToken) {
    throw new StoreError(
      "A ligação à base da loja ainda não está configurada. Consulte o guia de configuração.",
      503,
      "STORE_CONFIGURATION_REQUIRED",
    );
  }

  try {
    client = createClient({ url, authToken });
    return client;
  } catch {
    throw new StoreError(
      "Não foi possível inicializar a ligação à base da loja. Verifique a configuração do Turso.",
      503,
      "STORE_CONNECTION_FAILED",
    );
  }
}

export function isStoreSchemaMissing(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("no such table") || message.includes("does not exist");
}

export function storeSetupRequiredError(): StoreError {
  return new StoreError(
    "A base da loja existe, mas ainda não foi inicializada. Depois de configurar o Turso, execute npm run db:store:setup.",
    503,
    "STORE_SETUP_REQUIRED",
  );
}
