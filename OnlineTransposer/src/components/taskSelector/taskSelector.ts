/**
 * Component for selecting official task templates from pglaps.com
 * File path: src/components/taskSelector/taskSelector.ts
 */

import { FileService, IFileService } from '../../services/fileService';
import { XCTask } from '../../types/taskTypes';
import { Airspace } from '../../types/airspaceTypes';

interface TaskTemplate {
    id: string;
    name: string;
    image: string;
    xctskUrl: string;
    airspaceUrl: string;
}

interface TaskTemplatesResponse {
    tasks: TaskTemplate[];
}

interface SelectorCallbacks {
    onTaskLoaded: (task: XCTask) => void;
    onAirspaceLoaded: (airspace: Airspace[]) => void;
    onError?: (error: Error) => void;
}

export class TaskSelectorComponent {
    private container: HTMLElement;
    private callbacks: SelectorCallbacks;
    private fileService: IFileService;
    private templates: TaskTemplate[] = [];
    private dropdown: HTMLSelectElement;
    private previewImage: HTMLImageElement;

    constructor(containerId: string, callbacks: SelectorCallbacks) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container element ${containerId} not found`);
        }

        this.container = container;
        this.callbacks = callbacks;
        this.fileService = new FileService();

        this.initializeUI();
        this.loadTemplates();
    }

    /**
     * Initialize the selector UI
     */
    private initializeUI(): void {
        const selectorContainer = document.createElement('div');
        selectorContainer.className = 'task-selector-container';

        // Create label
        const label = document.createElement('label');
        label.className = 'task-selector-label';
        label.textContent = 'Official Tasks:';

        // Create wrapper for dropdown and preview
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'task-selector-content';

        // Create dropdown
        this.dropdown = document.createElement('select');
        this.dropdown.className = 'task-selector-dropdown';
        this.dropdown.disabled = true;
        this.dropdown.innerHTML = '<option value="">Loading tasks...</option>';

        // Create preview image container
        const previewContainer = document.createElement('div');
        previewContainer.className = 'task-preview-container';

        this.previewImage = document.createElement('img');
        this.previewImage.className = 'task-preview-image';
        this.previewImage.alt = 'Task preview';
        this.previewImage.style.display = 'none';

        previewContainer.appendChild(this.previewImage);
        contentWrapper.appendChild(this.dropdown);
        contentWrapper.appendChild(previewContainer);
        selectorContainer.appendChild(label);
        selectorContainer.appendChild(contentWrapper);

        this.container.appendChild(selectorContainer);

        // Add event listener
        this.dropdown.addEventListener('change', () => this.handleSelection());

        // Add styles
        this.addStyles();
    }

    /**
     * Load task templates from WordPress injected data
     */
    private async loadTemplates(): Promise<void> {
        try {
            // Try to use WordPress injected data first
            if ((window as any).pglapsData && (window as any).pglapsData.tasks) {
                this.templates = (window as any).pglapsData.tasks.tasks || (window as any).pglapsData.tasks || [];
            } else {
                // Fallback: fetch from tasks.json
                const pluginUrl = this.getPluginUrl();
                const response = await fetch(`${pluginUrl}tasks.json`);
                if (!response.ok) {
                    throw new Error(`Failed to load tasks: ${response.statusText}`);
                }
                const data: TaskTemplatesResponse = await response.json();
                this.templates = data.tasks || [];
            }

            this.populateDropdown();
        } catch (error) {
            console.error('Error loading task templates:', error);
            this.dropdown.innerHTML = '<option value="">Failed to load tasks</option>';
            if (this.callbacks.onError) {
                this.callbacks.onError(error as Error);
            }
        }
    }

    /**
     * Get the plugin base URL
     */
    private getPluginUrl(): string {
        // Try WordPress injected data first
        if ((window as any).pglapsData && (window as any).pglapsData.pluginUrl) {
            return (window as any).pglapsData.pluginUrl;
        }

        // Fallback: try to detect from script tags
        const scriptElements = document.getElementsByTagName('script');
        for (let i = 0; i < scriptElements.length; i++) {
            const src = (scriptElements[i] as HTMLScriptElement).src;
            if (src && src.includes('bundle.js')) {
                const baseUrl = src.substring(0, src.lastIndexOf('/'));
                return `${baseUrl}/`;
            }
        }

        // Default fallback
        return './';
    }

    /**
     * Populate dropdown with loaded templates
     */
    private populateDropdown(): void {
        this.dropdown.disabled = false;
        this.dropdown.innerHTML = '<option value="">Select a task...</option>';

        this.templates.forEach(task => {
            const option = document.createElement('option');
            option.value = task.id;
            option.textContent = task.name;
            option.dataset.image = task.image;
            this.dropdown.appendChild(option);
        });
    }

    /**
     * Handle task selection
     */
    private async handleSelection(): Promise<void> {
        const selectedId = this.dropdown.value;
        if (!selectedId) {
            this.previewImage.style.display = 'none';
            return;
        }

        const task = this.templates.find(t => t.id === selectedId);
        if (!task) return;

        // Update preview image
        this.previewImage.src = task.image;
        this.previewImage.style.display = 'block';

        // Load both task and airspace files
        await this.loadTaskFiles(task);
    }

    /**
     * Load task and airspace files from URLs
     */
    private async loadTaskFiles(task: TaskTemplate): Promise<void> {
        try {
            // Load task file
            const taskResponse = await fetch(task.xctskUrl);
            if (!taskResponse.ok) {
                throw new Error(`Failed to load task file: ${taskResponse.statusText}`);
            }
            const taskBlob = await taskResponse.blob();
            const taskFile = new File([taskBlob], 'task.xctsk', { type: 'application/octet-stream' });
            const parsedTask = await this.fileService.parseTaskFile(taskFile);
            this.callbacks.onTaskLoaded(parsedTask);

            // Load airspace file if URL is provided
            if (task.airspaceUrl) {
                const airspaceResponse = await fetch(task.airspaceUrl);
                if (airspaceResponse.ok) {
                    const airspaceBlob = await airspaceResponse.blob();
                    const airspaceFile = new File([airspaceBlob], 'airspace.txt', { type: 'text/plain' });
                    const parsedAirspace = await this.fileService.parseAirspaceFile(airspaceFile);
                    this.callbacks.onAirspaceLoaded(parsedAirspace);
                } else {
                    console.warn(`Airspace file unavailable (${airspaceResponse.status}): ${task.airspaceUrl}`);
                }
            }

        } catch (error) {
            console.error('Error loading task files:', error);
            if (this.callbacks.onError) {
                this.callbacks.onError(error as Error);
            }
        }
    }

    /**
     * Add required styles to the document
     */
    private addStyles(): void {
        const styleId = 'task-selector-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .task-selector-container {
                display: flex;
                flex-direction: column;
                gap: 6px;
                flex: 1;
                min-width: 0;
            }

            .task-selector-label {
                font-size: 13px;
                font-weight: 600;
                color: #333;
                margin: 0;
            }

            .task-selector-content {
                display: flex;
                gap: 8px;
                align-items: center;
            }

            .task-selector-dropdown {
                flex: 1;
                padding: 8px 10px;
                border: 1px solid #ccc;
                border-radius: 4px;
                font-size: 13px;
                background: white;
                cursor: pointer;
                min-width: 0;
            }

            .task-selector-dropdown:hover {
                border-color: #007bff;
            }

            .task-selector-dropdown:focus {
                outline: none;
                border-color: #007bff;
                box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
            }

            .task-preview-container {
                flex-shrink: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #f5f5f5;
                border-radius: 4px;
                overflow: hidden;
            }

            .task-preview-image {
                max-width: 28px;
                max-height: 28px;
                object-fit: contain;
            }

            /* Mobile responsive */
            @media (max-width: 768px) {
                .task-selector-content {
                    flex-direction: column;
                    align-items: stretch;
                }

                .task-preview-container {
                    width: 100%;
                    height: 60px;
                }

                .task-preview-image {
                    max-width: 100%;
                    max-height: 56px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Clean up resources
     */
    public destroy(): void {
        this.dropdown.remove();
        this.previewImage.remove();
        this.container.innerHTML = '';
    }
}

export default TaskSelectorComponent;
