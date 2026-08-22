import type { TenderExtraction } from "./schema.js";

export interface TenderWorkspace extends TenderExtraction {
  agent: "tender_intake";
  schema_version: "1.0";
}
