// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IOUSoulbound
 * @dev A Soulbound Token (SBT) contract for Scotopia IOU attestations
 * @notice This contract extends ERC721 but disables transfers to make tokens soulbound
 */
contract IOUSoulbound is ERC721, ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;
    string private _baseTokenURI;
    
    // Mapping to track if a token has been minted
    mapping(uint256 => bool) public tokens;
    
    // Event emitted when a new attestation is minted
    event AttestationMinted(address indexed to, uint256 indexed tokenId, string metadataUri, string tier);
    
    // Event emitted when deposit occurs (for listener integration)
    event Deposit(address indexed user, uint256 amount, string token, uint256 timestamp);
    
    constructor(
        address initialOwner,
        string memory name,
        string memory symbol,
        string memory baseURI
    ) ERC721(name, symbol) Ownable(initialOwner) {
        _baseTokenURI = baseURI;
    }
    
    /**
     * @dev Mint a new attestation to a recipient
     * @param to The address to mint the attestation to
     * @param metadataUri The URI pointing to the attestation metadata
     */
    function mintAttestation(address to, string memory metadataUri) public onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataUri);
        
        tokens[tokenId] = true;
        
        emit AttestationMinted(to, tokenId, metadataUri, "");
        
        return tokenId;
    }
    
    /**
     * @dev Mint a tiered attestation
     * @param to The address to mint the attestation to
     * @param tierId The tier identifier (0 = Tier A, 1 = Tier B, 2 = Tier C)
     */
    function mintTier(address to, uint256 tierId) public onlyOwner returns (uint256) {
        require(tierId < 3, "Invalid tier ID");
        
        uint256 tokenId = _tokenIdCounter++;
        string memory tierName = tierId == 0 ? "Tier A" : tierId == 1 ? "Tier B" : "Tier C";
        string memory metadataUri = string(abi.encodePacked(_baseTokenURI, "/", tierName));
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataUri);
        
        tokens[tokenId] = true;
        
        emit AttestationMinted(to, tokenId, metadataUri, tierName);
        
        return tokenId;
    }
    
    /**
     * @dev Override transfer functions to prevent transfers (soulbound behavior)
     * @notice Transfers are disabled to maintain soulbound property
     */
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721URIStorage) returns (address) {
        // Only allow minting (from == address(0)) and burning (to == address(0))
        require(auth == address(0) || to == address(0), "Token is soulbound and cannot be transferred");
        return super._update(to, tokenId, auth);
    }
    
    /**
     * @dev Set the base URI for all tokens
     * @param baseURI The base URI to set
     */
    function setBaseURI(string memory baseURI) public onlyOwner {
        _baseTokenURI = baseURI;
    }
    
    /**
     * @dev Returns the base URI for all tokens
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
    
    /**
     * @dev Returns the token URI for a given token ID
     */
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    /**
     * @dev Check if a token exists
     */
    function exists(uint256 tokenId) public view returns (bool) {
        return tokens[tokenId];
    }
    
    /**
     * @dev Get the current token counter (total supply)
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter;
    }
}

