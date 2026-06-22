import { createElement } from "lwc";
import WorkQueueStepPanel from "c/workQueueStepPanel";

const CALL_STEP = {
  stepTrackerId: "a01",
  cadenceName: "Cadence A",
  stepName: "Day 1 Call",
  stepType: "Call",
  stepDay: 1,
  script: "Hi, this is a call script.",
  state: "Overdue",
  targetName: "Alice Acme",
  company: "Acme Corp",
  titleRole: "CEO",
  lastActivity: "2026-05-15T00:00:00Z",
  phone: "555-0001"
};

const CUSTOM_STEP = {
  stepTrackerId: "b01",
  cadenceName: "Cadence B",
  stepName: "Day 5 Custom",
  stepType: "Custom",
  stepDay: 5,
  script: "Send a gift.",
  state: "Active",
  targetName: "Bob Builder",
  company: "Builder Co",
  titleRole: "VP",
  lastActivity: null,
  phone: null
};

describe("c-work-queue-step-panel", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllTimers();
  });

  beforeEach(() => {
    jest.useFakeTimers();
  });

  it("shows phone as tel link for Call step", () => {
    const el = createElement("c-work-queue-step-panel", {
      is: WorkQueueStepPanel
    });
    el.step = CALL_STEP;
    document.body.appendChild(el);

    const tel = el.shadowRoot.querySelector('a[href^="tel:"]');
    expect(tel).not.toBeNull();
    expect(tel.href).toContain("555-0001");
  });

  it("does not show phone for non-Call step", () => {
    const el = createElement("c-work-queue-step-panel", {
      is: WorkQueueStepPanel
    });
    el.step = CUSTOM_STEP;
    document.body.appendChild(el);

    const tel = el.shadowRoot.querySelector('a[href^="tel:"]');
    expect(tel).toBeNull();
  });

  it("emits disposition event with outcome on Call button click", () => {
    const el = createElement("c-work-queue-step-panel", {
      is: WorkQueueStepPanel
    });
    el.step = CALL_STEP;
    document.body.appendChild(el);

    const handler = jest.fn();
    el.addEventListener("disposition", handler);

    const connectedBtn = el.shadowRoot.querySelector(
      '[data-outcome="Connected"]'
    );
    connectedBtn.click();

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.stepTrackerId).toBe("a01");
    expect(detail.outcome).toBe("Connected");
    expect(detail.notes).toBe("");
  });

  it("emits disposition event with notes for Custom step", () => {
    const el = createElement("c-work-queue-step-panel", {
      is: WorkQueueStepPanel
    });
    el.step = CUSTOM_STEP;
    document.body.appendChild(el);

    const handler = jest.fn();
    el.addEventListener("disposition", handler);

    const notesInput = el.shadowRoot.querySelector("lightning-textarea");
    notesInput.value = "Left a message";
    notesInput.dispatchEvent(
      new CustomEvent("change", { detail: { value: "Left a message" } })
    );

    const completeBtn = el.shadowRoot.querySelector(
      '[data-outcome="Complete"]'
    );
    completeBtn.click();

    const detail = handler.mock.calls[0][0].detail;
    expect(detail.notes).toBe("Left a message");
    expect(detail.outcome).toBe("Complete");
  });

  it("emits nextStep event after 3-second countdown", () => {
    const el = createElement("c-work-queue-step-panel", {
      is: WorkQueueStepPanel
    });
    el.step = CALL_STEP;
    el.nextStepId = "a02";
    document.body.appendChild(el);

    const connectedBtn = el.shadowRoot.querySelector(
      '[data-outcome="Connected"]'
    );
    connectedBtn.click();

    const nextHandler = jest.fn();
    el.addEventListener("nextstep", nextHandler);

    jest.advanceTimersByTime(3000);

    expect(nextHandler).toHaveBeenCalledTimes(1);
    expect(nextHandler.mock.calls[0][0].detail.stepTrackerId).toBe("a02");
  });
});
