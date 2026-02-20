import { type FC, useState } from 'react'
import { Button, Text } from '../primitives/index.js'
import Tooltip from '../primitives/Tooltip.js'
import { useCopyToClipboard } from 'usehooks-ts'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faCopy } from '@fortawesome/free-solid-svg-icons'

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
        className="relay-text-[color:var(--relay-colors-gray9)] hover:relay-text-[color:var(--relay-colors-gray11)]"
      >
        <span className="relay-inline-flex relay-transition-transform relay-duration-150">
          {isCopied ? (
            <FontAwesomeIcon icon={faCheck} width={16} height={16} />
          ) : (
            <FontAwesomeIcon icon={faCopy} width={16} height={16} />
          )}
        </span>
      </Button>
    </Tooltip>
  )
}
