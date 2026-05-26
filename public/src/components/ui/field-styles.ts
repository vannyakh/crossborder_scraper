/** Shared rounded input styles — theme-aware via semantic tokens */
export const fieldStyles = {
  bg: 'bg.input',
  borderWidth: '1px',
  borderColor: 'border.subtle',
  borderRadius: 'input',
  color: 'fg',
  _placeholder: { color: 'fg.subtle' },
  _focusVisible: {
    borderColor: 'brand.emphasis',
    boxShadow: '0 0 0 2px var(--chakra-colors-purple-200)',
    outline: 'none',
  },
} as const
