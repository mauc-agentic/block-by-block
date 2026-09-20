import { vi } from "vitest";
import { encodeAbiParameters } from "viem";
import type { AuthUser } from "@/lib/auth";
import type { CauseDetail, CauseListItem, Dashboard } from "@/lib/api";

export const WALLET = "0x94C5E2065F555e01364ad83879D3ADDD298E706f";
export const OTHER_WALLET = "0x1111111111111111111111111111111111111111";
export const VAULT = "0x591723edf457032ad341366f4654a973fbd0daa9";
export const TOKEN = "0xD6D6fbbcAe342788DCC18fF2b1cd692c8b8837ec";
export const HASH = `0x${"a".repeat(64)}`;
export const HASH2 = `0x${"b".repeat(64)}`;

// next/navigation simulado: cada archivo lo inyecta con vi.mock(..., () => import("./helpers").then(m => m.navigationMock)).
export const nav = { push: vi.fn(), replace: vi.fn(), params: { id: "7" } as Record<string, string> };
export const navigationMock = {
  useRouter: () => ({ push: nav.push, replace: nav.replace }),
  useParams: () => nav.params,
  usePathname: () => "/",
};

export function user(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 2,
    username: "carlos",
    email: "carlos@example.com",
    auth_provider: "local",
    wallet_address: WALLET,
    created_at: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

export function setSession(u: AuthUser | null) {
  if (!u) return;
  localStorage.setItem("bbb_token", "jwt-token");
  localStorage.setItem("bbb_user", JSON.stringify(u));
}

export function cause(overrides: Partial<CauseDetail> = {}): CauseDetail {
  return {
    id: 7,
    recipient_id: 1,
    onchain_cause_id: 3,
    title: "Techo del comedor comunitario",
    description: "El comedor necesita reparar el techo antes de la temporada de lluvias.",
    image_hash: "abc",
    target_amount: "500.000000",
    status: "Verified",
    verification_hash: null,
    verification_reason: "La foto muestra un techo dañado coherente con la descripción.",
    verification_confidence: "0.90",
    created_at: "2026-09-10T10:00:00Z",
    recipient_name: "miguel",
    image_url: "/causes/7/evidence",
    collected: "12.500000",
    donations: [{ amount: "12.500000", tx_hash: HASH, donor_wallet: OTHER_WALLET, created_at: "2026-09-11T10:00:00Z" }],
    ...overrides,
  };
}

export function listItem(overrides: Partial<CauseListItem> = {}): CauseListItem {
  return {
    id: 7,
    title: "Techo del comedor comunitario",
    description: "El comedor necesita reparar el techo.",
    recipient_name: "miguel",
    image_hash: "abc",
    image_url: "/causes/7/evidence",
    target_amount: "500.000000",
    collected: "12.500000",
    status: "Verified",
    ...overrides,
  };
}

export function dashboard(overrides: Partial<Dashboard> = {}): Dashboard {
  const u = user();
  return {
    user: u,
    wallet_linked: true,
    causes: [],
    total_donated: "0.000000",
    donations: [],
    ...overrides,
  };
}

const word = (n: bigint) => encodeAbiParameters([{ type: "uint256" }], [n]);

type WalletOptions = {
  accounts?: string[];
  chainId?: string;
  balance?: bigint;
  allowance?: bigint;
  rejectSend?: boolean;
  receiptStatus?: string;
};

/** window.ethereum simulado (EIP-1193): registra las transacciones enviadas en `sent`. */
export function mockWallet(opts: WalletOptions = {}) {
  const sent: { to: string; data: string }[] = [];
  const state = {
    accounts: opts.accounts ?? [WALLET],
    chainId: opts.chainId ?? "0x85",
    balance: opts.balance ?? BigInt(100_000_000),
    allowance: opts.allowance ?? BigInt(0),
  };
  const request = vi.fn(async ({ method, params }: { method: string; params?: unknown }) => {
    switch (method) {
      case "eth_chainId":
        return state.chainId;
      case "wallet_switchEthereumChain":
        state.chainId = "0x85";
        return null;
      case "eth_accounts":
      case "eth_requestAccounts":
        return state.accounts;
      case "eth_sendTransaction": {
        if (opts.rejectSend) throw Object.assign(new Error("User rejected"), { code: 4001 });
        const tx = (params as { to: string; data: string }[])[0];
        sent.push(tx);
        return sent.length === 1 ? HASH : HASH2;
      }
      case "eth_getTransactionReceipt":
        return { status: opts.receiptStatus ?? "0x1" };
      case "eth_call": {
        const data = (params as { data: string }[])[0].data;
        if (data.startsWith("0x70a08231")) return word(state.balance);
        if (data.startsWith("0xdd62ed3e")) return word(state.allowance);
        return "0x";
      }
      case "wallet_watchAsset":
        return true;
      default:
        throw new Error(`método no simulado: ${method}`);
    }
  });
  (window as { ethereum?: unknown }).ethereum = { request };
  return { request, sent, state };
}
