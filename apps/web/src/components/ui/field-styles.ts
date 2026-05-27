/** Inputs — radius and focus follow global UI config CSS variables */
export const fieldStyles = {
  bg: 'bg.input',
  borderWidth: '1px',
  borderColor: 'transparent',
  borderRadius: 'var(--radius-input)',
  color: 'fg',
  _placeholder: { color: 'fg.subtle' },
  _hover: { borderColor: 'border.subtle' },
  _focusVisible: {
    borderColor: 'var(--app-accent)',
    boxShadow: 'none',
    outline: '2px solid',
    outlineColor: 'var(--app-accent)',
    outlineOffset: '0px',
  },
} as const
