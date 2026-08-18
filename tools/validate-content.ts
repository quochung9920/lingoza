import { chineseBundle } from "../language-packs/zh-CN/src/index.js";
import { formatReport, validateBundle } from "../packages/content-validator/src/index.js";

/**
 * `npm run validate:content`
 *
 * Validates every shipped language pack. Errors fail the build; warnings are
 * printed but tolerated, because unrecorded audio and orphaned draft entries
 * are normal mid-authoring states that should be visible without blocking.
 */
const bundles = [{ label: "zh-CN", bundle: chineseBundle }];

let failed = false;
for (const { label, bundle } of bundles) {
  const report = validateBundle(bundle);
  console.log(formatReport(report, label));
  if (!report.ok) failed = true;
}

process.exit(failed ? 1 : 0);
