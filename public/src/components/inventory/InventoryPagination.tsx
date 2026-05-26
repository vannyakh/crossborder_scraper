import { Button, HStack, NativeSelect } from '@chakra-ui/react'
import { SubtitleText } from '../ui/Section'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { buildPageNumbers, INVENTORY_PAGE_SIZE_OPTIONS } from './inventory-list-utils'

export function InventoryPagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}) {
  const accentPalette = useAccentPalette()
  const pageNumbers = buildPageNumbers(page, totalPages)
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  if (total === 0) return null

  return (
    <HStack
      mt={4}
      pt={4}
      borderTopWidth="1px"
      borderColor="border.subtle"
      justify="space-between"
      flexWrap="wrap"
      gap={3}
      fontSize="sm"
    >
      <SubtitleText>
        Showing {from}–{to} of {total}
      </SubtitleText>
      <HStack gap={2} flexWrap="wrap">
        <Button
          size="xs"
          variant="outline"
          borderColor="border.subtle"
          borderRadius="input"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          ‹
        </Button>
        {pageNumbers.map((n) => (
          <Button
            key={n}
            size="xs"
            variant={n === page ? 'solid' : 'outline'}
            colorPalette={n === page ? accentPalette : undefined}
            borderColor="border.subtle"
            borderRadius="input"
            onClick={() => onPageChange(n)}
          >
            {n}
          </Button>
        ))}
        <Button
          size="xs"
          variant="outline"
          borderColor="border.subtle"
          borderRadius="input"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          ›
        </Button>
        <NativeSelect.Root size="xs" w="auto">
          <NativeSelect.Field
            value={String(pageSize)}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            borderRadius="var(--radius-input)"
          >
            {INVENTORY_PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </NativeSelect.Field>
        </NativeSelect.Root>
      </HStack>
    </HStack>
  )
}
