import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import {
    acquireUserMedia,
    captureVideoFrameToJpeg,
    DEFAULT_VIDEO_CONSTRAINTS,
    releaseStream
} from 'c/photoCaptureCameraUtility';

export default class PhotoCapture extends LightningElement {
    // === FLOW INPUTS (@api) ===
    @api headingText = 'Capture Applicant Photo';
    @api photoInstructions =
        "Ensure the applicant's face is clearly visible within the frame. Only the current photo will be captured; do not take a picture of a screen or existing photo.";

    // === FLOW OUTPUTS: private backing + accessors (satisfies @lwc/lwc/no-api-reassignments) ===
    _photoDataUrl = null;
    @track _photoCaptured = false;
    @track cameraActive = false;
    @track stream = null;
    @track _displayPhotoDataUrl = null;

    // === DOM REFERENCES ===
    videoElement;
    canvasPhotoElement;

    @api
    get photoDataUrl() {
        return this._photoDataUrl;
    }

    set photoDataUrl(value) {
        this._photoDataUrl = value;
        if (value) {
            this._displayPhotoDataUrl = 'data:image/jpeg;base64,' + value;
            this._photoCaptured = true;
        } else {
            this._displayPhotoDataUrl = null;
            this._photoCaptured = false;
        }
    }

    @api
    get photoCaptured() {
        return this._photoCaptured;
    }

    set photoCaptured(value) {
        this._photoCaptured = value;
    }

    disconnectedCallback() {
        this.stopCamera();
    }

    renderedCallback() {
        if (!this.videoElement) {
            this.videoElement = this.template.querySelector('video');
        }
        if (!this.canvasPhotoElement) {
            this.canvasPhotoElement = this.template.querySelector('.photo-canvas');
        }
    }

    /** Buttons always visible; use disabled to enforce Start then Capture. */
    get startCameraDisabled() {
        return this.cameraActive || this._photoCaptured;
    }

    get capturePhotoDisabled() {
        return !this.cameraActive || this._photoCaptured;
    }

    get retakePhotoDisabled() {
        return !this._photoCaptured;
    }

    get showPlaceholder() {
        return !this.cameraActive && !this._photoCaptured;
    }

    get videoHiddenClass() {
        if (!this.cameraActive || this._photoCaptured) {
            return 'video-feed hidden';
        }
        return 'video-feed';
    }

    stopCamera() {
        releaseStream(this.stream, this.videoElement);
        this.stream = null;
        this.cameraActive = false;
    }

    async startCamera() {
        try {
            this.stopCamera();
            this.stream = await acquireUserMedia(DEFAULT_VIDEO_CONSTRAINTS);
            this.videoElement.srcObject = this.stream;
            this.cameraActive = true;
        } catch (err) {
            console.error('Camera access failed:', err);
            if (err.code === 'BROWSER_UNSUPPORTED') {
                this.showToast('Browser not supported', err.message, 'error');
            } else {
                this.showToast(
                    'Camera error',
                    'Access denied or failed. Check browser or OS permissions.',
                    'error'
                );
            }
            this.cameraActive = false;
        }
    }

    handleStartCameraClick() {
        this.videoElement = this.template.querySelector('video');
        if (this.videoElement) {
            this.startCamera();
        } else {
            this.showToast('Setup error', 'Video element not found.', 'error');
        }
    }

    handleCapturePhoto() {
        const video = this.videoElement;
        const canvas = this.canvasPhotoElement;
        if (!video || !canvas || !this.stream) {
            this.showToast('Setup error', 'Camera feed is not active or elements missing.', 'error');
            this.stopCamera();
            return;
        }

        const { displayDataUrl, rawBase64 } = captureVideoFrameToJpeg(video, canvas);
        this._displayPhotoDataUrl = displayDataUrl;
        this._photoDataUrl = rawBase64;
        this._photoCaptured = true;
        this.stopCamera();
    }

    handleRetakePhoto() {
        this._photoCaptured = false;
        this._photoDataUrl = null;
        this._displayPhotoDataUrl = null;

        Promise.resolve().then(() => {
            this.videoElement = this.template.querySelector('video');
            if (this.videoElement) {
                this.startCamera();
            } else {
                this.showToast('Setup error', 'Could not find video element to retake photo.', 'error');
            }
        });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant,
                mode: 'dismissable'
            })
        );
    }
}
