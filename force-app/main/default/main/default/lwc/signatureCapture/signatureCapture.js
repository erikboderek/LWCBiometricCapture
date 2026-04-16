import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { JPEG_QUALITY } from 'c/photoCaptureCameraUtility';

const LOGICAL_WIDTH = 400;
const LOGICAL_HEIGHT = 150;

export default class SignatureCapture extends LightningElement {
    // === FLOW INPUTS (@api) ===
    @api headingText = 'Capture Applicant Signature';
    @api signatureDisclaimer =
        'By providing your signature below, you affirm under penalty of law that all information, photo, and data provided during this application process is true, accurate, and complete to the best of your knowledge. This electronic signature carries the same legal weight as a handwritten signature.';

    // === FLOW OUTPUTS: private backing + accessors ===
    _signatureDataUrl = null;
    _signatureComplete = false;

    // === INTERNAL STATE (@track) ===
    @track signatureCaptured = false;

    // === DOM REFERENCES ===
    canvasSignatureElement;
    ctxSignature;
    isDrawing = false;

    _logicalW = LOGICAL_WIDTH;
    _logicalH = LOGICAL_HEIGHT;

    @api
    get signatureDataUrl() {
        return this._signatureDataUrl;
    }

    set signatureDataUrl(value) {
        this._signatureDataUrl = value;
    }

    @api
    get signatureComplete() {
        return this._signatureComplete;
    }

    set signatureComplete(value) {
        this._signatureComplete = value;
    }

    renderedCallback() {
        const canvas = this.template.querySelector('.signature-canvas');
        if (canvas && canvas !== this.canvasSignatureElement) {
            this.canvasSignatureElement = canvas;
            this._initSignatureCanvas(canvas);
        }
    }

    _initSignatureCanvas(canvas) {
        const dpr = window.devicePixelRatio || 1;
        const w = LOGICAL_WIDTH;
        const h = LOGICAL_HEIGHT;
        this._logicalW = w;
        this._logicalH = h;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        const ctx = canvas.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000000';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        this.ctxSignature = ctx;
    }

    _pointerToLogical(event) {
        const canvas = this.canvasSignatureElement;
        const rect = canvas.getBoundingClientRect();
        let cx;
        let cy;
        if (event.touches && event.touches.length > 0) {
            cx = event.touches[0].clientX;
            cy = event.touches[0].clientY;
        } else if (event.changedTouches && event.changedTouches.length > 0) {
            cx = event.changedTouches[0].clientX;
            cy = event.changedTouches[0].clientY;
        } else {
            cx = event.clientX;
            cy = event.clientY;
        }
        const x = ((cx - rect.left) / rect.width) * this._logicalW;
        const y = ((cy - rect.top) / rect.height) * this._logicalH;
        return { x, y };
    }

    handleSignatureStart(event) {
        if (!this.ctxSignature || !this.canvasSignatureElement) {
            return;
        }
        if (event.type === 'touchstart') {
            event.preventDefault();
        }
        this.isDrawing = true;
        const { x, y } = this._pointerToLogical(event);
        this.ctxSignature.beginPath();
        this.ctxSignature.moveTo(x, y);
    }

    handleSignatureDraw(event) {
        if (!this.isDrawing || !this.ctxSignature) {
            return;
        }
        if (event.type === 'touchmove') {
            event.preventDefault();
        }
        const { x, y } = this._pointerToLogical(event);
        this.ctxSignature.lineTo(x, y);
        this.ctxSignature.stroke();
    }

    handleSignatureEnd(event) {
        if (event && event.type === 'touchend') {
            event.preventDefault();
        }
        if (!this.isDrawing || !this.canvasSignatureElement || !this.ctxSignature) {
            return;
        }
        this.isDrawing = false;

        const fullDataUrl = this.canvasSignatureElement.toDataURL('image/jpeg', JPEG_QUALITY);
        this._signatureDataUrl = fullDataUrl.split(',')[1];

        this.signatureCaptured = true;
        this._signatureComplete = true;
    }

    handleClearSignature() {
        if (!this.canvasSignatureElement) {
            return;
        }
        this._initSignatureCanvas(this.canvasSignatureElement);

        this._signatureDataUrl = null;
        this.signatureCaptured = false;
        this._signatureComplete = false;
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
