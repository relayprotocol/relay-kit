import { type FC } from 'react'
import { Flex, Box, Text } from '../../primitives/index.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClock, faGasPump } from '@fortawesome/free-solid-svg-icons'

const TransactionDetailsFooter: FC = () => (
  <Flex justify="center" align="center" css={{ gap: '6px', width: '100%' }}>
    <Flex align="center" css={{ gap: '1' }}>
      <Box css={{ color: 'green9', width: 14, height: 14 }}>
        <FontAwesomeIcon icon={faClock} />
      </Box>
      <Text style="subtitle2">~5s</Text>
    </Flex>
    <Flex justify="center" align="center" css={{ color: 'gray6', height: 4 }}>
      &#8226;
    </Flex>
    <Flex align="center" css={{ gap: '1' }}>
      <Box css={{ color: 'gray9', width: 14, height: 14 }}>
        <FontAwesomeIcon icon={faGasPump} />
      </Box>
      <Text style="subtitle2">~$0.001</Text>
    </Flex>
  </Flex>
)

export default TransactionDetailsFooter
