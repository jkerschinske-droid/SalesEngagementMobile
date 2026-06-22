import { LightningElement, api } from "lwc";

const STEP_TYPE_ICONS = {
  MakeACall: "utility:call",
  AutomatedCall: "utility:call",
  SendAnEmail: "utility:email",
  ManualEmail: "utility:email",
  CreateTask: "utility:record"
};

const STEP_TYPE_COLORS = {
  MakeACall: "#34c759",
  AutomatedCall: "#34c759",
  SendAnEmail: "#e07b00",
  ManualEmail: "#e07b00",
  CreateTask: "#0070d2"
};

const STEP_TYPE_LABELS = {
  MakeACall: "Call",
  AutomatedCall: "Auto Call",
  SendAnEmail: "Email",
  ManualEmail: "Manual Email",
  CreateTask: "Task"
};

const STATE_COLORS = {
  Overdue: "#c23934",
  Active: "#e07b00",
  Upcoming: "#706e6b"
};

const EMAIL_TYPES = new Set(["SendAnEmail", "ManualEmail"]);
const CALL_TYPES = new Set(["MakeACall", "AutomatedCall"]);

function isMissingField(item) {
  if (EMAIL_TYPES.has(item.stepType) && !item.email) return true;
  if (CALL_TYPES.has(item.stepType) && !item.phone) return true;
  return false;
}

export default class WorkQueueList extends LightningElement {
  _hideUpcoming = false;
  @api
  get hideUpcoming() { return this._hideUpcoming; }
  set hideUpcoming(val) { this._hideUpcoming = val; this._groups = undefined; }

  _hideMissingFields = false;
  @api
  get hideMissingFields() { return this._hideMissingFields; }
  set hideMissingFields(val) { this._hideMissingFields = val; this._groups = undefined; }

  _sortBy = "dueDate";
  @api
  get sortBy() { return this._sortBy; }
  set sortBy(val) { this._sortBy = val; this._groups = undefined; }

  _sortDir = "asc";
  @api
  get sortDir() { return this._sortDir; }
  set sortDir(val) { this._sortDir = val; this._groups = undefined; }

  _items = [];
  _groups = undefined;
  _collapsed = new Set();

  @api
  get items() { return this._items; }
  set items(val) { this._items = val || []; this._groups = undefined; }

  get hasGroups() {
    return this.groups.length > 0;
  }

  get groups() {
    if (!this._groups) {
      this._groups = this._buildGroups();
    }
    return this._groups.map((g) => ({
      ...g,
      isCollapsed: this._collapsed.has(g.cadenceName),
      chevronIcon: this._collapsed.has(g.cadenceName)
        ? "utility:chevronright"
        : "utility:chevrondown"
    }));
  }

  handleCadenceToggle(event) {
    const name = event.currentTarget.dataset.cadence;
    const next = new Set(this._collapsed);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    this._collapsed = next;
  }

  _buildGroups() {
    let visible = this._items;
    if (this._hideUpcoming) {
      visible = visible.filter((i) => i.state !== "Upcoming");
    }
    if (this._hideMissingFields) {
      visible = visible.filter((i) => !isMissingField(i));
    }

    const dir = this._sortDir === "asc" ? 1 : -1;
    const key = this._sortBy;
    const sorted = [...visible].sort((a, b) => {
      const aVal = a[key] ? new Date(a[key]).getTime() : (dir > 0 ? Infinity : -Infinity);
      const bVal = b[key] ? new Date(b[key]).getTime() : (dir > 0 ? Infinity : -Infinity);
      if (aVal !== bVal) return (aVal - bVal) * dir;
      if (a.cadenceName < b.cadenceName) return -1;
      if (a.cadenceName > b.cadenceName) return 1;
      return 0;
    });

    const cadenceMap = new Map();
    for (const item of sorted) {
      if (!cadenceMap.has(item.cadenceName)) {
        cadenceMap.set(item.cadenceName, { cadenceName: item.cadenceName, stepGroups: new Map() });
      }
      const cadenceGroup = cadenceMap.get(item.cadenceName);
      const typeLabel = STEP_TYPE_LABELS[item.stepType] || item.stepType || "Step";
      const stepName = item.stepName || "";
      const stepKey = item.stepDay != null
        ? `Day ${item.stepDay}: ${stepName} — ${typeLabel}`
        : stepName
          ? `${stepName} — ${typeLabel}`
          : typeLabel;
      if (!cadenceGroup.stepGroups.has(stepKey)) {
        cadenceGroup.stepGroups.set(stepKey, { stepKey, rows: [] });
      }
      const iconColor = STEP_TYPE_COLORS[item.stepType] || "#706e6b";
      const stateLabel = item.state === "Active" ? "Due" : item.state;
      const dueDateLabel = item.dueDate
        ? new Date(item.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : null;
      const missingField = isMissingField(item);
      cadenceGroup.stepGroups.get(stepKey).rows.push({
        ...item,
        iconName: STEP_TYPE_ICONS[item.stepType] || "utility:record",
        iconBadgeStyle: `background-color:${iconColor};display:inline-flex;align-items:center;justify-content:center`,
        stateColor: STATE_COLORS[item.state] || "#706e6b",
        stateLabel: dueDateLabel ? `${stateLabel} ${dueDateLabel}` : stateLabel,
        missingField
      });
    }

    return Array.from(cadenceMap.values()).map((cg) => ({
      cadenceName: cg.cadenceName,
      stepGroups: Array.from(cg.stepGroups.values()).map((sg) => ({
        stepKey: sg.stepKey,
        count: sg.rows.length,
        overdueCount: sg.rows.filter((r) => r.state === "Overdue").length,
        rows: sg.rows
      }))
    }));
  }

  handleRowClick(event) {
    const stepTrackerId = event.currentTarget.dataset.stepTrackerid;
    this.dispatchEvent(new CustomEvent("stepselected", { detail: { stepTrackerId } }));
  }
}
