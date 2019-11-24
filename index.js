/**
 * State machine config and transition handling
 */
const stateMachineConfig = {
  id: "form",
  // Throw errors for likely mistakes
  strict: true,
  context: {
    initialContextField: "This is a context field that is set by default"
  },
  // This is the first screen we want to show the user:
  initial: "welcome",
  states: {
    welcome: {
      on: {
        CONTINUE: "residency"
      }
    },
    residency: {
      on: {
        CONTINUE: [
          { target: "profile", cond: "isStateResident" },
          { target: "nonResident" }
        ]
      }
    },
    profile: {
      on: {
        CONTINUE: "livingSituation"
      }
    },
    livingSituation: {
      on: {
        CONTINUE: [
          { target: "homeAddress", cond: "hasStableHousing" },
          { target: "mailingAddress" }
        ]
      }
    },
    homeAddress: {
      on: {
        CONTINUE: [
          { target: "review", cond: "mailingSameAsHomeAddress" },
          { target: "mailingAddress" }
        ]
      }
    },
    mailingAddress: {},
    nonResident: {
      type: "final"
    },
    review: {
      type: "final"
    }
  },
  on: {
    SET_STATE: {
      // This currently only works with the @next version of StateX
      // https://github.com/davidkpiano/xstate/issues/644
      actions: "updateFormState"
    }
  }
};

const actions = {
  updateFormState: XState.assign((context, event) =>
    Object.assign(context, event.payload)
  )
};

const guards = {
  hasStableHousing: context => context.livingSituation === "stable",
  isStateResident: context => context.isStateResident === "yes",
  mailingSameAsHomeAddress: context =>
    context.mailingSameAsHomeAddress === "yes"
};

const machine = XState.Machine(stateMachineConfig, { actions, guards });

const service = XState.interpret(machine)
  .onTransition(newState => {
    console.log("Transition:", newState.value, newState);
    renderFormStep(newState);
  })
  .start(); // Start our service to trigger the initial render, and so we can send events to our machine

/**
 * ====================================
 * UI management
 * ====================================
 */

/**
 * Update our state and trigger a transition to the next state
 * @param {Event} event
 */
function handleSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);

  // Update the state machine context to store the current form's values
  service.send("SET_STATE", { payload: Object.fromEntries(formData) });

  // Transition to the next screen
  service.send("CONTINUE");
}

/**
 * Display the active state's UI, and hide previously active state's UI.
 * @todo Show how we could use the state object to update the URL, so that
 *  something like React Router could handle UI transitions
 * @param {object} state
 * @param {string} state.value - property name of the active state
 */
function renderFormStep(state) {
  console.log("Render form", state.value, state);
  const activeStepClass = "step--active";
  const previousStep = document.querySelector(`.${activeStepClass}`);
  const step = document.querySelector(`#step--${state.value}`);

  if (previousStep) previousStep.classList.remove(activeStepClass);
  step.classList.add(activeStepClass);

  const debug = document.querySelector(".statex-debug");
  debug.innerHTML = `State => ${JSON.stringify(
    state,
    null,
    1
  )}\n\nstate.toStrings() => ${JSON.stringify(state.toStrings(), null, 1)}`;
}

const forms = document.querySelectorAll("form");
forms.forEach(button => {
  button.addEventListener("submit", handleSubmit);
});

// Render our state machine config to the browser for copy-pasting into visualizer
const machineDebugEl = document.querySelector(".statex-machine-config");
machineDebugEl.innerHTML = `Machine(${JSON.stringify(
  stateMachineConfig,
  null,
  1
)}, { actions, guards })`;
