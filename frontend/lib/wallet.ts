// UC-003 — cliente de vinculación de wallet (Rabby / cualquier proveedor EIP-1193).
// El backend nunca custodia claves (C-009): aquí solo se pide la conexión y la
// firma al proveedor inyectado por la extensión; la verificación vive en el
// backend (verify_wallet_signature, BR-001).

import { encodeFunctionData } from "viem";
import { getStoredToken, getStoredUser, type AuthUser } from "@/lib/auth";
import type { PublishInstruction } from "@/lib/causes";

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

// Convierte cualquier error (RPC de la wallet, red, bug) en un WalletError con
// un mensaje real. Antes, un error no contemplado explícitamente (p.ej. -32002
// "ya hay una solicitud pendiente") caía en un mensaje genérico que ocultaba la
// causa real y hacía imposible depurar fallos de conexión con Rabby.
function toWalletError(err: unknown, fallback: string): WalletError {
  if (err instanceof WalletError) return err;
  if (isRpcError(err, -32002)) {
    return new WalletError(
      "Rabby ya tiene una solicitud pendiente. Abre la extensión, apruébala o recházala, y vuelve a intentar."
    );
  }
  if (err instanceof Error && err.message) return new WalletError(err.message);
  if (typeof err === "string" && err) return new WalletError(err);
  if (typeof err === "object" && err !== null && "message" in err) {
    const message = (err as { message: unknown }).message;
    if (typeof message === "string" && message) return new WalletError(message);
  }
  return new WalletError(fallback);
}

function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new WalletError(timeoutMessage)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

const WALLET_PROMPT_TIMEOUT_MS = 30_000;
const WALLET_TIMEOUT_MESSAGE =
  "Rabby no respondió a tiempo. Abre la extensión por si tiene una ventana de aprobación esperando, o reinicia el navegador si sigue sin responder.";

async function ensureHskNetwork(provider: EthereumProvider) {
  const currentChainId = await withTimeout(
    provider.request({ method: "eth_chainId" }),
    WALLET_PROMPT_TIMEOUT_MS,
    WALLET_TIMEOUT_MESSAGE
  );
  if (currentChainId === HSK_CHAIN_ID_HEX) return;

  // A4: red incorrecta -> pedir cambio a HSK Chain testnet.
  try {
    await withTimeout(
      provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: HSK_CHAIN_ID_HEX }],
      }),
      WALLET_PROMPT_TIMEOUT_MS,
      WALLET_TIMEOUT_MESSAGE
    );
  } catch (switchErr) {
    if (isRpcError(switchErr, 4001)) {
      throw new WalletRejectedError("Cancelaste el cambio de red en tu wallet.");
    }

    // La wallet no tiene la red agregada. El código EIP-3326 (4902) para este
    // caso no es consistente entre wallets (Rabby a veces lanza un error sin
    // ese código, p.ej. "Unrecognized chain ID"), así que cualquier fallo que
    // no sea un rechazo explícito del usuario se trata igual: intentar
    // agregar la red.
    try {
      await withTimeout(
        provider.request({
          method: "wallet_addEthereumChain",
          params: [HSK_CHAIN_PARAMS],
        }),
        WALLET_PROMPT_TIMEOUT_MS,
        WALLET_TIMEOUT_MESSAGE
      );
    } catch (addErr) {
      if (isRpcError(addErr, 4001)) {
        throw new WalletRejectedError("Cancelaste el cambio de red en tu wallet.");
      }
      throw addErr;
    }

    // Algunas wallets agregan la red sin activarla automáticamente.
    const chainIdAfterAdd = await withTimeout(
      provider.request({ method: "eth_chainId" }),
      WALLET_PROMPT_TIMEOUT_MS,
      WALLET_TIMEOUT_MESSAGE
    );
    if (chainIdAfterAdd !== HSK_CHAIN_ID_HEX) {
      try {
        await withTimeout(
          provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: HSK_CHAIN_ID_HEX }],
          }),
          WALLET_PROMPT_TIMEOUT_MS,
          WALLET_TIMEOUT_MESSAGE
        );
      } catch (finalSwitchErr) {
        if (isRpcError(finalSwitchErr, 4001)) {
          throw new WalletRejectedError("Cancelaste el cambio de red en tu wallet.");
        }
        throw finalSwitchErr;
      }
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
    accounts = (await withTimeout(
      provider.request({ method: "eth_requestAccounts" }),
      WALLET_PROMPT_TIMEOUT_MS,
      WALLET_TIMEOUT_MESSAGE
    )) as string[];
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

function toHexMessage(message: string): string {
  const bytes = new TextEncoder().encode(message);
  return `0x${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;
}

async function signMessage(provider: EthereumProvider, address: string, message: string): Promise<string> {
  try {
    // El mensaje va hex-encodeado (spec de personal_sign); el backend recupera
    // la dirección a partir del texto original con encode_defunct, que aplica
    // el mismo prefijo EIP-191 sobre los mismos bytes.
    return (await withTimeout(
      provider.request({
        method: "personal_sign",
        params: [toHexMessage(message), address],
      }),
      WALLET_PROMPT_TIMEOUT_MS,
      WALLET_TIMEOUT_MESSAGE
    )) as string;
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
  try {
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

    return await submitWalletLink({ wallet_address: address, signature, message });
  } catch (err) {
    throw toWalletError(err, "No se pudo vincular la wallet.");
  }
}

// UC-013 BR-001: el backend solo entrega la instrucción; aquí se codifica y
// firma `createCause` con la wallet del receptor, sin custodia del backend.
const CREATE_CAUSE_ABI = [
  {
    type: "function",
    name: "createCause",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_title", type: "string" },
      { name: "_description", type: "string" },
      { name: "_targetAmount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/** UC-013: firma y envía `createCause` al contrato con la wallet vinculada. */
export async function publishCauseOnChain(
  instruction: PublishInstruction,
  fromAddress: string
): Promise<string> {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new WalletError(
      "No detectamos una wallet compatible. Instala Rabby (rabby.io) y recarga la página."
    );
  }

  try {
    await ensureHskNetwork(provider);

    const [title, description, targetAmount] = instruction.params;
    const data = encodeFunctionData({
      abi: CREATE_CAUSE_ABI,
      functionName: "createCause",
      args: [String(title), String(description), BigInt(targetAmount)],
    });

    return (await withTimeout(
      provider.request({
        method: "eth_sendTransaction",
        params: [{ from: fromAddress, to: instruction.contract, data }],
      }),
      WALLET_PROMPT_TIMEOUT_MS,
      WALLET_TIMEOUT_MESSAGE
    )) as string;
  } catch (err) {
    // A3: el receptor cancela la firma en su wallet.
    if (isRpcError(err, 4001)) {
      throw new WalletRejectedError(
        "Cancelaste la firma. Tu causa sigue guardada, puedes reintentar publicarla en la cadena."
      );
    }
    throw toWalletError(err, "No se pudo enviar la transacción de publicación.");
  }
}
