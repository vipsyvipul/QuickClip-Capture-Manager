import { MarkdownView, Plugin } from 'obsidian'
import { processHighlight, scanAndTransform } from './renderers/highlight'
import { processFullPage, injectFullPageHeader } from './renderers/fullPage'
import { ClipManagerView, VIEW_CLIP_MANAGER } from './views/ClipManagerView'

export default class QuickClipCapturePlugin extends Plugin {
    async onload(): Promise<void> {
        this.registerView(
            VIEW_CLIP_MANAGER,
            (leaf) => new ClipManagerView(leaf)
        )

        this.registerMarkdownPostProcessor((el, ctx) => {
            processHighlight(el, ctx)
            processFullPage(this.app, el, ctx)
        })

        // Re-scan on leaf change to handle Obsidian's reading view cache resets
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', (leaf) => {
                if (!leaf) return
                const view = leaf.view
                if (!(view instanceof MarkdownView)) return
                if (view.getMode() !== 'preview') return

                setTimeout(() => {
                    const section = view.containerEl.querySelector('.markdown-preview-section')
                    if (section) scanAndTransform(section as HTMLElement)
                    injectFullPageHeader(this.app, view.containerEl, view.file?.path ?? '')
                }, 100)
            })
        )

        this.addRibbonIcon('scissors', 'QuickClip Manager', () => this.activateView())

        this.addCommand({
            id: 'open-manager',
            name: 'Open clip manager',
            callback: () => this.activateView(),
        })
    }

    onunload(): void {
        this.app.workspace.detachLeavesOfType(VIEW_CLIP_MANAGER)
    }

    private async activateView(): Promise<void> {
        const { workspace } = this.app
        const existing = workspace.getLeavesOfType(VIEW_CLIP_MANAGER)[0]
        if (existing) { workspace.revealLeaf(existing); return }

        const leaf = workspace.getLeaf(false)
        await leaf.setViewState({ type: VIEW_CLIP_MANAGER, active: true })
        workspace.revealLeaf(leaf)
    }
}
