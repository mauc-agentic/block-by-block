// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {CauseVault} from "../src/CauseVault.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address token = 0xD6D6fbbcAe342788DCC18fF2b1cd692c8b8837ec; // MockUSDT
        address owner = vm.addr(deployerPrivateKey);
        address agent = owner;
        
        vm.startBroadcast(deployerPrivateKey);
        
        CauseVault vault = new CauseVault(token, owner, agent);
        
        vm.stopBroadcast();
        
        console.log("CauseVault deployed at:", address(vault));
    }
}
