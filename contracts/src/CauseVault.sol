// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title CauseVault
 * @dev Plataforma de donaciones descentralizada peer-to-peer.
 * Receptores crean causas, el agente las verifica, y los donantes
 * transfieren USDT directamente sin comisiones.
 *
 * Casos de uso mapeados:
 * - UC-004: createCause (receptor crea)
 * - UC-006: verifyCause (agente verifica)
 * - UC-009: donate (donante dona)
 * - UC-010: withdrawFunds (receptor retira)
 */
contract CauseVault is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ========================================================================
    // TIPOS Y CONSTANTES
    // ========================================================================

    enum CauseStatus {
        Pending,    // 0: Creada, aguardando verificación
        Verified,   // 1: Verificada por el agente
        Rejected,   // 2: Rechazada por el agente
        Completed   // 3: Meta alcanzada
    }

    struct Cause {
        address recipient;
        string title;
        string description;
        uint256 targetAmount;           // USDT con 6 decimales
        uint256 collected;              // Monto actual recaudado
        CauseStatus status;
        uint256 createdAt;
        bool verified;
        string verificationHash;        // IPFS hash del análisis IA
    }

    struct Donation {
        address donor;
        uint256 causeId;
        uint256 amount;
        uint256 timestamp;
    }

    // ========================================================================
    // STATE VARIABLES
    // ========================================================================

    IERC20 public immutable token;      // USDT (6 decimales)
    address public agent;               // Solo el agente puede verificar

    uint256 public nextCauseId;
    mapping(uint256 => Cause) public causes;
    mapping(uint256 => Donation[]) public donations;
    mapping(address => uint256[]) public recipientCauses;

    // ========================================================================
    // EVENTS (NFR-011: Auditoría pública)
    // ========================================================================

    /**
     * @dev UC-004: Causa creada.
     */
    event CauseCreated(
        uint256 indexed causeId,
        address indexed recipient,
        uint256 targetAmount,
        string title
    );

    /**
     * @dev UC-006: Causa verificada o rechazada.
     */
    event CauseVerified(
        uint256 indexed causeId,
        bool verified,
        string verificationHash
    );

    /**
     * @dev UC-009: Donación recibida (NFR-011: auditable).
     */
    event DonationReceived(
        uint256 indexed causeId,
        address indexed donor,
        uint256 amount
    );

    /**
     * @dev UC-010: Fondos retirados.
     */
    event FundsWithdrawn(
        uint256 indexed causeId,
        address indexed recipient,
        uint256 amount
    );

    // ========================================================================
    // MODIFIERS
    // ========================================================================

    /**
     * @dev Restricción: solo el agente verificador puede llamar.
     * UC-006: verifyCause
     */
    modifier onlyAgent() {
        require(msg.sender == agent, "CauseVault: not agent");
        _;
    }

    // ========================================================================
    // CONSTRUCTOR
    // ========================================================================

    /**
     * @param _token Dirección del token USDT (ERC-20, 6 decimales).
     * @param _owner Propietario del contrato (admin, puede pausar).
     * @param _agent Dirección del agente verificador.
     */
    constructor(
        address _token,
        address _owner,
        address _agent
    ) Ownable(_owner) {
        require(_token != address(0), "CauseVault: token zero address");
        require(_agent != address(0), "CauseVault: agent zero address");

        token = IERC20(_token);
        agent = _agent;
    }

    // ========================================================================
    // UC-004: CREAR CAUSA (RECEPTOR)
    // ========================================================================

    /**
     * @dev UC-004: El receptor publica una causa con monto objetivo.
     *
     * Business Rules:
     * - BR-001: Solo receptores pueden crear (validado en backend).
     * - BR-002: Monto objetivo > 0.
     * - BR-003: Causa nace en estado Pending.
     *
     * @param _title Título de la causa (máx 255 caracteres).
     * @param _description Descripción (máx 2000 caracteres).
     * @param _targetAmount Monto objetivo en USDT (6 decimales).
     * @return causeId ID asignado a la causa.
     */
    function createCause(
        string calldata _title,
        string calldata _description,
        uint256 _targetAmount
    ) external whenNotPaused returns (uint256) {
        require(_targetAmount > 0, "CauseVault: target amount must be > 0");

        uint256 id = nextCauseId++;
        causes[id] = Cause({
            recipient: msg.sender,
            title: _title,
            description: _description,
            targetAmount: _targetAmount,
            collected: 0,
            status: CauseStatus.Pending,
            createdAt: block.timestamp,
            verified: false,
            verificationHash: ""
        });

        recipientCauses[msg.sender].push(id);
        emit CauseCreated(id, msg.sender, _targetAmount, _title);

        return id;
    }

    // ========================================================================
    // UC-006: VERIFICAR CAUSA CON IA (AGENTE)
    // ========================================================================

    /**
     * @dev UC-006: El agente verifica la causa tras análisis de IA.
     *
     * Business Rules:
     * - BR-001: Solo el agente.
     * - BR-002: Confianza >= 0.80 para verificar (backend).
     * - BR-003: Hash IPFS del análisis para auditoría.
     *
     * @param _causeId ID de la causa.
     * @param _verified true si se verifica, false si se rechaza.
     * @param _verificationHash Hash IPFS del análisis del agente.
     *
     * @custom:uc UC-006 BR-001
     */
    function verifyCause(
        uint256 _causeId,
        bool _verified,
        string calldata _verificationHash
    ) external onlyAgent {
        require(_causeId < nextCauseId, "CauseVault: cause does not exist");

        Cause storage cause = causes[_causeId];
        cause.verified = _verified;
        cause.verificationHash = _verificationHash;

        if (_verified) {
            cause.status = CauseStatus.Verified;
        } else {
            cause.status = CauseStatus.Rejected;
        }

        emit CauseVerified(_causeId, _verified, _verificationHash);
    }

    // ========================================================================
    // UC-009: DONAR A UNA CAUSA (DONANTE)
    // ========================================================================

    /**
     * @dev UC-009: Donante transfiere USDT a una causa verificada.
     *
     * Business Rules:
     * - BR-001: Solo causas Verified aceptan donaciones.
     * - BR-002: Sin comisión (100% al receptor) [NFR-005].
     * - BR-003: Monto > 0.
     * - BR-004: Backend nunca firma (donante firma en su wallet).
     *
     * Flujo:
     * 1. Donante aprueba el gasto de USDT al contrato (approve).
     * 2. Donante llama donate().
     * 3. Contrato bloquea USDT y registra donación.
     * 4. Si collected >= target, causa se marca Completed.
     *
     * @param _causeId ID de la causa.
     * @param _amount Monto en USDT (6 decimales).
     *
     * @custom:uc UC-009 BR-001
     */
    function donate(
        uint256 _causeId,
        uint256 _amount
    ) external whenNotPaused nonReentrant {
        require(_causeId < nextCauseId, "CauseVault: cause does not exist");

        Cause storage cause = causes[_causeId];
        require(cause.verified, "CauseVault: cause not verified");
        require(_amount > 0, "CauseVault: amount must be > 0");

        // Transferir USDT del donante al contrato
        token.safeTransferFrom(msg.sender, address(this), _amount);

        // Registrar donación y actualizar recaudación
        cause.collected += _amount;
        donations[_causeId].push(
            Donation({
                donor: msg.sender,
                causeId: _causeId,
                amount: _amount,
                timestamp: block.timestamp
            })
        );

        // Marcar como Completed si alcanzó la meta
        if (cause.collected >= cause.targetAmount) {
            cause.status = CauseStatus.Completed;
        }

        emit DonationReceived(_causeId, msg.sender, _amount);
    }

    // ========================================================================
    // UC-010: RETIRAR FONDOS (RECEPTOR)
    // ========================================================================

    /**
     * @dev UC-010: El receptor retira los fondos recaudados.
     *
     * Business Rules:
     * - BR-001: Solo el receptor de la causa.
     * - BR-002: Solo causas Verified.
     * - BR-003: Retira todo de una vez.
     * - BR-004: Sin reentrada (pone collected = 0 antes de transfer).
     *
     * @param _causeId ID de la causa.
     *
     * @custom:uc UC-010 BR-001
     */
    function withdrawFunds(
        uint256 _causeId
    ) external nonReentrant {
        require(_causeId < nextCauseId, "CauseVault: cause does not exist");

        Cause storage cause = causes[_causeId];
        require(
            cause.recipient == msg.sender,
            "CauseVault: not the recipient"
        );
        require(cause.verified, "CauseVault: cause not verified");
        require(cause.collected > 0, "CauseVault: no funds to withdraw");

        // Poner en cero antes de transferir (prevenir reentrada) [BR-004]
        uint256 amount = cause.collected;
        cause.collected = 0;

        // Transferir al receptor [NFR-005: 100%]
        token.safeTransfer(msg.sender, amount);

        emit FundsWithdrawn(_causeId, msg.sender, amount);
    }

    // ========================================================================
    // GETTERS (LECTURA)
    // ========================================================================

    /**
     * @dev Obtener los datos de una causa.
     * @param _causeId ID de la causa.
     * @return Struct Cause con todos los datos.
     */
    function getCause(uint256 _causeId)
        external
        view
        returns (Cause memory)
    {
        require(_causeId < nextCauseId, "CauseVault: cause does not exist");
        return causes[_causeId];
    }

    /**
     * @dev Obtener todas las donaciones de una causa.
     * @param _causeId ID de la causa.
     * @return Array de Donation.
     */
    function getDonationsForCause(uint256 _causeId)
        external
        view
        returns (Donation[] memory)
    {
        require(_causeId < nextCauseId, "CauseVault: cause does not exist");
        return donations[_causeId];
    }

    /**
     * @dev Obtener todas las causas de un receptor.
     * @param _recipient Dirección del receptor.
     * @return Array de IDs de causas.
     */
    function getRecipientCauses(address _recipient)
        external
        view
        returns (uint256[] memory)
    {
        return recipientCauses[_recipient];
    }

    /**
     * @dev Contar causas totales.
     * @return Total de causas creadas.
     */
    function getCausesCount() external view returns (uint256) {
        return nextCauseId;
    }

    // ========================================================================
    // ADMIN
    // ========================================================================

    /**
     * @dev Cambiar el agente verificador (solo owner).
     * @param _newAgent Nueva dirección del agente.
     */
    function setAgent(address _newAgent) external onlyOwner {
        require(_newAgent != address(0), "CauseVault: agent zero address");
        agent = _newAgent;
    }

    /**
     * @dev Pausar/reanudar el contrato (emergency).
     */
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
