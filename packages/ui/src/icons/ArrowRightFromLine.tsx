import React from 'react'

type ArrowRightFromLineProps = React.SVGProps<SVGSVGElement> & {
  width?: number
  height?: number
  fill?: string
}

export const ArrowRightFromLine = ({
  width = 15,
  height = 13,
  fill = '#5A45DF',
  ...props
}: ArrowRightFromLineProps) => {
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
        d="M2.71802 1.5L2.71802 11.5C2.71802 12.0625 2.24927 12.5 1.71802 12.5C1.15552 12.5 0.718018 12.0625 0.718018 11.5L0.718018 1.5C0.718018 0.96875 1.15552 0.5 1.71802 0.5C2.24927 0.5 2.71802 0.96875 2.71802 1.5ZM14.4055 7.21875L10.4055 11.2187C10.0305 11.625 9.37427 11.625 8.99927 11.2187C8.59302 10.8437 8.59302 10.1875 8.99927 9.8125L11.2805 7.5L5.71802 7.5C5.15552 7.5 4.71802 7.0625 4.71802 6.5C4.71802 5.96875 5.15552 5.5 5.71802 5.5L11.2805 5.5L8.99927 3.21875C8.59302 2.84375 8.59302 2.1875 8.99927 1.8125C9.37427 1.40625 10.0305 1.40625 10.4055 1.8125L14.4055 5.8125C14.8118 6.1875 14.8118 6.84375 14.4055 7.21875Z"
        fill={fill}
      />
    </svg>
  )
}

export default ArrowRightFromLine
