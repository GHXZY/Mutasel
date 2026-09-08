import type { Bridge } from "../../../packages/shared/protocol";
declare global {
  interface Window {
    classroom?: Bridge;
  }
}
