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
    private dropZone: HTMLElement;
    private taskInput: HTMLInputElement;
    private airspaceInput: HTMLInputElement;
    private callbacks: UploadCallbacks;
    private fileService: IFileService;

    constructor(containerId: string, callbacks: UploadCallbacks) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container element ${containerId} not found`);
        }

        this.container = container;
        this.callbacks = callbacks;
        this.fileService = new FileService();

        this.initializeUploadUI();
        this.setupDragAndDrop();
    }

    /**
     * Initialize the upload interface
     */
    private initializeUploadUI(): void {
        // Create container for upload elements (horizontal layout)
        const uploadContainer = document.createElement('div');
        uploadContainer.className = 'upload-container';

        // Create buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'upload-buttons-container';

        // Create task file input
        this.taskInput = this.createFileInput('task', 'xctsk', 'Upload Task (.xctsk)');

        // Create airspace file input
        this.airspaceInput = this.createFileInput('airspace', 'txt', 'Upload Airspace (.txt)');

        // Create drop zone
        this.dropZone = document.createElement('div');
        this.dropZone.className = 'drop-zone';
        this.dropZone.innerHTML = `
            <div class="drop-zone-content">
                <p>Drag & Drop</p>
                <p class="small">.xctsk / .txt</p>
            </div>
        `;

        // Add elements to containers
        buttonsContainer.appendChild(this.taskInput.parentElement!);
        buttonsContainer.appendChild(this.airspaceInput.parentElement!);

        uploadContainer.appendChild(buttonsContainer);
        uploadContainer.appendChild(this.dropZone);

        this.container.appendChild(uploadContainer);

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
        const style = document.createElement('style');
        style.textContent = `
            .upload-container {
                display: flex;
                gap: 10px;
                align-items: stretch;
            }

            .upload-buttons-container {
                display: flex;
                flex-direction: column;
                gap: 8px;
                justify-content: center;
                flex-shrink: 0;
            }

            .file-input-wrapper {
                display: flex;
                align-items: stretch;
            }

            .file-input {
                display: none;
            }

            .file-input-label {
                display: inline-block;
                padding: 10px 16px;
                background: #007bff;
                color: white;
                border-radius: 4px;
                cursor: pointer;
                transition: background 0.3s;
                text-align: center;
                font-size: 14px;
                white-space: nowrap;
            }

            .file-input-label:hover {
                background: #0056b3;
            }

            .drop-zone {
                flex: 1;
                border: 2px dashed #ccc;
                border-radius: 8px;
                padding: 15px;
                text-align: center;
                transition: all 0.3s;
                display: flex;
                flex-direction: column;
                justify-content: center;
                min-width: 120px;
            }

            .drop-zone.drag-over {
                border-color: #007bff;
                background: rgba(0, 123, 255, 0.1);
            }

            .drop-zone-content p {
                margin: 2px 0;
                color: #666;
                font-size: 14px;
            }

            .small {
                font-size: 0.85em;
                color: #999;
            }

            /* Mobile responsive */
            @media (max-width: 768px) {
                .upload-container {
                    flex-direction: column;
                }

                .upload-buttons-container {
                    flex-direction: row;
                }

                .file-input-wrapper {
                    flex: 1;
                }

                .file-input-label {
                    padding: 12px 10px;
                    font-size: 13px;
                }

                .drop-zone {
                    min-height: 60px;
                    padding: 10px;
                }

                .drop-zone-content p {
                    font-size: 13px;
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
    }
}

export default FileUploadComponent;
