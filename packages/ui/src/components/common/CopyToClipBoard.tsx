import { type FC, useState } from 'react'
import { Button, Text } from '../primitives/index.js'
import Tooltip from '../primitives/Tooltip.js'
import { useCopyToClipboard } from 'usehooks-ts'
import { AnimatePresence, motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck'
import { faCopy } from '@fortawesome/free-solid-svg-icons/faCopy'

type CopyToClipBoardProps = {
  text: string
}

export const CopyToClipBoard: FC<CopyToClipBoardProps> = ({ text }) => {
  const [value, copy] = useCopyToClipboard()
  const [isCopied, setIsCopied] = useState(false)
  const [open, setOpen] = useState(false)

  const handleCopy = () => {
    copy(text)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 1000)
  }

  return (
    <Tooltip
      align="center"
      side="top"
      open={open}
      content={<Text style="body2">{isCopied ? 'Copied!' : 'Copy'}</Text>}
    >
      <Button
        color="ghost"
        size="none"
        onClick={(e) => {
          e.preventDefault()
          handleCopy()
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onTouchStart={() => {
          handleCopy()
          setOpen(true)
          setTimeout(() => setOpen(false), 1000)
        }}
        css={{ color: 'gray9', _hover: { color: 'gray11' } }}
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.span
            transition={{
              type: 'spring',
              duration: 0.15,
              bounce: 0
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            key={isCopied ? 'Copied' : 'Copy'}
          >
            {isCopied ? (
              <FontAwesomeIcon icon={faCheck} width={16} height={16} />
            ) : (
              <FontAwesomeIcon icon={faCopy} width={16} height={16} />
            )}
          </motion.span>
        </AnimatePresence>
      </Button>
    </Tooltip>
  )
}
