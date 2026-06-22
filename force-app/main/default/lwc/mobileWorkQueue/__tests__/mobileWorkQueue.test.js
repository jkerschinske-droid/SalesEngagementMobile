import { createElement } from "lwc";
import MobileWorkQueue from "c/mobileWorkQueue";
import getQueueItems from "@salesforce/apex/MobileWorkQueueController.getQueueItems";
// eslint-disable-next-line no-unused-vars
import completeStep from "@salesforce/apex/MobileWorkQueueController.completeStep";

jest.mock(
  "@salesforce/apex/MobileWorkQueueController.getQueueItems",
  () => ({ default: jest.fn() }),
  { virtual: true }
);
jest.mock(
  "@salesforce/apex/MobileWorkQueueController.completeStep",
  () => ({ default: jest.fn() }),
  { virtual: true }
);

const MOCK_ITEMS = [
  {
    stepTrackerId: "a01",
    cadenceName: "C",
    stepName: "S",
    stepType: "Call",
    stepDay: 1,
    state: "Overdue",
    dueDate: "2026-05-19T10:00:00Z",
    targetName: "Alice",
    company: "Acme",
    titleRole: null,
    phone: "555-0001",
    script: null
  },
  {
    stepTrackerId: "a02",
    cadenceName: "C",
    stepName: "S",
    stepType: "Call",
    stepDay: 1,
    state: "Active",
    dueDate: "2026-05-20T10:00:00Z",
    targetName: "Bob",
    company: "Acme",
    titleRole: null,
    phone: "555-0002",
    script: null
  }
];

describe("c-mobile-work-queue", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it("renders list and no panel on initial load", async () => {
    getQueueItems.mockResolvedValue(MOCK_ITEMS);
    const el = createElement("c-mobile-work-queue", { is: MobileWorkQueue });
    document.body.appendChild(el);
    await Promise.resolve();

    const list = el.shadowRoot.querySelector("c-work-queue-list");
    const panel = el.shadowRoot.querySelector("c-work-queue-step-panel");
    expect(list).not.toBeNull();
    expect(panel).toBeNull();
  });

  it("shows panel when stepselected event fires", async () => {
    getQueueItems.mockResolvedValue(MOCK_ITEMS);
    const el = createElement("c-mobile-work-queue", { is: MobileWorkQueue });
    document.body.appendChild(el);
    await Promise.resolve();

    const list = el.shadowRoot.querySelector("c-work-queue-list");
    list.dispatchEvent(
      new CustomEvent("stepselected", { detail: { stepTrackerId: "a01" } })
    );
    await Promise.resolve();

    const panel = el.shadowRoot.querySelector("c-work-queue-step-panel");
    expect(panel).not.toBeNull();
  });

  it("computes correct nextStepId as first item after current in sorted queue", async () => {
    getQueueItems.mockResolvedValue(MOCK_ITEMS);
    const el = createElement("c-mobile-work-queue", { is: MobileWorkQueue });
    document.body.appendChild(el);
    await Promise.resolve();

    const list = el.shadowRoot.querySelector("c-work-queue-list");
    list.dispatchEvent(
      new CustomEvent("stepselected", { detail: { stepTrackerId: "a01" } })
    );
    await Promise.resolve();

    const panel = el.shadowRoot.querySelector("c-work-queue-step-panel");
    expect(panel.nextStepId).toBe("a02");
  });
});
