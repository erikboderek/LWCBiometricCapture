@IsTest
private class BiometricUploadServiceTest {
    @IsTest
    static void uploadFiles_happyPath_photoAndSignature() {
        Account a = new Account(Name = 'Biometric Test');
        insert a;

        String b64 = EncodingUtil.base64Encode(Blob.valueOf('test-bytes'));

        BiometricUploadService.Request req = new BiometricUploadService.Request();
        req.recordId = a.Id;
        req.photoBase64 = b64;
        req.signatureBase64 = b64;
        req.photoTitle = 'Photo Title';
        req.signatureTitle = 'Sig Title';

        Test.startTest();
        List<BiometricUploadService.Result> results = BiometricUploadService.uploadFiles(
            new List<BiometricUploadService.Request>{ req }
        );
        Test.stopTest();

        System.assertEquals(1, results.size(), 'One result per request');
        System.assertEquals(true, results[0].success, results[0].errorMessage);
        System.assertEquals(null, results[0].errorMessage);
        System.assertEquals(null, results[0].photoErrorMessage);
        System.assertEquals(null, results[0].signatureErrorMessage);

        Integer linkCount = [
            SELECT COUNT()
            FROM ContentDocumentLink
            WHERE LinkedEntityId = :a.Id
        ];
        System.assertEquals(2, linkCount, 'Photo and signature files linked');
    }

    @IsTest
    static void uploadFiles_processesMultipleRequests() {
        Account a1 = new Account(Name = 'A1');
        Account a2 = new Account(Name = 'A2');
        insert new List<Account>{ a1, a2 };

        String b64 = EncodingUtil.base64Encode(Blob.valueOf('x'));

        BiometricUploadService.Request r1 = new BiometricUploadService.Request();
        r1.recordId = a1.Id;
        r1.photoBase64 = b64;

        BiometricUploadService.Request r2 = new BiometricUploadService.Request();
        r2.recordId = a2.Id;
        r2.photoBase64 = b64;

        List<BiometricUploadService.Result> results = BiometricUploadService.uploadFiles(
            new List<BiometricUploadService.Request>{ r1, r2 }
        );

        System.assertEquals(2, results.size());
        System.assertEquals(true, results[0].success);
        System.assertEquals(true, results[1].success);
    }

    @IsTest
    static void uploadFiles_invalidBase64_returnsError() {
        Account a = new Account(Name = 'Bad B64');
        insert a;

        BiometricUploadService.Request req = new BiometricUploadService.Request();
        req.recordId = a.Id;
        req.photoBase64 = '%%%INVALID_BASE64%%%';

        List<BiometricUploadService.Result> results = BiometricUploadService.uploadFiles(
            new List<BiometricUploadService.Request>{ req }
        );

        System.assertEquals(1, results.size());
        System.assertEquals(false, results[0].success);
        System.assert(String.isNotBlank(results[0].photoErrorMessage));
        System.assert(String.isNotBlank(results[0].errorMessage));
    }

    @IsTest
    static void uploadFiles_missingRecordId_returnsError() {
        BiometricUploadService.Request req = new BiometricUploadService.Request();
        req.recordId = null;
        req.photoBase64 = EncodingUtil.base64Encode(Blob.valueOf('x'));

        List<BiometricUploadService.Result> results = BiometricUploadService.uploadFiles(
            new List<BiometricUploadService.Request>{ req }
        );

        System.assertEquals(false, results[0].success);
        System.assert(String.isNotBlank(results[0].errorMessage));
    }

    @IsTest
    static void uploadFiles_nullRequestList_returnsEmpty() {
        System.assertEquals(0, BiometricUploadService.uploadFiles(null).size());
    }
}
