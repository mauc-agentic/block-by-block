// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../src/CauseVault.sol";

/**
 * @dev Tests para CauseVault.
 * Mapean a TC-001 (happy path) y TC-002 (causa rechazada).
 */

// Mock USDT para testing
contract MockUST is ERC20 {
    constructor() ERC20("USDT", "USDT") {
        _mint(msg.sender, 10000 * 10 ** 6); // 10k USDT
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

contract CauseVaultTest is Test {
    CauseVault vault;
    MockUST usdt;
    address owner = makeAddr("owner");
    address agent = makeAddr("agent");
    address receptor = makeAddr("receptor");
    address donante = makeAddr("donante");

    function setUp() public {
        // Deploy USDT mock
        usdt = new MockUST();

        // Deploy CauseVault
        vault = new CauseVault(address(usdt), owner, agent);

        // Distribuir USDT
        usdt.transfer(receptor, 100 * 10 ** 6);   // 100 USDT
        usdt.transfer(donante, 1000 * 10 ** 6);   // 1k USDT

        // Approvals
        vm.prank(receptor);
        usdt.approve(address(vault), type(uint256).max);

        vm.prank(donante);
        usdt.approve(address(vault), type(uint256).max);
    }

    // ========================================================================
    // TC-001: FLUJO FELIZ (Receptor → Donante → Retiro)
    // ========================================================================

    /**
     * @dev TC-001: Receptor crea causa → verifica → donante dona → receptor retira.
     *
     * Steps:
     * 1. Receptor crea causa (UC-004)
     * 2. Agente verifica (UC-006)
     * 3. Donante dona (UC-009)
     * 4. Receptor retira (UC-010)
     */
    function test_TC001_HappyPath() public {
        // Step 1: Receptor crea causa (UC-004)
        vm.prank(receptor);
        uint256 causeId = vault.createCause(
            "Reconstruir mi tienda",
            "Sismo destruyo vitrinas",
            500 * 10 ** 6 // 500 USDT
        );

        CauseVault.Cause memory cause = vault.getCause(causeId);
        assertEq(cause.recipient, receptor);
        assertEq(cause.targetAmount, 500 * 10 ** 6);
        assertEq(uint256(cause.status), uint256(CauseVault.CauseStatus.Pending));
        assertFalse(cause.verified);

        // Step 2: Agente verifica (UC-006)
        vm.prank(agent);
        vault.verifyCause(causeId, true, "QmHash...");

        cause = vault.getCause(causeId);
        assertTrue(cause.verified);
        assertEq(uint256(cause.status), uint256(CauseVault.CauseStatus.Verified));

        // Step 3: Donante dona 100 USDT (UC-009)
        uint256 donationAmount = 100 * 10 ** 6;
        vm.prank(donante);
        vault.donate(causeId, donationAmount);

        cause = vault.getCause(causeId);
        assertEq(cause.collected, donationAmount);

        // Verificar evento de donacion
        CauseVault.Donation[] memory causeDonations = vault.getDonationsForCause(causeId);
        assertEq(causeDonations.length, 1);
        assertEq(causeDonations[0].donor, donante);
        assertEq(causeDonations[0].amount, donationAmount);

        // Step 4: Receptor retira fondos (UC-010)
        uint256 receptorBalanceBefore = usdt.balanceOf(receptor);
        vm.prank(receptor);
        vault.withdrawFunds(causeId);

        uint256 receptorBalanceAfter = usdt.balanceOf(receptor);
        assertEq(receptorBalanceAfter - receptorBalanceBefore, donationAmount);

        // Verificar que collected queda en 0
        cause = vault.getCause(causeId);
        assertEq(cause.collected, 0);
    }

    // ========================================================================
    // TC-002: CAUSA RECHAZADA BLOQUEA FONDOS
    // ========================================================================

    /**
     * @dev TC-002: Causa rechazada no recibe donaciones ni permite retiros.
     *
     * Steps:
     * 1. Receptor crea causa (UC-004)
     * 2. Agente rechaza (UC-006)
     * 3. Donante intenta donar → REVERT
     * 4. Receptor intenta retirar → REVERT
     */
    function test_TC002_RejectedCauseBlocksFunds() public {
        // Step 1: Receptor crea causa (UC-004)
        vm.prank(receptor);
        uint256 causeId = vault.createCause(
            "Ayuda urgente",
            "Incendio en mi casa",
            300 * 10 ** 6 // 300 USDT
        );

        // Step 2: Agente rechaza (UC-006)
        vm.prank(agent);
        vault.verifyCause(causeId, false, "QmRejectedHash...");

        CauseVault.Cause memory cause = vault.getCause(causeId);
        assertFalse(cause.verified);
        assertEq(uint256(cause.status), uint256(CauseVault.CauseStatus.Rejected));

        // Step 3: Donante intenta donar → REVERT (UC-009)
        vm.prank(donante);
        vm.expectRevert("CauseVault: cause not verified");
        vault.donate(causeId, 50 * 10 ** 6);

        // Verificar que no se registro donacion
        CauseVault.Donation[] memory causeDonations = vault.getDonationsForCause(causeId);
        assertEq(causeDonations.length, 0);

        // Step 4: Receptor intenta retirar → REVERT: la causa no está verificada (UC-010 A3)
        vm.prank(receptor);
        vm.expectRevert("CauseVault: cause not verified");
        vault.withdrawFunds(causeId);
    }

    // ========================================================================
    // TESTS DE VALIDACIONES
    // ========================================================================

    function test_UC004_BR002_CreateCauseWithZeroAmountReverts() public {
        vm.prank(receptor);
        vm.expectRevert("CauseVault: target amount must be > 0");
        vault.createCause("Bad", "Bad cause", 0);
    }

    function test_UC009_BR003_DonateWithZeroAmountReverts() public {
        // Setup: crear y verificar causa
        vm.prank(receptor);
        uint256 causeId = vault.createCause("Test", "Test", 100 * 10 ** 6);

        vm.prank(agent);
        vault.verifyCause(causeId, true, "Hash");

        // Intentar donar 0
        vm.prank(donante);
        vm.expectRevert("CauseVault: amount must be > 0");
        vault.donate(causeId, 0);
    }

    function test_UC010_BR001_A2_OnlyRecipientCanWithdraw() public {
        // Setup: crear, verificar, donar
        vm.prank(receptor);
        uint256 causeId = vault.createCause("Test", "Test", 100 * 10 ** 6);

        vm.prank(agent);
        vault.verifyCause(causeId, true, "Hash");

        vm.prank(donante);
        vault.donate(causeId, 50 * 10 ** 6);

        // Otro usuario intenta retirar
        address other = makeAddr("other");
        vm.prank(other);
        vm.expectRevert("CauseVault: not the recipient");
        vault.withdrawFunds(causeId);
    }

    function test_UC006_BR001_OnlyAgentCanVerify() public {
        // Setup: crear causa
        vm.prank(receptor);
        uint256 causeId = vault.createCause("Test", "Test", 100 * 10 ** 6);

        // Otro usuario intenta verificar
        address other = makeAddr("other");
        vm.prank(other);
        vm.expectRevert("CauseVault: not agent");
        vault.verifyCause(causeId, true, "Hash");
    }

    function test_CompletedCauseAfterReachingTarget() public {
        // Setup: crear y verificar causa
        vm.prank(receptor);
        uint256 causeId = vault.createCause("Test", "Test", 100 * 10 ** 6);

        vm.prank(agent);
        vault.verifyCause(causeId, true, "Hash");

        // Donar exactamente el target
        vm.prank(donante);
        vault.donate(causeId, 100 * 10 ** 6);

        // Verificar que status es Completed
        CauseVault.Cause memory cause = vault.getCause(causeId);
        assertEq(uint256(cause.status), uint256(CauseVault.CauseStatus.Completed));
    }

    function test_GetRecipientCauses() public {
        vm.startPrank(receptor); // vm.prank solo vale para la siguiente llamada
        uint256 causeId1 = vault.createCause("Cause 1", "Desc", 100 * 10 ** 6);
        uint256 causeId2 = vault.createCause("Cause 2", "Desc", 200 * 10 ** 6);
        vm.stopPrank();

        uint256[] memory causes = vault.getRecipientCauses(receptor);
        assertEq(causes.length, 2);
        assertEq(causes[0], causeId1);
        assertEq(causes[1], causeId2);
    }

    function test_GetCausesCount() public {
        assertEq(vault.getCausesCount(), 0);

        vm.startPrank(receptor);
        vault.createCause("Cause 1", "Desc", 100 * 10 ** 6);
        assertEq(vault.getCausesCount(), 1);

        vault.createCause("Cause 2", "Desc", 200 * 10 ** 6);
        vm.stopPrank();
        assertEq(vault.getCausesCount(), 2);
    }

    // ========================================================================
    // UC-012: ADMINISTRAR EL CONTRATO (TC-004)
    // ========================================================================

    function _verifiedCauseWithFunds(uint256 donation) internal returns (uint256 id) {
        vm.prank(receptor);
        id = vault.createCause("Causa", "Desc", 100 * 10 ** 6);
        vm.prank(agent);
        vault.verifyCause(id, true, "QmHash");
        vm.prank(donante);
        vault.donate(id, donation);
    }

    function test_UC012_BR001_A2_OnlyOwnerCanPauseUnpauseAndRotateAgent() public {
        vm.startPrank(donante);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, donante));
        vault.pause();
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, donante));
        vault.unpause();
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, donante));
        vault.setAgent(donante);
        vm.stopPrank();

        assertFalse(vault.paused());
        assertEq(vault.agent(), agent);
    }

    function test_UC012_BR002_PauseBlocksNewCausesAndDonationsButNeverWithdrawals() public {
        uint256 id = _verifiedCauseWithFunds(30 * 10 ** 6);

        vm.prank(owner);
        vault.pause();
        assertTrue(vault.paused());

        vm.prank(donante);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.donate(id, 10 * 10 ** 6);

        vm.prank(receptor);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.createCause("Otra", "Desc", 50 * 10 ** 6);

        // Los fondos nunca quedan bloqueados: el receptor puede retirar durante la pausa
        uint256 before = usdt.balanceOf(receptor);
        vm.prank(receptor);
        vault.withdrawFunds(id);
        assertEq(usdt.balanceOf(receptor), before + 30 * 10 ** 6);
    }

    function test_UC012_UnpauseRestoresDonations() public {
        uint256 id = _verifiedCauseWithFunds(10 * 10 ** 6);

        vm.startPrank(owner);
        vault.pause();
        vault.unpause();
        vm.stopPrank();
        assertFalse(vault.paused());

        vm.prank(donante);
        vault.donate(id, 5 * 10 ** 6);
        assertEq(vault.getCause(id).collected, 15 * 10 ** 6);
    }

    function test_UC012_A1_OwnerRotatesAgentAndTheOldOneLosesAuthority() public {
        address newAgent = makeAddr("newAgent");
        vm.prank(receptor);
        uint256 id = vault.createCause("Causa", "Desc", 100 * 10 ** 6);

        vm.prank(owner);
        vault.setAgent(newAgent);
        assertEq(vault.agent(), newAgent);

        vm.prank(agent);
        vm.expectRevert("CauseVault: not agent");
        vault.verifyCause(id, true, "QmOld");

        vm.prank(newAgent);
        vault.verifyCause(id, true, "QmNew");
        assertTrue(vault.getCause(id).verified);
    }

    function test_UC012_A3_BR003_AgentCanNeverBeTheZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert("CauseVault: agent zero address");
        vault.setAgent(address(0));
        assertEq(vault.agent(), agent);
    }

    // ========================================================================
    // UC-010: RETIRAR FONDOS
    // ========================================================================

    function test_UC010_A1_NoFundsToWithdrawReverts() public {
        vm.prank(receptor);
        uint256 id = vault.createCause("Causa", "Desc", 100 * 10 ** 6);
        vm.prank(agent);
        vault.verifyCause(id, true, "QmHash");

        vm.prank(receptor);
        vm.expectRevert("CauseVault: no funds to withdraw");
        vault.withdrawFunds(id);
    }

    function test_UC010_A3_BR002_WithdrawRevertsForAnUnverifiedCause() public {
        vm.prank(receptor);
        uint256 id = vault.createCause("Causa", "Desc", 100 * 10 ** 6);

        vm.prank(receptor);
        vm.expectRevert("CauseVault: cause not verified");
        vault.withdrawFunds(id);
    }

    function test_UC010_BR003_BR004_WithdrawTransfersEverythingAndZeroesTheBalanceFirst() public {
        uint256 id = _verifiedCauseWithFunds(30 * 10 ** 6);

        uint256 before = usdt.balanceOf(receptor);
        vm.prank(receptor);
        vault.withdrawFunds(id);

        assertEq(usdt.balanceOf(receptor), before + 30 * 10 ** 6);
        assertEq(vault.getCause(id).collected, 0);
        assertEq(usdt.balanceOf(address(vault)), 0);

        vm.prank(receptor);
        vm.expectRevert("CauseVault: no funds to withdraw");
        vault.withdrawFunds(id);
    }
}
