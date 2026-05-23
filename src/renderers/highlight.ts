import { MarkdownPostProcessorContext, MarkdownRenderChild } from 'obsidian'

export function processHighlight(el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
    if (el.closest('.cm-editor')) return
    if (!el.querySelector('[data-callout="quote"]')) return
    ctx.addChild(new HighlightScanner(el))
}

class HighlightScanner extends MarkdownRenderChild {
    onload(): void {
        const tryTransform = () => {
            if (!this.containerEl.parentElement) {
                requestAnimationFrame(tryTransform)
                return
            }
            transformSection(this.containerEl)
        }
        tryTransform()
    }
}

function transformSection(calloutSection: HTMLElement): void {
    // Already transformed
    if (calloutSection.querySelector('.qc-highlight-card')) return

    const callout = calloutSection.querySelector<HTMLElement>('[data-callout="quote"]')
    if (!callout) return

    // The metadata table must be the immediate next sibling
    const tableSection = calloutSection.nextElementSibling as HTMLElement | null
    if (!tableSection) return

    const table = tableSection.querySelector('table')
    if (!table) return

    const rows = Array.from(table.querySelectorAll('tr'))
    const hasCaptured = rows.some(r => (r.cells[0]?.textContent?.trim() ?? '') === 'Captured')
    if (!hasCaptured) return

    // Optional [!note] block immediately before this callout
    const prevSection = calloutSection.previousElementSibling as HTMLElement | null
    const noteCallout = prevSection?.querySelector<HTMLElement>('[data-callout="note"]') ?? null

    buildCard(calloutSection, tableSection, callout, table as HTMLTableElement, noteCallout, prevSection)

}

// Called from main.ts on active-leaf-change to re-apply after Obsidian cache resets
export function scanAndTransform(container: HTMLElement): void {
    const sections = Array.from(container.querySelectorAll('[data-callout="quote"]'))
    sections.forEach(callout => {
        const section = callout.closest('.el-div, .el-blockquote, div') as HTMLElement | null
        if (section && section.parentElement === container) {
            transformSection(section)
        }
    })
}

function buildCard(
    calloutSection: HTMLElement,
    tableSection: HTMLElement,
    callout: HTMLElement,
    table: HTMLTableElement,
    noteCallout: HTMLElement | null,
    noteSection: HTMLElement | undefined | null
): void {
    const contentEl = callout.querySelector('.callout-content')
    if (!contentEl) return

    let viewHref = ''
    let captured = ''
    const tags: string[] = []

    for (const row of Array.from(table.querySelectorAll('tr'))) {
        const key = row.cells[0]?.textContent?.trim() ?? ''
        const valueCell = row.cells[1]

        if (key === 'Open') {
            viewHref = valueCell?.querySelector('a')?.href ?? ''
        } else if (key === 'Captured') {
            captured = (valueCell?.textContent?.trim() ?? '').replace(' | ', ' · ')
        } else if (key === 'Tags') {
            valueCell?.textContent?.split(/\s+/).filter(Boolean).forEach(t => tags.push(t))
        }
    }

    const card = document.createElement('div')
    card.className = 'qc-highlight-card'

    // Quote / image content
    const quoteEl = document.createElement('div')
    quoteEl.className = 'qc-highlight-quote'
    quoteEl.innerHTML = contentEl.innerHTML

    // If content is purely an image, add image-specific class for styling
    const hasOnlyImage = !!(quoteEl.querySelector('img')) &&
        (quoteEl.textContent?.trim() ?? '') === ''
    if (hasOnlyImage) quoteEl.classList.add('qc-highlight-quote--image')

    card.appendChild(quoteEl)

    // Inline note annotation
    if (noteCallout) {
        const noteContent = noteCallout.querySelector('.callout-content')
        if (noteContent) {
            const noteEl = document.createElement('div')
            noteEl.className = 'qc-highlight-note'
            noteEl.innerHTML = noteContent.innerHTML
            card.appendChild(noteEl)
            if (noteSection) noteSection.style.display = 'none'
        }
    }

    // Meta
    const metaEl = document.createElement('div')
    metaEl.className = 'qc-highlight-meta'

    if (tags.length) {
        const tagsEl = document.createElement('div')
        tagsEl.className = 'qc-highlight-tags'
        tags.forEach(tag => {
            const chip = document.createElement('a')
            chip.className = 'tag'
            chip.textContent = tag
            chip.href = tag
            tagsEl.appendChild(chip)
        })
        metaEl.appendChild(tagsEl)
    }

    const actionsEl = document.createElement('div')
    actionsEl.className = 'qc-highlight-actions'

    if (viewHref) {
        const link = document.createElement('a')
        link.href = viewHref
        link.className = 'qc-view-link external-link'
        link.textContent = 'View with highlight ↗'
        link.target = '_blank'
        link.rel = 'noopener'
        actionsEl.appendChild(link)
    }

    if (captured) {
        const capturedEl = document.createElement('span')
        capturedEl.className = 'qc-captured'
        capturedEl.textContent = captured
        actionsEl.appendChild(capturedEl)
    }

    metaEl.appendChild(actionsEl)
    card.appendChild(metaEl)

    calloutSection.innerHTML = ''
    calloutSection.appendChild(card)
    tableSection.classList.add('qc-table-hidden')
    tableSection.style.display = 'none'
}
