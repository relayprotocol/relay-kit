import type { ReactElement } from 'react'

interface Button {
  color?: string
  background?: string
  hover?: {
    color?: string
    background?: string
  }
}

export interface RelayKitTheme {
  font?: string
  fontHeading?: string
  primaryColor?: string
  focusColor?: string
  subtleBackgroundColor?: string
  subtleBorderColor?: string
  text?: {
    default?: string
    subtle?: string
    error?: string
    success?: string
  }
  buttons?: {
    primary?: Button
    secondary?: Button
    disabled?: {
      color?: string
      background?: string
    }
  }
  input?: {
    background?: string
    borderRadius?: string
    color?: string
  }
  skeleton?: {
    background?: string
  }
  anchor?: {
    color?: string
    hover?: {
      color?: string
    }
  }
  dropdown?: {
    background?: string
    borderRadius?: string
    border?: string
  }
  widget?: {
    background?: string
    borderRadius?: string
    border?: string
    boxShadow?: string
    card?: {
      background?: string
      borderRadius?: string
      border?: string
      gutter?: string
    }
    selector?: {
      background?: string
      hover?: {
        background?: string
      }
    }
    swapCurrencyButtonBorderColor?: string
    swapCurrencyButtonBorderWidth?: string
    swapCurrencyButtonBorderRadius?: string
  }
  modal?: {
    background?: string
    border?: string
    borderRadius?: string
  }
}

export const defaultTheme: RelayKitTheme = {
  font: 'Barlow, -apple-system, Helvetica, sans-serif',
  fontHeading: 'Chivo, -apple-system, Helvetica, sans-serif',
  primaryColor: 'primary9',
  focusColor: 'primary7',
  subtleBackgroundColor: 'gray1',
  subtleBorderColor: 'gray5',
  text: {
    default: 'gray12',
    subtle: 'gray11',
    error: 'red12',
    success: 'green11'
  },
  buttons: {
    primary: {
      background: 'primary9',
      color: 'white',
      hover: {
        background: 'primary10',
        color: 'white'
      }
    },
    secondary: {
      background: 'primary3',
      color: 'primary11',
      hover: {
        background: 'primary4',
        color: 'primary11'
      }
    },
    disabled: {
      color: 'gray11',
      background: 'gray8'
    }
  },
  input: {
    background: 'gray3',
    borderRadius: '8px',
    color: 'gray12'
  },
  skeleton: {
    background: 'gray3'
  },
  anchor: {
    color: 'primary11',
    hover: {
      color: 'primary9'
    }
  },
  dropdown: {
    background: 'gray3',
    borderRadius: '8px'
  },
  widget: {
    background: 'white',
    borderRadius: '16px',
    border: '0x solid white',
    boxShadow: '0px 4px 30px rgba(0, 0, 0, 0.10)',
    card: {
      background: 'gray1',
      borderRadius: '12px'
    },
    selector: {
      background: 'gray2',
      hover: {
        background: 'gray3'
      }
    },
    swapCurrencyButtonBorderColor: 'primary3',
    swapCurrencyButtonBorderWidth: '4px',
    swapCurrencyButtonBorderRadius: '8px'
  },
  modal: {
    background: 'gray1',
    border: '0x solid white',
    borderRadius: '16px'
  }
}
