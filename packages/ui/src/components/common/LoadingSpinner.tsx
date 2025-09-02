import { useContext, type FC, type SVGProps } from 'react'
import {
  cva,
  css as designCss,
  type Styles
} from '@relayprotocol/relay-design-system/css'
import { ProviderOptionsContext } from '../../providers/RelayKitProvider.js'

const SpinnerSVG: FC<SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg
      width="21"
      height="20"
      viewBox="0 0 21 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M12.375 1.875C12.375 2.92969 11.5156 3.75 10.5 3.75C9.44531 3.75 8.625 2.92969 8.625 1.875C8.625 0.859375 9.44531 0 10.5 0C11.5156 0 12.375 0.859375 12.375 1.875ZM12.375 18.125C12.375 19.1797 11.5156 20 10.5 20C9.44531 20 8.625 19.1797 8.625 18.125C8.625 17.1094 9.44531 16.25 10.5 16.25C11.5156 16.25 12.375 17.1094 12.375 18.125ZM0.5 10C0.5 8.98438 1.32031 8.125 2.375 8.125C3.39062 8.125 4.25 8.98438 4.25 10C4.25 11.0547 3.39062 11.875 2.375 11.875C1.32031 11.875 0.5 11.0547 0.5 10ZM20.5 10C20.5 11.0547 19.6406 11.875 18.625 11.875C17.5703 11.875 16.75 11.0547 16.75 10C16.75 8.98438 17.5703 8.125 18.625 8.125C19.6406 8.125 20.5 8.98438 20.5 10ZM3.39062 17.0703C2.6875 16.3672 2.6875 15.1562 3.39062 14.4531C4.13281 13.7109 5.34375 13.7109 6.04688 14.4531C6.78906 15.1562 6.78906 16.3672 6.04688 17.0703C5.34375 17.8125 4.13281 17.8125 3.39062 17.0703ZM6.04688 5.58594C5.34375 6.32812 4.13281 6.32812 3.39062 5.58594C2.6875 4.88281 2.6875 3.67188 3.39062 2.92969C4.13281 2.22656 5.34375 2.22656 6.04688 2.92969C6.78906 3.67188 6.78906 4.88281 6.04688 5.58594ZM14.9141 14.4531C15.6172 13.7109 16.8281 13.7109 17.5703 14.4531C18.2734 15.1562 18.2734 16.3672 17.5703 17.0703C16.8281 17.8125 15.6172 17.8125 14.9141 17.0703C14.1719 16.3672 14.1719 15.1562 14.9141 14.4531Z" />
    </svg>
  )
}

const LoadingSpinnerCss = cva({
  base: {
    animation: 'spin 1s linear infinite',
    fill: 'primary-color'
  }
})

export const LoadingSpinner: FC<{ css?: Styles }> = ({ css }) => {
  const providerOptionsContext = useContext(ProviderOptionsContext)
  if (providerOptionsContext.loader) {
    return (
      <div className={designCss(css)}>
        {providerOptionsContext.loader({
          width: (css as any)?.width ?? 20,
          height: (css as any)?.height ?? 20,
          fill: (css as any)?.fill
        })}
      </div>
    )
  }

  return (
    <SpinnerSVG
      className={designCss(LoadingSpinnerCss.raw(), designCss.raw(css))}
    />
  )
}
