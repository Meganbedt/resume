export const ResumeChainABI = {
  "abi": [
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "resumeId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "viewer",
          "type": "address"
        }
      ],
      "name": "AccessGranted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "resumeId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "viewer",
          "type": "address"
        }
      ],
      "name": "AccessRevoked",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "resumeId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "sectionHash",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "endorser",
          "type": "address"
        }
      ],
      "name": "Endorsed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "resumeId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "resumeHash",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "isPublic",
          "type": "bool"
        }
      ],
      "name": "ResumeCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "resumeId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "newHash",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "isPublic",
          "type": "bool"
        }
      ],
      "name": "ResumeUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "resumeId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "sectionHash",
          "type": "bytes32"
        }
      ],
      "name": "SectionUpserted",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "resumeHash",
          "type": "bytes32"
        },
        {
          "internalType": "bool",
          "name": "isPublic",
          "type": "bool"
        }
      ],
      "name": "createResume",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "resumeId",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "resumeId",
          "type": "uint256"
        }
      ],
      "name": "endorseResume",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "resumeId",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "sectionHash",
          "type": "bytes32"
        }
      ],
      "name": "endorseSection",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "endorsedBy",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "resumeId",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "sectionHash",
          "type": "bytes32"
        }
      ],
      "name": "getEncryptedEndorsementCount",
      "outputs": [
        {
          "internalType": "euint32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "resumeId",
          "type": "uint256"
        }
      ],
      "name": "getResume",
      "outputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "bytes32",
          "name": "resumeHash",
          "type": "bytes32"
        },
        {
          "internalType": "bool",
          "name": "isPublic",
          "type": "bool"
        },
        {
          "internalType": "uint64",
          "name": "createdAt",
          "type": "uint64"
        },
        {
          "internalType": "uint64",
          "name": "updatedAt",
          "type": "uint64"
        },
        {
          "internalType": "ebool",
          "name": "callerAccess",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "resumeId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "viewer",
          "type": "address"
        }
      ],
      "name": "grantAccess",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "nextResumeId",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "protocolId",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "pure",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "resumes",
      "outputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "bytes32",
          "name": "resumeHash",
          "type": "bytes32"
        },
        {
          "internalType": "bool",
          "name": "isPublic",
          "type": "bool"
        },
        {
          "internalType": "uint64",
          "name": "createdAt",
          "type": "uint64"
        },
        {
          "internalType": "uint64",
          "name": "updatedAt",
          "type": "uint64"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "resumeId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "viewer",
          "type": "address"
        }
      ],
      "name": "revokeAccess",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "sections",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "sectionHash",
          "type": "bytes32"
        },
        {
          "internalType": "euint32",
          "name": "endorsementCount",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "resumeId",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "newHash",
          "type": "bytes32"
        },
        {
          "internalType": "bool",
          "name": "isPublic",
          "type": "bool"
        }
      ],
      "name": "updateResume",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "resumeId",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "sectionHash",
          "type": "bytes32"
        }
      ],
      "name": "upsertSection",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]
} as const;
