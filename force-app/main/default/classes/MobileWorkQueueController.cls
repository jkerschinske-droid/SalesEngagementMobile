public with sharing class MobileWorkQueueController {
  public class StepTrackerRecord {
    @AuraEnabled
    public Id stepTrackerId;
    @AuraEnabled
    public String cadenceName;
    @AuraEnabled
    public String stepName;
    @AuraEnabled
    public String stepType;
    @AuraEnabled
    public Integer stepDay;
    @AuraEnabled
    public String script;
    @AuraEnabled
    public String state;
    @AuraEnabled
    public Datetime dueDate;
    @AuraEnabled
    public Datetime createdDate;
    @AuraEnabled
    public Datetime lastModifiedDate;
    @AuraEnabled
    public Id targetId;
    @AuraEnabled
    public String targetName;
    @AuraEnabled
    public String company;
    @AuraEnabled
    public String titleRole;
    @AuraEnabled
    public Datetime lastActivity;
    @AuraEnabled
    public String phone;
    @AuraEnabled
    public String email;
  }

  @AuraEnabled
  public static List<StepTrackerRecord> getQueueItems() {
    Id userId = UserInfo.getUserId();
    List<StepTrackerRecord> results = new List<StepTrackerRecord>();

    List<ActionCadenceStepTracker> trackers = [
      SELECT
        Id,
        ActionCadenceName,
        StepTitle,
        StepType,
        ActionCadenceStep.ScheduledDaysUntilDue,
        ActionCadenceStep.StepComments,
        State,
        DueDateTime,
        CreatedDate,
        LastModifiedDate,
        TargetId
      FROM ActionCadenceStepTracker
      WHERE ActionCadenceTracker.OwnerId = :userId
        AND State IN ('Active', 'Overdue', 'Upcoming')
      ORDER BY DueDateTime ASC NULLS LAST
    ];

    Set<Id> leadIds = new Set<Id>();
    Set<Id> contactIds = new Set<Id>();

    for (ActionCadenceStepTracker t : trackers) {
      StepTrackerRecord r = new StepTrackerRecord();
      r.stepTrackerId = t.Id;
      r.cadenceName = t.ActionCadenceName;
      r.stepName = t.StepTitle;
      r.stepType = t.StepType;
      r.stepDay = t.ActionCadenceStep != null &&
        t.ActionCadenceStep.ScheduledDaysUntilDue != null
        ? Integer.valueOf(t.ActionCadenceStep.ScheduledDaysUntilDue)
        : null;
      r.script = t.ActionCadenceStep?.StepComments;
      r.state = t.State;
      r.dueDate = t.DueDateTime;
      r.createdDate = t.CreatedDate;
      r.lastModifiedDate = t.LastModifiedDate;
      r.targetId = t.TargetId;
      results.add(r);

      if (t.TargetId != null) {
        SObjectType sot = t.TargetId.getSObjectType();
        if (sot == Lead.SObjectType)
          leadIds.add(t.TargetId);
        else if (sot == Contact.SObjectType)
          contactIds.add(t.TargetId);
      }
    }

    Map<Id, Lead> leadMap = leadIds.isEmpty()
      ? new Map<Id, Lead>()
      : new Map<Id, Lead>(
          [
            SELECT Id, Name, Company, Title, LastActivityDate, Phone, Email
            FROM Lead
            WHERE Id IN :leadIds
          ]
        );
    Map<Id, Contact> contactMap = contactIds.isEmpty()
      ? new Map<Id, Contact>()
      : new Map<Id, Contact>(
          [
            SELECT Id, Name, Account.Name, Title, LastActivityDate, Phone, Email
            FROM Contact
            WHERE Id IN :contactIds
          ]
        );

    for (StepTrackerRecord r : results) {
      if (r.targetId == null)
        continue;
      SObjectType sot = r.targetId.getSObjectType();

      if (sot == Lead.SObjectType && leadMap.containsKey(r.targetId)) {
        Lead l = leadMap.get(r.targetId);
        r.targetName = l.Name;
        r.company = l.Company;
        r.titleRole = l.Title;
        r.lastActivity = l.LastActivityDate != null
          ? Datetime.newInstance(
              l.LastActivityDate,
              Time.newInstance(0, 0, 0, 0)
            )
          : null;
        r.phone = l.Phone;
        r.email = l.Email;
      } else if (
        sot == Contact.SObjectType && contactMap.containsKey(r.targetId)
      ) {
        Contact c = contactMap.get(r.targetId);
        r.targetName = c.Name;
        r.company = c.Account?.Name;
        r.titleRole = c.Title;
        r.lastActivity = c.LastActivityDate != null
          ? Datetime.newInstance(
              c.LastActivityDate,
              Time.newInstance(0, 0, 0, 0)
            )
          : null;
        r.phone = c.Phone;
        r.email = c.Email;
      }
    }

    return results;
  }

  @AuraEnabled
  public static void completeStep(
    Id stepTrackerId,
    String outcome,
    String notes
  ) {
    List<ActionCadenceStepTracker> trackers = [
      SELECT Id, TargetId, StepType, StepTitle
      FROM ActionCadenceStepTracker
      WHERE Id = :stepTrackerId
        AND ActionCadenceTracker.OwnerId = :UserInfo.getUserId()
      LIMIT 1
    ];
    if (trackers.isEmpty()) {
      throw new AuraHandledException('Step not found or access denied.');
    }
    ActionCadenceStepTracker tracker = trackers[0];

    String baseUrl = URL.getOrgDomainUrl().toExternalForm();

    String stepType = tracker.StepType;
    Set<String> callOutcomes = new Set<String>{ 'Connected', 'NoAnswer', 'LeftVM' };

    if (stepType == 'MakeACall' && callOutcomes.contains(outcome)) {
      Task t = new Task();
      t.WhoId = tracker.TargetId;
      t.Subject = tracker.StepTitle;
      t.CallDisposition = outcome;
      t.Description = notes;
      t.Status = 'Completed';
      t.ActivityDate = Date.today();
      insert t;
    }

    if (stepType == 'CreateTask' && String.isNotBlank(notes)) {
      Task t = new Task();
      t.WhoId = tracker.TargetId;
      t.Subject = tracker.StepTitle;
      t.Description = notes;
      t.Status = 'Completed';
      t.ActivityDate = Date.today();
      insert t;
    }

    completeStepAsync(stepTrackerId, tracker.TargetId, outcome, baseUrl);
  }

  @future(callout=true)
  private static void completeStepAsync(Id stepTrackerId, Id targetId, String outcome, String baseUrl) {
    String sessionId = Page.GetSessionId.getContent().toString().trim();
    String eventType = (outcome == 'Skip') ? 'Skip' : 'ManualComplete';
    try {
      HttpRequest req = new HttpRequest();
      req.setEndpoint(baseUrl + '/services/data/v66.0/actions/standard/sendSalesCadenceEvent');
      req.setMethod('POST');
      req.setHeader('Content-Type', 'application/json');
      req.setHeader('Authorization', 'Bearer ' + sessionId);
      req.setBody('{"inputs":[{"recordId":"' + stepTrackerId + '","eventType":"' + eventType + '"}]}');
      new Http().send(req);
    } catch (Exception e) {
      System.debug(LoggingLevel.ERROR, 'completeStepAsync failed: ' + e.getMessage());
    }
  }
}
