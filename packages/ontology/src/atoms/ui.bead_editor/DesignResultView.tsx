/**
 * DesignResultView — 组装 BraceletSvg（查看）与 BeadEditor（编辑）的切换卡片。
 * 独立于此，切断 BraceletSvg ↔ BeadEditor 的循环依赖（svg 纯展示，editor 依赖 svg）。
 * @module @bazidiy/ontology/client/DesignResultView
 */

import { useState } from 'react'
import type { ToolCallOwnerProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { BraceletSvg } from '../ui.svg_render/BraceletSvg.tsx'
import { BeadEditor } from './BeadEditor.tsx'
import css from '../ui.svg_render/BraceletSvg.module.css'

/**
 * The generate_design result card: view mode shows the SVG, edit mode shows
 * the bead editor. A toggle switches between the two. Nothing while running.
 * @param props - the tool-view owner props (block is the frozen call/result node).
 * @returns the card, or null while the call is still running.
 */
export function DesignResultView({ block }: ToolCallOwnerProps): React.ReactNode {
  const [editing, setEditing] = useState(false)
  if (!('kind' in block)) return null
  return (
    <div className={css.viewRoot}>
      <BraceletSvg block={block} />
      <button type="button" className={css.editToggle} onClick={() => { setEditing((v) => !v) }}>
        {editing ? '完成' : '换珠子'}
      </button>
      {editing && <BeadEditor block={block} />}
    </div>
  )
}
