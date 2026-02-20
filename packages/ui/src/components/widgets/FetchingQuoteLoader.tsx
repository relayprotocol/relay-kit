import { type FC } from 'react'
import { Flex, Text } from '../primitives/index.js'
import { LoadingSpinner } from '../common/LoadingSpinner.js'
import { cn } from '../../utils/cn.js'

type Props = {
  isLoading: boolean
  containerClassName?: string
}

const FetchingQuoteLoader: FC<Props> = ({ isLoading, containerClassName }) => {
  if (!isLoading) {
    return null
  }

  return (
    <Flex
      align="center"
      className={cn(
        'relay-gap-[14px] relay-mb-3 relay-mt-1 relay-py-3 relay-mx-auto',
        containerClassName
      )}
    >
      <LoadingSpinner className="relay-h-4 relay-w-4" />
      <Text style="subtitle2">Fetching the best price</Text>
    </Flex>
  )
}

export default FetchingQuoteLoader
