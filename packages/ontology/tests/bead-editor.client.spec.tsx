// @vitest-environment jsdom
// BeadEditor: shows the settled slots as selectable chips, loads the bead
// catalog, and replaces the selected slot with a picked catalog bead (the
// slot chip reflects the edited slots).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ToolResultNode } from '@deepseek-ai/dsh-client-runtime/client'
import { BeadEditor, type CatalogBead } from '../src/atoms/ui.bead_editor/BeadEditor.tsx'

afterEach(cleanup)

const CATALOG: CatalogBead[] = [
  { id: 'nanhong_round', bead_id: 'nanhong', name: '南红', wuxing: '火', variant: 'round', diameters: [8, 10], color: '#c0392b', image: 'nanhong_round', ratio: 1 },
  { id: 'jinsi-nan_round', bead_id: 'jinsi-nan', name: '金丝楠', wuxing: '木', variant: 'round', diameters: [8, 10], color: '#c8a951', image: 'jinsi-nan_round', ratio: 1 },
  { id: 'baiyin_spacer', bead_id: 'baiyin', name: '白银', wuxing: '金', variant: 'spacer', diameters: [4, 5, 6], color: '#c0c0c0', image: 'baiyin_spacer', ratio: 0.33 },
]

const SLOTS = [
  { name: '南红', diameter: 8, image: 'nanhong_round', ratio: 1 },
  { name: '白银', diameter: 4, image: 'baiyin_spacer', ratio: 0.33 },
]

function resultNode(): ToolResultNode {
  return {
    kind: 'tool-result',
    seq: 1,
    time: 0,
    callId: 'c1',
    call: { name: 'generate_design', argsRaw: '{}' },
    callTime: 0,
    content: [],
    isError: false,
    meta: { style_name: 'B-03', wrist_size: '17', summary: '南红手串', slots: SLOTS },
    callView: null,
    resultView: null,
    subCalls: [],
  } as unknown as ToolResultNode
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ beads: CATALOG }),
    }),
  ))
})

/** Slot chips carry `title="<name> <dia>mm"`; catalog beads carry `title="<name>（<wx>）<dia>mm"`. */
const slotButton = (title: string) => screen.getByTitle(title)

describe('BeadEditor', () => {
  it('renders the current slots and the catalog', async () => {
    render(<BeadEditor block={resultNode()} />)
    await waitFor(() => expect(screen.getByTitle(/金丝楠/)).toBeTruthy())
    // both slot chips present
    expect(slotButton('南红 8mm')).toBeTruthy()
    expect(slotButton('白银 4mm')).toBeTruthy()
    // catalog bead present
    expect(screen.getByTitle(/金丝楠/)).toBeTruthy()
  })

  it('replaces the selected slot with a catalog bead', async () => {
    render(<BeadEditor block={resultNode()} />)
    await waitFor(() => expect(screen.getByTitle(/金丝楠/)).toBeTruthy())
    // select the first slot (南红 8mm), then pick 金丝楠
    fireEvent.click(slotButton('南红 8mm'))
    fireEvent.click(screen.getByTitle(/金丝楠/))
    // the replaced slot chip now names 金丝楠 with the 8mm diameter preserved
    expect(slotButton('金丝楠 8mm')).toBeTruthy()
    // the untouched spacer slot stays
    expect(slotButton('白银 4mm')).toBeTruthy()
  })
})
