import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent'; 

export default class PhotoCapture extends LightningElement {


    // === FLOW INPUTS (@api) ===
    @api headingText = 'Capture Applicant Photo'; // Set default value
    @api photoInstructions = 'Ensure the applicant\'s face is clearly visible within the frame. Only the current photo will be captured; do not take a picture of a screen or existing photo.';

    // === FLOW OUTPUTS/ ===
    
    // Private backing field for persistence (stores raw Base64)
    _photoDataUrl = null; 
    
    @api photoCaptured = false;       
    @api photoDataUrl; // Managed by the setter/getter below

    // === INTERNAL STATE (@track) ===
    @track cameraActive = false;
    @track stream = null; 
    @track _displayPhotoDataUrl = null; // Prefixed Base64 for HTML Display
    @track inFrameReady = false;       // Controls the FaceID green cue

    // === DOM REFERENCES ===
    videoElement;
    canvasPhotoElement;

    // === FLOW INPUT/OUTPUT ACCESSOR (Image Persistence) ===
    // This getter is used when the Flow reads the data out of the component.
    get photoDataUrl() {
        return this._photoDataUrl;
    }
    
    // This setter is called when the Flow passes data *back into* the component (e.g., on "Previous").
    set photoDataUrl(value) {
        this._photoDataUrl = value;
        
        // If a value is passed back from the Flow, re-initialize the component's state
        if (value) {
            // Re-add the Base64 prefix for the HTML <img> tag
            this._displayPhotoDataUrl = 'data:image/jpeg;base64,' + value;
            this.photoCaptured = true; 
        } else {
            this._displayPhotoDataUrl = null;
            this.photoCaptured = false;
        }
    }
    // ===================================================

    // === LIFECYCLE HOOKS ===
    disconnectedCallback() {
        this.stopCamera();
        console.log('Component disconnected. Camera resources released.');
    }

    renderedCallback() {
        if (!this.videoElement) {
             this.videoElement = this.template.querySelector('video');
        }
        if (!this.canvasPhotoElement) {
            this.canvasPhotoElement = this.template.querySelector('.photo-canvas');
        }
    }
    
    // === UI GETTERS ===
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

    get captureOverlayClass() {
        let baseClass = 'capture-overlay';
        if (this.inFrameReady) {
            baseClass += ' ready';
        }
        return baseClass;
    }
    // ======================================

    // === CAMERA CORE LOGIC ===

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
              //  this.showToast('Ready! ✅', 'Camera access granted. Please position the applicant.', 'success');
                
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
        this._photoDataUrl = fullDataUrl.split(',')[1];
        
        this.photoCaptured = true;
        
        // 3. CLEANUP
        this.stopCamera(); 

       // this.showToast('Success! 📸', 'Image successfully captured!', 'success');
    }

    handleRetakePhoto() {
        this.photoCaptured = false;
        this._photoDataUrl = null; // Clear backing field for Flow
        this._displayPhotoDataUrl = null; 
        this.inFrameReady = false; 

        Promise.resolve().then(() => {
            this.videoElement = this.template.querySelector('video');
            
            if (this.videoElement) {
                this.startCamera();
            } else {
                this.showToast('Setup Error 🛑', 'Could not find video element to retake photo.', 'error');
            }
        });
    }

    // === UTILITY ===
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