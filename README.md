# LWCBiometricCapture

Here are two LWCs that can be used in a flow to capture a user's photo using the computer's camera, as well as their signature, and upload those as images to any record.

Both LWCs have some configuration options to meet most needs. 

Additionally there's an invocable Apex class that will take the base64 strings from the LWCs, convert them to blobs, and save the images with any file naming format you choose.

| Area | Entry points |
|------|----------------|
| Photo screen | [`lwc/photoCapture/`](force-app/main/default/main/default/lwc/photoCapture/) |
| Signature screen | [`lwc/signatureCapture/`](force-app/main/default/main/default/lwc/signatureCapture/) |
| Upload to Files | [`classes/BiometricUploadService.cls`](force-app/main/default/main/default/classes/BiometricUploadService.cls) |

---

## Photo Capture

Add the **Photo Capture** component to a Screen Flow element.

![Photo capture in Flow configuration](https://github.com/user-attachments/assets/192423d8-edb4-4f1a-ad30-fb2b616e20af)

Flow property definitions live in [`photoCapture.js-meta.xml`](force-app/main/default/main/default/lwc/photoCapture/photoCapture.js-meta.xml).

### Inputs

| Flow label (Screen component property) | Purpose |
|----------------------------------------|--------|
| **Input: Photo Instructions Text** (`photoInstructions`) | Body copy on the screen. Text templates work well; the UI uses [`lightning-formatted-rich-text`](force-app/main/default/main/default/lwc/photoCapture/photoCapture.html) so plain or rich text is fine. |
| **Input: Step Heading Text** (`headingText`) | Heading at the top of the step. |

![Text template example for instructions](https://github.com/user-attachments/assets/ea8b1511-4235-4f18-8863-7294212f39fb)

![Step heading input](https://github.com/user-attachments/assets/2f1d257d-48bd-407b-a2e9-bfa620c4bd71)

### Outputs (Advanced on the screen component)

Wire these to Flow variables (for example a **Boolean** and a **Text** collection or long text variable for the payload).

| Flow label | Apex / Flow usage |
|------------|-------------------|
| **Output: Photo Captured Flag** (`photoCaptured`) | Use in a **Decision** to confirm the user captured a photo before calling upload. |
| **Output: Captured Photo Base64** (`photoDataUrl`) | Raw Base64 (no `data:image/jpeg;base64,` prefix). Pass to **Upload Biometric Files** as photo input. |

Capture logic: [`photoCapture.js`](force-app/main/default/main/default/lwc/photoCapture/photoCapture.js).

---

## Signature Capture

Same pattern as photo capture. Component: [`lwc/signatureCapture/`](force-app/main/default/main/default/lwc/signatureCapture/). Metadata: [`signatureCapture.js-meta.xml`](force-app/main/default/main/default/lwc/signatureCapture/signatureCapture.js-meta.xml).

![Signature capture in Flow configuration](https://github.com/user-attachments/assets/bcc33dd5-26fe-4233-9c4d-a8d58b271435)

### Inputs

| Flow label | Purpose |
|------------|--------|
| **Input: Signature Disclaimer Text** (`signatureDisclaimer`) | On-screen disclaimer; text templates recommended. |
| **Input: Step Heading Text** (`headingText`) | Step heading. |

![Signature disclaimer](https://github.com/user-attachments/assets/eea86edd-f819-4c13-90db-111e49b6e4e3)

### Outputs (Advanced)

| Flow label | Usage |
|------------|--------|
| **Output: Signature Complete Flag** (`signatureComplete`) | Boolean for Decision logic. |
| **Output: Captured Signature Base64** (`signatureDataUrl`) | Raw Base64 for the invocable action. |

Canvas / export: [`signatureCapture.js`](force-app/main/default/main/default/lwc/signatureCapture/signatureCapture.js).

---

## Apex: Upload to the Record

In the Flow, add an **Action** and choose **Upload Biometric Files** (invocable method on [`BiometricUploadService.cls`](force-app/main/default/main/default/classes/BiometricUploadService.cls)).

Map:

- **Target Record ID** (required) — record to link the files to.
- **Photo Base64 Data** / **Signature Base64 Data** — outputs from the LWCs (either can be left blank if you only use one of the LWCs).
- **Photo File Title** / **Signature File Title** — optional; omit to use defaults **Applicant Photo** and **Applicant Signature**. You do **not** need a file extension in the title; files are still stored as JPEG (`photo.jpeg` / `signature.jpeg` on the ContentVersion).

The service decodes Base64 and inserts ContentVersion and generates a ContentDocumentLink to the record. It does not resize or validate image dimensions.

### Action Outputs

| Output | Meaning |
|--------|--------|
| **Success** | `true` only if neither photo nor signature upload reported an error. |
| **Error Message** | Combined summary when something failed. |
| **Photo Error Message** / **Signature Error Message** | Per-artifact errors (decode/DML, etc.). |

Use a **Decision** after the action to branch on `Success` and show a fault path or toast as needed.

![Invocable action configuration](https://github.com/user-attachments/assets/c6bfd69d-dd10-4472-b36f-4ac98d9c4e58)

Tests: [`BiometricUploadServiceTest.cls`](force-app/main/default/main/default/classes/BiometricUploadServiceTest.cls).

---

## Image Quality, Sizes, and Format

Defaults live in [`photoCaptureCameraUtility.js`](force-app/main/default/main/default/lwc/photoCaptureCameraUtility/photoCaptureCameraUtility.js).

Captured images are JPEG. Compression uses **`JPEG_QUALITY` (0.8, i.e. 80%)** via `canvas.toDataURL('image/jpeg', quality)`. Lower quality → smaller files; higher → larger. Since this was meant for demos, it's set to 80%.

Both photo and signature share the same default quality, as they use that constant (signature imports `JPEG_QUALITY` from the same module). To change only the photo, pass an explicit `quality` third argument from [`photoCapture.js`](force-app/main/default/main/default/lwc/photoCapture/photoCapture.js) `handleCapturePhoto` into `captureVideoFrameToJpeg(video, canvas, quality)`.

### Resolution

The camera is requested with **`DEFAULT_VIDEO_CONSTRAINTS`** (`getUserMedia`). On capture, the canvas is sized to **`video.videoWidth` / `video.videoHeight`** and one frame is drawn so the **saved pixel dimensions match the camera track**, not the on-screen CSS size. 

To change requested resolution, edit `DEFAULT_VIDEO_CONSTRAINTS` or pass custom constraints from [`photoCapture.js`](force-app/main/default/main/default/lwc/photoCapture/photoCapture.js) into `acquireUserMedia`. For a fixed export size (scale down/up regardless of camera), extend [`captureVideoFrameToJpeg`](force-app/main/default/main/default/lwc/photoCaptureCameraUtility/photoCaptureCameraUtility.js) (or wrap it) instead of always using full `video.videoWidth` / `video.videoHeight`.

| Goal | Where |
|------|--------|
| Default JPEG quality (both, unless overridden) | `JPEG_QUALITY` in [`photoCaptureCameraUtility.js`](force-app/main/default/main/default/lwc/photoCaptureCameraUtility/photoCaptureCameraUtility.js) |
| Photo-only quality | Third argument to `captureVideoFrameToJpeg` from [`photoCapture.js`](force-app/main/default/main/default/lwc/photoCapture/photoCapture.js) |
| Requested camera resolution | `DEFAULT_VIDEO_CONSTRAINTS` or custom constraints in [`photoCapture.js`](force-app/main/default/main/default/lwc/photoCapture/photoCapture.js) |

---

## Deploy to Salesforce

[![Deploy to Salesforce](https://raw.githubusercontent.com/afawcett/githubsfdeploy/master/deploy.png)](https://githubsfdeploy.herokuapp.com?owner=erikboderek&repo=LWCBiometricCapture&ref=main)

One-click deploy of this repo’s default branch: [LWCBiometricCapture](https://github.com/erikboderek/LWCBiometricCapture).

---

## Package Contents

Source root: [`force-app/`](force-app/). Metadata under [`force-app/main/default/main/default/`](force-app/main/default/main/default/). Manifest: [`manifest/package.xml`](manifest/package.xml).

| Metadata type | Count | Members |
|---------------|------:|---------|
| **ApexClass** | 2 | [`BiometricUploadService`](force-app/main/default/main/default/classes/BiometricUploadService.cls), [`BiometricUploadServiceTest`](force-app/main/default/main/default/classes/BiometricUploadServiceTest.cls) |
| **LightningComponentBundle** | 3 | [`photoCaptureCameraUtility`](force-app/main/default/main/default/lwc/photoCaptureCameraUtility/), [`photoCapture`](force-app/main/default/main/default/lwc/photoCapture/), [`signatureCapture`](force-app/main/default/main/default/lwc/signatureCapture/) |

**Total: 5** metadata components (2 Apex + 3 LWC bundles).

API versions: see each component’s `*-meta.xml`; project `sourceApiVersion` is **63.0** in [`sfdx-project.json`](sfdx-project.json).

---

## Manual Deployment

### Prerequisites

- [Salesforce CLI (`sf`)](https://developer.salesforce.com/tools/salesforcecli)
- Permission to deploy Apex and LWCs to the target org

### Commands

```bash
git clone https://github.com/erikboderek/LWCBiometricCapture.git
cd LWCBiometricCapture
sf org login web --alias my-org
sf project deploy start --source-dir force-app --target-org my-org
