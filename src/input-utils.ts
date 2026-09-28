export interface ChangeNotifyingInput {
  value: string;
  trigger(eventType: string): void;
}

/** Replace an input value and notify any component bound to its input event. */
export function setInputValueAndNotify(
  input: ChangeNotifyingInput,
  value: string,
): void {
  input.value = value;
  input.trigger("input");
}
