import { createElement } from "lwc";
import WorkQueueList from "c/workQueueList";

const MOCK_ITEMS = [
  {
    stepTrackerId: "a01",
    cadenceName: "Cadence A",
    stepName: "Day 1 Call",
    stepType: "Call",
    stepDay: 1,
    state: "Overdue",
    dueDate: "2026-05-19T10:00:00Z",
    targetName: "Alice Acme",
    company: "Acme Corp",
    titleRole: "CEO",
    phone: "555-0001"
  },
  {
    stepTrackerId: "a02",
    cadenceName: "Cadence A",
    stepName: "Day 1 Call",
    stepType: "Call",
    stepDay: 1,
    state: "Active",
    dueDate: "2026-05-20T10:00:00Z",
    targetName: "Bob Builder",
    company: "Builder Co",
    titleRole: "VP",
    phone: "555-0002"
  },
  {
    stepTrackerId: "a03",
    cadenceName: "Cadence A",
    stepName: "Day 3 Email",
    stepType: "Email",
    stepDay: 3,
    state: "Active",
    dueDate: "2026-05-22T10:00:00Z",
    targetName: "Carol Cloud",
    company: "Cloud Inc",
    titleRole: null,
    phone: null
  }
];

describe("c-work-queue-list", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("renders cadence group header", () => {
    const el = createElement("c-work-queue-list", { is: WorkQueueList });
    el.items = MOCK_ITEMS;
    el.hideUpcoming = false;
    document.body.appendChild(el);

    const headers = el.shadowRoot.querySelectorAll(
      '[data-id="cadence-header"]'
    );
    expect(headers.length).toBe(1);
    expect(headers[0].textContent).toContain("Cadence A");
  });

  it("renders step sub-headers grouped by day+type", () => {
    const el = createElement("c-work-queue-list", { is: WorkQueueList });
    el.items = MOCK_ITEMS;
    el.hideUpcoming = false;
    document.body.appendChild(el);

    const subHeaders = el.shadowRoot.querySelectorAll(
      '[data-id="step-header"]'
    );
    expect(subHeaders.length).toBe(2); // Day 1 Call, Day 3 Email
  });

  it("emits stepselected with correct stepTrackerId on row tap", () => {
    const el = createElement("c-work-queue-list", { is: WorkQueueList });
    el.items = MOCK_ITEMS;
    el.hideUpcoming = false;
    document.body.appendChild(el);

    const handler = jest.fn();
    el.addEventListener("stepselected", handler);

    const rows = el.shadowRoot.querySelectorAll('[data-id="step-row"]');
    rows[0].click();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.stepTrackerId).toBe("a01");
  });

  it("hides upcoming rows when hideUpcoming is true", () => {
    const upcomingItems = [
      ...MOCK_ITEMS,
      {
        stepTrackerId: "a04",
        cadenceName: "Cadence B",
        stepName: "Day 5 Custom",
        stepType: "Custom",
        stepDay: 5,
        state: "Upcoming",
        dueDate: "2026-05-25T10:00:00Z",
        targetName: "Dave Demo",
        company: "Demo LLC",
        titleRole: null,
        phone: null
      }
    ];
    const el = createElement("c-work-queue-list", { is: WorkQueueList });
    el.items = upcomingItems;
    el.hideUpcoming = true;
    document.body.appendChild(el);

    // Cadence B should not appear because its only row is upcoming
    const headers = el.shadowRoot.querySelectorAll(
      '[data-id="cadence-header"]'
    );
    const headerTexts = Array.from(headers).map((h) => h.textContent);
    expect(headerTexts.some((t) => t.includes("Cadence B"))).toBe(false);
  });
});
