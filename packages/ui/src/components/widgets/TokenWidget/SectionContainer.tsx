import { type FC, type PropsWithChildren } from 'react'
import { Flex } from '../../primitives/index.js'
import { type Styles } from '@relayprotocol/relay-design-system/css'

const SectionContainer: FC<
  PropsWithChildren & { css?: Styles; id?: string }
> = ({ children, css, id }) => {
  return (
    <Flex
      align="center"
      justify="between"
      id={id}
      css={{
        width: '100%',
        minWidth: '400px',
        maxWidth: '400px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'start',
        backgroundColor: 'widget-card-background',
        border: 'widget-card-border',
        gap: '4',
        p: '16px',
        borderRadius: 'widget-card-border-radius',
        ...css
      }}
    >
      {children}
    </Flex>
  )
}

export default SectionContainer
