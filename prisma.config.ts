// @ts-nocheck
import { defineConfig } from '@prisma/config'
import path from 'path'

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`,
  },
})
