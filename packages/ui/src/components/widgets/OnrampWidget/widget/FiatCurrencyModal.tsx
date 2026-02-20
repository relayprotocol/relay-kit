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
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import Fuse from 'fuse.js'
import useMoonPayCurrencies, {
  type MoonPayFiatCurrency
} from '../../../../hooks/useMoonPayCurrencies.js'
import moonpayFiatCurrencies from '../../../../constants/moonPayFiatCurrencies.js'
import { cn } from '../../../../utils/cn.js'

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
          className="relay-h-[28px] relay-min-h-[28px] relay-w-max relay-shrink-0 relay-overflow-hidden relay-gap-1 relay-flex relay-items-center relay-py-1 relay-px-2 relay-bg-[var(--relay-colors-gray2)] relay-border-none hover:relay-bg-[var(--relay-colors-gray3)]"
        >
          <img
            alt="currency-icon"
            src={fiatCurrency.icon}
            className="relay-w-[16px] relay-h-[16px] relay-rounded-full"
          />
          <Text style="subtitle2" color="subtle">
            {fiatCurrency.code.toUpperCase()}
          </Text>
          <Box className="relay-text-[color:var(--relay-colors-gray9)] relay-w-[14px]">
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
      className="relay-overflow-hidden relay-p-4 relay-max-w-[100vw] !relay-max-h-[450px] relay-h-[450px] sm:!relay-max-w-[400px]"
    >
      <Text
        style="h6"
        className="relay-w-full relay-text-left"
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
        className="relay-flex relay-flex-col relay-w-full relay-gap-1 relay-overflow-y-auto relay-h-[calc(100%-24px)] relay-scroll-pt-[40px]"
      >
        <AccessibleListItem value="input" asChild>
          <Box
            className="relay-sticky relay-py-2 relay-z-[1] relay-top-0 relay-bg-[var(--relay-colors-modal-background)]"
          >
            <Input
              placeholder="Search for a currency"
              icon={
                <Box className="relay-text-[color:var(--relay-colors-gray9)]">
                  <FontAwesomeIcon
                    icon={faMagnifyingGlass}
                    width={16}
                    height={16}
                  />
                </Box>
              }
              containerClassName="relay-w-full"
              style={{ scrollSnapAlign: 'start' }}
              className="relay-w-full relay-h-[40px]"
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
                className={cn(
                  'relay-p-2 relay-flex relay-items-center relay-gap-2 relay-relative',
                  'relay-transition-[backdrop-filter] relay-duration-[250ms] relay-ease-linear',
                  'focus-visible:relay-shadow-[inset_0_0_0_2px_var(--relay-colors-focus-color)]',
                  '[&[data-state=on]]:relay-shadow-[inset_0_0_0_2px_var(--relay-colors-focus-color)]',
                  'active:relay-shadow-[inset_0_0_0_2px_var(--relay-colors-focus-color)]',
                  !active && 'hover:relay-bg-[rgba(128,128,128,0.1)]',
                  i + 1 < (fiatCurrencies?.length ?? 0) ? 'relay-mb-1' : ''
                )}
                style={{ scrollSnapAlign: 'start' }}
              >
                {active ? (
                  <div
                    className="relay-absolute relay-rounded-[8px] relay-top-0 relay-left-0 relay-w-full relay-h-full relay-opacity-[0.15] relay-z-[-1] relay-bg-[var(--relay-colors-primary-color)]"
                  />
                ) : null}
                <Flex align="center" className="relay-gap-2">
                  <img
                    src={currency.icon}
                    alt={`${currency.name} icon`}
                    className="relay-w-[32px] relay-h-[32px] relay-rounded-full"
                  />
                  <Flex
                    className="relay-gap-[2px] relay-text-left"
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
          <Text style="subtitle2" className="relay-text-center relay-py-5">
            No results found.
          </Text>
        ) : null}
      </AccessibleList>
    </Modal>
  )
}

export default FiatCurrencyModal
