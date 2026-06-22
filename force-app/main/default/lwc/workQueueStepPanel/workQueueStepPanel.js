import { LightningElement, api } from "lwc";
import { NavigationMixin } from "lightning/navigation";

const STEP_TYPE_LABELS = {
  MakeACall: "Call",
  AutomatedCall: "Auto Call",
  SendAnEmail: "Email",
  ManualEmail: "Manual Email",
  CreateTask: "Task"
};

export default class WorkQueueStepPanel extends NavigationMixin(LightningElement) {
  _step = null;
  @api
  get step() {
    return this._step;
  }
  set step(val) {
    this._step = val;
    this.disposed = false;
    this.countdown = 3;
    this.notes = "";
    this.scriptCopied = false;
    this.subjectCopied = false;
    this.bodyCopied = false;
    this._animating = true;
    if (this._countdownInterval != null) {
      window.clearInterval(this._countdownInterval);
      this._countdownInterval = null;
    }
    // eslint-disable-next-line @lwc/lwc/no-async-operation
    setTimeout(() => {
      this._animating = false;
      this.template?.host?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 260);
  }

  @api nextStepId;

  @api cancelDisposition() {
    if (this._countdownInterval != null) {
      window.clearInterval(this._countdownInterval);
      this._countdownInterval = null;
    }
    this.disposed = false;
    this.countdown = 3;
    this._capturedNextId = null;
    this._pendingOutcome = null;
  }

  disposed = false;
  countdown = 3;
  notes = "";
  callNotes = "";
  showCallNotesModal = false;
  _pendingOutcome = null;
  _capturedNextId = null;
  scriptCopied = false;
  subjectCopied = false;
  bodyCopied = false;
  _animating = false;

  get panelClass() {
    return this._animating ? "panel-content animate" : "panel-content";
  }

  _countdownInterval;

  get isCall() {
    return (
      this.step?.stepType === "MakeACall" ||
      this.step?.stepType === "AutomatedCall"
    );
  }

  get isEmail() {
    return (
      this.step?.stepType === "SendAnEmail" ||
      this.step?.stepType === "ManualEmail"
    );
  }

  get isCustom() {
    return this.step?.stepType === "CreateTask";
  }

  get showPhone() {
    return this.isCall && !!this.step?.phone;
  }

  get showEmailLink() {
    return this.isEmail && !!this.step?.email;
  }

  get _parsedScript() {
    const script = this.step?.script || "";
    const subjectMatch = script.match(/^Subject:\s*(.+)/m);
    if (subjectMatch) {
      return {
        subject: subjectMatch[1].trim(),
        body: script.replace(/^Subject:\s*.+\n+/, "").trim()
      };
    }
    return { subject: "", body: script };
  }

  get emailSubject() {
    return this._parsedScript.subject;
  }

  get emailBody() {
    return this._parsedScript.body;
  }

  get showEmailParts() {
    return this.isEmail && !!this.step?.script;
  }

  get subjectCopyLabel() {
    return this.subjectCopied ? "Copied!" : "Copy Subject";
  }

  get bodyCopyLabel() {
    return this.bodyCopied ? "Copied!" : "Copy Body";
  }

  _buildMailto() {
    const { subject, body } = this._parsedScript;
    return (
      "mailto:" +
      this.step.email +
      "?subject=" +
      encodeURIComponent(subject) +
      "&body=" +
      encodeURIComponent(body)
    );
  }

  handleCopySubject() {
    navigator.clipboard.writeText(this._parsedScript.subject).then(() => {
      this.subjectCopied = true;
      // eslint-disable-next-line @lwc/lwc/no-async-operation
      setTimeout(() => { this.subjectCopied = false; }, 2000);
    });
  }

  handleCopyBody() {
    navigator.clipboard.writeText(this._parsedScript.body).then(() => {
      this.bodyCopied = true;
      // eslint-disable-next-line @lwc/lwc/no-async-operation
      setTimeout(() => { this.bodyCopied = false; }, 2000);
    });
  }

  handleEmailClick(event) {
    event.preventDefault();
    // eslint-disable-next-line @lwc/lwc/no-document-query
    const anchor = document.createElement("a");
    anchor.setAttribute("href", this._buildMailto());
    anchor.style.display = "none";
    // eslint-disable-next-line @lwc/lwc/no-document-query
    document.body.appendChild(anchor);
    anchor.click();
    // eslint-disable-next-line @lwc/lwc/no-document-query
    document.body.removeChild(anchor);
  }

  get telHref() {
    return `tel:${this.step?.phone}`;
  }

  get formattedPhone() {
    const raw = (this.step?.phone || "").replace(/\D/g, "");
    if (raw.length === 10) {
      return `(${raw.slice(0, 3)}) ${raw.slice(3, 6)}-${raw.slice(6)}`;
    }
    if (raw.length === 11 && raw[0] === "1") {
      return `+1 (${raw.slice(1, 4)}) ${raw.slice(4, 7)}-${raw.slice(7)}`;
    }
    return this.step?.phone || "";
  }

  get telAriaLabel() {
    return `Call ${this.step?.phone}`;
  }

  get stepDayLabel() {
    const type =
      STEP_TYPE_LABELS[this.step?.stepType] || this.step?.stepType || "Step";
    if (this.step?.stepDay != null) {
      return `Day ${this.step.stepDay} · ${type}`;
    }
    return this.step?.stepName || type;
  }

  get scriptLabel() {
    return this.isCall ? "CALL SCRIPT" : "INSTRUCTIONS";
  }

  get copyLabel() {
    return this.scriptCopied ? "Copied!" : "Copy Script";
  }

  handleCopyScript() {
    const script = this.step?.script || "";
    navigator.clipboard.writeText(script).then(() => {
      this.scriptCopied = true;
      // eslint-disable-next-line @lwc/lwc/no-async-operation
      setTimeout(() => {
        this.scriptCopied = false;
      }, 2000);
    });
  }

  get showScript() {
    return !!this.step?.script;
  }

  get showCountdownBanner() {
    return this.disposed;
  }

  get queueComplete() {
    return !this.nextStepId;
  }

  handleTargetClick() {
    this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: {
        recordId: this.step.targetId,
        actionName: "view"
      }
    });
  }

  handleNotesChange(event) {
    this.notes = event.detail.value;
  }

  handleDisposition(event) {
    const outcome = event.currentTarget.dataset.outcome;
    if (outcome === "Connected") {
      this._pendingOutcome = outcome;
      this._capturedNextId = this.nextStepId;
      this.callNotes = "";
      this.showCallNotesModal = true;
      return;
    }
    this._emitDisposition(outcome, this.nextStepId);
  }

  handleCallNotesChange(event) {
    this.callNotes = event.detail.value;
  }

  handleCallNotesSubmit() {
    this.showCallNotesModal = false;
    this._emitDisposition(this._pendingOutcome, this._capturedNextId, this.callNotes);
  }

  handleCallNotesCancel() {
    this.showCallNotesModal = false;
    this._pendingOutcome = null;
    this._capturedNextId = null;
  }

  _emitDisposition(outcome, capturedNextId, extraNotes) {
    this.dispatchEvent(
      new CustomEvent("disposition", {
        detail: {
          stepTrackerId: this.step.stepTrackerId,
          outcome,
          notes: extraNotes || this.notes
        }
      })
    );
    this.disposed = true;
    this._capturedNextId = capturedNextId;
    if (capturedNextId) {
      this._startCountdown();
    }
  }

  _startCountdown() {
    this.countdown = 3;
    // eslint-disable-next-line @lwc/lwc/no-async-operation
    this._countdownInterval = window.setInterval(() => {
      this.countdown -= 1;
      if (this.countdown <= 0) {
        this._advance();
      }
    }, 1000);
  }

  _advance() {
    if (this._countdownInterval == null) return;
    window.clearInterval(this._countdownInterval);
    this._countdownInterval = null;
    this.dispatchEvent(
      new CustomEvent("nextstep", {
        detail: { stepTrackerId: this._capturedNextId }
      })
    );
  }

  handleAdvanceNow() {
    this._advance();
  }

  disconnectedCallback() {
    window.clearInterval(this._countdownInterval);
    this._countdownInterval = null;
  }
}
