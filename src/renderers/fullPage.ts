import { App, MarkdownPostProcessorContext, MarkdownRenderChild, TFile } from 'obsidian'

const HEADER_CLASS = 'qc-reading-header'

export function processFullPage(app: App, el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
    if (el.closest('.cm-editor')) return

    const file = app.vault.getAbstractFileByPath(ctx.sourcePath)
    if (!(file instanceof TFile)) return

    const cache = app.metadataCache.getFileCache(file)
    if (cache?.frontmatter?.clip_type !== 'full-page') return

    ctx.addChild(new FullPageHeader(app, el, ctx.sourcePath))
}

class FullPageHeader extends MarkdownRenderChild {
    constructor(private app: App, el: HTMLElement, private sourcePath: string) {
        super(el)
    }

    onload(): void {
        const inject = () => injectHeader(this.app, this.containerEl, this.sourcePath)
        if (this.containerEl.parentElement) {
            inject()
        } else {
            requestAnimationFrame(inject)
        }
    }
}

export function injectFullPageHeader(app: App, container: HTMLElement, sourcePath: string): void {
    // Find the preview section container
    const section = container.querySelector('.markdown-preview-section') as HTMLElement | null
    if (!section) return

    // Derive the file from the view's source path
    injectHeader(app, section.firstElementChild as HTMLElement, sourcePath)
}

function injectHeader(app: App, el: HTMLElement, sourcePath: string): void {
    const container = el?.closest('.markdown-preview-section') as HTMLElement | null
        ?? el?.parentElement

    if (!container) return

    // Only inject once per render
    if (container.querySelector(`.${HEADER_CLASS}`)) return

    const file = app.vault.getAbstractFileByPath(sourcePath)
    if (!(file instanceof TFile)) return

    const cache = app.metadataCache.getFileCache(file)
    const fm = cache?.frontmatter
    if (!fm || fm.clip_type !== 'full-page') return

    const wordCount: number = fm.word_count ?? 0
    const readingMins = Math.max(1, Math.round(wordCount / 200))

    const header = document.createElement('div')
    header.className = HEADER_CLASS

    const metaEl = document.createElement('div')
    metaEl.className = 'qc-reading-meta'

    const parts: { cls: string; text: string }[] = []
    if (fm.author) parts.push({ cls: 'qc-reading-author', text: fm.author })
    if (fm.published) parts.push({ cls: 'qc-reading-published', text: fm.published })
    if (fm.site) parts.push({ cls: 'qc-reading-site', text: fm.site })
    parts.push({ cls: 'qc-reading-stats', text: `${wordCount.toLocaleString()} words · ${readingMins} min read` })

    parts.forEach(({ cls, text }) => {
        const span = document.createElement('span')
        span.className = cls
        span.textContent = text
        metaEl.appendChild(span)
    })

    const progressBar = document.createElement('div')
    progressBar.className = 'qc-progress-bar'
    const progressFill = document.createElement('div')
    progressFill.className = 'qc-progress-fill'
    progressBar.appendChild(progressFill)

    header.appendChild(metaEl)
    header.appendChild(progressBar)
    container.prepend(header)

    // Scroll progress
    const scrollEl = container.closest('.markdown-preview-view') as HTMLElement | null
    if (scrollEl) {
        const update = () => {
            const { scrollTop, scrollHeight, clientHeight } = scrollEl
            const pct = scrollHeight <= clientHeight ? 100
                : Math.min(100, Math.round((scrollTop / (scrollHeight - clientHeight)) * 100))
            progressFill.style.width = `${pct}%`
        }
        scrollEl.addEventListener('scroll', update, { passive: true })
    }
}
