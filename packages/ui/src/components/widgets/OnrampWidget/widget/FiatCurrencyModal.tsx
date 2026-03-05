import { useMemo, useState, type FC } from 'react'
import {
  AccessibleList,
  AccessibleListItem,
  Box,
  Button,
  Flex,
  Input,
  Text
} from '../../../primitives/index.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons/faChevronDown'
import { Modal } from '../../../../components/common/Modal.js'
import type { FiatCurrency } from '../../../../types/index.js'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons/faMagnifyingGlass'
import Fuse from 'fuse.js'
import useMoonPayCurrencies, {
  type MoonPayFiatCurrency
} from '../../../../hooks/useMoonPayCurrencies.js'
import moonpayFiatCurrencies from '../../../../constants/moonPayFiatCurrencies.js'

type Props = {
  moonPayApiKey: string
  fiatCurrency: FiatCurrency
  setFiatCurrency: (fiatCurrency: FiatCurrency) => void
}

const fuseSearchOptions = {
  includeScore: true,
  includeMatches: true,
  threshold: 0.2,
  keys: ['name', 'code']
}

const FiatCurrencyModal: FC<Props> = ({
  moonPayApiKey,
  fiatCurrency,
  setFiatCurrency
}) => {
  const [open, setOpen] = useState(false)
  const [currencySearchInput, setCurrencySearchInput] = useState('')
  const { data: moonPayCurrencies } = useMoonPayCurrencies(
    {
      apiKey: moonPayApiKey
    },
    {
      staleTime: 1000 * 60 * 60 * 24, //1 day
      retryDelay: 1000 * 60 * 60 * 10 //10 minutes
    }
  )

  const fiatCurrencies = useMemo(() => {
    if (moonPayCurrencies && moonPayCurrencies.length > 0) {
      return moonPayCurrencies
        .filter((currency) => currency.type === 'fiat')
        .map((currency) => {
          const fiatCurrency = currency as MoonPayFiatCurrency
          return {
            name: fiatCurrency.name,
            code: fiatCurrency.code,
            minAmount: fiatCurrency.minBuyAmount,
            icon: fiatCurrency.icon
          }
        })
    } else {
      return moonpayFiatCurrencies
    }
  }, [moonPayCurrencies])

  const sortedFiatCurrencies = useMemo(
    () => fiatCurrencies?.sort((a, b) => a.name.localeCompare(b.name)) ?? [],
    [fiatCurrencies]
  )
  const currenciesFuse = new Fuse(sortedFiatCurrencies, fuseSearchOptions)
  const filteredCurrencies = useMemo(() => {
    if (currencySearchInput.trim() !== '') {
      return currenciesFuse
        .search(currencySearchInput)
        .map((result) => result.item)
    } else {
      return sortedFiatCurrencies
    }
  }, [currencySearchInput, currenciesFuse])

  return (
    <Modal
      trigger={
        <Button
          color="white"
          corners="pill"
          css={{
            height: 28,
            minHeight: 28,
            width: 'max-content',
            flexShrink: 0,
            overflow: 'hidden',
            gap: '1',
            display: 'flex',
            alignItems: 'center',
            py: '1',
            px: '2',
            backgroundColor: 'gray2',
            border: 'none',
            _hover: {
              backgroundColor: 'gray3'
            }
          }}
        >
          <img
            alt="currency-icon"
            src={fiatCurrency.icon}
            style={{ width: 16, height: 16, borderRadius: '50%' }}
          />
          <Text style="subtitle2" color="subtle">
            {fiatCurrency.code.toUpperCase()}
          </Text>
          <Box css={{ color: 'gray9', width: 14 }}>
            <FontAwesomeIcon icon={faChevronDown} width={14} />
          </Box>
        </Button>
      }
      open={open}
      onOpenChange={(open) => {
        if (open) {
          // onAnalyticEvent?.(EventNames.ONRAMP_MODAL_OPEN)
        } else {
          // onAnalyticEvent?.(EventNames.ONRAMP_MODAL_CLOSE)
        }
        setOpen(open)
      }}
      css={{
        overflow: 'hidden',
        p: '4',
        maxWidth: '100vw',
        maxHeight: '450px !important',
        height: 450,
        sm: {
          maxWidth: '400px !important'
        }
      }}
    >
      <Text
        style="h6"
        css={{
          width: '100%',
          textAlign: 'left'
        }}
      >
        Select a currency
      </Text>
      <AccessibleList
        onSelect={(value) => {
          if (value && value !== 'input') {
            const selectedCurrency = sortedFiatCurrencies?.find(
              (currency) => currency.code === value
            )
            if (selectedCurrency) {
              setFiatCurrency(selectedCurrency)
            }
            setOpen(false)
          }
        }}
        css={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          gap: '1',
          height: 'calc(100% - 24px)',
          overflowY: 'auto',
          scrollPaddingTop: '40px'
        }}
      >
        <AccessibleListItem value="input" asChild>
          <Box
            css={{
              bg: 'modal-background',
              position: 'sticky',
              py: '2',
              zIndex: 1,
              top: 0
            }}
          >
            <Input
              placeholder="Search for a currency"
              icon={
                <Box css={{ color: 'gray9' }}>
                  <FontAwesomeIcon
                    icon={faMagnifyingGlass}
                    width={16}
                    height={16}
                  />
                </Box>
              }
              containerCss={{
                width: '100%',
                height: 40,
                scrollSnapAlign: 'start'
              }}
              css={{
                width: '100%',
                _placeholder_parent: {
                  textOverflow: 'ellipsis'
                }
              }}
              value={currencySearchInput}
              onChange={(e) => {
                setCurrencySearchInput((e.target as HTMLInputElement).value)
              }}
            />
          </Box>
        </AccessibleListItem>
        {filteredCurrencies.map((currency, i) => {
          const active = fiatCurrency.code === currency.code
          return (
            <AccessibleListItem
              key={currency.code}
              value={currency.code}
              asChild
            >
              <Button
                color="ghost"
                size="none"
                css={{
                  scrollSnapAlign: 'start',
                  p: '2',
                  mb: i + 1 < (fiatCurrencies?.length ?? 0) ? '1' : 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2',
                  position: 'relative',
                  ...(active && {
                    _before: {
                      content: '""',
                      position: 'absolute',
                      borderRadius: 8,
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0.15,
                      backgroundColor: 'primary-color',
                      zIndex: -1
                    }
                  }),
                  transition: 'backdrop-filter 250ms linear',
                  _hover: {
                    backgroundColor: active ? '' : 'gray/10'
                  },
                  '--focusColor': 'colors.focus-color',
                  _focusVisible: {
                    boxShadow: 'inset 0 0 0 2px var(--focusColor)'
                  },
                  '&[data-state="on"]': {
                    boxShadow: 'inset 0 0 0 2px var(--focusColor)'
                  },
                  _active: {
                    boxShadow: 'inset 0 0 0 2px var(--focusColor)'
                  },
                  _focusWithin: {
                    boxShadow: 'inset 0 0 0 2px var(--focusColor)'
                  }
                }}
              >
                <Flex align="center" css={{ gap: '2' }}>
                  <img
                    src={currency.icon}
                    alt={`${currency.name} icon`}
                    style={{ width: 32, height: 32, borderRadius: '50%' }}
                  />
                  <Flex
                    css={{ gap: '2px', textAlign: 'left' }}
                    direction="column"
                  >
                    <Text style="subtitle2">{currency.name}</Text>
                    <Text style="body3" color="subtle">
                      {currency.code.toUpperCase()}
                    </Text>
                  </Flex>
                </Flex>
              </Button>
            </AccessibleListItem>
          )
        })}
        {/* Empty State */}
        {filteredCurrencies.length === 0 ? (
          <Text style="subtitle2" css={{ textAlign: 'center', py: '5' }}>
            No results found.
          </Text>
        ) : null}
      </AccessibleList>
    </Modal>
  )
}

export default FiatCurrencyModal
