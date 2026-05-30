/** User-facing copy for panel API / gateway connectivity failures. */
export function formatServerErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.trim()
    if (msg) return msg
  }
  return 'The panel API is not responding.'
}

export const DEFAULT_SERVER_ERROR_HINT =
  'Start the gateway with make run-dev or bash scripts/serve-api.sh, then retry. If security entrance is enabled, open the panel from your bookmark URL with the access key.'
