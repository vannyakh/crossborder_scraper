import {
  Box,
  Button,
  Field,
  FileUpload,
  Float,
  Grid,
  HStack,
  IconButton,
  Input,
  Separator,
  Slider,
  Switch,
  Text,
  VStack,
  useFileUploadContext,
} from '@chakra-ui/react'
import { Image, Monitor, Moon, Sun, X } from 'lucide-react'
import { useRef } from 'react'
import { notifyError } from '../../lib/toast'
import { useThemeActions } from '../../hooks/use-theme-actions'
import { useUiConfig } from '../../hooks/use-ui-config'
import {
  defaultThemeConfig,
  pageTransitionOptions,
  motionSpeedOptions,
  type ColorMode,
  type RadiusScale,
  type FontScale,
  type Density,
  type PageTransitionStyle,
  type MotionSpeed,
} from '../../theme/config'
import {
  DEFAULT_LOGIN_BACKGROUND,
  DEFAULT_LOGIN_PATH_BACKGROUND_URL,
  DEFAULT_PANEL_FAVICON_URL,
  DEFAULT_PANEL_LOGO_URL,
  hasCustomLoginBackgroundImage,
  THEME_COLOR_PRESETS,
  THEME_STYLE_OPTIONS,
  type LoginBackgroundConfig,
} from '../../theme/panel-appearance'
import type { PanelSettingsForm } from './use-panel-settings-form'
import { Section, SectionCard, SubtitleText } from '../ui/Section'
import { fieldStyles } from '../ui/field-styles'

const PANEL_IMAGE_MAX_BYTES = 2 * 1024 * 1024

function readImageFile(file: File, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > maxBytes) {
      reject(new Error(`File must be under ${Math.round(maxBytes / 1024 / 1024)}MB`))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function ThemePickCard({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={`theme-pick-card${active ? ' is-active' : ''}`}
      onClick={onClick}
    >
      {active ? <span className="theme-pick-card__dot" aria-hidden /> : null}
      <div className="theme-pick-card__content">{children}</div>
      <div className="theme-pick-card__label">{label}</div>
    </button>
  )
}

function SettingBlock({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <Grid templateColumns={{ base: '1fr', md: '200px 1fr' }} gap={{ base: 3, md: 6 }} py={4}>
      <Text fontSize="sm" fontWeight="medium" color="fg.muted" pt={{ md: 1 }}>
        {label}
      </Text>
      <Box minW={0}>
        {children}
        {hint ? (
          <Text mt={2.5} fontSize="xs" color="fg.subtle" lineHeight="short">
            {hint}
          </Text>
        ) : null}
      </Box>
    </Grid>
  )
}

function OpacityControl({
  value,
  onChange,
  compact = false,
}: {
  value: number
  onChange: (value: number) => void
  compact?: boolean
}) {
  return (
    <HStack gap={compact ? 2 : 4} flexWrap="wrap" align="center">
      <Box flex="1" minW={compact ? '100px' : '120px'} maxW={compact ? 'none' : '200px'}>
        <Slider.Root
          min={1}
          max={100}
          value={[value]}
          onValueChange={(e) => onChange(e.value[0] ?? value)}
        >
          <Slider.Control>
            <Slider.Track>
              <Slider.Range />
            </Slider.Track>
            <Slider.Thumb index={0} />
          </Slider.Control>
        </Slider.Root>
      </Box>
      <Input
        {...fieldStyles}
        size="sm"
        type="number"
        min={1}
        max={100}
        w="88px"
        value={String(value)}
        onChange={(e) => onChange(Number(e.target.value) || 1)}
      />
      {!compact ? (
        <Text fontSize="xs" color="fg.subtle">
          (1–100, lower = more transparent)
        </Text>
      ) : null}
    </HStack>
  )
}

function PanelImageDropzoneDeleteButton({
  label,
  onRemove,
}: {
  label: string
  onRemove: () => void
}) {
  return (
    <Float placement="top-end" offset="6">
      <IconButton
        aria-label={label}
        size="2xs"
        variant="solid"
        colorPalette="gray"
        borderRadius="full"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
      >
        <X size={12} strokeWidth={2.5} />
      </IconButton>
    </Float>
  )
}

function PanelImageDropzoneContent({
  previewUrl,
  hasCustomImage = true,
  onReset,
}: {
  previewUrl: string | null
  /** When false, preview shows the built-in default and remove is hidden. */
  hasCustomImage?: boolean
  onReset: () => void
}) {
  const fileUpload = useFileUploadContext()
  const file = fileUpload.acceptedFiles[0]

  if (file) {
    return (
      <Box className="panel-image-dropzone" position="relative" w="full" minH="120px">
        <FileUpload.ItemGroup
          w="full"
          minH="120px"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <FileUpload.Item
            file={file}
            w="full"
            h="full"
            minH="120px"
            p={0}
            border="none"
            bg="transparent"
            position="relative"
          >
            <FileUpload.ItemPreviewImage
              w="full"
              h="full"
              minH="120px"
              maxH="180px"
              objectFit="contain"
              borderRadius="var(--radius-input)"
            />
            <Float placement="top-end" offset="6">
              <FileUpload.ItemDeleteTrigger
                boxSize="4"
                layerStyle="fill.solid"
                borderRadius="full"
                aria-label={`Remove ${file.name}`}
                onClick={(e) => e.stopPropagation()}
              >
                <X size={12} strokeWidth={2.5} />
              </FileUpload.ItemDeleteTrigger>
            </Float>
          </FileUpload.Item>
        </FileUpload.ItemGroup>
      </Box>
    )
  }

  if (previewUrl) {
    return (
      <Box className="panel-image-dropzone" position="relative" w="full" minH="120px">
        <img src={previewUrl} alt="" className="panel-image-dropzone__img" />
        {hasCustomImage ? (
          <PanelImageDropzoneDeleteButton
            label="Remove custom image"
            onRemove={() => {
              fileUpload.clearFiles()
              onReset()
            }}
          />
        ) : null}
      </Box>
    )
  }

  return (
    <VStack gap={1.5} py={4} color="fg.muted" pointerEvents="none">
      <Image size={22} strokeWidth={1.75} />
      <Text fontSize="sm" fontWeight="medium" color="fg">
        Drop image here
      </Text>
      <Text fontSize="xs" color="fg.subtle" textAlign="center" px={2}>
        PNG, JPG, WebP, SVG, or ICO · max 2MB
      </Text>
    </VStack>
  )
}

function PanelImageResetButton({
  onReset,
  label = 'Reset default',
}: {
  onReset: () => void
  label?: string
}) {
  const fileUpload = useFileUploadContext()

  return (
    <Button
      size="sm"
      variant="outline"
      borderColor="border.subtle"
      borderRadius="input"
      onClick={() => {
        fileUpload.clearFiles()
        onReset()
      }}
    >
      {label}
    </Button>
  )
}

function ImageUploadField({
  label,
  hint,
  previewUrl,
  hasCustomImage,
  uploadLabel,
  resetLabel = 'Reset default',
  onUpload,
  onReset,
}: {
  label: string
  hint: string
  previewUrl: string | null
  hasCustomImage?: boolean
  uploadLabel: string
  resetLabel?: string
  onUpload: (dataUrl: string) => void
  onReset: () => void
}) {
  const hadAcceptedFilesRef = useRef(false)

  async function onFileAccept(files: File[]) {
    const file = files[0]
    if (!file) return
    try {
      onUpload(await readImageFile(file, PANEL_IMAGE_MAX_BYTES))
    } catch (err) {
      notifyError(err)
    }
  }

  function onFileReject(details: FileUpload.FileRejectDetails) {
    const message = details.files.flatMap((f) => f.errors).join(', ')
    notifyError(message || 'File type not accepted')
  }

  return (
    <SettingBlock label={label} hint={hint}>
      <FileUpload.Root
        accept="image/*"
        maxFiles={1}
        maxFileSize={PANEL_IMAGE_MAX_BYTES}
        onFileAccept={(details) => void onFileAccept(details.files)}
        onFileReject={onFileReject}
        onFileChange={(details) => {
          const hasFiles = details.acceptedFiles.length > 0
          if (hasFiles) {
            hadAcceptedFilesRef.current = true
            return
          }
          if (hadAcceptedFilesRef.current) {
            hadAcceptedFilesRef.current = false
            onReset()
          }
        }}
      >
        <FileUpload.HiddenInput />
        <VStack align="stretch" gap={3}>
          <FileUpload.Dropzone
            w="full"
            minH="120px"
            borderWidth="1px"
            borderColor="border.subtle"
            borderRadius="var(--radius-input)"
            bg="bg.subtle"
            _hover={{ borderColor: 'border.emphasized' }}
            display="flex"
            alignItems="center"
            justifyContent="center"
            p={previewUrl ? 2 : 3}
          >
            <FileUpload.DropzoneContent w="full">
              <PanelImageDropzoneContent
                previewUrl={previewUrl}
                hasCustomImage={hasCustomImage}
                onReset={onReset}
              />
            </FileUpload.DropzoneContent>
          </FileUpload.Dropzone>

          <HStack gap={2} flexWrap="wrap">
            <FileUpload.Trigger asChild>
              <Button size="sm" variant="outline" borderColor="border.subtle" borderRadius="input">
                <Image size={16} strokeWidth={2} />
                {uploadLabel}
              </Button>
            </FileUpload.Trigger>
            {hasCustomImage !== false ? (
              <PanelImageResetButton onReset={onReset} label={resetLabel} />
            ) : null}
          </HStack>
          {hasCustomImage !== undefined ? (
            <Text fontSize="xs" color="fg.subtle">
              {hasCustomImage ? 'Custom image saved in this browser.' : 'Using built-in default.'}
            </Text>
          ) : null}
        </VStack>
      </FileUpload.Root>
    </SettingBlock>
  )
}

function LoginPageBackgroundSettings({
  background,
  accentPalette,
  onPatch,
  onReset,
}: {
  background: LoginBackgroundConfig
  accentPalette: string
  onPatch: (background: LoginBackgroundConfig) => void
  onReset: () => void
}) {
  const usingDefault = !hasCustomLoginBackgroundImage(background)

  function patch(partial: Partial<LoginBackgroundConfig>) {
    onPatch({ ...background, ...partial })
  }

  return (
    <>
      <Text fontSize="md" fontWeight="semibold" mb={2} mt={2}>
        Login page
      </Text>

      <SettingBlock
        label="Sign-in background"
        hint="Upload a custom wallpaper or leave empty to use the built-in default."
      >
        <HStack justify="space-between" maxW="xs" mb={background.enabled ? 3 : 0}>
          <Text fontSize="sm">Show background</Text>
          <Switch.Root
            checked={background.enabled}
            onCheckedChange={(e) => patch({ enabled: !!e.checked })}
            colorPalette={accentPalette}
          >
            <Switch.HiddenInput />
            <Switch.Control />
          </Switch.Root>
        </HStack>

        {!background.enabled ? (
          <Text fontSize="xs" color="fg.subtle">
            The sign-in page uses a plain canvas when disabled.
          </Text>
        ) : (
          <VStack align="stretch" gap={4}>
            <ImageUploadField
              label="Wallpaper (light)"
              hint="1920×1080 recommended · max 2MB. Empty uses the default image."
              previewUrl={background.lightUrl ?? DEFAULT_LOGIN_PATH_BACKGROUND_URL}
              hasCustomImage={Boolean(background.lightUrl)}
              uploadLabel="Upload"
              resetLabel="Use default"
              onUpload={(lightUrl) => patch({ lightUrl })}
              onReset={() => patch({ lightUrl: null })}
            />

            <ImageUploadField
              label="Wallpaper (dark)"
              hint="Optional — falls back to light, then the default."
              previewUrl={
                background.darkUrl ?? background.lightUrl ?? DEFAULT_LOGIN_PATH_BACKGROUND_URL
              }
              hasCustomImage={Boolean(background.darkUrl)}
              uploadLabel="Upload"
              resetLabel="Use default"
              onUpload={(darkUrl) => patch({ darkUrl })}
              onReset={() => patch({ darkUrl: null })}
            />

            <Text fontSize="xs" color="fg.subtle">
              {usingDefault
                ? 'Using bundled default wallpaper.'
                : 'Custom images saved in this browser.'}
            </Text>

            <Box
              borderWidth="1px"
              borderColor="border.subtle"
              borderRadius="var(--radius-input)"
              px={3}
              py={3}
            >
              <Text fontSize="xs" fontWeight="medium" color="fg.muted" mb={3}>
                Display
              </Text>
              <VStack align="stretch" gap={3}>
                <HStack justify="space-between" gap={3} flexWrap="wrap">
                  <Text fontSize="sm" minW="5rem">
                    Image
                  </Text>
                  <Box flex="1" minW="160px">
                    <OpacityControl
                      value={background.imageOpacity}
                      onChange={(imageOpacity) => patch({ imageOpacity })}
                      compact
                    />
                  </Box>
                </HStack>
                <HStack justify="space-between" gap={3} flexWrap="wrap">
                  <Text fontSize="sm" minW="5rem">
                    Overlay
                  </Text>
                  <Box flex="1" minW="160px">
                    <OpacityControl
                      value={background.overlayOpacity}
                      onChange={(overlayOpacity) => patch({ overlayOpacity })}
                      compact
                    />
                  </Box>
                </HStack>
              </VStack>
            </Box>

            <Button
              size="sm"
              variant="outline"
              borderColor="border.subtle"
              borderRadius="input"
              alignSelf="flex-start"
              onClick={onReset}
            >
              Reset login background
            </Button>
          </VStack>
        )}
      </SettingBlock>
    </>
  )
}

function PanelPathsFooter({ form }: { form: PanelSettingsForm }) {
  const { panel, isLoading } = form
  if (isLoading || !panel) return null
  return (
    <Box mt={6} pt={4} borderTopWidth="1px" borderColor="border.subtle">
      <Text fontSize="sm" fontWeight="semibold" mb={2}>
        Server config paths
      </Text>
      <Text fontSize="xs" color="fg.muted" fontFamily="mono">
        {panel.ui_config_path}
      </Text>
      <Text fontSize="xs" color="fg.subtle" mt={2} lineHeight="short">
        Scrape, AI, proxy, and marketplace settings are saved to this file. Theme and branding below
        are stored in your browser until server sync is added.
      </Text>
    </Box>
  )
}

export function PanelAppearanceSection({ form }: { form: PanelSettingsForm }) {
  const customColorRef = useRef<HTMLInputElement>(null)
  const { mode, config, accentPalette, setMode, setConfig, resetConfig } = useUiConfig()
  const { activeAccentHex, activePreset, isCustomAccentColor, setAccentHex, resetAccentColor } =
    useThemeActions()

  return (
    <Section
      title="Panel appearance"
      description="Theme, branding, and layout — saved in this browser"
      mt={0}
      action={
        <Button
          size="sm"
          variant="outline"
          borderColor="border.subtle"
          borderRadius="input"
          onClick={resetConfig}
        >
          Reset default settings
        </Button>
      }
    >
      <SectionCard p={{ base: 5, md: 11 }} position="relative">
        <Text fontSize="md" fontWeight="semibold" mb={4}>
          Theme settings
        </Text>

        <SettingBlock
          label="Theme style"
          hint="Select the interface theme; Auto follows your system preference."
        >
          <HStack gap={2.5} flexWrap="wrap" className="theme-pick-group">
            {THEME_STYLE_OPTIONS.map((opt) => (
              <ThemePickCard
                key={opt.value}
                active={mode === opt.value}
                label={opt.label}
                onClick={() => setMode(opt.value as ColorMode)}
              >
                {opt.value === 'system' ? (
                  <Monitor size={22} strokeWidth={1.75} />
                ) : opt.value === 'light' ? (
                  <Sun size={22} strokeWidth={1.75} />
                ) : (
                  <Moon size={22} strokeWidth={1.75} />
                )}
              </ThemePickCard>
            ))}
          </HStack>
        </SettingBlock>

        <Separator borderColor="border.subtle" />

        <SettingBlock
          label="Theme color"
          hint="Preset accent colors or pick a custom hex value for the panel tone."
        >
          <HStack gap={2.5} flexWrap="wrap" className="theme-pick-group">
            {THEME_COLOR_PRESETS.map((preset) => (
              <ThemePickCard
                key={preset.id}
                active={activePreset?.id === preset.id}
                label={preset.label}
                onClick={() => setAccentHex(preset.hex)}
              >
                <span className="theme-color-block" style={{ backgroundColor: preset.hex }} />
              </ThemePickCard>
            ))}
            <ThemePickCard
              active={isCustomAccentColor}
              label="Custom"
              onClick={() => customColorRef.current?.click()}
            >
              <input
                ref={customColorRef}
                type="color"
                className="theme-color-input"
                value={activeAccentHex}
                onChange={(e) => setAccentHex(e.target.value)}
                aria-label="Custom accent color"
              />
            </ThemePickCard>
          </HStack>
          <HStack mt={3} gap={2} flexWrap="wrap">
            <Field.Root maxW="140px">
              <Field.Label fontSize="xs" color="fg.muted">
                Custom hex
              </Field.Label>
              <Input
                {...fieldStyles}
                size="sm"
                value={activeAccentHex}
                onChange={(e) => setAccentHex(e.target.value)}
                fontFamily="mono"
              />
            </Field.Root>
            <Button
              size="sm"
              variant="outline"
              borderColor="border.subtle"
              borderRadius="input"
              mt={5}
              onClick={resetAccentColor}
            >
              Restore default color
            </Button>
          </HStack>
        </SettingBlock>

        <Separator borderColor="border.subtle" />

        <Text fontSize="md" fontWeight="semibold" mb={2} mt={2}>
          Logo settings
        </Text>

        <ImageUploadField
          label="Logo"
          hint="Shown in the left sidebar (recommended 32×32, SVG or PNG)."
          previewUrl={config.branding.logoUrl ?? DEFAULT_PANEL_LOGO_URL}
          hasCustomImage={Boolean(config.branding.logoUrl)}
          uploadLabel="Upload logo"
          resetLabel="Use default"
          onUpload={(logoUrl) => setConfig({ branding: { ...config.branding, logoUrl } })}
          onReset={() => setConfig({ branding: { ...config.branding, logoUrl: null } })}
        />

        <Separator borderColor="border.subtle" />

        <ImageUploadField
          label="Favicon"
          hint="Browser tab icon (16×16 ICO, PNG, or SVG recommended)."
          previewUrl={config.branding.faviconUrl ?? DEFAULT_PANEL_FAVICON_URL}
          hasCustomImage={Boolean(config.branding.faviconUrl)}
          uploadLabel="Upload favicon"
          resetLabel="Use default"
          onUpload={(faviconUrl) => setConfig({ branding: { ...config.branding, faviconUrl } })}
          onReset={() => setConfig({ branding: { ...config.branding, faviconUrl: null } })}
        />

        <Separator borderColor="border.subtle" />

        <Text fontSize="md" fontWeight="semibold" mb={2} mt={2}>
          Sidebar settings
        </Text>

        <SettingBlock label="Sidebar background opacity" hint="Applies to the left navigation bar.">
          <OpacityControl
            value={config.sidebarOpacity}
            onChange={(sidebarOpacity) => setConfig({ sidebarOpacity })}
          />
          <Button
            size="sm"
            variant="outline"
            borderColor="border.subtle"
            borderRadius="input"
            mt={3}
            onClick={() => setConfig({ sidebarOpacity: defaultThemeConfig.sidebarOpacity })}
          >
            Reset default
          </Button>
        </SettingBlock>

        <Separator borderColor="border.subtle" />

        <Text fontSize="md" fontWeight="semibold" mb={2} mt={2}>
          Main page settings
        </Text>

        <SettingBlock label="Main background">
          <HStack justify="space-between" mb={config.mainBackground.enabled ? 3 : 0}>
            <Text fontSize="sm">Show background image</Text>
            <Switch.Root
              checked={config.mainBackground.enabled}
              onCheckedChange={(e) =>
                setConfig({
                  mainBackground: {
                    ...config.mainBackground,
                    enabled: !!e.checked,
                  },
                })
              }
              colorPalette={accentPalette}
            >
              <Switch.HiddenInput />
              <Switch.Control />
            </Switch.Root>
          </HStack>
          {config.mainBackground.enabled ? (
            <VStack align="stretch" gap={0}>
              <ImageUploadField
                label="Main background (light)"
                hint="1920×1080 PNG recommended, max 2MB."
                previewUrl={config.mainBackground.lightUrl}
                uploadLabel="Upload image"
                onUpload={(lightUrl) =>
                  setConfig({
                    mainBackground: { ...config.mainBackground, lightUrl },
                  })
                }
                onReset={() =>
                  setConfig({
                    mainBackground: { ...config.mainBackground, lightUrl: null },
                  })
                }
              />
              <ImageUploadField
                label="Main background (dark)"
                hint="Used when dark mode is active."
                previewUrl={config.mainBackground.darkUrl}
                uploadLabel="Upload image"
                onUpload={(darkUrl) =>
                  setConfig({
                    mainBackground: { ...config.mainBackground, darkUrl },
                  })
                }
                onReset={() =>
                  setConfig({
                    mainBackground: { ...config.mainBackground, darkUrl: null },
                  })
                }
              />
            </VStack>
          ) : (
            <Text fontSize="xs" color="fg.subtle">
              Enable to upload light and dark wallpapers for the main content area.
            </Text>
          )}
        </SettingBlock>

        <SettingBlock label="Background opacity">
          <OpacityControl
            value={config.mainBackground.imageOpacity}
            onChange={(imageOpacity) =>
              setConfig({ mainBackground: { ...config.mainBackground, imageOpacity } })
            }
          />
        </SettingBlock>

        <SettingBlock label="Content opacity">
          <OpacityControl
            value={config.mainBackground.contentOpacity}
            onChange={(contentOpacity) =>
              setConfig({ mainBackground: { ...config.mainBackground, contentOpacity } })
            }
          />
        </SettingBlock>

        <Separator borderColor="border.subtle" />

        <LoginPageBackgroundSettings
          background={config.loginPage.background}
          accentPalette={accentPalette}
          onPatch={(background) => setConfig({ loginPage: { background } })}
          onReset={() => setConfig({ loginPage: { background: DEFAULT_LOGIN_BACKGROUND } })}
        />

        <Separator borderColor="border.subtle" />

        <Text fontSize="md" fontWeight="semibold" mb={2} mt={2}>
          Layout & motion
        </Text>

        <SettingBlock label="Corner radius">
          <HStack gap={1} flexWrap="wrap">
            {(['sm', 'md', 'lg'] as RadiusScale[]).map((radius) => (
              <Button
                key={radius}
                size="xs"
                variant={config.radius === radius ? 'solid' : 'outline'}
                colorPalette={config.radius === radius ? accentPalette : 'gray'}
                borderRadius="input"
                borderColor="border.subtle"
                onClick={() => setConfig({ radius })}
              >
                {radius.toUpperCase()}
              </Button>
            ))}
          </HStack>
        </SettingBlock>

        <SettingBlock label="Font & density">
          <HStack gap={4} flexWrap="wrap">
            <Box>
              <SubtitleText mb={1}>Font</SubtitleText>
              <HStack gap={1}>
                {(['sm', 'md', 'lg'] as FontScale[]).map((fontScale) => (
                  <Button
                    key={fontScale}
                    size="xs"
                    variant={config.fontScale === fontScale ? 'solid' : 'outline'}
                    colorPalette={config.fontScale === fontScale ? accentPalette : 'gray'}
                    onClick={() => setConfig({ fontScale })}
                  >
                    {fontScale}
                  </Button>
                ))}
              </HStack>
            </Box>
            <Box>
              <SubtitleText mb={1}>Density</SubtitleText>
              <HStack gap={1}>
                {(['compact', 'comfortable'] as Density[]).map((density) => (
                  <Button
                    key={density}
                    size="xs"
                    variant={config.density === density ? 'solid' : 'outline'}
                    colorPalette={config.density === density ? accentPalette : 'gray'}
                    onClick={() => setConfig({ density })}
                  >
                    {density}
                  </Button>
                ))}
              </HStack>
            </Box>
          </HStack>
        </SettingBlock>

        <SettingBlock label="Page transitions">
          <VStack align="stretch" gap={3}>
            <HStack justify="space-between" maxW="md">
              <Text fontSize="sm">Animate route changes</Text>
              <Switch.Root
                checked={config.pageTransitions}
                onCheckedChange={(e) => setConfig({ pageTransitions: !!e.checked })}
                colorPalette={accentPalette}
              >
                <Switch.HiddenInput />
                <Switch.Control />
              </Switch.Root>
            </HStack>
            {config.pageTransitions ? (
              <HStack gap={1} flexWrap="wrap">
                {pageTransitionOptions
                  .filter((o) => o.value !== 'none')
                  .map((opt) => (
                    <Button
                      key={opt.value}
                      size="xs"
                      variant={config.pageTransition === opt.value ? 'solid' : 'outline'}
                      colorPalette={config.pageTransition === opt.value ? accentPalette : 'gray'}
                      onClick={() =>
                        setConfig({ pageTransition: opt.value as PageTransitionStyle })
                      }
                    >
                      {opt.label}
                    </Button>
                  ))}
              </HStack>
            ) : null}
            <HStack gap={1} flexWrap="wrap">
              {motionSpeedOptions.map((opt) => (
                <Button
                  key={opt.value}
                  size="xs"
                  variant={config.motionSpeed === opt.value ? 'solid' : 'outline'}
                  colorPalette={config.motionSpeed === opt.value ? accentPalette : 'gray'}
                  onClick={() => setConfig({ motionSpeed: opt.value as MotionSpeed })}
                >
                  {opt.label}
                </Button>
              ))}
            </HStack>
          </VStack>
        </SettingBlock>

        <PanelPathsFooter form={form} />
      </SectionCard>
    </Section>
  )
}
