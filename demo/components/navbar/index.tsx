import { FC } from 'react'
import Link from 'next/link'
import { ThemeSwitcher } from './ThemeSwitcher'
import { BaseApiSwitcher } from './BaseApiSwitcher'
import { ConnectButton } from 'components/ConnectButton'

export const Navbar: FC = () => {
  return (
    <header className="demo-navbar">
      <Link href="/" className="demo-brand">
        <img src="/relay-mark.svg" alt="" />
        Relay Kit
        <span className="demo-badge">Demo</span>
      </Link>
      <div className="demo-navbar-actions">
        <BaseApiSwitcher />
        <ThemeSwitcher />
        <ConnectButton />
      </div>
    </header>
  )
}
