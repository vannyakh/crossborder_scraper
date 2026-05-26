import { Box, Button, HStack, Link, Text, VStack } from '@chakra-ui/react'
import { motion } from 'motion/react'
import { FadeIn } from '../components/motion/FadeIn'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel, PanelBody } from '../components/ui/Panel'
import { useDeleteFileMutation, useFilesQuery } from '../hooks'
import { formatBytes } from '../lib/utils'

const MotionBox = motion.create(Box)

export function FilesPage() {
  const { data, isLoading, error, refetch } = useFilesQuery()
  const deleteMutation = useDeleteFileMutation()

  const items = data?.items ?? []
  const outputDir = data?.output_dir ?? 'data/output'
  const err = error ? String((error as Error).message || error) : ''

  async function remove(path: string) {
    if (!confirm(`Delete ${path}?`)) return
    await deleteMutation.mutateAsync(path)
  }

  return (
    <VStack align="stretch" gap={5}>
      <PageHeader
        title="Output files"
        description={`JSON and HTML artifacts under ${outputDir}.`}
        action={
          <Button
            size="sm"
            variant="outline"
            borderColor="border.subtle"
            onClick={() => void refetch()}
            loading={isLoading}
          >
            Refresh
          </Button>
        }
      />

      <FadeIn>
        <Panel>
          <PanelBody>
            {err ? (
              <Text fontSize="sm" color="red.400" mb={3}>
                {err}
              </Text>
            ) : null}

            <VStack align="stretch" gap={2}>
              {items.map((f, i) => (
                <MotionBox
                  key={f.path}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  p={3}
                  borderRadius="card"
                  borderWidth="1px"
                  borderColor="border.subtle"
                  bg="bg.elevated"
                >
                  <HStack justify="space-between" align="flex-start" gap={3}>
                    <Box flex={1} minW={0}>
                      <Text fontFamily="mono" fontSize="sm">
                        {f.path}
                      </Text>
                      <Text fontSize="xs" color="fg.subtle" mt={1}>
                        {f.kind} · {formatBytes(f.size_bytes)} ·{' '}
                        {new Date(f.modified_at).toLocaleString()}
                      </Text>
                    </Box>
                    <HStack gap={2} flexShrink={0}>
                      <Link href={`/files/${f.path}`} target="_blank" rel="noreferrer">
                        <Button size="xs" variant="outline" colorPalette="purple">
                          Open
                        </Button>
                      </Link>
                      <Button
                        size="xs"
                        variant="outline"
                        colorPalette="red"
                        loading={deleteMutation.isPending}
                        onClick={() => void remove(f.path)}
                      >
                        Delete
                      </Button>
                    </HStack>
                  </HStack>
                </MotionBox>
              ))}
            </VStack>

            {items.length === 0 && !isLoading ? (
              <Text fontSize="sm" color="fg.muted" mt={2}>
                No output files yet.
              </Text>
            ) : null}
          </PanelBody>
        </Panel>
      </FadeIn>
    </VStack>
  )
}
