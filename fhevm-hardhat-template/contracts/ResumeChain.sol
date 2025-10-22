// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, ebool, euint32, euint64, eaddress, externalEuint32, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ResumeChain - Encrypted resume registry with endorsements and ACL on FHEVM
/// @notice Stores only hashes and minimal public indices on-chain. Encrypted content stays off-chain (e.g., IPFS).
/// @dev Demonstrates selective FHE usage for private counters (endorsements) and ACL flags.
contract ResumeChain is SepoliaConfig {
    struct ResumeMeta {
        address owner;
        bytes32 resumeHash; // hash of encrypted resume JSON stored off-chain
        bool isPublic; // visibility flag for discovery
        uint64 createdAt;
        uint64 updatedAt;
    }

    struct SectionMeta {
        bytes32 sectionHash; // hash of the section content (encrypted JSON)
        // Private endorsement counter; decryptable only by authorized users.
        euint32 endorsementCount;
    }

    /// @dev Access Control: resumeId => viewer => encrypted boolean permission
    mapping(uint256 => mapping(address => ebool)) private _acl;
    mapping(uint256 => ResumeMeta) public resumes; // resumeId => meta
    mapping(uint256 => mapping(bytes32 => SectionMeta)) public sections; // resumeId => sectionHash => meta

    mapping(uint256 => mapping(bytes32 => mapping(address => bool))) public endorsedBy; // prevent double-endorse

    uint256 public nextResumeId = 1;

    event ResumeCreated(uint256 indexed resumeId, address indexed owner, bytes32 resumeHash, bool isPublic);
    event ResumeUpdated(uint256 indexed resumeId, bytes32 newHash, bool isPublic);
    event SectionUpserted(uint256 indexed resumeId, bytes32 indexed sectionHash);
    event Endorsed(uint256 indexed resumeId, bytes32 indexed sectionHash, address indexed endorser);
    event AccessGranted(uint256 indexed resumeId, address indexed viewer);
    event AccessRevoked(uint256 indexed resumeId, address indexed viewer);

    modifier onlyOwner(uint256 resumeId) {
        require(resumes[resumeId].owner == msg.sender, "Not owner");
        _;
    }

    function createResume(bytes32 resumeHash, bool isPublic) external returns (uint256 resumeId) {
        resumeId = nextResumeId++;
        resumes[resumeId] = ResumeMeta({
            owner: msg.sender,
            resumeHash: resumeHash,
            isPublic: isPublic,
            createdAt: uint64(block.timestamp),
            updatedAt: uint64(block.timestamp)
        });
        // auto grant ACL to owner for viewing/decryption
        {
            ebool granted = FHE.asEbool(true);
            _acl[resumeId][msg.sender] = granted;
            FHE.allowThis(granted);
            FHE.allow(granted, msg.sender);
        }
        emit ResumeCreated(resumeId, msg.sender, resumeHash, isPublic);
    }

    function updateResume(uint256 resumeId, bytes32 newHash, bool isPublic) external onlyOwner(resumeId) {
        ResumeMeta storage m = resumes[resumeId];
        require(m.owner != address(0), "Resume not found");
        m.resumeHash = newHash;
        m.isPublic = isPublic;
        m.updatedAt = uint64(block.timestamp);
        emit ResumeUpdated(resumeId, newHash, isPublic);
    }

    /// @notice Upsert a section. Initializes encrypted endorsement counter to 0 if new.
    function upsertSection(uint256 resumeId, bytes32 sectionHash) external onlyOwner(resumeId) {
        ResumeMeta storage m = resumes[resumeId];
        require(m.owner != address(0), "Resume not found");
        SectionMeta storage s = sections[resumeId][sectionHash];
        if (s.sectionHash == bytes32(0)) {
            s.sectionHash = sectionHash;
            // init private counter to 0
            s.endorsementCount = FHE.asEuint32(0);
            FHE.allowThis(s.endorsementCount);
            FHE.allow(s.endorsementCount, m.owner);
        }
        emit SectionUpserted(resumeId, sectionHash);
    }

    /// @notice Endorse a section; increments encrypted counter and prevents double endorsement by same address.
    function endorseSection(uint256 resumeId, bytes32 sectionHash) external {
        ResumeMeta storage m = resumes[resumeId];
        require(m.owner != address(0), "Resume not found");
        SectionMeta storage s = sections[resumeId][sectionHash];
        require(s.sectionHash != bytes32(0), "Section not found");
        require(!endorsedBy[resumeId][sectionHash][msg.sender], "Already endorsed");
        endorsedBy[resumeId][sectionHash][msg.sender] = true;

        // increment encrypted counter by 1
        s.endorsementCount = FHE.add(s.endorsementCount, FHE.asEuint32(1));
        FHE.allowThis(s.endorsementCount);
        FHE.allow(s.endorsementCount, m.owner);

        emit Endorsed(resumeId, sectionHash, msg.sender);
    }

    /// @notice Simple endorsement without specifying a section (for demo convenience)
    function endorseResume(uint256 resumeId) external {
        ResumeMeta storage m = resumes[resumeId];
        require(m.owner != address(0), "Resume not found");
        // Use resume hash as dummy section key so counter is stored under a deterministic key
        SectionMeta storage s = sections[resumeId][m.resumeHash];
        if (s.sectionHash == bytes32(0)) {
            s.sectionHash = m.resumeHash;
            s.endorsementCount = FHE.asEuint32(0);
            FHE.allowThis(s.endorsementCount);
            FHE.allow(s.endorsementCount, m.owner);
        }
        require(!endorsedBy[resumeId][m.resumeHash][msg.sender], "Already endorsed");
        endorsedBy[resumeId][m.resumeHash][msg.sender] = true;
        s.endorsementCount = FHE.add(s.endorsementCount, FHE.asEuint32(1));
        FHE.allowThis(s.endorsementCount);
        FHE.allow(s.endorsementCount, m.owner);
        emit Endorsed(resumeId, m.resumeHash, msg.sender);
    }

    /// @notice Grant viewing access by setting ACL[resumeId][viewer] = true (encrypted boolean)
    function grantAccess(uint256 resumeId, address viewer) external onlyOwner(resumeId) {
        ebool granted = FHE.asEbool(true);
        _acl[resumeId][viewer] = granted;
        FHE.allowThis(granted);
        FHE.allow(granted, msg.sender);
        FHE.allow(granted, viewer);
        emit AccessGranted(resumeId, viewer);
    }

    /// @notice Revoke viewing access by setting ACL[resumeId][viewer] = false (encrypted boolean)
    function revokeAccess(uint256 resumeId, address viewer) external onlyOwner(resumeId) {
        ebool revoked = FHE.asEbool(false);
        _acl[resumeId][viewer] = revoked;
        FHE.allowThis(revoked);
        FHE.allow(revoked, msg.sender);
        FHE.allow(revoked, viewer);
        emit AccessRevoked(resumeId, viewer);
    }

    /// @notice Returns resume metadata and an encrypted ACL flag for the caller (owner/viewer)
    function getResume(uint256 resumeId)
        external
        view
        returns (
            address owner,
            bytes32 resumeHash,
            bool isPublic,
            uint64 createdAt,
            uint64 updatedAt,
            ebool callerAccess
        )
    {
        ResumeMeta storage m = resumes[resumeId];
        require(m.owner != address(0), "Resume not found");
        owner = m.owner;
        resumeHash = m.resumeHash;
        isPublic = m.isPublic;
        createdAt = m.createdAt;
        updatedAt = m.updatedAt;
        callerAccess = _acl[resumeId][msg.sender];
    }

    /// @notice Returns the encrypted endorsement counter for a section
    function getEncryptedEndorsementCount(uint256 resumeId, bytes32 sectionHash)
        external
        view
        returns (euint32)
    {
        SectionMeta storage s = sections[resumeId][sectionHash];
        require(s.sectionHash != bytes32(0), "Section not found");
        return s.endorsementCount;
    }
}



