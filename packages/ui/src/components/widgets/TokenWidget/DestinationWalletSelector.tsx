import type { FC } from 'react'
import { Flex, Text, Button, Box } from '../../primitives/index.js'
import {
  MultiWalletDropdown,
  type MultiWalletDropdownProps
} from '../../common/MultiWalletDropdown.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClipboard } from '@fortawesome/free-solid-svg-icons'

type DestinationWalletSelectorProps = {
  label: string
  isMultiWalletEnabled: boolean
  walletSupported: boolean
  dropdownProps: Omit<MultiWalletDropdownProps, 'context'>
  fallback: {
    highlighted: boolean
    text: string
    onClick: () => void
    showClipboard?: boolean
  }
}

export const DestinationWalletSelector: FC<DestinationWalletSelectorProps> = ({
  label,
  isMultiWalletEnabled,
  walletSupported,
  dropdownProps,
  fallback
}) => {
  return (
    <Flex align="center" css={{ width: '100%', gap: '2' }}>
      <Text style="subtitle2" color="subtle">
        {label}
      </Text>
      {isMultiWalletEnabled && walletSupported ? (
        <MultiWalletDropdown context="destination" {...dropdownProps} />
      ) : (
        <Button
          color={fallback.highlighted ? 'warning' : 'secondary'}
          corners="pill"
          size="none"
          css={{
            display: 'flex',
            alignItems: 'center',
            px: '2',
            py: '1'
          }}
          onClick={fallback.onClick}
        >
          {fallback.showClipboard ? (
            <Box css={{ color: 'amber11' }}>
              <FontAwesomeIcon icon={faClipboard} width={16} height={16} />
            </Box>
          ) : null}
          <Text
            style="subtitle2"
            css={{
              color: fallback.highlighted ? 'amber11' : 'anchor-color'
            }}
          >
            {fallback.text}
          </Text>
        </Button>
      )}
    </Flex>
  )
}

export type { DestinationWalletSelectorProps }
