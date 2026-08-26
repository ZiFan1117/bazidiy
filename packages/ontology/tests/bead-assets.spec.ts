// Verifies the /beads static route: mountBeadAssets registers a prefix route
// whose handler serves the bead PNG with image/png + immutable cache headers,
// and 404s for missing files without escaping the assets directory.
import { describe, expect, it } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { Context } from '@deepseek-ai/cordis'
import { mountBeadAssets } from '../src/assets.ts'

/** A minimal webServer stand-in capturing the registered prefix route. */
type RouteHandler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
type RouteResult = { status: number; type?: string; cache?: string; body?: Buffer }
type FakeServer = { ctx: Context; handler: (pathname: string) => Promise<RouteResult> }

function fakeWebServer(): FakeServer {
  let captured: { handler: RouteHandler } | undefined
  const webServer = {
    register(route: { kind: string; path: string; handler: RouteHandler }): () => void {
      captured = route
      return () => {}
    },
  }
  const ctx = new Context()
  ctx.provide('webServer', webServer)
  return {
    ctx,
    handler: (pathname: string) => new Promise((resolvePromise) => {
      const chunks: Buffer[] = []
      let settle: ((result: RouteResult) => void) | undefined
      const res = {
        writeHead: (status: number, headers?: Record<string, string>) => {
          settle = () => {
            resolvePromise({
              status,
              type: headers?.['content-type'],
              cache: headers?.['cache-control'],
              body: Buffer.concat(chunks),
            })
          }
        },
        end: (body?: Buffer) => {
          if (body !== undefined) chunks.push(body)
          if (settle !== undefined) settle()
          else resolvePromise({ status: 200, body: Buffer.concat(chunks) })
        },
      } as unknown as ServerResponse
      void captured?.handler(
        { method: 'GET', url: pathname } as unknown as IncomingMessage,
        res,
      )
    }),
  }
}

describe('bead assets route', () => {
  it('registers the /beads prefix route', () => {
    const { ctx } = fakeWebServer()
    const dispose = mountBeadAssets(ctx)
    expect(dispose).toBeDefined()
    dispose?.()
    void ctx.fiber.dispose()
  })

  it('serves a bead PNG with image/png and immutable cache headers', async () => {
    const { ctx, handler } = fakeWebServer()
    mountBeadAssets(ctx)
    const result = await handler('/beads/nanhong_round.png')
    expect(result.status).toBe(200)
    expect(result.type).toBe('image/png')
    expect(result.cache).toBe('public, max-age=31536000, immutable')
    expect(result.body).toBeDefined()
    expect(result.body!.length).toBeGreaterThan(0)
    void ctx.fiber.dispose()
  })

  it('404s for a missing bead', async () => {
    const { ctx, handler } = fakeWebServer()
    mountBeadAssets(ctx)
    const result = await handler('/beads/no-such-bead.png')
    expect(result.status).toBe(404)
    void ctx.fiber.dispose()
  })

  it('rejects traversal outside the assets directory', async () => {
    const { ctx, handler } = fakeWebServer()
    mountBeadAssets(ctx)
    const result = await handler('/beads/..%2F..%2Fpackage.json')
    expect(result.status).toBe(403)
    void ctx.fiber.dispose()
  })

  it('serves the bead catalog JSON with every bead entry', async () => {
    const { ctx, handler } = fakeWebServer()
    mountBeadAssets(ctx)
    const result = await handler('/beads/catalog.json')
    expect(result.status).toBe(200)
    expect(result.type).toBe('application/json; charset=utf-8')
    const parsed = JSON.parse(result.body!.toString('utf8')) as {
      beads: Array<{ id: string; name: string; ratio: number; diameters: number[] }>
    }
    expect(parsed.beads.length).toBeGreaterThan(0)
    const nanhong = parsed.beads.find(b => b.id === 'nanhong_round')
    expect(nanhong).toBeDefined()
    expect(nanhong!.name).toBe('南红')
    expect(nanhong!.ratio).toBeGreaterThan(0)
    expect(nanhong!.diameters).toContain(8)
    void ctx.fiber.dispose()
  })
})
