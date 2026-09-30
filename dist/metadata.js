// Exact upstream IDs from https://models.dev/api.json, retrieved 2026-10-01.
// Only text-output tool-capable models with explicit metadata. No prices copied.
// Conflicting capabilities across direct-provider records are excluded.
export const builtinProfiles = {
    "gpt-5.4": {
        "name": "GPT-5.4",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1050000,
            "output": 128000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-5.4"
        }
    },
    "gpt-5.4-pro": {
        "name": "GPT-5.4 Pro",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1050000,
            "output": 128000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-5.4-pro"
        }
    },
    "gpt-5.5-pro": {
        "name": "GPT-5.5 Pro",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1050000,
            "output": 128000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-5.5-pro"
        }
    },
    "gpt-5.4-nano": {
        "name": "GPT-5.4 nano",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 400000,
            "output": 128000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-5.4-nano"
        }
    },
    "gpt-realtime-2.1": {
        "name": "GPT-Realtime-2.1",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "audio",
                "image"
            ],
            "output": [
                "text",
                "audio"
            ]
        },
        "limit": {
            "context": 128000,
            "output": 32000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-realtime-2.1"
        }
    },
    "gpt-4o-2024-05-13": {
        "name": "GPT-4o (2024-05-13)",
        "tool_call": true,
        "reasoning": false,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 128000,
            "output": 4096
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-4o-2024-05-13"
        }
    },
    "gpt-4o": {
        "name": "GPT-4o",
        "tool_call": true,
        "reasoning": false,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 128000,
            "output": 16384
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-4o"
        }
    },
    "gpt-5-mini": {
        "name": "GPT-5 Mini",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 400000,
            "output": 128000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-5-mini"
        }
    },
    "gpt-5.2-pro": {
        "name": "GPT-5.2 Pro",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 400000,
            "output": 128000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-5.2-pro"
        }
    },
    "o4-mini": {
        "name": "o4-mini",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 200000,
            "output": 100000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#o4-mini"
        }
    },
    "o3-mini": {
        "name": "o3-mini",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": false,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 200000,
            "output": 100000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#o3-mini"
        }
    },
    "gpt-4": {
        "name": "GPT-4",
        "tool_call": true,
        "reasoning": false,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 8192,
            "output": 8192
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-4"
        }
    },
    "gpt-5.3-codex": {
        "name": "GPT-5.3 Codex",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 400000,
            "output": 128000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-5.3-codex"
        }
    },
    "gpt-4.1-nano": {
        "name": "GPT-4.1 nano",
        "tool_call": true,
        "reasoning": false,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1047576,
            "output": 32768
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-4.1-nano"
        }
    },
    "gpt-5-nano": {
        "name": "GPT-5 Nano",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 400000,
            "output": 128000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-5-nano"
        }
    },
    "gpt-5.6": {
        "name": "GPT-5.6",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1050000,
            "output": 128000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-5.6"
        }
    },
    "gpt-5.2-chat-latest": {
        "name": "GPT-5.2 Chat",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 128000,
            "output": 16384
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-5.2-chat-latest"
        }
    },
    "o1": {
        "name": "o1",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 200000,
            "output": 100000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#o1"
        }
    },
    "gpt-5-pro": {
        "name": "GPT-5 Pro",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 400000,
            "output": 272000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-5-pro"
        }
    },
    "gpt-5.3-codex-spark": {
        "name": "GPT-5.3 Codex Spark",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 128000,
            "output": 32000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-5.3-codex-spark"
        }
    },
    "gpt-6.1-sol": {
        "name": "GPT-6.1 Sol",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1050000,
            "output": 128000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-6.1-sol"
        }
    },
    "gpt-4o-2024-08-06": {
        "name": "GPT-4o (2024-08-06)",
        "tool_call": true,
        "reasoning": false,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 128000,
            "output": 16384
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-4o-2024-08-06"
        }
    },
    "gpt-6-astra": {
        "name": "GPT-6 Astra",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1050000,
            "output": 128000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-6-astra"
        }
    },
    "gpt-5.1": {
        "name": "GPT-5.1",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 400000,
            "output": 128000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-5.1"
        }
    },
    "gpt-4o-mini": {
        "name": "GPT-4o mini",
        "tool_call": true,
        "reasoning": false,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 128000,
            "output": 16384
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-4o-mini"
        }
    },
    "o3-pro": {
        "name": "o3-pro",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 200000,
            "output": 100000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#o3-pro"
        }
    },
    "gpt-daybreak-blue-latest": {
        "name": "Daybreak Blue",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1050000,
            "output": 128000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-daybreak-blue-latest"
        }
    },
    "gpt-5.4-mini": {
        "name": "GPT-5.4 mini",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 400000,
            "output": 128000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-5.4-mini"
        }
    },
    "gpt-5.6-luna": {
        "name": "GPT-5.6 Luna",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1050000,
            "output": 128000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-5.6-luna"
        }
    },
    "gpt-5.2": {
        "name": "GPT-5.2",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 400000,
            "output": 128000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-5.2"
        }
    },
    "gpt-5.5": {
        "name": "GPT-5.5",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1050000,
            "output": 128000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-5.5"
        }
    },
    "gpt-4.1": {
        "name": "GPT-4.1",
        "tool_call": true,
        "reasoning": false,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1047576,
            "output": 32768
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-4.1"
        }
    },
    "gpt-4o-2024-11-20": {
        "name": "GPT-4o (2024-11-20)",
        "tool_call": true,
        "reasoning": false,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 128000,
            "output": 16384
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-4o-2024-11-20"
        }
    },
    "gpt-4.1-mini": {
        "name": "GPT-4.1 mini",
        "tool_call": true,
        "reasoning": false,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1047576,
            "output": 32768
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-4.1-mini"
        }
    },
    "gpt-6-luna": {
        "name": "GPT-6 Luna",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1050000,
            "output": 128000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-6-luna"
        }
    },
    "gpt-5.3-chat-latest": {
        "name": "GPT-5.3 Chat (latest)",
        "tool_call": true,
        "reasoning": false,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 128000,
            "output": 16384
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-5.3-chat-latest"
        }
    },
    "gpt-5.6-terra": {
        "name": "GPT-5.6 Terra",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1050000,
            "output": 128000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-5.6-terra"
        }
    },
    "gpt-4-turbo": {
        "name": "GPT-4 Turbo",
        "tool_call": true,
        "reasoning": false,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 128000,
            "output": 4096
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-4-turbo"
        }
    },
    "gpt-daybreak-red-latest": {
        "name": "Daybreak Red",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 400000,
            "output": 128000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-daybreak-red-latest"
        }
    },
    "o3": {
        "name": "o3",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 200000,
            "output": 100000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#o3"
        }
    },
    "gpt-5": {
        "name": "GPT-5",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 400000,
            "output": 128000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-5"
        }
    },
    "gpt-5.6-sol": {
        "name": "GPT-5.6 Sol",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1050000,
            "output": 128000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-5.6-sol"
        }
    },
    "gpt-6-sol": {
        "name": "GPT-6 Sol",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1050000,
            "output": 128000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#gpt-6-sol"
        }
    },
    "o1-pro": {
        "name": "o1-pro",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 200000,
            "output": 100000
        },
        "options": {
            "lmmApi": "openai-responses",
            "lmmSupportedApis": [
                "openai-responses",
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/openai#o1-pro"
        }
    },
    "claude-haiku-4-5": {
        "name": "Claude Haiku 4.5 (latest)",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 200000,
            "output": 64000
        },
        "options": {
            "lmmApi": "anthropic-messages",
            "lmmSupportedApis": [
                "anthropic-messages"
            ],
            "lmmMetadataSource": "https://models.dev/anthropic#claude-haiku-4-5"
        }
    },
    "claude-opus-4-5": {
        "name": "Claude Opus 4.5 (latest)",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 200000,
            "output": 64000
        },
        "options": {
            "lmmApi": "anthropic-messages",
            "lmmSupportedApis": [
                "anthropic-messages"
            ],
            "lmmMetadataSource": "https://models.dev/anthropic#claude-opus-4-5"
        }
    },
    "claude-sonnet-4-5": {
        "name": "Claude Sonnet 4.5 (latest)",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 64000
        },
        "options": {
            "lmmApi": "anthropic-messages",
            "lmmSupportedApis": [
                "anthropic-messages"
            ],
            "lmmMetadataSource": "https://models.dev/anthropic#claude-sonnet-4-5"
        }
    },
    "claude-opus-5-5": {
        "name": "Claude Opus 5.5",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 128000
        },
        "options": {
            "lmmApi": "anthropic-messages",
            "lmmSupportedApis": [
                "anthropic-messages"
            ],
            "lmmMetadataSource": "https://models.dev/anthropic#claude-opus-5-5"
        }
    },
    "claude-fable-5-1": {
        "name": "Claude Fable 5.1",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 128000
        },
        "options": {
            "lmmApi": "anthropic-messages",
            "lmmSupportedApis": [
                "anthropic-messages"
            ],
            "lmmMetadataSource": "https://models.dev/anthropic#claude-fable-5-1"
        }
    },
    "claude-opus-4-5-20251101": {
        "name": "Claude Opus 4.5",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 200000,
            "output": 64000
        },
        "options": {
            "lmmApi": "anthropic-messages",
            "lmmSupportedApis": [
                "anthropic-messages"
            ],
            "lmmMetadataSource": "https://models.dev/anthropic#claude-opus-4-5-20251101"
        }
    },
    "claude-opus-5": {
        "name": "Claude Opus 5",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 128000
        },
        "options": {
            "lmmApi": "anthropic-messages",
            "lmmSupportedApis": [
                "anthropic-messages"
            ],
            "lmmMetadataSource": "https://models.dev/anthropic#claude-opus-5"
        }
    },
    "claude-fable-5": {
        "name": "Claude Fable 5",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 128000
        },
        "options": {
            "lmmApi": "anthropic-messages",
            "lmmSupportedApis": [
                "anthropic-messages"
            ],
            "lmmMetadataSource": "https://models.dev/anthropic#claude-fable-5"
        }
    },
    "claude-opus-4-8": {
        "name": "Claude Opus 4.8",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 128000
        },
        "options": {
            "lmmApi": "anthropic-messages",
            "lmmSupportedApis": [
                "anthropic-messages"
            ],
            "lmmMetadataSource": "https://models.dev/anthropic#claude-opus-4-8"
        }
    },
    "claude-sonnet-4-5-20250929": {
        "name": "Claude Sonnet 4.5",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 64000
        },
        "options": {
            "lmmApi": "anthropic-messages",
            "lmmSupportedApis": [
                "anthropic-messages"
            ],
            "lmmMetadataSource": "https://models.dev/anthropic#claude-sonnet-4-5-20250929"
        }
    },
    "claude-sonnet-5": {
        "name": "Claude Sonnet 5",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 128000
        },
        "options": {
            "lmmApi": "anthropic-messages",
            "lmmSupportedApis": [
                "anthropic-messages"
            ],
            "lmmMetadataSource": "https://models.dev/anthropic#claude-sonnet-5"
        }
    },
    "claude-opus-4-6": {
        "name": "Claude Opus 4.6",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 128000
        },
        "options": {
            "lmmApi": "anthropic-messages",
            "lmmSupportedApis": [
                "anthropic-messages"
            ],
            "lmmMetadataSource": "https://models.dev/anthropic#claude-opus-4-6"
        }
    },
    "claude-haiku-4-5-20251001": {
        "name": "Claude Haiku 4.5",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 200000,
            "output": 64000
        },
        "options": {
            "lmmApi": "anthropic-messages",
            "lmmSupportedApis": [
                "anthropic-messages"
            ],
            "lmmMetadataSource": "https://models.dev/anthropic#claude-haiku-4-5-20251001"
        }
    },
    "claude-sonnet-4-6": {
        "name": "Claude Sonnet 4.6",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 128000
        },
        "options": {
            "lmmApi": "anthropic-messages",
            "lmmSupportedApis": [
                "anthropic-messages"
            ],
            "lmmMetadataSource": "https://models.dev/anthropic#claude-sonnet-4-6"
        }
    },
    "claude-sonnet-5-5": {
        "name": "Claude Sonnet 5.5",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 128000
        },
        "options": {
            "lmmApi": "anthropic-messages",
            "lmmSupportedApis": [
                "anthropic-messages"
            ],
            "lmmMetadataSource": "https://models.dev/anthropic#claude-sonnet-5-5"
        }
    },
    "claude-opus-4-7": {
        "name": "Claude Opus 4.7",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 128000
        },
        "options": {
            "lmmApi": "anthropic-messages",
            "lmmSupportedApis": [
                "anthropic-messages"
            ],
            "lmmMetadataSource": "https://models.dev/anthropic#claude-opus-4-7"
        }
    },
    "deepseek-v4-flash-vision-exp": {
        "name": "DeepSeek V4 Flash Vision Exp",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 393216
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/deepseek#deepseek-v4-flash-vision-exp"
        }
    },
    "deepseek-flash": {
        "name": "DeepSeek V4.1 Flash",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 393216
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/deepseek#deepseek-flash"
        }
    },
    "deepseek-v4-pro": {
        "name": "DeepSeek V4 Pro",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 393216
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/deepseek#deepseek-v4-pro"
        }
    },
    "deepseek-v4-flash": {
        "name": "DeepSeek V4 Flash",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 393216
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/deepseek#deepseek-v4-flash"
        }
    },
    "qwen-flash": {
        "name": "Qwen Flash",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 32768
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen-flash"
        }
    },
    "qwen3.5-flash": {
        "name": "Qwen3.5 Flash",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "video"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 65536
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3.5-flash"
        }
    },
    "qwen3.7-max": {
        "name": "Qwen3.7 Max",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 131072
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3.7-max"
        }
    },
    "qwen2-5-32b-instruct": {
        "name": "Qwen2.5 32B Instruct",
        "tool_call": true,
        "reasoning": false,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 131072,
            "output": 8192
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen2-5-32b-instruct"
        }
    },
    "qwq-plus": {
        "name": "QwQ Plus",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 131072,
            "output": 8192
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwq-plus"
        }
    },
    "qwen2-5-vl-72b-instruct": {
        "name": "Qwen2.5-VL 72B Instruct",
        "tool_call": true,
        "reasoning": false,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 131072,
            "output": 8192
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen2-5-vl-72b-instruct"
        }
    },
    "qwen3-vl-plus": {
        "name": "Qwen3-VL Plus",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 262144,
            "output": 32768
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3-vl-plus"
        }
    },
    "qwen3.5-27b": {
        "name": "Qwen3.5 27B",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "video",
                "audio"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 262144,
            "output": 65536
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3.5-27b"
        }
    },
    "deepseek-v4-flash-0731": {
        "name": "DeepSeek V4 Flash 0731",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 384000
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#deepseek-v4-flash-0731"
        }
    },
    "qwen-max": {
        "name": "Qwen Max",
        "tool_call": true,
        "reasoning": false,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 32768,
            "output": 8192
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen-max"
        }
    },
    "qwen3-next-80b-a3b-thinking": {
        "name": "Qwen3-Next 80B-A3B (Thinking)",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 131072,
            "output": 32768
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3-next-80b-a3b-thinking"
        }
    },
    "qwen3.8-max": {
        "name": "Qwen3.8 Max",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "video",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 131072
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3.8-max"
        }
    },
    "qwen-plus-character-ja": {
        "name": "Qwen Plus Character (Japanese)",
        "tool_call": true,
        "reasoning": false,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 8192,
            "output": 512
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen-plus-character-ja"
        }
    },
    "qwen3.5-plus": {
        "name": "Qwen3.5 Plus",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "video"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 65536
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3.5-plus"
        }
    },
    "qwen2-5-72b-instruct": {
        "name": "Qwen2.5 72B Instruct",
        "tool_call": true,
        "reasoning": false,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 131072,
            "output": 8192
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen2-5-72b-instruct"
        }
    },
    "qwen3-32b": {
        "name": "Qwen3 32B",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 131072,
            "output": 16384
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3-32b"
        }
    },
    "qwen-plus": {
        "name": "Qwen Plus",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 32768
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen-plus"
        }
    },
    "qwen3.7-flash": {
        "name": "Qwen3.7 Flash",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "video"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 131072
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3.7-flash"
        }
    },
    "qwen3-max": {
        "name": "Qwen3 Max",
        "tool_call": true,
        "reasoning": false,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 262144,
            "output": 65536
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3-max"
        }
    },
    "qwen-omni-turbo-realtime": {
        "name": "Qwen-Omni Turbo Realtime",
        "tool_call": true,
        "reasoning": false,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "audio"
            ],
            "output": [
                "text",
                "audio"
            ]
        },
        "limit": {
            "context": 32768,
            "output": 2048
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen-omni-turbo-realtime"
        }
    },
    "qwen3-coder-480b-a35b-instruct": {
        "name": "Qwen3-Coder 480B-A35B Instruct",
        "tool_call": true,
        "reasoning": false,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 262144,
            "output": 65536
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3-coder-480b-a35b-instruct"
        }
    },
    "qwen-turbo": {
        "name": "Qwen Turbo",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 16384
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen-turbo"
        }
    },
    "qwen3-coder-30b-a3b-instruct": {
        "name": "Qwen3-Coder 30B-A3B Instruct",
        "tool_call": true,
        "reasoning": false,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 262144,
            "output": 65536
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3-coder-30b-a3b-instruct"
        }
    },
    "qvq-max": {
        "name": "QVQ Max",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 131072,
            "output": 8192
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qvq-max"
        }
    },
    "qwen2-5-7b-instruct": {
        "name": "Qwen2.5 7B Instruct",
        "tool_call": true,
        "reasoning": false,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 131072,
            "output": 8192
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen2-5-7b-instruct"
        }
    },
    "qwen3-omni-flash": {
        "name": "Qwen3-Omni Flash",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "audio",
                "video"
            ],
            "output": [
                "text",
                "audio"
            ]
        },
        "limit": {
            "context": 65536,
            "output": 16384
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3-omni-flash"
        }
    },
    "qwen-vl-max": {
        "name": "Qwen-VL Max",
        "tool_call": true,
        "reasoning": false,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 131072,
            "output": 8192
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen-vl-max"
        }
    },
    "qwen3-235b-a22b": {
        "name": "Qwen3 235B-A22B",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 131072,
            "output": 16384
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3-235b-a22b"
        }
    },
    "qwen3-vl-30b-a3b": {
        "name": "Qwen3-VL 30B-A3B",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 131072,
            "output": 32768
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3-vl-30b-a3b"
        }
    },
    "qwen3.5-122b-a10b": {
        "name": "Qwen3.5 122B-A10B",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "video",
                "audio"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 262144,
            "output": 65536
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3.5-122b-a10b"
        }
    },
    "qwen3.6-35b-a3b": {
        "name": "Qwen3.6 35B-A3B",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "video",
                "audio"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 262144,
            "output": 65536
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3.6-35b-a3b"
        }
    },
    "qwen3-next-80b-a3b-instruct": {
        "name": "Qwen3-Next 80B-A3B Instruct",
        "tool_call": true,
        "reasoning": false,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 131072,
            "output": 32768
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3-next-80b-a3b-instruct"
        }
    },
    "qwen-vl-plus": {
        "name": "Qwen-VL Plus",
        "tool_call": true,
        "reasoning": false,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 131072,
            "output": 8192
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen-vl-plus"
        }
    },
    "qwen3.6-flash": {
        "name": "Qwen3.6 Flash",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "video"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 65536
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3.6-flash"
        }
    },
    "qwen3-coder-flash": {
        "name": "Qwen3 Coder Flash",
        "tool_call": true,
        "reasoning": false,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 65536
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3-coder-flash"
        }
    },
    "qwen2-5-omni-7b": {
        "name": "Qwen2.5-Omni 7B",
        "tool_call": true,
        "reasoning": false,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "audio",
                "video"
            ],
            "output": [
                "text",
                "audio"
            ]
        },
        "limit": {
            "context": 32768,
            "output": 2048
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen2-5-omni-7b"
        }
    },
    "qwen3-vl-235b-a22b": {
        "name": "Qwen3-VL 235B-A22B",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 131072,
            "output": 32768
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3-vl-235b-a22b"
        }
    },
    "qwen3-coder-plus": {
        "name": "Qwen3 Coder Plus",
        "tool_call": true,
        "reasoning": false,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1048576,
            "output": 65536
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3-coder-plus"
        }
    },
    "qwen2-5-14b-instruct": {
        "name": "Qwen2.5 14B Instruct",
        "tool_call": true,
        "reasoning": false,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 131072,
            "output": 8192
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen2-5-14b-instruct"
        }
    },
    "qwen2-5-vl-7b-instruct": {
        "name": "Qwen2.5-VL 7B Instruct",
        "tool_call": true,
        "reasoning": false,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 131072,
            "output": 8192
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen2-5-vl-7b-instruct"
        }
    },
    "qwen3.5-35b-a3b": {
        "name": "Qwen3.5 35B-A3B",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "video",
                "audio"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 262144,
            "output": 65536
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3.5-35b-a3b"
        }
    },
    "qwen3.6-max-preview": {
        "name": "Qwen3.6 Max Preview",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 262144,
            "output": 65536
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3.6-max-preview"
        }
    },
    "qwen3.5-397b-a17b": {
        "name": "Qwen3.5 397B-A17B",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "video",
                "audio"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 262144,
            "output": 65536
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3.5-397b-a17b"
        }
    },
    "qwen3-8b": {
        "name": "Qwen3 8B",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 131072,
            "output": 8192
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3-8b"
        }
    },
    "glm-5.2": {
        "name": "GLM-5.2",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 131072
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/zhipuai#glm-5.2"
        }
    },
    "qwen-omni-turbo": {
        "name": "Qwen-Omni Turbo",
        "tool_call": true,
        "reasoning": false,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "audio",
                "video"
            ],
            "output": [
                "text",
                "audio"
            ]
        },
        "limit": {
            "context": 32768,
            "output": 2048
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen-omni-turbo"
        }
    },
    "qwen3-omni-flash-realtime": {
        "name": "Qwen3-Omni Flash Realtime",
        "tool_call": true,
        "reasoning": false,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "audio",
                "video"
            ],
            "output": [
                "text",
                "audio"
            ]
        },
        "limit": {
            "context": 65536,
            "output": 16384
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3-omni-flash-realtime"
        }
    },
    "qwen3.6-27b": {
        "name": "Qwen3.6 27B",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "video",
                "audio"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 262144,
            "output": 65536
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3.6-27b"
        }
    },
    "qwen3.6-plus": {
        "name": "Qwen3.6 Plus",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "video"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 65536
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3.6-plus"
        }
    },
    "qwen3-14b": {
        "name": "Qwen3 14B",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 131072,
            "output": 8192
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3-14b"
        }
    },
    "qwen3.7-plus": {
        "name": "Qwen3.7 Plus",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "video"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 131072
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/alibaba#qwen3.7-plus"
        }
    },
    "kimi-k2.7-code-highspeed": {
        "name": "Kimi K2.7 Code HighSpeed",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image",
                "video"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 262144,
            "output": 262144
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/moonshotai#kimi-k2.7-code-highspeed"
        }
    },
    "kimi-k2.6": {
        "name": "Kimi K2.6",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "video"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 262144,
            "output": 262144
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/moonshotai#kimi-k2.6"
        }
    },
    "kimi-k2.7-code": {
        "name": "Kimi K2.7 Code",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": false,
        "modalities": {
            "input": [
                "text",
                "image",
                "video"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 262144,
            "output": 262144
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/moonshotai#kimi-k2.7-code"
        }
    },
    "glm-4.6v": {
        "name": "GLM-4.6V",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "video"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 128000,
            "output": 32768
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/zhipuai#glm-4.6v"
        }
    },
    "glm-4.5": {
        "name": "GLM-4.5",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 131072,
            "output": 98304
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/zhipuai#glm-4.5"
        }
    },
    "glm-5v-turbo": {
        "name": "GLM-5V-Turbo",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "video",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 200000,
            "output": 131072
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/zhipuai#glm-5v-turbo"
        }
    },
    "glm-5.3-flash": {
        "name": "GLM-5.3-Flash",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "video",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 131072
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/zhipuai#glm-5.3-flash"
        }
    },
    "glm-4.6": {
        "name": "GLM-4.6",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 204800,
            "output": 131072
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/zhipuai#glm-4.6"
        }
    },
    "glm-5": {
        "name": "GLM-5",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 204800,
            "output": 131072
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/zhipuai#glm-5"
        }
    },
    "glm-4.6v-flash": {
        "name": "GLM-4.6V-Flash",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "video"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 128000,
            "output": 32768
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/zhipuai#glm-4.6v-flash"
        }
    },
    "glm-4.5v": {
        "name": "GLM-4.5V",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "video"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 64000,
            "output": 16384
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/zhipuai#glm-4.5v"
        }
    },
    "glm-5.3-flashx": {
        "name": "GLM-5.3-FlashX",
        "tool_call": true,
        "reasoning": true,
        "attachment": true,
        "temperature": true,
        "modalities": {
            "input": [
                "text",
                "image",
                "video",
                "pdf"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 131072
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/zhipuai#glm-5.3-flashx"
        }
    },
    "glm-4.7-flash": {
        "name": "GLM-4.7-Flash",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 200000,
            "output": 131072
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/zhipuai#glm-4.7-flash"
        }
    },
    "glm-4.7": {
        "name": "GLM-4.7",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 204800,
            "output": 131072
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/zhipuai#glm-4.7"
        }
    },
    "glm-4.5-flash": {
        "name": "GLM-4.5-Flash",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 131072,
            "output": 98304
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/zhipuai#glm-4.5-flash"
        }
    },
    "glm-5.1": {
        "name": "GLM-5.1",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 200000,
            "output": 131072
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/zhipuai#glm-5.1"
        }
    },
    "glm-4.7-flashx": {
        "name": "GLM-4.7-FlashX",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 200000,
            "output": 131072
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/zhipuai#glm-4.7-flashx"
        }
    },
    "glm-5-turbo": {
        "name": "GLM-5-Turbo",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 200000,
            "output": 131072
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/zai#glm-5-turbo"
        }
    },
    "glm-4.5-air": {
        "name": "GLM-4.5-Air",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 131072,
            "output": 98304
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/zhipuai#glm-4.5-air"
        }
    },
    "glm-5.3": {
        "name": "GLM-5.3",
        "tool_call": true,
        "reasoning": true,
        "attachment": false,
        "temperature": true,
        "modalities": {
            "input": [
                "text"
            ],
            "output": [
                "text"
            ]
        },
        "limit": {
            "context": 1000000,
            "output": 131072
        },
        "options": {
            "lmmApi": "openai-completions",
            "lmmSupportedApis": [
                "openai-completions"
            ],
            "lmmMetadataSource": "https://models.dev/zhipuai#glm-5.3"
        }
    }
};
