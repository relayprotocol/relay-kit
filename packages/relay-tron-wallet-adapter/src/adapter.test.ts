import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TronWeb, utils } from 'tronweb'
import {
  createClient,
  MAINNET_RELAY_API,
  type TransactionStepItem
} from '@relayprotocol/relay-sdk'

import { adaptTronWallet } from './adapter.js'

const { txJsonToPb, txPbToRawDataHex, txPbToTxID } = utils.transaction

const OWNER = '41' + '11'.repeat(20)
const CONTRACT = '41a614f803b6fd780986a42c78ec9c7f77e6ded13c'
const ATTACKER = '41' + '22'.repeat(20)
const CALLDATA = 'a9059cbb' + '00'.repeat(64)
const CALL_VALUE = 1_000_000

const STEP_ITEM = {
  status: 'incomplete',
  data: {
    parameter: {
      owner_address: OWNER,
      contract_address: CONTRACT,
      data: `0x${CALLDATA}`,
      call_value: CALL_VALUE
    }
  }
} as unknown as TransactionStepItem

// A reply whose raw_data_hex and txID are consistent with its own contents
const makeReply = (
  contract: { type: string; parameter: { value: Record<string, unknown> } },
  rawData: Record<string, unknown> = {}
) => {
  const transaction = {
    visible: false,
    raw_data: {
      contract: [
        {
          ...contract,
          parameter: {
            ...contract.parameter,
            type_url: `type.googleapis.com/protocol.${contract.type}`
          }
        }
      ],
      ref_block_bytes: 'abcd',
      ref_block_hash: '0123456789abcdef',
      expiration: 1_800_000_000_000,
      timestamp: 1_799_999_940_000,
      fee_limit: 30_000_000,
      ...rawData
    }
  } as any
  const pb = txJsonToPb(transaction)
  transaction.raw_data_hex = txPbToRawDataHex(pb)
  transaction.txID = txPbToTxID(pb).replace(/^0x/, '')
  return { result: { result: true }, transaction }
}

const trigger = (value: Record<string, unknown> = {}) => ({
  type: 'TriggerSmartContract',
  parameter: {
    value: {
      owner_address: OWNER,
      contract_address: CONTRACT,
      data: CALLDATA,
      call_value: CALL_VALUE,
      ...value
    }
  }
})

const setup = (reply: unknown) => {
  const tronWeb = new TronWeb({ fullHost: 'http://127.0.0.1' })
  const request = vi
    .spyOn(tronWeb.fullNode, 'request')
    .mockResolvedValue(reply as any)
  const sign = vi
    .spyOn(tronWeb.trx, 'sign')
    .mockImplementation(async (tx: any) => ({ ...tx, signature: ['00'] }))
  const broadcast = vi
    .spyOn(tronWeb.trx, 'sendRawTransaction')
    .mockImplementation(
      async (tx: any) => ({ result: true, txid: tx.txID }) as any
    )
  const wallet = adaptTronWallet(OWNER, tronWeb)
  const send = () =>
    wallet.handleSendTransactionStep(728126428, STEP_ITEM, {} as any)
  return { request, sign, broadcast, send }
}

describe('adaptTronWallet handleSendTransactionStep', () => {
  beforeEach(() => {
    createClient({ baseApiUrl: MAINNET_RELAY_API })
  })

  it('signs and broadcasts a reply that matches the request', async () => {
    const reply = makeReply(trigger())
    const { request, sign, broadcast, send } = setup(reply)

    await expect(send()).resolves.toBe(reply.transaction.txID)
    expect(request).toHaveBeenCalledWith(
      'wallet/triggersmartcontract',
      expect.objectContaining({
        owner_address: OWNER,
        contract_address: CONTRACT,
        data: CALLDATA,
        call_value: CALL_VALUE,
        fee_limit: 30_000_000
      }),
      'post'
    )
    expect(sign).toHaveBeenCalledOnce()
    expect(broadcast).toHaveBeenCalledOnce()
  })

  it.each([
    ['changed calldata', makeReply(trigger({ data: 'deadbeef' }))],
    ['changed call value', makeReply(trigger({ call_value: 999_000_000 }))],
    ['changed fee limit', makeReply(trigger(), { fee_limit: 1_000_000_000 })],
    ['added memo', makeReply(trigger(), { data: '6869' })],
    [
      'a TRX transfer',
      makeReply({
        type: 'TransferContract',
        parameter: {
          value: { owner_address: OWNER, to_address: ATTACKER, amount: 1 }
        }
      })
    ],
    [
      'a permission update',
      makeReply({
        type: 'AccountPermissionUpdateContract',
        parameter: {
          value: {
            owner_address: OWNER,
            owner: {
              type: 0,
              permission_name: 'owner',
              threshold: 1,
              keys: [{ address: ATTACKER, weight: 1 }]
            },
            actives: [
              {
                type: 2,
                permission_name: 'active',
                threshold: 1,
                operations:
                  '7fff1fc0033e0000000000000000000000000000000000000000000000000000',
                keys: [{ address: ATTACKER, weight: 1 }]
              }
            ]
          }
        }
      })
    ]
  ])('refuses %s before signing', async (_, reply) => {
    const { sign, broadcast, send } = setup(reply)

    await expect(send()).rejects.toThrow('Invalid transaction')
    expect(sign).not.toHaveBeenCalled()
    expect(broadcast).not.toHaveBeenCalled()
  })

  it('surfaces the node error message', async () => {
    const { sign, send } = setup({
      result: { result: false, message: Buffer.from('REVERT').toString('hex') }
    })

    await expect(send()).rejects.toThrow('REVERT')
    expect(sign).not.toHaveBeenCalled()
  })
})
