@IsTest
private class MobileWorkQueueControllerTest {

    @IsTest
    static void getQueueItems_returnsEmptyListWhenNoTrackers() {
        Test.startTest();
        List<MobileWorkQueueController.StepTrackerRecord> results =
            MobileWorkQueueController.getQueueItems();
        Test.stopTest();

        System.assertNotEquals(null, results, 'Result should never be null');
        System.assert(results.isEmpty(), 'Expected empty list — no cadence data in test org');
    }

    @IsTest
    static void completeStep_unknownId_throwsAuraHandledException() {
        Id fakeId = '0ve000000000001AAA';

        Boolean exceptionThrown = false;
        Test.startTest();
        try {
            MobileWorkQueueController.completeStep(fakeId, 'Connected', null);
        } catch (AuraHandledException e) {
            exceptionThrown = true;
        }
        Test.stopTest();

        System.assert(exceptionThrown, 'Expected AuraHandledException for unknown stepTrackerId');
    }

    @IsTest
    static void completeStep_nullId_throwsException() {
        Boolean exceptionThrown = false;
        Test.startTest();
        try {
            MobileWorkQueueController.completeStep(null, 'Connected', null);
        } catch (Exception e) {
            exceptionThrown = true;
        }
        Test.stopTest();

        System.assert(exceptionThrown, 'Expected exception for null stepTrackerId');
    }
}
