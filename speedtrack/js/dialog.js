InitilizeDialogDom(document.querySelector("body > *"));
function InitilizeDialogDom(container) {
  if (!container)
    console.error("Dialog container not found.");
  if (!container.querySelector("vue-dialog"))
    container.appendChild(document.createElement("vue-dialog"));
}
/**
 * Callback to validate current dialog object.
 * @callback ValidateDialog
 * @param {Dialog} dialog Dialog object.
 * @param {object} value Value to be validated.
 * @param {SubmitEvent} event Event triggered.
 * @returns {Promise<bool>} Define the success of validation.
 */
/**
 * @typedef DialogInputOption
 * @property {string} Description
 * @property {any} Value
 */
/**
 * @typedef {Object} DialogInput
 * @property {bool} Autofocus
 * @property {bool} Disabled
 * @property {string} Name
 * @property {DialogInputOption[]} Options
 * @property {bool} Required
 * @property {string} Type
 * @property {any} Value
 */
class DialogType {
  static Error = new DialogType("error")
  static Info = new DialogType("info")
  static Progress = new DialogType("loop")
  static Question = new DialogType("question_mark")
  static Success = new DialogType("check_circle")
  static Warning = new DialogType("warning")
  constructor(icon) {
    /** @type {string} */
    this.Icon = icon;
  }
}
class Dialog {
  constructor(id) {
    /** @type {string[]} */
    this.Buttons = [];
    /** @type {PromiseLike<string|object[]>} */
    this.CloseModal = null;
    /** @type {PromiseLike<Error>} */
    this.CloseModalWithError = null;
    /** @type {bool} */
    this.HideCloseButton = false;
    /** @type {int} */
    this.Id = id || 0;
    /** @type {string} */
    this.Icon = null;
    /** @type {DialogInput[]} */
    this.Inputs = [];
    /** @type {string} */
    this.Message = null;
    /** @type {DialogType} */
    this.Type = null;
    /** @type {ValidateDialog} */
    this.ValidateDialog = null;
  }
}
Vue.component("vue-dialog", async (resolve, reject) => {
  try {
    const response = await fetch("js/vue-templates/dialog.html");
    const template = (await response.text()).replace('<script type="text/javascript" src="/___vscode_livepreview_injected_script">', "");
    resolve({
      data: function() {
        return {
          Dialogs: []
        }
      },
      computed: {
        MaxId: function() {
          return this.Dialogs.length === 0 ? null : Math.max(...this.Dialogs.map(d => d.Id));
        }
      },
      template,
      methods: {
        Close: async function(dialog, value, event) {
          event?.submitter && (event.submitter.disabled = true);
          try {
            if (!value || !dialog.ValidateDialog || await dialog.ValidateDialog(dialog, value, event))
              dialog.CloseModal && dialog.CloseModal(value);
          } catch(error) {
            dialog.CloseModalWithError(error);
          } finally {
            event?.submitter && (event.submitter.disabled = false);
          }
        },
        CloseDialogByButton: async function(event, dialog) {
          try {
            event.target.disabled = true;
            return await dialog.CloseModal();
          } finally {
            event.target.disabled = false;
          }
        }
      }
    });
  } catch (error) {
    reject(error);
  }
});
/**
 * Callback to get current dialog object.
 * @callback GetDialog
 * @param {Dialog} dialog Dialog object.
 * @returns {Promise<void>}
 */
/**
 * Show a dialog box.
 * @param {string} message Dialog content. Can be html or text (see options param).
 * @param {object} options 
 * @param {DialogType} options.Type
 * @param {string} options.Icon Text icon retrieved from material icons: https://material.io/resources/icons
 * @param {string[]} [options.Buttons=["Ok"]] Text of buttons. By default, only one button with the text "Ok".
 * @param {GetDialog} options.GetDialog Callback to return the current dialog object.
 * @param {bool} options.PreventEscape Prevent user escape dialog pressing escape key.
 * @param {bool} options.HideCloseButton Hide close button.
 * @param {ValidateDialog} options.ValidateDialog Callback to validate the current dialog object.
 * @param {DialogInput[]} options.Inputs Input fields to request to user. The first button is used to validate the form with all inputs.
 * @returns {Promise<string|DialogInput[]>} If the user click the button, returns the clicked button text. If inputs are defined and the user click the first button, all inputs are returned.
 */
async function showModal(message, options) {
  const dialogContainer = [...document.querySelectorAll("section")].find(dialog => dialog.__vue__?.$options._componentTag === "vue-dialog")?.__vue__;
  if (!dialogContainer)
    return alert(message);
  const dialogId = (dialogContainer.MaxId ?? -1) + 1;
  const dialog = new Dialog(dialogId);
  dialogContainer.Dialogs.push(dialog);
  dialog.Buttons = options?.Buttons ?? ["Ok"];
  dialog.HideCloseButton = options?.HideCloseButton ?? false;
  dialog.Icon = options?.Icon || options?.Type?.Icon;
  dialog.Inputs = options?.Inputs || [];
  dialog.Message = message;
  dialog.Type = options?.Type;
  dialog.ValidateDialog = options?.ValidateDialog;
  var dialogElement;
  try {
    return await new Promise(async (resolve, reject) => {
      try {
        dialog.CloseModal = resolve;
        dialog.CloseModalWithError = reject;
        dialogElement = (await waitForElements(`#dlg${dialogId}`))[0];
        options?.PreventEscape && dialogElement.addEventListener("cancel", event => event.preventDefault());
        dialogElement.showModal();
        options?.GetDialog && await options?.GetDialog(dialog);
      } catch (error) {
        reject(error);
      }
    });
  } finally {
    dialogContainer.Dialogs.splice(dialogId, 1);
    dialogElement?.close();
  }
}
async function waitForElements(selector) {
  return new Promise(async resolve => {
    var elements = [...document.querySelectorAll(selector)];
    if (elements.length > 0)
      return resolve(elements);
    const watcher = new MutationObserver((mutations, observer) => {
      elements = mutations.find(m => [...m.addedNodes].some(n => n.matches && (n.matches(selector) || n.querySelector(selector))) || m.target.querySelector(selector));
      if (elements) {
        resolve([...document.querySelectorAll(selector)]);
        observer.disconnect();
      }
    });
    watcher.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
}