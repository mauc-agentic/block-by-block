import { explorerAddressUrl, explorerTxUrl, shortAddress } from "@/lib/format";

// S6: enlace al explorador para una transacción o una dirección.
export function ExplorerLink({
  hash,
  address,
  label,
}: {
  hash?: string;
  address?: string;
  label?: string;
}) {
  const value = hash ?? address ?? "";
  const href = hash ? explorerTxUrl(hash) : explorerAddressUrl(value);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-xs text-eag-secondary hover:underline"
    >
      {label ?? shortAddress(value)}
    </a>
  );
}
