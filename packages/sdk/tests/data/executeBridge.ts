import { type Execute } from "../../src/types";

export const executeBridge: Execute = {
    "steps": [
        {
            "id": "deposit",
            "action": "Confirm transaction in your wallet",
            "description": "Deposit funds for executing the calls",
            "kind": "transaction",
            "items": [
                {
                    "status": "incomplete",
                    "data": {
                        "from": "0x03508bB71268BBA25ECaCC8F620e01866650532c",
                        "to": "0xa5f565650890fba1824ee0f21ebbbf660a179934",
                        "data": "0x01a25f8d",
                        "value": "1001599368867232",
                        "maxFeePerGas": "19138328136",
                        "maxPriorityFeePerGas": "3244774195",
                        "gas": "10000",
                        "chainId": 1
                    },
                    "check": {
                        "endpoint": "/intents/status?requestId=0xec4f03fa91d82bc02ced9174632e001c52c47b4417098d00f4eb2022dcd4c414",
                        "method": "GET"
                    }
                }
            ],
            "requestId": "0xabc"
        }
    ],
    "fees": {
        "gas": {
            "currency": {
                "chainId": 1,
                "address": "0x0000000000000000000000000000000000000000",
                "symbol": "ETH",
                "name": "Ether",
                "decimals": 18,
                "metadata": {
                    "logoURI": "https://assets.relay.link/icons/1/light.png",
                    "verified": true,
                    "isNative": true
                }
            },
            "amount": "349951520050000",
            "amountFormatted": "0.00034995152005",
            "amountUsd": "1.141885"
        },
        "relayer": {
            "currency": {
                "chainId": 1,
                "address": "0x0000000000000000000000000000000000000000",
                "symbol": "ETH",
                "name": "Ether",
                "decimals": 18,
                "metadata": {
                    "logoURI": "https://assets.relay.link/icons/1/light.png",
                    "verified": true,
                    "isNative": true
                }
            },
            "amount": "1599368867232",
            "amountFormatted": "0.000001599368867232",
            "amountUsd": "0.005219"
        },
        "relayerGas": {
            "currency": {
                "chainId": 1,
                "address": "0x0000000000000000000000000000000000000000",
                "symbol": "ETH",
                "name": "Ether",
                "decimals": 18,
                "metadata": {
                    "logoURI": "https://assets.relay.link/icons/1/light.png",
                    "verified": true,
                    "isNative": true
                }
            },
            "amount": "1599368867232",
            "amountFormatted": "0.000001599368867232",
            "amountUsd": "0.005219"
        },
        "relayerService": {
            "currency": {
                "chainId": 1,
                "address": "0x0000000000000000000000000000000000000000",
                "symbol": "ETH",
                "name": "Ether",
                "decimals": 18,
                "metadata": {
                    "logoURI": "https://assets.relay.link/icons/1/light.png",
                    "verified": true,
                    "isNative": true
                }
            },
            "amount": "0",
            "amountFormatted": "0.0",
            "amountUsd": "0.000000"
        },
        "app": {
            "currency": {
                "chainId": 1,
                "address": "0x0000000000000000000000000000000000000000",
                "symbol": "ETH",
                "name": "Ether",
                "decimals": 18,
                "metadata": {
                    "logoURI": "https://assets.relay.link/icons/1/light.png",
                    "verified": true,
                    "isNative": true
                }
            },
            "amount": "0",
            "amountFormatted": "0.0",
            "amountUsd": "0.000000"
        }
    },
    "breakdown": [
        {
            "value": "1000000000000000",
            "timeEstimate": 12
        }
    ],
    "details": {
        "sender": "0x03508bB71268BBA25ECaCC8F620e01866650532c",
        "recipient": "0x03508bB71268BBA25ECaCC8F620e01866650532c",
        "currencyIn": {
            "currency": {
                "chainId": 1,
                "address": "0x0000000000000000000000000000000000000000",
                "symbol": "ETH",
                "name": "Ether",
                "decimals": 18,
                "metadata": {
                    "logoURI": "https://assets.relay.link/icons/1/light.png",
                    "verified": true,
                    "isNative": true
                }
            },
            "amount": "1001599368867232",
            "amountFormatted": "0.001001599368867232",
            "amountUsd": "3.268199"
        },
        "currencyOut": {
            "currency": {
                "chainId": 8453,
                "address": "0x0000000000000000000000000000000000000000",
                "symbol": "ETH",
                "name": "Ether",
                "decimals": 18,
                "metadata": {
                    "logoURI": "https://assets.relay.link/icons/1/light.png",
                    "verified": true,
                    "isNative": true
                }
            },
            "amount": "1000000000000000",
            "amountFormatted": "0.001",
            "amountUsd": "3.268120"
        },
        "totalImpact": {
            "usd": "-0.000079",
            "percent": "-0.00"
        },
        "swapImpact": {
            "usd": "0.005140",
            "percent": "0.16"
        },
        "rate": "1",
        "slippageTolerance": {
            "origin": {
                "usd": "0.000000",
                "value": "0",
                "percent": "0"
            },
            "destination": {
                "usd": "0.000000",
                "value": "0",
                "percent": "0"
            }
        }
    }
}