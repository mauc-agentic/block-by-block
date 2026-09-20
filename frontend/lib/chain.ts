// S6: configuración de la red 133 y fragmentos de ABI que firma el frontend.

export const HSK_CHAIN_ID_DECIMAL = 133;
export const HSK_CHAIN_ID_HEX = `0x${HSK_CHAIN_ID_DECIMAL.toString(16)}`;

export const TOKEN_ADDRESS =
  process.env.NEXT_PUBLIC_TOKEN_ADDRESS ?? "0xD6D6fbbcAe342788DCC18fF2b1cd692c8b8837ec";

export const HSK_CHAIN_PARAMS = {
  chainId: HSK_CHAIN_ID_HEX,
  chainName: "HSK Chain Testnet",
  nativeCurrency: { name: "HSK", symbol: "HSK", decimals: 18 },
  rpcUrls: ["https://testnet.hsk.xyz"],
  blockExplorerUrls: ["https://testnet-explorer.hskchain.net/"],
};

export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const VAULT_ABI = [
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
  {
    type: "function",
    name: "donate",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_causeId", type: "uint256" },
      { name: "_amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "withdrawFunds",
    stateMutability: "nonpayable",
    inputs: [{ name: "_causeId", type: "uint256" }],
    outputs: [],
  },
] as const;
