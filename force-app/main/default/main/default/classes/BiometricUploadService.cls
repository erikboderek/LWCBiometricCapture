public with sharing class BiometricUploadService {

    // The Invocable Method that the Flow will call
    @InvocableMethod(label='Upload Biometric Files' description='Uploads photo and signature files to a target record.')
    public static void uploadFiles(List<Request> requests) {
        if (requests == null || requests.isEmpty()) {
            return;
        }

        Request req = requests[0];
        
        // 1. Upload Photo
        if (String.isNotBlank(req.photoBase64)) {
            // Use the title passed directly from the Flow
            createFile(req.recordId, req.photoBase64, req.photoTitle, 'image/jpeg', 'photo.jpeg');
        }

        // 2. Upload Signature
        if (String.isNotBlank(req.signatureBase64)) {
            // Use the title passed directly from the Flow
            createFile(req.recordId, req.signatureBase64, req.signatureTitle, 'image/jpeg', 'signature.jpeg');
        }
    }

    // Class to define the Flow inputs
    public class Request {
        @InvocableVariable(required=true label='Target Record ID')
        public Id recordId;

        @InvocableVariable(label='Photo Base64 Data')
        public String photoBase64;
        
        @InvocableVariable(label='Signature Base64 Data')
        public String signatureBase64;

        // ⭐ NEW INPUTS: Receive the title strings from the Flow ⭐
        @InvocableVariable(label='Photo File Title')
        public String photoTitle;

        @InvocableVariable(label='Signature File Title')
        public String signatureTitle;
    }

    // Helper method to handle file creation and linking (No change needed here)
    private static void createFile(Id targetRecordId, String base64Data, String title, String mimeType, String path) {
        if (targetRecordId == null || String.isBlank(base64Data)) {
            return;
        }

        Blob fileBody;
        try {
            fileBody = EncodingUtil.base64Decode(base64Data);
        } catch (Exception e) {
            System.debug('Base64 Decode Failed for ' + title + ': ' + e.getMessage());
            return;
        }

        // Create ContentVersion
        ContentVersion cv = new ContentVersion(
            Title = title, // Uses the title passed from Flow
            PathOnClient = path, 
            VersionData = fileBody
        );
        insert cv;

        // Create ContentDocumentLink to attach the file to the target record
        if (cv.Id != null) {
            // Retrieve the ContentDocument Id (parent of ContentVersion)
            cv = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id];

            ContentDocumentLink cdl = new ContentDocumentLink(
                ContentDocumentId = cv.ContentDocumentId,
                LinkedEntityId = targetRecordId,
                ShareType = 'V', 
                Visibility = 'AllUsers'
            );
            insert cdl;
        }
    }
}