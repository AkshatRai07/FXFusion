// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract BasketJsonNFT is ERC721URIStorage {
    uint256 public nextTokenId;

    constructor() ERC721("BasketJsonNFT", "BJNFT") {}

    function mintNFT(string memory jsonMetadata) external {
        uint256 tokenId = nextTokenId;
        nextTokenId++;

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, jsonMetadata);
    }
}