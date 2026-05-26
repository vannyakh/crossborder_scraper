/** Alist-style filled inputs with rounded-lg and blue focus ring */
export const fieldStyles = {
  bg: 'bg.input',
  borderWidth: '1px',
  borderColor: 'transparent',
  borderRadius: 'input',
  color: 'fg',
  _placeholder: { color: 'fg.subtle' },
  _hover: { borderColor: 'border.subtle' },
  _focusVisible: {
    borderColor: 'brand.emphasis',
    boxShadow: 'none',
    outline: '2px solid',
    outlineColor: 'brand.emphasis',
    outlineOffset: '0px',
  },
} as const
