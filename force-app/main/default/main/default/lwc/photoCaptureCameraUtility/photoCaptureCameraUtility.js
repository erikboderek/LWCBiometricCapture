/** Shared helpers for photo capture LWCs (camera stream + JPEG frame export). */

export const JPEG_QUALITY = 0.8;

export const DEFAULT_VIDEO_CONSTRAINTS = {
    video: { width: 300, height: 225, facingMode: 'user' }
};

/**
 * Stops all tracks on the stream and clears the video element srcObject.
 * @param {MediaStream|null|undefined} stream
 * @param {HTMLVideoElement|null|undefined} videoElement
 */
export function releaseStream(stream, videoElement) {
    if (stream) {
        stream.getTracks().forEach((track) => track.stop());
    }
    if (videoElement && videoElement.srcObject) {
        videoElement.srcObject = null;
    }
}

/**
 * @returns {Promise<MediaStream>}
 * @throws {Error} code BROWSER_UNSUPPORTED or user-media error
 */
export async function acquireUserMedia(constraints = DEFAULT_VIDEO_CONSTRAINTS) {
    if (!navigator.mediaDevices?.getUserMedia) {
        const err = new Error('Camera is not supported in this browser.');
        err.code = 'BROWSER_UNSUPPORTED';
        throw err;
    }
    return navigator.mediaDevices.getUserMedia(constraints);
}

/**
 * Draws the current video frame to the canvas and returns JPEG data URLs.
 * @param {HTMLVideoElement} video
 * @param {HTMLCanvasElement} canvas
 * @param {number} [quality=JPEG_QUALITY]
 * @returns {{ displayDataUrl: string, rawBase64: string }}
 */
export function captureVideoFrameToJpeg(video, canvas, quality = JPEG_QUALITY) {
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const displayDataUrl = canvas.toDataURL('image/jpeg', quality);
    const rawBase64 = displayDataUrl.split(',')[1];
    return { displayDataUrl, rawBase64 };
}
