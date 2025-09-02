import React from 'react'

type XIconProps = React.HTMLAttributes<SVGElement> & {
  width?: number | string
  height?: number | string
  fill?: string
}

export const XIcon = ({
  width = 10,
  height = 10,
  fill = 'currentColor',
  ...props
}: XIconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 16 15"
      fill={fill}
      {...props}
    >
      <g clip-path="url(#clip0_690_7509)">
        <path
          d="M12.449 0.5H14.8134L9.64897 6.44222L15.7467 14.5H10.9556L7.22231 9.61556L2.92897 14.5H0.564529L6.10231 8.15333L0.253418 0.5H5.16897L8.56008 4.98L12.449 0.5ZM11.609 13.0689H12.9156L4.45342 1.83778H3.02231L11.609 13.0689Z"
          fill={fill}
        />
      </g>
      <defs>
        <clipPath id="clip0_690_7509">
          <rect
            width="15.4933"
            height="14"
            fill="white"
            transform="translate(0.253418 0.5)"
          />
        </clipPath>
      </defs>
    </svg>
  )
}
