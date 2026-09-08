// @vitest-environment jsdom
// BraceletSvg: renders the projected slots from a settled tool result's meta
// as one SVG with one <image> bead per slot, and nothing when meta is absent.
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import type { ToolResultNode } from '@deepseek-ai/dsh-client-runtime/client'
import { BraceletSvg } from '../src/atoms/ui.svg_render/BraceletSvg.tsx'

afterEach(cleanup)

function resultNode(meta: unknown): ToolResultNode {
  return {
    kind: 'tool-result',
    seq: 1,
    time: 0,
    callId: 'c1',
    call: { name: 'generate_design', argsRaw: '{}' },
    callTime: 0,
    content: [],
    isError: false,
    meta,
    callView: null,
    resultView: null,
    subCalls: [],
  } as unknown as ToolResultNode
}

const SLOTS = [
  { name: '南红', diameter: 8, image: 'nanhong_round', ratio: 1 },
  { name: '白银', diameter: 4, image: 'baiyin_spacer', ratio: 152 / 468 },
  { name: '南红', diameter: 8, image: 'nanhong_round', ratio: 1 },
]

describe('BraceletSvg', () => {
  it('renders one image per slot when meta carries slots', () => {
    const node = resultNode({ style_name: 'B-01', wrist_size: '17', summary: '南红手串', slots: SLOTS })
    const { container } = render(<BraceletSvg block={node} />)
    const images = container.querySelectorAll('image')
    expect(images).toHaveLength(SLOTS.length)
    expect([...images].map(img => img.getAttribute('href')))
      .toEqual(SLOTS.map(slot => `/beads/${slot.image}.png`))
  })

  it('renders nothing when meta has no slots', () => {
    const node = resultNode(undefined)
    const { container } = render(<BraceletSvg block={node} />)
    expect(container.querySelector('svg')).toBeNull()
  })
})
