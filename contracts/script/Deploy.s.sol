// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/CauseVault.sol";

/**
 * @dev Script de deploy para CauseVault en HSK Chain testnet.
 *
 * Uso:
 * forge script script/Deploy.s.sol:Deploy \
 *   --rpc-url https://testnet-rpc.hskchain.io \
 *   --broadcast
 */
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address owner = vm.envAddress("OWNER_ADDRESS");
        address agent = vm.envAddress("AGENT_ADDRESS");
        address token = vm.envAddress("TOKEN_ADDRESS"); // USDT

        vm.startBroadcast(deployerKey);

        CauseVault vault = new CauseVault(token, owner, agent);

        vm.stopBroadcast();

        console.log("CauseVault deployed at:", address(vault));
        console.log("Owner:", owner);
        console.log("Agent:", agent);
        console.log("Token:", token);
    }
}
