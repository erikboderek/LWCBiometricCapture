public with sharing class BiometricUploadService {
    private static final String DEFAULT_PHOTO_TITLE = 'Applicant Photo';
    private static final String DEFAULT_SIGNATURE_TITLE = 'Applicant Signature';

    @InvocableMethod(
        label='Upload Biometric Files'
        description='Uploads photo and signature files to a target record. Returns success and error details for Flow branching.'
    )
    public static List<Result> uploadFiles(List<Request> requests) {
        List<Result> results = new List<Result>();
        if (requests == null) {
            return results;
        }
        for (Request req : requests) {
            results.add(processRequest(req));
        }
        return results;
    }

    private static Result processRequest(Request req) {
        Result res = new Result();
        res.success = true;
        res.errorMessage = null;
        res.photoErrorMessage = null;
        res.signatureErrorMessage = null;

        if (req == null) {
            res.success = false;
            res.errorMessage = 'Request was null.';
            return res;
        }

        if (req.recordId == null) {
            res.success = false;
            res.errorMessage = 'Target Record ID is required.';
            return res;
        }

        if (String.isNotBlank(req.photoBase64)) {
            String title = defaultTitle(req.photoTitle, DEFAULT_PHOTO_TITLE);
            res.photoErrorMessage = uploadOneFile(req.recordId, req.photoBase64, title, 'photo.jpeg');
        }

        if (String.isNotBlank(req.signatureBase64)) {
            String title = defaultTitle(req.signatureTitle, DEFAULT_SIGNATURE_TITLE);
            res.signatureErrorMessage = uploadOneFile(req.recordId, req.signatureBase64, title, 'signature.jpeg');
        }

        if (String.isNotBlank(res.photoErrorMessage) || String.isNotBlank(res.signatureErrorMessage)) {
            res.success = false;
            res.errorMessage = buildCombinedError(res.photoErrorMessage, res.signatureErrorMessage);
        }

        return res;
    }

    private static String defaultTitle(String fromFlow, String fallback) {
        return String.isBlank(fromFlow) ? fallback : fromFlow;
    }

    private static String buildCombinedError(String photoErr, String sigErr) {
        List<String> parts = new List<String>();
        if (String.isNotBlank(photoErr)) {
            parts.add('Photo: ' + photoErr);
        }
        if (String.isNotBlank(sigErr)) {
            parts.add('Signature: ' + sigErr);
        }
        return String.join(parts, ' ');
    }

    /**
     * @return null on success, otherwise an error message
     */
    private static String uploadOneFile(Id targetRecordId, String base64Data, String title, String pathOnClient) {
        if (targetRecordId == null || String.isBlank(base64Data)) {
            return null;
        }

        Blob fileBody;
        try {
            fileBody = EncodingUtil.base64Decode(base64Data);
        } catch (Exception e) {
            return 'Base64 decode failed for ' + title + ': ' + e.getMessage();
        }

        try {
            ContentVersion cv = new ContentVersion(
                Title = title,
                PathOnClient = pathOnClient,
                VersionData = fileBody
            );
            insert cv;

            cv = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id LIMIT 1];

            ContentDocumentLink cdl = new ContentDocumentLink(
                ContentDocumentId = cv.ContentDocumentId,
                LinkedEntityId = targetRecordId,
                ShareType = 'V',
                Visibility = 'AllUsers'
            );
            insert cdl;
        } catch (DmlException e) {
            return e.getMessage();
        } catch (Exception e) {
            return e.getMessage();
        }
        return null;
    }

    public class Request {
        @InvocableVariable(required=true label='Target Record ID')
        public Id recordId;

        @InvocableVariable(label='Photo Base64 Data')
        public String photoBase64;

        @InvocableVariable(label='Signature Base64 Data')
        public String signatureBase64;

        @InvocableVariable(label='Photo File Title')
        public String photoTitle;

        @InvocableVariable(label='Signature File Title')
        public String signatureTitle;
    }

    public class Result {
        @InvocableVariable(label='Success')
        public Boolean success;

        @InvocableVariable(label='Error Message')
        public String errorMessage;

        @InvocableVariable(label='Photo Error Message')
        public String photoErrorMessage;

        @InvocableVariable(label='Signature Error Message')
        public String signatureErrorMessage;
    }
}
