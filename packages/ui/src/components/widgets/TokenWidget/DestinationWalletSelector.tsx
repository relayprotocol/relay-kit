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
    <Flex align="center" className="relay-w-full relay-gap-2">
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
          className="relay-flex relay-items-center relay-px-2 relay-py-1"
          onClick={fallback.onClick}
        >
          {fallback.showClipboard ? (
            <Box className="relay-text-[color:var(--relay-colors-amber11)]">
              <FontAwesomeIcon icon={faClipboard} width={16} height={16} />
            </Box>
          ) : null}
          <Text
            style="subtitle2"
            className={fallback.highlighted ? 'relay-text-[color:var(--relay-colors-amber11)]' : 'relay-text-[color:var(--relay-colors-anchor-color)]'}
          >
            {fallback.text}
          </Text>
        </Button>
      )}
    </Flex>
  )
}

export type { DestinationWalletSelectorProps }
