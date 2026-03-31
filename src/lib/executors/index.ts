/**
 * Executor registry.
 * Registers all pipeline executors with the runner's label-based dispatch system.
 */

import { registerExecutor } from "../runner";
import { fanpageDiscoverExecutor } from "./fanpage-discover";
import { fanpageDraftExecutor } from "./fanpage-draft";
import { fanpagePostExecutor } from "./fanpage-post";
import { fanpageEngageExecutor } from "./fanpage-engage";
import { salonChatExecutor } from "./salon-agent";

export function registerFanpageExecutors(): void {
  registerExecutor("fanpage:discover", fanpageDiscoverExecutor);
  registerExecutor("fanpage:draft", fanpageDraftExecutor);
  registerExecutor("fanpage:post", fanpagePostExecutor);
  registerExecutor("fanpage:engage", fanpageEngageExecutor);
  console.log("[executors] Registered fanpage executors: discover, draft, post, engage");
}

export function registerSalonExecutors(): void {
  registerExecutor("salon:chat", salonChatExecutor);
  console.log("[executors] Registered salon executors: chat");
}
