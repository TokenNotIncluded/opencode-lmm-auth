import type { Model } from '@opencode-ai/sdk';

// Exact vendor reference rates from the reviewed models.dev snapshot used for
// the bundled capability profiles. These are local UI estimates only: LMM
// catalog pricing and settlement remain authoritative, especially for dynamic
// or expression-based billing.
export const referenceCosts: Readonly<Record<string, Model['cost']>> = {
  "gpt-5.4": {
    "input": 2.5,
    "output": 15,
    "cache": {
      "read": 0.25,
      "write": 0
    }
  },
  "gpt-5.4-pro": {
    "input": 30,
    "output": 180,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "gpt-5.5-pro": {
    "input": 30,
    "output": 180,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "gpt-5.4-nano": {
    "input": 0.2,
    "output": 1.25,
    "cache": {
      "read": 0.02,
      "write": 0
    }
  },
  "gpt-realtime-2.1": {
    "input": 4,
    "output": 24,
    "cache": {
      "read": 0.4,
      "write": 0
    }
  },
  "gpt-4o-2024-05-13": {
    "input": 5,
    "output": 15,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "gpt-4o": {
    "input": 2.5,
    "output": 10,
    "cache": {
      "read": 1.25,
      "write": 0
    }
  },
  "gpt-5-mini": {
    "input": 0.25,
    "output": 2,
    "cache": {
      "read": 0.025,
      "write": 0
    }
  },
  "gpt-5.2-pro": {
    "input": 21,
    "output": 168,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "o4-mini": {
    "input": 1.1,
    "output": 4.4,
    "cache": {
      "read": 0.275,
      "write": 0
    }
  },
  "o3-mini": {
    "input": 1.1,
    "output": 4.4,
    "cache": {
      "read": 0.55,
      "write": 0
    }
  },
  "gpt-4": {
    "input": 30,
    "output": 60,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "gpt-5.3-codex": {
    "input": 1.75,
    "output": 14,
    "cache": {
      "read": 0.175,
      "write": 0
    }
  },
  "gpt-4.1-nano": {
    "input": 0.1,
    "output": 0.4,
    "cache": {
      "read": 0.025,
      "write": 0
    }
  },
  "gpt-5-nano": {
    "input": 0.05,
    "output": 0.4,
    "cache": {
      "read": 0.005,
      "write": 0
    }
  },
  "gpt-5.6": {
    "input": 4,
    "output": 20,
    "cache": {
      "read": 0.4,
      "write": 5
    }
  },
  "o1": {
    "input": 15,
    "output": 60,
    "cache": {
      "read": 7.5,
      "write": 0
    }
  },
  "gpt-5-pro": {
    "input": 15,
    "output": 120,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "gpt-5.3-codex-spark": {
    "input": 1.75,
    "output": 14,
    "cache": {
      "read": 0.175,
      "write": 0
    }
  },
  "gpt-6.1-sol": {
    "input": 2,
    "output": 10,
    "cache": {
      "read": 0.1,
      "write": 2.5
    }
  },
  "gpt-4o-2024-08-06": {
    "input": 2.5,
    "output": 10,
    "cache": {
      "read": 1.25,
      "write": 0
    }
  },
  "gpt-6-astra": {
    "input": 10,
    "output": 50,
    "cache": {
      "read": 1,
      "write": 12.5
    }
  },
  "gpt-5.1": {
    "input": 1.25,
    "output": 10,
    "cache": {
      "read": 0.125,
      "write": 0
    }
  },
  "gpt-4o-mini": {
    "input": 0.15,
    "output": 0.6,
    "cache": {
      "read": 0.075,
      "write": 0
    }
  },
  "o3-pro": {
    "input": 20,
    "output": 80,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "gpt-daybreak-blue-latest": {
    "input": 4,
    "output": 20,
    "cache": {
      "read": 0.4,
      "write": 5
    }
  },
  "gpt-5.4-mini": {
    "input": 0.75,
    "output": 4.5,
    "cache": {
      "read": 0.075,
      "write": 0
    }
  },
  "gpt-5.6-luna": {
    "input": 0.2,
    "output": 1.2,
    "cache": {
      "read": 0.02,
      "write": 0.25
    }
  },
  "gpt-5.2": {
    "input": 1.75,
    "output": 14,
    "cache": {
      "read": 0.175,
      "write": 0
    }
  },
  "gpt-5.5": {
    "input": 5,
    "output": 30,
    "cache": {
      "read": 0.5,
      "write": 0
    }
  },
  "gpt-4.1": {
    "input": 2,
    "output": 8,
    "cache": {
      "read": 0.5,
      "write": 0
    }
  },
  "gpt-4o-2024-11-20": {
    "input": 2.5,
    "output": 10,
    "cache": {
      "read": 1.25,
      "write": 0
    }
  },
  "gpt-4.1-mini": {
    "input": 0.4,
    "output": 1.6,
    "cache": {
      "read": 0.1,
      "write": 0
    }
  },
  "gpt-6-luna": {
    "input": 0.1,
    "output": 0.5,
    "cache": {
      "read": 0.01,
      "write": 0.125
    }
  },
  "gpt-5.6-terra": {
    "input": 2,
    "output": 12,
    "cache": {
      "read": 0.2,
      "write": 2.5
    }
  },
  "gpt-4-turbo": {
    "input": 10,
    "output": 30,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "gpt-daybreak-red-latest": {
    "input": 12.5,
    "output": 75,
    "cache": {
      "read": 1.25,
      "write": 15.625
    }
  },
  "o3": {
    "input": 2,
    "output": 8,
    "cache": {
      "read": 0.5,
      "write": 0
    }
  },
  "gpt-5": {
    "input": 1.25,
    "output": 10,
    "cache": {
      "read": 0.125,
      "write": 0
    }
  },
  "gpt-5.6-sol": {
    "input": 4,
    "output": 20,
    "cache": {
      "read": 0.4,
      "write": 5
    }
  },
  "gpt-6-sol": {
    "input": 2,
    "output": 10,
    "cache": {
      "read": 0.2,
      "write": 2.5
    }
  },
  "o1-pro": {
    "input": 150,
    "output": 600,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "claude-haiku-4-5": {
    "input": 1,
    "output": 5,
    "cache": {
      "read": 0.1,
      "write": 1.25
    }
  },
  "claude-opus-4-5": {
    "input": 5,
    "output": 25,
    "cache": {
      "read": 0.5,
      "write": 6.25
    }
  },
  "claude-sonnet-4-5": {
    "input": 3,
    "output": 15,
    "cache": {
      "read": 0.3,
      "write": 3.75
    }
  },
  "claude-opus-5-5": {
    "input": 4,
    "output": 20,
    "cache": {
      "read": 0.2,
      "write": 5
    }
  },
  "claude-fable-5-1": {
    "input": 10,
    "output": 50,
    "cache": {
      "read": 0.25,
      "write": 12.5
    }
  },
  "claude-opus-4-5-20251101": {
    "input": 5,
    "output": 25,
    "cache": {
      "read": 0.5,
      "write": 6.25
    }
  },
  "claude-opus-5": {
    "input": 5,
    "output": 25,
    "cache": {
      "read": 0.5,
      "write": 6.25
    }
  },
  "claude-fable-5": {
    "input": 10,
    "output": 50,
    "cache": {
      "read": 1,
      "write": 12.5
    }
  },
  "claude-opus-4-8": {
    "input": 5,
    "output": 25,
    "cache": {
      "read": 0.5,
      "write": 6.25
    }
  },
  "claude-sonnet-4-5-20250929": {
    "input": 3,
    "output": 15,
    "cache": {
      "read": 0.3,
      "write": 3.75
    }
  },
  "claude-sonnet-5": {
    "input": 2,
    "output": 10,
    "cache": {
      "read": 0.2,
      "write": 2.5
    }
  },
  "claude-opus-4-6": {
    "input": 5,
    "output": 25,
    "cache": {
      "read": 0.5,
      "write": 6.25
    }
  },
  "claude-haiku-4-5-20251001": {
    "input": 1,
    "output": 5,
    "cache": {
      "read": 0.1,
      "write": 1.25
    }
  },
  "claude-sonnet-4-6": {
    "input": 3,
    "output": 15,
    "cache": {
      "read": 0.3,
      "write": 3.75
    }
  },
  "claude-sonnet-5-5": {
    "input": 2,
    "output": 10,
    "cache": {
      "read": 0.1,
      "write": 2.5
    }
  },
  "claude-opus-4-7": {
    "input": 5,
    "output": 25,
    "cache": {
      "read": 0.5,
      "write": 6.25
    }
  },
  "deepseek-v4-flash-vision-exp": {
    "input": 0.15,
    "output": 0.6,
    "cache": {
      "read": 0.003,
      "write": 0
    }
  },
  "deepseek-flash": {
    "input": 0.15,
    "output": 0.6,
    "cache": {
      "read": 0.003,
      "write": 0
    }
  },
  "deepseek-v4-pro": {
    "input": 0.66,
    "output": 1.98,
    "cache": {
      "read": 0.022,
      "write": 0
    }
  },
  "deepseek-v4-flash": {
    "input": 0.15,
    "output": 0.6,
    "cache": {
      "read": 0.003,
      "write": 0
    }
  },
  "qwen-flash": {
    "input": 0.05,
    "output": 0.4,
    "cache": {
      "read": 0.01,
      "write": 0.0625
    }
  },
  "qwen3.5-flash": {
    "input": 0.1,
    "output": 0.4,
    "cache": {
      "read": 0.01,
      "write": 0.125
    }
  },
  "qwen3.7-max": {
    "input": 2.5,
    "output": 7.5,
    "cache": {
      "read": 0.5,
      "write": 3.125
    }
  },
  "qwq-plus": {
    "input": 0.8,
    "output": 2.4,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "qwen3-vl-plus": {
    "input": 0.2,
    "output": 1.6,
    "cache": {
      "read": 0.04,
      "write": 0.25
    }
  },
  "qwen3.5-27b": {
    "input": 0.3,
    "output": 2.4,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "deepseek-v4-flash-0731": {
    "input": 0.44,
    "output": 1.32,
    "cache": {
      "read": 0.088,
      "write": 0
    }
  },
  "qwen-max": {
    "input": 1.6,
    "output": 6.4,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "qwen3-next-80b-a3b-thinking": {
    "input": 0.5,
    "output": 6,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "qwen3.8-max": {
    "input": 2,
    "output": 6,
    "cache": {
      "read": 0.25,
      "write": 2.5
    }
  },
  "qwen-plus-character-ja": {
    "input": 0.5,
    "output": 1.4,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "qwen3.5-plus": {
    "input": 0.4,
    "output": 2.4,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "qwen3-32b": {
    "input": 0.7,
    "output": 2.8,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "qwen-plus": {
    "input": 0.4,
    "output": 1.2,
    "cache": {
      "read": 0.08,
      "write": 0.5
    }
  },
  "qwen3.7-flash": {
    "input": 0.03,
    "output": 0.13,
    "cache": {
      "read": 0.006,
      "write": 0.0375
    }
  },
  "qwen3-max": {
    "input": 1.2,
    "output": 6,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "qwen-omni-turbo-realtime": {
    "input": 0.27,
    "output": 1.07,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "qwen3-coder-480b-a35b-instruct": {
    "input": 1.5,
    "output": 7.5,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "qwen-turbo": {
    "input": 0.05,
    "output": 0.2,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "qwen3-coder-30b-a3b-instruct": {
    "input": 0.45,
    "output": 2.25,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "qvq-max": {
    "input": 1.2,
    "output": 4.8,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "qwen3-omni-flash": {
    "input": 0.43,
    "output": 1.66,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "qwen-vl-max": {
    "input": 0.8,
    "output": 3.2,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "qwen3-235b-a22b": {
    "input": 0.7,
    "output": 2.8,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "qwen3-vl-30b-a3b": {
    "input": 0.2,
    "output": 0.8,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "qwen3.5-122b-a10b": {
    "input": 0.4,
    "output": 3.2,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "qwen3.6-35b-a3b": {
    "input": 0.375,
    "output": 2.25,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "qwen3-next-80b-a3b-instruct": {
    "input": 0.5,
    "output": 2,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "qwen-vl-plus": {
    "input": 0.21,
    "output": 0.63,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "qwen3.6-flash": {
    "input": 0.25,
    "output": 1.5,
    "cache": {
      "read": 0.025,
      "write": 0.3125
    }
  },
  "qwen3-coder-flash": {
    "input": 0.3,
    "output": 1.5,
    "cache": {
      "read": 0.06,
      "write": 0.375
    }
  },
  "qwen2-5-omni-7b": {
    "input": 0.1,
    "output": 0.4,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "qwen3-vl-235b-a22b": {
    "input": 0.7,
    "output": 2.8,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "qwen3-coder-plus": {
    "input": 1,
    "output": 5,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "qwen3.5-35b-a3b": {
    "input": 0.25,
    "output": 2,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "qwen3.6-max-preview": {
    "input": 1.3,
    "output": 7.8,
    "cache": {
      "read": 0.13,
      "write": 1.625
    }
  },
  "qwen3.5-397b-a17b": {
    "input": 0.6,
    "output": 3.6,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "qwen3-8b": {
    "input": 0.18,
    "output": 0.7,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "glm-5.2": {
    "input": 1.19516,
    "output": 4.18306,
    "cache": {
      "read": 0.29879,
      "write": 0
    }
  },
  "qwen-omni-turbo": {
    "input": 0.07,
    "output": 0.27,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "qwen3-omni-flash-realtime": {
    "input": 0.52,
    "output": 1.99,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "qwen3.6-27b": {
    "input": 0.6,
    "output": 3.6,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "qwen3.6-plus": {
    "input": 0.5,
    "output": 3,
    "cache": {
      "read": 0.05,
      "write": 0.625
    }
  },
  "qwen3-14b": {
    "input": 0.35,
    "output": 1.4,
    "cache": {
      "read": 0,
      "write": 0
    }
  },
  "qwen3.7-plus": {
    "input": 0.4,
    "output": 1.6,
    "cache": {
      "read": 0.08,
      "write": 0.5
    }
  },
  "kimi-k2.7-code-highspeed": {
    "input": 1.9,
    "output": 8,
    "cache": {
      "read": 0.38,
      "write": 0
    }
  },
  "kimi-k2.6": {
    "input": 0.95,
    "output": 4,
    "cache": {
      "read": 0.16,
      "write": 0
    }
  },
  "kimi-k2.7-code": {
    "input": 0.95,
    "output": 4,
    "cache": {
      "read": 0.19,
      "write": 0
    }
  },
  "glm-4.6v": {
    "input": 0.1494,
    "output": 0.44819,
    "cache": {
      "read": 0.02988,
      "write": 0
    }
  },
  "glm-4.5": {
    "input": 0.6,
    "output": 2.2,
    "cache": {
      "read": 0.11,
      "write": 0
    }
  },
  "glm-5v-turbo": {
    "input": 0.74698,
    "output": 3.28669,
    "cache": {
      "read": 0.17927,
      "write": 0
    }
  },
  "glm-5.3-flash": {
    "input": 0.11952,
    "output": 0.41831,
    "cache": {
      "read": 0.03436,
      "write": 0
    }
  },
  "glm-4.6": {
    "input": 0.6,
    "output": 2.2,
    "cache": {
      "read": 0.11,
      "write": 0
    }
  },
  "glm-5": {
    "input": 0.59758,
    "output": 2.68911,
    "cache": {
      "read": 0.1494,
      "write": 0
    }
  },
  "glm-4.5v": {
    "input": 0.29879,
    "output": 0.89637,
    "cache": {
      "read": 0.05976,
      "write": 0
    }
  },
  "glm-5.3-flashx": {
    "input": 0.29879,
    "output": 1.04577,
    "cache": {
      "read": 0.08516,
      "write": 0
    }
  },
  "glm-4.7": {
    "input": 0.44819,
    "output": 2.09153,
    "cache": {
      "read": 0.08964,
      "write": 0
    }
  },
  "glm-5.1": {
    "input": 0.89637,
    "output": 3.58548,
    "cache": {
      "read": 0.19421,
      "write": 0
    }
  },
  "glm-4.7-flashx": {
    "input": 0.0747,
    "output": 0.44819,
    "cache": {
      "read": 0.01494,
      "write": 0
    }
  },
  "glm-5-turbo": {
    "input": 1.2,
    "output": 4,
    "cache": {
      "read": 0.24,
      "write": 0
    }
  },
  "glm-4.5-air": {
    "input": 0.11952,
    "output": 0.89637,
    "cache": {
      "read": 0.0239,
      "write": 0
    }
  },
  "glm-5.3": {
    "input": 1.19516,
    "output": 4.18306,
    "cache": {
      "read": 0.29879,
      "write": 0
    }
  }
};
