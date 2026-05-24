import { App, PluginSettingTab, Setting } from 'obsidian'
import QuickClipCapturePlugin from './main'
import { VIEW_CLIP_MANAGER } from './views/ClipManagerView'

export class QuickClipSettingTab extends PluginSettingTab {
    constructor(app: App, private plugin: QuickClipCapturePlugin) {
        super(app, plugin)
    }

    display(): void {
        const { containerEl } = this
        containerEl.empty()

        containerEl.createEl('h3', { text: 'Clip Manager' })

        new Setting(containerEl)
            .setName('Auto-open on startup')
            .setDesc('Open the clip manager when Obsidian starts.')
            .addToggle(t => t
                .setValue(this.plugin.settings.autoOpenOnStartup)
                .onChange(async val => {
                    this.plugin.settings.autoOpenOnStartup = val
                    await this.plugin.saveSettings()
                }))

        new Setting(containerEl)
            .setName('Row density')
            .setDesc('Cell padding in the clip table.')
            .addDropdown(d => d
                .addOption('compact', 'Compact')
                .addOption('comfortable', 'Comfortable')
                .addOption('spacious', 'Spacious')
                .setValue(this.plugin.settings.rowDensity)
                .onChange(async val => {
                    this.plugin.settings.rowDensity = val as 'compact' | 'comfortable' | 'spacious'
                    await this.plugin.saveSettings()
                    this.rerenderView()
                }))

        new Setting(containerEl)
            .setName('Snippet length')
            .setDesc('Characters shown in the Clip column (15–60).')
            .addSlider(s => s
                .setLimits(15, 60, 1)
                .setValue(this.plugin.settings.snippetLength)
                .setDynamicTooltip()
                .onChange(async val => {
                    this.plugin.settings.snippetLength = val
                    await this.plugin.saveSettings()
                    this.rerenderView()
                }))

        new Setting(containerEl)
            .setName('Date format')
            .addDropdown(d => d
                .addOption('absolute', 'Absolute (21 May)')
                .addOption('relative', 'Relative (3 days ago)')
                .addOption('full', 'Full (21 May 2026)')
                .setValue(this.plugin.settings.dateFormat)
                .onChange(async val => {
                    this.plugin.settings.dateFormat = val as 'absolute' | 'relative' | 'full'
                    await this.plugin.saveSettings()
                    this.rerenderView()
                }))

        new Setting(containerEl)
            .setName('File path display')
            .addDropdown(d => d
                .addOption('full', 'Full path')
                .addOption('filename', 'Filename only')
                .setValue(this.plugin.settings.filePathDisplay)
                .onChange(async val => {
                    this.plugin.settings.filePathDisplay = val as 'full' | 'filename'
                    await this.plugin.saveSettings()
                    this.rerenderView()
                }))

        containerEl.createEl('h3', { text: 'Editing' })

        new Setting(containerEl)
            .setName('Confirm before delete')
            .setDesc('Show a confirmation prompt before deleting a clip.')
            .addToggle(t => t
                .setValue(this.plugin.settings.confirmDelete)
                .onChange(async val => {
                    this.plugin.settings.confirmDelete = val
                    await this.plugin.saveSettings()
                }))
    }

    private rerenderView(): void {
        const leaves = this.plugin.app.workspace.getLeavesOfType(VIEW_CLIP_MANAGER)
        for (const leaf of leaves) {
            const view = leaf.view as any
            if (typeof view.rerenderTable === 'function') view.rerenderTable()
        }
    }
}
