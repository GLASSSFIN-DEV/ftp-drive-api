// src/lib/inngest-client.ts
import { Inngest } from 'inngest'
import { env } from '../config.js'

export const inngest = new Inngest({ id: env.APP_NAME })