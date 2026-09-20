// UC-003 — cliente de vinculación de wallet (Rabby / cualquier proveedor EIP-1193).
// El backend nunca custodia claves (C-009): aquí solo se pide la conexión y la
// firma al proveedor inyectado por la extensión; la verificación vive en el
// backend (verify_wallet_signature, BR-001).

import { getStoredToken, getStoredUser, type AuthUser } from "@/lib/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const HSK_CHAIN_ID_DECIMAL = 133;
export const HSK_CHAIN_ID_HEX = `0x${HSK_CHAIN_ID_DECIMAL.toString(16)}`;

const HSK_CHAIN_PARAMS = {
  chainId: HSK_CHAIN_ID_HEX,
  chainName: "HSK Chain Testnet",
  nativeCurrency: { name: "HSK", symbol: "HSK", decimals: 18 },
  rpcUrls: ["https://testnet.hsk.xyz"],
  blockExplorerUrls: ["https://testnet-explorer.hskchain.net/"],
};

type EthereumProvider = {
  isRabby?: boolean;
  isMetaMask?: boolean;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export class WalletError extends Error {}

// A3: el usuario cancela la solicitud en su wallet (código EIP-1193 4001).
export class WalletRejectedError extends WalletError {}

export function getInjectedProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  return window.ethereum ?? null;
}

function isRpcError(err: unknown, code: number): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === code;
}

async function ensureHskNetwork(provider: EthereumProvider) {
  const currentChainId = await provider.request({ method: "eth_chainId" });
  if (currentChainId === HSK_CHAIN_ID_HEX) return;

  // A4: red incorrecta -> pedir cambio a HSK Chain testnet.
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: HSK_CHAIN_ID_HEX }],
    });
  } catch (err) {
    // 4902: la wallet no tiene la red agregada todavía.
    if (isRpcError(err, 4902)) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [HSK_CHAIN_PARAMS],
      });
    } else if (isRpcError(err, 4001)) {
      throw new WalletRejectedError("Cancelaste el cambio de red en tu wallet.");
    } else {
      throw err;
    }
  }
}

export async function connectWallet(): Promise<string> {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new WalletError(
      "No detectamos una wallet compatible. Instala Rabby (rabby.io) y recarga la página."
    );
  }

  let accounts: string[];
  try {
    accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  } catch (err) {
    if (isRpcError(err, 4001)) {
      throw new WalletRejectedError("Cancelaste la conexión con tu wallet.");
    }
    throw err;
  }

  const address = accounts[0];
  if (!address) {
    throw new WalletError("Tu wallet no devolvió ninguna cuenta.");
  }

  await ensureHskNetwork(provider);
  return address;
}

function buildLinkMessage(address: string, user: AuthUser): string {
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return [
    "Vincula esta wallet a tu cuenta de Block by Block.",
    `Cuenta: ${user.email}`,
    `Dirección: ${address}`,
    `Nonce: ${nonce}`,
  ].join("\n");
}

async function signMessage(provider: EthereumProvider, address: string, message: string): Promise<string> {
  try {
    return (await provider.request({
      method: "personal_sign",
      params: [message, address],
    })) as string;
  } catch (err) {
    if (isRpcError(err, 4001)) {
      throw new WalletRejectedError("Cancelaste la firma. Tu cuenta sigue sin wallet vinculada.");
    }
    throw err;
  }
}

async function submitWalletLink(input: {
  wallet_address: string;
  signature: string;
  message: string;
}): Promise<AuthUser> {
  const token = getStoredToken();
  if (!token) {
    throw new WalletError("Tu sesión expiró. Inicia sesión de nuevo.");
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/wallet/link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    });
  } catch {
    throw new WalletError("No se pudo conectar con el servidor. Intenta de nuevo.");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    // A1: firma inválida / A2: wallet vinculada a otra cuenta -> el backend
    // ya distingue el mensaje en `detail`.
    throw new WalletError(data?.detail ?? "No se pudo vincular la wallet.");
  }

  return res.json();
}

/** Flujo completo de UC-003: conectar, firmar y vincular la wallet. */
export async function linkWallet(): Promise<AuthUser> {
  const user = getStoredUser();
  if (!user) {
    throw new WalletError("Tu sesión expiró. Inicia sesión de nuevo.");
  }

  const provider = getInjectedProvider();
  const address = await connectWallet();
  if (!provider) {
    throw new WalletError("No detectamos una wallet compatible.");
  }

  const message = buildLinkMessage(address, user);
  const signature = await signMessage(provider, address, message);

  return submitWalletLink({ wallet_address: address, signature, message });
}
