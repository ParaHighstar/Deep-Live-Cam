import { createClient } from '@blinkdotnew/sdk'

export const blink = createClient({
  projectId: import.meta.env.VITE_BLINK_PROJECT_ID || 'deepfake-live-app-steuehkl',
  publishableKey: import.meta.env.VITE_BLINK_PUBLISHABLE_KEY || 'blnk_pk_ErGEpjHQO1ROeiqcmLhOcrdWSeJIgXCC',
  authRequired: false,
  auth: { mode: 'managed' },
})
