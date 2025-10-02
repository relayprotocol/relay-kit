import { type FC } from 'react'
import { Flex, ChainIcon } from '../primitives/index.js'
import {
  FileSignature,
  Shuffle,
  ArrowRightFromLine,
  ArrowLeftToLine
} from '../../icons/index.js'

type StepIconProps = {
  stepId: string
  chainId?: number
}

export const StepIcon: FC<StepIconProps> = ({ stepId, chainId }) => {
  const getIconForStep = () => {
    if (stepId.includes('approve')) {
      return <FileSignature width={14} height={16} fill="currentColor" />
    }
    if (
      stepId.includes('swap') ||
      stepId.includes('deposit') ||
      stepId.includes('send')
    ) {
      if (stepId.includes('same-chain')) {
        return <Shuffle width={16} height={16} fill="currentColor" />
      } else {
        return <ArrowRightFromLine width={14} height={16} fill="currentColor" />
      }
    }
    if (stepId.includes('relay')) {
      return <Shuffle width={16} height={16} fill="currentColor" />
    }
    if (stepId.includes('receive')) {
      return <ArrowLeftToLine width={14} height={16} fill="currentColor" />
    }
    return <ChainIcon chainId={chainId} square={false} width={14} height={16} />
  }

  return (
    <Flex
      css={{
        borderRadius: '100px',
        padding: '8px',
        width: '32px',
        height: '32px',
        gap: '2'
      }}
    >
      {getIconForStep()}
    </Flex>
  )
}
