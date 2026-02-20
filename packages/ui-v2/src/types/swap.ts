/**
 * Whether the user is specifying an exact input amount or an expected output amount.
 * EXACT_INPUT: "I want to swap exactly X of token A"
 * EXPECTED_OUTPUT: "I want to receive exactly Y of token B"
 */
export type TradeType = 'EXACT_INPUT' | 'EXPECTED_OUTPUT'
