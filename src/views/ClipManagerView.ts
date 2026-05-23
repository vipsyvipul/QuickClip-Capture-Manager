import { ItemView, WorkspaceLeaf, Notice } from 'obsidian'
import { loadIndex, getAllClips, deleteClip } from '../clipsIndex'
import { ClipRef } from '../types'

export const VIEW_CLIP_MANAGER = 'quickclip-manager'

const CLIP_TYPE_LABELS: Record<string, string> = {
    'highlight': 'Highlight',
    'full-page': 'Full page',
    'transcript': 'Transcript',
    'tweet': 'Tweet',
    'pdf-highlight': 'PDF',
    'image': 'Image',
}

export class ClipManagerView extends ItemView {
    private clips: ClipRef[] = []

    constructor(leaf: WorkspaceLeaf) {
        super(leaf)
    }

    getViewType(): string { return VIEW_CLIP_MANAGER }
    getDisplayText(): string { return 'QuickClip Manager' }
    getIcon(): string { return 'scissors' }

    async onOpen(): Promise<void> {
        await this.refresh()
    }

    async refresh(): Promise<void> {
        const index = await loadIndex(this.app)
        this.clips = getAllClips(index)
        this.render()
    }

    private render(): void {
        const { contentEl } = this
        contentEl.empty()
        contentEl.addClass('qc-manager')

        const header = contentEl.createDiv('qc-manager-header')
        header.createEl('h2', { text: 'QuickClip Manager' })
        const countEl = header.createDiv('qc-manager-count')
        countEl.setText(`${this.clips.length} clip${this.clips.length !== 1 ? 's' : ''}`)

        if (this.clips.length === 0) {
            contentEl.createDiv('qc-manager-empty').setText(
                'No clips yet. Start saving from the browser extension.'
            )
            return
        }

        const list = contentEl.createDiv('qc-manager-list')

        // Group by domain
        const grouped = new Map<string, ClipRef[]>()
        for (const ref of this.clips) {
            const group = grouped.get(ref.domain) ?? []
            group.push(ref)
            grouped.set(ref.domain, group)
        }

        for (const [domain, refs] of grouped) {
            const section = list.createDiv('qc-manager-section')
            section.createEl('h3', { text: domain, cls: 'qc-manager-domain' })

            for (const ref of refs) {
                this.renderClipRow(section, ref)
            }
        }
    }

    private renderClipRow(container: HTMLElement, ref: ClipRef): void {
        const row = container.createDiv('qc-clip-row')

        const badge = row.createDiv('qc-clip-badge')
        badge.setText(CLIP_TYPE_LABELS[ref.clip.clip_type] ?? ref.clip.clip_type)
        badge.addClass(`qc-badge-${ref.clip.clip_type}`)

        const info = row.createDiv('qc-clip-info')

        const titleEl = info.createDiv('qc-clip-title')
        titleEl.setText(ref.pageTitle || ref.domain)

        if (ref.clip.text) {
            const snippet = info.createDiv('qc-clip-snippet')
            snippet.setText(ref.clip.text.length > 100
                ? ref.clip.text.slice(0, 100) + '…'
                : ref.clip.text
            )
        }

        const meta = info.createDiv('qc-clip-row-meta')
        const date = new Date(ref.clip.savedAt)
        meta.createSpan({ text: date.toLocaleDateString() })

        if (ref.clip.path) {
            const pathEl = meta.createSpan({ cls: 'qc-clip-path', text: ref.clip.path })
            pathEl.title = ref.clip.path
        }

        const deleteBtn = row.createEl('button', {
            cls: 'qc-delete-btn',
            text: '✕',
            attr: { 'aria-label': 'Delete clip' },
        })

        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation()
            deleteBtn.disabled = true
            deleteBtn.setText('…')
            try {
                await deleteClip(this.app, ref.url, ref.clip.hash)
                row.remove()
                this.clips = this.clips.filter(
                    c => !(c.url === ref.url && c.clip.hash === ref.clip.hash)
                )
                const countEl = this.contentEl.querySelector('.qc-manager-count')
                if (countEl) countEl.textContent = `${this.clips.length} clip${this.clips.length !== 1 ? 's' : ''}`
                new Notice('Clip deleted')
            } catch {
                new Notice('Failed to delete clip')
                deleteBtn.disabled = false
                deleteBtn.setText('✕')
            }
        })
    }
}
