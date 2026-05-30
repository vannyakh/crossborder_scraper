import { Box, Code, Link, List, Table, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'code'; lang: string; code: string }
  | { kind: 'table'; headers: string[]; rows: string[][] }

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

function isTableSeparator(line: string): boolean {
  return /^\|?[\s:-]+\|[\s|:-]+\|?$/.test(line.trim())
}

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      i += 1
      continue
    }

    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim()
      const codeLines: string[] = []
      i += 1
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i += 1
      }
      blocks.push({ kind: 'code', lang, code: codeLines.join('\n') })
      i += 1
      continue
    }

    if (trimmed.startsWith('#')) {
      const match = trimmed.match(/^(#{1,6})\s+(.+)$/)
      if (match) {
        blocks.push({ kind: 'heading', level: match[1].length, text: match[2] })
        i += 1
        continue
      }
    }

    if (trimmed.startsWith('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headers = parseTableRow(trimmed)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(parseTableRow(lines[i]))
        i += 1
      }
      blocks.push({ kind: 'table', headers, rows })
      continue
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''))
        i += 1
      }
      blocks.push({ kind: 'ul', items })
      continue
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''))
        i += 1
      }
      blocks.push({ kind: 'ol', items })
      continue
    }

    const paraLines: string[] = [trimmed]
    i += 1
    while (i < lines.length) {
      const next = lines[i].trim()
      if (
        !next ||
        next.startsWith('#') ||
        next.startsWith('```') ||
        next.startsWith('|') ||
        /^[-*]\s+/.test(next) ||
        /^\d+\.\s+/.test(next)
      ) {
        break
      }
      paraLines.push(next)
      i += 1
    }
    blocks.push({ kind: 'paragraph', text: paraLines.join(' ') })
  }

  return blocks
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = []
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let partIndex = 0

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    const token = match[0]
    const key = `${keyPrefix}-${partIndex++}`
    if (token.startsWith('`')) {
      parts.push(
        <Code key={key} fontSize="xs" px={1.5} py={0.5} borderRadius="sm">
          {token.slice(1, -1)}
        </Code>,
      )
    } else if (token.startsWith('**')) {
      parts.push(
        <Text key={key} as="span" fontWeight="semibold">
          {token.slice(2, -2)}
        </Text>,
      )
    } else if (token.startsWith('*') || token.startsWith('_')) {
      parts.push(
        <Text key={key} as="span" fontStyle="italic">
          {token.slice(1, -1)}
        </Text>,
      )
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      if (linkMatch) {
        parts.push(
          <Link
            key={key}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            color="blue.500"
          >
            {linkMatch[1]}
          </Link>,
        )
      }
    }
    lastIndex = match.index + token.length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }
  return parts.length ? parts : [text]
}

const headingSize: Record<number, string> = {
  1: 'lg',
  2: 'md',
  3: 'sm',
  4: 'sm',
  5: 'xs',
  6: 'xs',
}

export function MarkdownContent({
  source,
  compact = false,
}: {
  source: string
  compact?: boolean
}) {
  const blocks = parseBlocks(source)

  return (
    <Box
      className={['markdown-prose', compact ? 'markdown-prose--compact' : '']
        .filter(Boolean)
        .join(' ')}
      fontSize={compact ? 'xs' : 'sm'}
      color={compact ? 'inherit' : 'fg.muted'}
      lineHeight={compact ? '1.45' : 'tall'}
    >
      {blocks.map((block, index) => {
        const key = `md-${index}`
        if (block.kind === 'heading') {
          return (
            <Text
              key={key}
              as={`h${Math.min(block.level, 6)}` as 'h1'}
              fontSize={headingSize[block.level] ?? 'sm'}
              fontWeight="semibold"
              color={compact ? 'inherit' : 'fg'}
              mt={compact ? (index === 0 ? 0 : 2) : block.level <= 2 ? (index === 0 ? 0 : 5) : 4}
              mb={compact ? 1 : 2}
            >
              {renderInline(block.text, key)}
            </Text>
          )
        }
        if (block.kind === 'paragraph') {
          return (
            <Text key={key} mb={compact ? 1.5 : 3}>
              {renderInline(block.text, key)}
            </Text>
          )
        }
        if (block.kind === 'ul') {
          return (
            <List.Root key={key} as="ul" ps={5} mb={3} gap={1.5}>
              {block.items.map((item, itemIndex) => (
                <List.Item key={`${key}-${itemIndex}`}>
                  {renderInline(item, `${key}-${itemIndex}`)}
                </List.Item>
              ))}
            </List.Root>
          )
        }
        if (block.kind === 'ol') {
          return (
            <List.Root key={key} as="ol" ps={5} mb={3} gap={1.5}>
              {block.items.map((item, itemIndex) => (
                <List.Item key={`${key}-${itemIndex}`}>
                  {renderInline(item, `${key}-${itemIndex}`)}
                </List.Item>
              ))}
            </List.Root>
          )
        }
        if (block.kind === 'code') {
          return (
            <Box
              key={key}
              as="pre"
              mb={3}
              p={3}
              borderRadius="var(--radius-input)"
              borderWidth="1px"
              borderColor="border.subtle"
              bg="bg.input"
              overflowX="auto"
              fontSize="xs"
              fontFamily="mono"
              whiteSpace="pre-wrap"
            >
              {block.code}
            </Box>
          )
        }
        return (
          <Box key={key} mb={4} overflowX="auto">
            <Table.Root size="sm" variant="outline">
              <Table.Header>
                <Table.Row>
                  {block.headers.map((header) => (
                    <Table.ColumnHeader key={header}>{header}</Table.ColumnHeader>
                  ))}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {block.rows.map((row, rowIndex) => (
                  <Table.Row key={`${key}-row-${rowIndex}`}>
                    {row.map((cell, cellIndex) => (
                      <Table.Cell key={`${key}-cell-${cellIndex}`}>
                        {renderInline(cell, `${key}-cell-${cellIndex}`)}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        )
      })}
    </Box>
  )
}
