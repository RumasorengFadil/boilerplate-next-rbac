import "server-only";
// React progressive-enhancement metadata is transport, not feature input.
// Keep other unknown keys so strict feature schemas can reject tampering.
export function formPayload(form: FormData) {
  return Object.fromEntries([...form.entries()].filter(([key])=>!key.startsWith("$ACTION_")));
}
