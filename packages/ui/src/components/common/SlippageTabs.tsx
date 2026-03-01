import type { FC } from 'react'
import type { ChangeEvent } from 'react'
import { Button, Flex, Input, Text, Box } from '../primitives/index.js'
import {
  TabsRoot,
  TabsList,
  TabsTrigger,
  TabsContent
} from '../primitives/Tabs.js'
import type { SlippageToleranceMode } from '../../utils/slippage.js'
import { useMediaQuery } from 'usehooks-ts'

export type SlippageTabsProps = {
  mode: SlippageToleranceMode
  setMode: (mode: SlippageToleranceMode) => void
  displayValue: string | undefined
  setDisplayValue: (value: string | undefined) => void
  handleInputChange: (value: string) => void
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  handleClose: () => void
  slippageRating: string | undefined
  slippageRatingColor: string | undefined
  inputRef: React.RefObject<HTMLInputElement | null>
  widgetType?: 'token' | 'swap'
}

export const SlippageTabs: FC<SlippageTabsProps> = ({
  mode,
  setMode,
  displayValue,
  setDisplayValue,
  handleInputChange,
  handleKeyDown,
  handleClose,
  slippageRating,
  slippageRatingColor,
  inputRef,
  widgetType
}) => {
  const isMobile = useMediaQuery('(max-width: 520px)')
  const isTokenWidget = widgetType === 'token'
  return (
    <TabsRoot
      value={mode}
      onValueChange={(value) => {
        setMode(value as SlippageToleranceMode)
        if (value === 'Auto') {
          setDisplayValue(undefined)
        }
      }}
      css={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        gap: isTokenWidget ? '4px' : '3',
        sm: {
          gap: isTokenWidget ? '4px' : '2'
        }
      }}
    >
      <TabsList css={{ width: '100%' }}>
        <TabsTrigger value="Auto" css={{ width: '50%' }}>
          Auto
        </TabsTrigger>
        <TabsTrigger value="Custom" css={{ width: '50%' }}>
          Custom
        </TabsTrigger>
      </TabsList>

      <TabsContent value="Auto" css={{ width: '100%' }}>
        <Text
          style={isTokenWidget ? 'body3' : 'body2'}
          color="subtle"
          css={
            isTokenWidget
              ? { lineHeight: 'normal', fontSize: '12px' }
              : { lineHeight: '14px', sm: { fontSize: '12px' } }
          }
        >
          We'll set the slippage automatically to minimize the failure rate.
        </Text>
      </TabsContent>

      <TabsContent
        value="Custom"
        css={{
          display: 'flex',
          width: '100%',
          overflow: 'hidden',
          flexDirection: 'column',
          gap: '1'
        }}
      >
        {/* Mobile shortcut buttons */}
        <Flex
          css={{
            display: 'none',
            smDown: {
              display: 'flex',
              width: '100%',
              gap: '2',
              mb: '2'
            }
          }}
        >
          <Button
            color="ghost"
            size="small"
            css={{
              flex: 1,
              minHeight: 32,
              backgroundColor: 'gray3',
              fontWeight: 500,
              fontSize: 14,
              py: 2,
              borderRadius: '6px',
              justifyContent: 'center',
              '&:hover': {
                backgroundColor: 'gray5'
              }
            }}
            onClick={() => handleInputChange('1')}
          >
            1%
          </Button>
          <Button
            color="ghost"
            size="small"
            css={{
              flex: 1,
              minHeight: 32,
              backgroundColor: 'gray3',
              fontWeight: 500,
              fontSize: 14,
              py: 2,
              borderRadius: '6px',
              justifyContent: 'center',
              '&:hover': {
                backgroundColor: 'gray5'
              }
            }}
            onClick={() => handleInputChange('2')}
          >
            2%
          </Button>
          <Button
            color="ghost"
            size="small"
            css={{
              flex: 1,
              minHeight: 32,
              backgroundColor: 'gray3',
              fontWeight: 500,
              fontSize: 14,
              py: 2,
              borderRadius: '6px',
              justifyContent: 'center',
              '&:hover': {
                backgroundColor: 'gray5'
              }
            }}
            onClick={() => handleInputChange('5')}
          >
            5%
          </Button>
        </Flex>

        <Flex css={{ display: 'flex', width: '100%', position: 'relative' }}>
          <Input
            ref={inputRef}
            value={displayValue || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleInputChange(e.target.value)
            }
            onKeyDown={handleKeyDown}
            onBlur={handleClose}
            onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
              // Move cursor to end of input on focus for better mobile UX
              if (isMobile) {
                const input = e.target
                setTimeout(() => {
                  input.setSelectionRange(
                    input.value.length,
                    input.value.length
                  )
                }, 0)
              }
            }}
            placeholder="2"
            containerCss={{
              width: '100%'
            }}
            css={{
              height: '36px',
              pr: '28px !important',
              border: 'none',
              textAlign: 'right',
              width: '100%',
              smDown: {
                backgroundColor: 'transparent',
                '--borderColor': 'colors.gray.5',
                border: '1px solid var(--borderColor)'
              },
              color: slippageRatingColor
            }}
          />
          <Box
            css={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              color: slippageRatingColor
            }}
          >
            %
          </Box>
        </Flex>

        {slippageRating === 'very-high' ? (
          <Text style="body3" css={{ color: 'red11' }}>
            Very high slippage
          </Text>
        ) : null}
        {slippageRating === 'high' ? (
          <Text style="body3" css={{ color: 'amber11' }}>
            High slippage
          </Text>
        ) : null}
      </TabsContent>
    </TabsRoot>
  )
}
