// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";

contract BasketJsonNFT is ERC721URIStorage, ERC721Burnable {
    uint256 public nextTokenId;

    constructor() ERC721("BasketJsonNFT", "BJNFT") {}

    function mintNFT(string memory jsonMetadata) external {
        uint256 tokenId = nextTokenId;
        nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, jsonMetadata);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721URIStorage, ERC721) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721URIStorage, ERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}