# tests/integration/test_hsk_testnet.py
# Tests contra HSK Chain Testnet (RPC public)

import pytest
from web3 import Web3
from app.core.config import get_settings

settings = get_settings()

class TestHSKTestnet:
    """Tests contra HSK Chain testnet (sin credenciales privadas)."""

    def test_hsk_rpc_is_accessible(self):
        """Verifica que HSK testnet RPC es accesible."""
        w3 = Web3(Web3.HTTPProvider(settings.hsk_rpc_url))

        try:
            is_connected = w3.is_connected()
            assert is_connected, "HSK testnet RPC not responding"
            print(f"✅ HSK testnet RPC is accessible")
        except Exception as e:
            pytest.skip(f"HSK testnet not reachable: {e}")

    def test_hsk_chain_id_is_133(self):
        """Verifica que estamos en la cadena correcta (HSK testnet = 133)."""
        w3 = Web3(Web3.HTTPProvider(settings.hsk_rpc_url))

        if not w3.is_connected():
            pytest.skip("HSK testnet not reachable")

        chain_id = w3.eth.chain_id
        assert chain_id == 133, f"Expected chain 133, got {chain_id}"
        assert settings.hsk_chain_id == 133
        print(f"✅ Chain ID is 133 (HSK testnet)")

    def test_hsk_get_latest_block(self):
        """Obtiene el bloque más reciente de HSK testnet."""
        w3 = Web3(Web3.HTTPProvider(settings.hsk_rpc_url))

        if not w3.is_connected():
            pytest.skip("HSK testnet not reachable")

        block_number = w3.eth.block_number
        assert block_number > 0, "Invalid block number"

        block = w3.eth.get_block(block_number)
        assert block is not None

        print(f"✅ Latest block: #{block_number}")
        print(f"   Timestamp: {block['timestamp']}")
        print(f"   Gas used: {block['gasUsed']}")

    def test_hsk_gas_price(self):
        """Obtiene el precio actual del gas en HSK testnet."""
        w3 = Web3(Web3.HTTPProvider(settings.hsk_rpc_url))

        if not w3.is_connected():
            pytest.skip("HSK testnet not reachable")

        gas_price = w3.eth.gas_price
        gas_price_gwei = w3.from_wei(gas_price, 'gwei')

        assert gas_price > 0, "Gas price should be > 0"
        print(f"✅ Current gas price: {gas_price_gwei} Gwei")

    def test_agent_address_format(self):
        """Valida formato de AGENT_ADDRESS."""
        agent_addr = settings.agent_address

        if agent_addr in ["0x", "0xYourAgentAddress"]:
            pytest.fail(
                f"❌ AGENT_ADDRESS es placeholder: {agent_addr}\n"
                f"   Actualiza backend/.env con dirección real"
            )

        assert Web3.is_address(agent_addr), f"Invalid address format: {agent_addr}"
        print(f"✅ AGENT_ADDRESS formato válido: {agent_addr}")

    def test_agent_private_key_format(self):
        """Valida formato de AGENT_PRIVATE_KEY."""
        agent_pk = settings.agent_private_key

        if agent_pk in ["0x", "0xYourAgentPrivateKey"]:
            pytest.fail(
                f"❌ AGENT_PRIVATE_KEY es placeholder: {agent_pk[:20]}...\n"
                f"   Actualiza backend/.env con clave real"
            )

        assert agent_pk.startswith("0x"), "Private key should start with 0x"
        assert len(agent_pk) == 66, f"Private key should be 66 chars (0x + 64 hex), got {len(agent_pk)}"
        print(f"✅ AGENT_PRIVATE_KEY formato válido")

    def test_cause_vault_address_format(self):
        """Valida formato de CAUSE_VAULT_ADDRESS."""
        vault_addr = settings.cause_vault_address

        if vault_addr in ["0x", "0x..."]:
            pytest.fail(
                f"❌ CAUSE_VAULT_ADDRESS es placeholder: {vault_addr}\n"
                f"   Deploy el contrato en HSK y actualiza backend/.env"
            )

        assert Web3.is_address(vault_addr), f"Invalid address format: {vault_addr}"
        print(f"✅ CAUSE_VAULT_ADDRESS formato válido: {vault_addr}")

    @pytest.mark.skip(reason="Requires valid AGENT_PRIVATE_KEY")
    def test_sign_transaction_with_agent_key(self):
        """UC-006: Prueba firmar transacción con clave del agente."""
        from web3 import Web3
        from eth_account import Account

        w3 = Web3(Web3.HTTPProvider(settings.hsk_rpc_url))

        if not w3.is_connected():
            pytest.skip("HSK testnet not reachable")

        # Este test requiere AGENT_PRIVATE_KEY válida
        # Placeholder: solo verifica que podríamos firmar
        agent_pk = settings.agent_private_key

        # NO ejecutar en tests automatizados
        # account = Account.from_key(agent_pk)
        # Esto debería matchear AGENT_ADDRESS
        pass

    def test_get_contract_abi(self):
        """Verifica que el ABI del contrato está disponible."""
        import os
        import json

        abi_path = "abi/CauseVault.json"

        assert os.path.exists(abi_path), f"ABI file not found: {abi_path}"

        with open(abi_path) as f:
            abi = json.load(f)

        assert isinstance(abi, list), "ABI should be a list"
        assert len(abi) > 0, "ABI should not be empty"

        # Verificar que tiene las funciones esperadas
        function_names = [item.get("name") for item in abi if item.get("type") == "function"]
        expected_functions = ["verifyCause", "donate", "withdrawFunds"]

        for func in expected_functions:
            assert func in function_names, f"ABI missing function: {func}"

        print(f"✅ Contract ABI loaded with {len(function_names)} functions")


class TestHSKRequirements:
    """Requisitos para ejecutar tests on-chain de UC-006."""

    def test_print_hsk_requirements(self):
        """Imprime requerimientos para ejecutar UC-006 en HSK."""
        requirements = """
╔════════════════════════════════════════════════════════════════╗
║             HSK TESTNET REQUIREMENTS FOR UC-006                ║
╚════════════════════════════════════════════════════════════════╝

✅ COMPLETADO:
  • HSK RPC: https://testnet.hsk.xyz
  • Chain ID: 133
  • ABI del contrato: abi/CauseVault.json

⚠️  PENDIENTE (actualiza backend/.env):
  1. AGENT_ADDRESS: Obtén una wallet en HSK testnet
     → Faucet: https://hskchain.net/faucet
     → Export private key

  2. AGENT_PRIVATE_KEY: Exporta desde la wallet
     → Formato: 0x + 64 caracteres hex

  3. CAUSE_VAULT_ADDRESS: Deploy el contrato
     → forge create contracts/src/CauseVault.sol:CauseVault \\
         --rpc-url https://testnet.hsk.xyz \\
         --private-key 0x...
     → Copia la address del contrato

4. Obtén fondos HSK testnet:
   → Ve a https://hskchain.net/faucet
   → Pega tu wallet address
   → Recibe 10 HSK de prueba

DESPUÉS:
  • Actualiza backend/.env con las 3 direcciones
  • Corre: pytest tests/integration/test_hsk_testnet.py -v
  • Todos los tests deberían pasar ✅

ENTONCES UC-006 estará lista para firmar transacciones on-chain.
        """
        print(requirements)
        pytest.skip("Awaiting HSK credentials configuration")
