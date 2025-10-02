import React from 'react'

type ArrowLeftToLineProps = React.SVGProps<SVGSVGElement> & {
  width?: number
  height?: number
  fill?: string
}

export const ArrowLeftToLine = ({
  width = 15,
  height = 13,
  fill = '#889096',
  ...props
}: ArrowLeftToLineProps) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 15 13"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M0.718018 1.5C0.718018 0.96875 1.15552 0.5 1.71802 0.5C2.24927 0.5 2.71802 0.96875 2.71802 1.5L2.71802 11.5C2.71802 12.0625 2.24927 12.5 1.71802 12.5C1.15552 12.5 0.718018 12.0625 0.718018 11.5L0.718018 1.5ZM4.99927 7.21875C4.59302 6.84375 4.59302 6.1875 4.99927 5.8125L8.99927 1.8125C9.37427 1.40625 10.0305 1.40625 10.4055 1.8125C10.8118 2.1875 10.8118 2.84375 10.4055 3.21875L8.12427 5.5L13.718 5.5C14.2493 5.5 14.718 5.96875 14.718 6.5C14.718 7.0625 14.2493 7.5 13.718 7.5H8.12427L10.4055 9.8125C10.8118 10.1875 10.8118 10.8437 10.4055 11.2187C10.0305 11.625 9.37427 11.625 8.99927 11.2187L4.99927 7.21875Z"
        fill={fill}
      />
    </svg>
  )
}

export default ArrowLeftToLine
