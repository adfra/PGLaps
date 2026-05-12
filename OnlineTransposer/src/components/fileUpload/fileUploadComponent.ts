/**
 * Component for handling file uploads
 * File path: src/components/fileUpload/fileUploadComponent.ts
 */

import { FileService, IFileService } from '../../services/fileService';
import { XCTask } from '../../types/taskTypes';
import { Airspace } from '../../types/airspaceTypes';

interface UploadCallbacks {
    onTaskLoaded: (task: XCTask) => void;
    onAirspaceLoaded: (airspace: Airspace[]) => void;
    onError?: (error: Error) => void;
    onProgress?: (percent: number) => void;
}

export class FileUploadComponent {
    private container: HTMLElement;
    private dropZoneContainer?: HTMLElement;
    private dropZone: HTMLElement;
    private taskInput: HTMLInputElement;
    private airspaceInput: HTMLInputElement;
    private callbacks: UploadCallbacks;
    private fileService: IFileService;

    constructor(containerId: string, callbacks: UploadCallbacks, dropZoneContainerId?: string) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container element ${containerId} not found`);
        }

        this.container = container;
        this.callbacks = callbacks;
        this.fileService = new FileService();

        if (dropZoneContainerId) {
            const dropZoneContainer = document.getElementById(dropZoneContainerId);
            if (dropZoneContainer) {
                this.dropZoneContainer = dropZoneContainer;
            }
        }

        this.initializeUploadUI();
        this.setupDragAndDrop();
    }

    /**
     * Initialize the upload interface
     */
    private initializeUploadUI(): void {
        // Create buttons container (for middle column)
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'upload-buttons-container';

        // Add label above buttons
        const uploadLabel = document.createElement('div');
        uploadLabel.className = 'upload-section-label';
        uploadLabel.textContent = '...or upload files...';
        buttonsContainer.appendChild(uploadLabel);

        // Create task file input
        this.taskInput = this.createFileInput('task', 'xctsk', 'Upload Task');

        // Create airspace file input
        this.airspaceInput = this.createFileInput('airspace', 'txt', 'Upload Airspace');

        // Add buttons to buttons container
        buttonsContainer.appendChild(this.taskInput.parentElement!);
        buttonsContainer.appendChild(this.airspaceInput.parentElement!);

        this.container.appendChild(buttonsContainer);

        // Create drop zone (in separate container if provided)
        const dropZoneWrapper = document.createElement('div');
        dropZoneWrapper.className = 'drop-zone-wrapper';

        // Add label above drop zone
        const dropZoneLabel = document.createElement('div');
        dropZoneLabel.className = 'upload-section-label';
        dropZoneLabel.textContent = '...or drag and drop files here.';
        dropZoneWrapper.appendChild(dropZoneLabel);

        this.dropZone = document.createElement('div');
        this.dropZone.className = 'drop-zone';
        this.dropZone.innerHTML = `
            <div class="drop-zone-content">
                <p>Drag & Drop</p>
                <p class="small">.xctsk / .txt</p>
            </div>
        `;

        dropZoneWrapper.appendChild(this.dropZone);

        if (this.dropZoneContainer) {
            this.dropZoneContainer.appendChild(dropZoneWrapper);
        } else {
            this.container.appendChild(dropZoneWrapper);
        }

        // Add styles
        this.addStyles();
    }

    /**
     * Create a styled file input element
     */
    private createFileInput(name: string, accept: string, labelText: string): HTMLInputElement {
        const wrapper = document.createElement('div');
        wrapper.className = 'file-input-wrapper';

        const input = document.createElement('input');
        input.type = 'file';
        input.id = `${name}-input`;
        input.accept = `.${accept}`;
        input.className = 'file-input';

        const label = document.createElement('label');
        label.htmlFor = input.id;
        label.className = 'file-input-label';
        label.textContent = labelText;

        wrapper.appendChild(input);
        wrapper.appendChild(label);

        input.addEventListener('change', (event) => {
            const files = (event.target as HTMLInputElement).files;
            if (files && files[0]) {
                this.handleFileSelection(files[0]);
            }
        });

        return input;
    }

    /**
     * Set up drag and drop event handlers
     */
    private setupDragAndDrop(): void {
        const preventDefault = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
        };

        this.dropZone.addEventListener('dragenter', (e) => {
            preventDefault(e);
            this.dropZone.classList.add('drag-over');
        });

        this.dropZone.addEventListener('dragover', preventDefault);

        this.dropZone.addEventListener('dragleave', (e) => {
            preventDefault(e);
            this.dropZone.classList.remove('drag-over');
        });

        this.dropZone.addEventListener('drop', (e) => {
            preventDefault(e);
            this.dropZone.classList.remove('drag-over');

            const dt = e.dataTransfer;
            if (dt?.files) {
                Array.from(dt.files).forEach(file => {
                    this.handleFileSelection(file);
                });
            }
        });
    }

    /**
     * Handle file selection from input or drop
     */
    private async handleFileSelection(file: File): Promise<void> {
        try {
            if (file.name.toLowerCase().endsWith('.xctsk')) {
                const task = await this.fileService.parseTaskFile(file);
                this.callbacks.onTaskLoaded(task);
            } else if (file.name.toLowerCase().endsWith('.txt')) {
                const airspace = await this.fileService.parseAirspaceFile(file);
                this.callbacks.onAirspaceLoaded(airspace);
            } else {
                throw new Error('Unsupported file type');
            }
        } catch (error) {
            if (this.callbacks.onError) {
                this.callbacks.onError(error as Error);
            }
            console.error('File processing error:', error);
        }
    }

    /**
     * Add required styles to the document
     */
    private addStyles(): void {
        const styleId = 'file-upload-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .upload-buttons-container {
                display: flex;
                flex-direction: column;
                gap: 6px;
                height: 100%;
                min-width: 0;
            }

            .drop-zone-wrapper {
                display: flex;
                flex-direction: column;
                gap: 6px;
                height: 100%;
                min-width: 0;
            }

            .upload-section-label {
                font-size: 13px;
                font-weight: 600;
                color: #333;
                margin: 0;
                white-space: nowrap;
            }

            .file-input-wrapper {
                display: flex;
            }

            .file-input {
                display: none;
            }

            .file-input-label {
                display: block;
                width: 100%;
                padding: 10px 16px;
                background: #007bff;
                color: white;
                border-radius: 4px;
                cursor: pointer;
                transition: background 0.3s;
                text-align: center;
                font-size: 13px;
                white-space: nowrap;
            }

            .file-input-label:hover {
                background: #0056b3;
            }

            .drop-zone {
                border: 2px dashed #ccc;
                border-radius: 8px;
                padding: 15px;
                text-align: center;
                transition: all 0.3s;
                display: flex;
                flex-direction: column;
                justify-content: center;
                flex: 1;
                min-height: 70px;
                box-sizing: border-box;
            }

            .drop-zone.drag-over {
                border-color: #007bff;
                background: rgba(0, 123, 255, 0.1);
            }

            .drop-zone-content p {
                margin: 2px 0;
                color: #666;
                font-size: 13px;
            }

            .small {
                font-size: 0.85em;
                color: #999;
            }

            /* Mobile responsive */
            @media (max-width: 768px) {
                .file-input-label {
                    padding: 12px 10px;
                    font-size: 13px;
                }

                .drop-zone {
                    min-height: 60px;
                    padding: 10px;
                }

                .drop-zone-content p {
                    font-size: 12px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Reset file inputs
     */
    public reset(): void {
        this.taskInput.value = '';
        this.airspaceInput.value = '';
    }

    /**
     * Clean up resources
     */
    public destroy(): void {
        this.taskInput.remove();
        this.airspaceInput.remove();
        this.dropZone.remove();
        this.container.innerHTML = '';
        if (this.dropZoneContainer) {
            this.dropZoneContainer.innerHTML = '';
        }
    }
}

export default FileUploadComponent;
