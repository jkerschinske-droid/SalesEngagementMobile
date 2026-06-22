import { LightningElement } from "lwc";
import getQueueItems from "@salesforce/apex/MobileWorkQueueController.getQueueItems";
import completeStep from "@salesforce/apex/MobileWorkQueueController.completeStep";

const SORT_OPTIONS = [
  { label: "Due Date", value: "dueDate" },
  { label: "Last Modified Date", value: "lastModifiedDate" },
  { label: "Date Created", value: "createdDate" }
];

export default class MobileWorkQueue extends LightningElement {
  items = [];
  selectedStepId = null;
  error;

  sortBy = "dueDate";
  sortDir = "asc";
  hideUpcoming = false;
  hideMissingFields = false;

  _sortedIds = [];

  get sortOptions() {
    return SORT_OPTIONS;
  }

  get sortDirLabel() {
    return this.sortDir === "asc" ? "Oldest First" : "Newest First";
  }

  get sortDirIcon() {
    return this.sortDir === "asc" ? "utility:arrowup" : "utility:arrowdown";
  }

  connectedCallback() {
    getQueueItems()
      .then((data) => {
        this.items = data;
        this._sortedIds = this._buildSortedIds(data);
        this.error = null;
      })
      .catch((err) => {
        this.error = err?.body?.message ?? "An unexpected error occurred.";
      });
  }

  _buildSortedIds(items) {
    const dir = this.sortDir === "asc" ? 1 : -1;
    const key = this.sortBy;
    return [...items]
      .sort((a, b) => {
        const aVal = a[key] ? new Date(a[key]).getTime() : (dir > 0 ? Infinity : -Infinity);
        const bVal = b[key] ? new Date(b[key]).getTime() : (dir > 0 ? Infinity : -Infinity);
        if (aVal !== bVal) return (aVal - bVal) * dir;
        if (a.cadenceName < b.cadenceName) return -1;
        if (a.cadenceName > b.cadenceName) return 1;
        return 0;
      })
      .map((i) => i.stepTrackerId);
  }

  get showList() {
    return !this.selectedStepId;
  }

  get showPanel() {
    return !!this.selectedStepId;
  }

  get selectedStep() {
    return this.items.find((i) => i.stepTrackerId === this.selectedStepId) ?? null;
  }

  get nextStepId() {
    const idx = this._sortedIds.indexOf(this.selectedStepId);
    if (idx === -1) return null;
    const EMAIL_TYPES = new Set(["SendAnEmail", "ManualEmail"]);
    const CALL_TYPES = new Set(["MakeACall", "AutomatedCall"]);
    for (let i = idx + 1; i < this._sortedIds.length; i++) {
      const id = this._sortedIds[i];
      const item = this.items.find((e) => e.stepTrackerId === id);
      if (!item) continue;
      if (this.hideUpcoming && item.state === "Upcoming") continue;
      if (this.hideMissingFields) {
        const needsEmail = EMAIL_TYPES.has(item.stepType) && !item.email;
        const needsPhone = CALL_TYPES.has(item.stepType) && !item.phone;
        if (needsEmail || needsPhone) continue;
      }
      return id;
    }
    return null;
  }

  handleStepSelected(event) {
    this.selectedStepId = event.detail.stepTrackerId;
  }

  handleDisposition(event) {
    const { stepTrackerId, outcome, notes } = event.detail;
    completeStep({ stepTrackerId, outcome, notes }).catch((err) => {
      this.error = err?.body?.message ?? "An unexpected error occurred.";
      const panel = this.template.querySelector("c-work-queue-step-panel");
      if (panel) panel.cancelDisposition();
    });
  }

  handleNextStep(event) {
    const nextId = event.detail.stepTrackerId;
    const { stepTrackerId: completedId } = this.selectedStep || {};
    this.items = this.items.filter((i) => i.stepTrackerId !== completedId);
    this._sortedIds = this._sortedIds.filter((id) => id !== completedId);
    this.selectedStepId = nextId;
  }

  handleBackToList() {
    this.selectedStepId = null;
  }

  get filterUpcomingLabel() {
    return this.hideUpcoming ? "Show Upcoming" : "Hide Upcoming";
  }

  get filterUpcomingIcon() {
    return this.hideUpcoming ? "utility:check" : "";
  }

  get filterMissingLabel() {
    return this.hideMissingFields ? "Show Missing Fields" : "Hide Missing Fields";
  }

  get filterMissingIcon() {
    return this.hideMissingFields ? "utility:check" : "";
  }

  handleSortChange(event) {
    this.sortBy = event.detail.value;
    this._sortedIds = this._buildSortedIds(this.items);
  }

  handleSortDirToggle() {
    this.sortDir = this.sortDir === "asc" ? "desc" : "asc";
    this._sortedIds = this._buildSortedIds(this.items);
  }

  handleFilterSelect(event) {
    const val = event.detail.value;
    if (val === "toggleUpcoming") {
      this.hideUpcoming = !this.hideUpcoming;
    } else if (val === "toggleMissingFields") {
      this.hideMissingFields = !this.hideMissingFields;
    }
  }
}
