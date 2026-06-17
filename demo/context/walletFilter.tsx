import React, { createContext, useContext, useState, ReactNode } from 'react'

interface WalletFilterContextState {
  walletFilter?: 'EVM' | 'SOL' | 'ECLIPSE' | 'BTC' | 'SUI' | 'TRON' | 'TON'
  setWalletFilter: (
    value: 'EVM' | 'SOL' | 'BTC' | 'ECLIPSE' | 'SUI' | 'TRON' | 'TON' | undefined
  ) => void
}

const WalletFilterContext = createContext<WalletFilterContextState | undefined>(
  undefined
)

export const WalletFilterProvider: React.FC<{ children: ReactNode }> = ({
  children
}) => {
  const [walletFilter, setWalletFilter] = useState<
    'EVM' | 'SOL' | 'ECLIPSE' | 'BTC' | 'SUI' | 'TRON' | 'TON' | undefined
  >(undefined)

  return (
    <WalletFilterContext.Provider value={{ walletFilter, setWalletFilter }}>
      {children}
    </WalletFilterContext.Provider>
  )
}

// Custom hook to use the context
export const useWalletFilter = () => {
  const context = useContext(WalletFilterContext)
  if (!context) {
    throw new Error('useWalletFilter must be used within a WalletFilterContext')
  }
  return context
}
