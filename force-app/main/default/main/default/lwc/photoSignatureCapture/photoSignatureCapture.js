import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent'; 

export default class PhotoSignatureCapture extends LightningElement {
    @api photoDataUrl = null;         // Raw Base64 for Flow/ContentVersion
    @api signatureDataUrl = null;     // Raw Base64 for Flow/ContentVersion
    @api biometricsComplete = false; 

    @track currentStep = 'photo'; 
    @track cameraActive = false;
    @track photoCaptured = false;
    @track signatureCaptured = false;
    @track stream = null; 
    
    @track _displayPhotoDataUrl = null; // Prefixed Base64 for HTML Display

    videoElement;
    canvasPhotoElement;
    canvasSignatureElement;
    ctxSignature;
    isDrawing = false;

    // === LIFECYCLE HOOKS ===
    
    disconnectedCallback() {
        this.stopCamera();
        console.log('Component disconnected. Camera resources released.');
    }

    renderedCallback() {
        if (this.currentStep === 'photo' && !this.videoElement) {
             this.videoElement = this.template.querySelector('video');
        }
        if (this.currentStep === 'photo' && !this.canvasPhotoElement) {
            this.canvasPhotoElement = this.template.querySelector('.photo-canvas');
        }
        if (this.currentStep === 'signature' && !this.canvasSignatureElement) {
            this.canvasSignatureElement = this.template.querySelector('.signature-canvas');
            if (this.canvasSignatureElement) {
                this.ctxSignature = this.canvasSignatureElement.getContext('2d');
                
                // Fix: Set a white background initially 
                this.ctxSignature.fillStyle = '#FFFFFF'; 
                this.ctxSignature.fillRect(0, 0, this.canvasSignatureElement.width, this.canvasSignatureElement.height);
                
                this.ctxSignature.lineWidth = 2;
                this.ctxSignature.strokeStyle = '#000000';
            }
        }
    }
    
    // === NEW GETTERS FOR GREYING OUT UX ===
    get isPhotoStepActive() {
        // Apply 'deactivated' class if the current step is NOT photo
        return this.currentStep === 'photo' ? '' : 'deactivated';
    }

    get isSignatureStepActive() {
        // Apply 'deactivated' class if the current step is NOT signature
        return this.currentStep === 'signature' ? '' : 'deactivated';
    }
    // ======================================
    
    // === GENERAL GETTERS ===
    get isCaptureDisabled() {
        return !this.cameraActive;
    }

    get isNextDisabled() {
        return !this.photoCaptured;
    }
    
    get showPlaceholder() {
        return !this.cameraActive && !this.photoCaptured;
    }
    
    get videoHiddenClass() {
        if (!this.cameraActive || this.photoCaptured) {
            return 'video-feed hidden';
        }
        return 'video-feed';
    }
    // ==================

    // === Camera Logic ===

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
            this.cameraActive = false;
        }

        if (this.videoElement && this.videoElement.srcObject) {
            this.videoElement.srcObject = null;
        }
    }

    async startCamera() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                this.stopCamera(); 

                this.stream = await navigator.mediaDevices.getUserMedia({ video: { width: 300, height: 225 } });
                this.videoElement.srcObject = this.stream;
                
                this.cameraActive = true; 
                this.showToast('Ready! ✅', 'Camera access granted. Please position the applicant.', 'success');
            } catch (error) {
                console.error('Camera access failed:', error);
                this.showToast('Camera Error 🚨', 'Access denied or failed. Check browser or OS permissions.', 'error');
                this.cameraActive = false;
            }
        } else {
            this.showToast('Browser Error 🛑', 'Your browser does not support camera access.', 'error');
            this.cameraActive = false;
        }
    }
    
    handleStartCameraClick() {
        this.videoElement = this.template.querySelector('video');

        if (this.videoElement) {
            this.startCamera();
        } else {
            this.showToast('Setup Error 🛑', 'Video element not found.', 'error');
        }
    }

    handleCapturePhoto() {
        const video = this.videoElement;
        const canvas = this.canvasPhotoElement;
        
         if (!video || !canvas || !this.stream) {
            this.showToast('Setup Error ❌', 'Camera feed is not active or elements missing.', 'error');
            this.stopCamera();
            return;
        }

        const context = canvas.getContext('2d');
        if (!context) {
             this.showToast('Setup Error ❌', 'Canvas context missing. Try refreshing the page.', 'error');
             return;
        }

        // 1. DRAW FRAME TO CANVAS
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // 2. CAPTURE BOTH DATA VERSIONS - using JPEG at 80% quality
        const fullDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        // a) For HTML Display (Needs full prefix)
        this._displayPhotoDataUrl = fullDataUrl;
        
        // b) For Flow/ContentVersion (Needs raw Base64)
        this.photoDataUrl = fullDataUrl.split(',')[1];
        
        this.photoCaptured = true;
        
        // 3. CLEANUP
        this.stopCamera(); 

        this.showToast('Success! 📸', 'Image successfully captured!', 'success');
    }

  handleRetakePhoto() {
        this.photoCaptured = false;
        this.photoDataUrl = null;
        this._displayPhotoDataUrl = null; 
        this.inFrameReady = false; 

        // ⭐ NEW: Reset Signature Data and Canvas ⭐
        // Ensure this method is safe to call even if signature step hasn't been accessed yet.
        if (this.ctxSignature) {
            this.ctxSignature.clearRect(0, 0, this.canvasSignatureElement.width, this.canvasSignatureElement.height);
            
            // Redraw white background (from previous fix)
            this.ctxSignature.fillStyle = '#FFFFFF'; 
            this.ctxSignature.fillRect(0, 0, this.canvasSignatureElement.width, this.canvasSignatureElement.height);
        }
        
        this.signatureDataUrl = null;
        this.signatureCaptured = false;
        this.biometricsComplete = false;
        // ⭐ End New Logic ⭐

        Promise.resolve().then(() => {
            this.videoElement = this.template.querySelector('video');
            
            if (this.videoElement) {
                this.startCamera();
            } else {
                this.showToast('Setup Error 🛑', 'Could not find video element to retake photo.', 'error');
            }
        });
    }

    handleNextToSignature() {
        if (this.photoCaptured) {
            this.stopCamera(); 
            this.currentStep = 'signature';
            this.biometricsComplete = false;
        }
    }

    // === Signature Logic ===

    handleSignatureStart(event) {
        this.isDrawing = true;
        const rect = this.canvasSignatureElement.getBoundingClientRect();
        this.ctxSignature.beginPath();
        this.ctxSignature.moveTo(event.clientX - rect.left, event.clientY - rect.top);
    }

    handleSignatureDraw(event) {
        if (!this.isDrawing) return;
        event.preventDefault(); 
        const rect = this.canvasSignatureElement.getBoundingClientRect();
        this.ctxSignature.lineTo(event.clientX - rect.left, event.clientY - rect.top);
        this.ctxSignature.stroke();
    }

    handleSignatureEnd() {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        this.ctxSignature.closePath();
        
        // Generate JPEG at 80% quality
        const fullDataUrl = this.canvasSignatureElement.toDataURL('image/jpeg', 0.8);

        // Save only the raw Base64 to the output variable
        this.signatureDataUrl = fullDataUrl.split(',')[1]; 
        
        this.signatureCaptured = true;
        this.biometricsComplete = true;

        this.showToast('Success! ✍️', 'Signature Captured! Click Next below to continue.', 'success');
    }

    handleClearSignature() {
        this.ctxSignature.clearRect(0, 0, this.canvasSignatureElement.width, this.canvasSignatureElement.height);
        
        this.ctxSignature.fillStyle = '#FFFFFF'; 
        this.ctxSignature.fillRect(0, 0, this.canvasSignatureElement.width, this.canvasSignatureElement.height);

        this.signatureDataUrl = null;
        this.signatureCaptured = false;
        this.biometricsComplete = false;
    }
    
    handleBackToPhoto() {
        this.currentStep = 'photo';
        this.stopCamera(); 
    }

    // === Reusable Toast Method ===
    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
            mode: 'dismissable'
        });
        this.dispatchEvent(event);
    }
}