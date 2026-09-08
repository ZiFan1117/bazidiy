/**
 * Bead image static serving: registers the `/beads` prefix route so the browser
 * can fetch bracelet bead PNGs directly. Images live beside the ontology data
 * (assets/beads) as the single source of truth. The route is optional: mounted
 * only when a webServer service is composed (headless profiles skip it).
 * @module @bazidiy/ontology/assets
 */

import type { ServerResponse } from 'node:http'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, extname, join, normalize, resolve, sep } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { beads as beadsData } from './_atoms/kb/beadCatalog.ts'

const require = createRequire(import.meta.url)

/** The bead image directory, resolved from this package's own manifest (stable across source/lib layouts). */
const PACKAGE_ROOT = dirname(require.resolve('@bazidiy/ontology/package.json'))
const ASSETS_DIR = join(PACKAGE_ROOT, 'assets', 'beads')

/** Prefix route path the browser fetches bead PNGs from. */
export const BEADS_ROUTE = '/beads'

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
}

/**
 * The bead catalog the browser picker fetches: every bead with the data the
 * editor needs to offer a replacement (name, wuxing, diameters, color, image
 * key + aspect ratio). Derived from the ontology bead data — single source.
 */
export interface BeadCatalogEntry {
  id: string
  bead_id: string
  name: string
  wuxing: string
  variant: string
  diameters: number[]
  color: string
  image: string
  ratio: number
}

/** One bead catalog entry, derived from the ontology bead record. */
function catalogEntry(b: (typeof beadsData)[number]): BeadCatalogEntry {
  return {
    id: b.id,
    bead_id: b.bead_id,
    name: b.name,
    wuxing: b.wuxing,
    variant: b.variant,
    diameters: [...b.diameters],
    color: b.color,
    image: b.id,
    ratio: b.image_w / b.image_h,
  }
}

/** Serve the bead catalog as JSON for the browser picker. */
function serveCatalog(res: ServerResponse): void {
  const body = JSON.stringify({ beads: beadsData.map(catalogEntry) })
  res.writeHead(200, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'public, max-age=31536000, immutable',
  })
  res.end(Buffer.from(body, 'utf8'))
}

/**
 * Serve one bead PNG with a long immutable cache header (image keys are stable).
 * @param pathname - decoded URL pathname under /beads.
 * @param res - the node:http response.
 */
async function serveBead(pathname: string, res: ServerResponse): Promise<void> {
  const relative = pathname.slice(BEADS_ROUTE.length).replace(/^\/+/, '')
  // The catalog endpoint is served from data, not the asset directory.
  if (relative === 'catalog.json') {
    serveCatalog(res)
    return
  }
  const target = resolve(normalize(join(ASSETS_DIR, relative)))
  // Traversal rejection: the target must stay under the assets directory.
  if (target !== ASSETS_DIR && !target.startsWith(ASSETS_DIR + sep)) {
    res.writeHead(403)
    res.end()
    return
  }
  let body: Buffer
  try {
    body = await readFile(target)
  } catch {
    res.writeHead(404)
    res.end()
    return
  }
  const type = MIME[extname(target)] ?? 'application/octet-stream'
  res.writeHead(200, {
    'content-type': type,
    'cache-control': 'public, max-age=31536000, immutable',
  })
  res.end(body)
}

/**
 * Register the `/beads` prefix route when a web server is composed.
 * @param ctx - plugin context.
 * @returns disposer, or undefined when no webServer service exists.
 */
export function mountBeadAssets(ctx: Context): (() => void) | undefined {
  const webServer = ctx.get('webServer')
  if (webServer === undefined) return undefined
  return webServer.register({
    kind: 'prefix',
    path: BEADS_ROUTE,
    handler: async (req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405)
        res.end()
        return
      }
      /* v8 ignore next -- node:http always sets url on server requests */
      const rawPath = new URL(req.url ?? '/', 'http://x').pathname
      await serveBead(decodeURIComponent(rawPath), res)
    },
  })
}
