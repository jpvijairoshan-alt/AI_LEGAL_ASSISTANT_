import { NextResponse } from "next/server";
import { z, ZodTypeAny } from "zod";

export const COURT_TYPES = [
  "HIGH_COURT",
  "DISTRICT_COURT",
  "SUPREME_COURT",
  "TRIBUNAL",
  "SESSIONS_COURT",
  "MAGISTRATE_COURT",
] as const;

export const CASE_STAGES = [
  "FIR_STAGE",
  "INVESTIGATION",
  "CHARGE_SHEET",
  "TRIAL",
  "ARGUMENTS",
  "CROSS_EXAMINATION",
  "JUDGMENT",
  "BAIL",
  "APPEAL",
  "MISC",
] as const;

export const CASE_STATUSES = ["ACTIVE", "DISPOSED", "PENDING"] as const;

const validDate = (v: string) => !Number.isNaN(new Date(v).getTime());

/** Required, non-empty string. */
const required = (label: string) =>
  z.string({ required_error: `${label} is required`, invalid_type_error: `${label} must be text` })
    .trim()
    .min(1, `${label} is required`);

/** Optional text; empty string becomes null. */
const optionalText = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v ? v : null));

const optionalDate = (label: string) =>
  z
    .string()
    .trim()
    .nullish()
    .refine((v) => !v || validDate(v), `${label} is not a valid date`)
    .transform((v) => (v ? new Date(v) : null));

const optionalEmail = z
  .string()
  .trim()
  .nullish()
  .refine((v) => !v || z.string().email().safeParse(v).success, "Client email is not a valid email address")
  .transform((v) => (v ? v : null));

export const registerSchema = z.object({
  fullName: required("Full name"),
  email: required("Email").email("Email is not a valid email address").transform((v) => v.toLowerCase()),
  barCouncilNo: required("Bar Council number"),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
});

export const loginSchema = z.object({
  email: required("Email").transform((v) => v.toLowerCase()),
  password: z.string({ required_error: "Password is required" }).min(1, "Password is required"),
});

const caseFields = {
  caseNumber: required("Case number"),
  title: required("Title"),
  clientName: required("Client name"),
  clientPhone: optionalText,
  clientEmail: optionalEmail,
  courtName: required("Court name"),
  courtType: z.enum(COURT_TYPES, { errorMap: () => ({ message: "Invalid court type" }) }),
  judgeName: optionalText,
  opposingCounsel: optionalText,
  stage: z.enum(CASE_STAGES, { errorMap: () => ({ message: "Invalid case stage" }) }),
  status: z.enum(CASE_STATUSES, { errorMap: () => ({ message: "Invalid case status" }) }),
  description: optionalText,
  filingDate: optionalDate("Filing date"),
};

export const caseCreateSchema = z.object({
  ...caseFields,
  courtType: caseFields.courtType.default("DISTRICT_COURT"),
  stage: caseFields.stage.default("FIR_STAGE"),
});

// Only these keys can ever be updated; unknown keys (lawyerId, id, createdAt, ...) are stripped.
export const caseUpdateSchema = z.object(caseFields).partial().strip();

export const hearingCreateSchema = z.object({
  title: required("Title"),
  date: required("Date").refine(validDate, "Date is not a valid date"),
  time: optionalText,
  courtName: required("Court name"),
  courtType: z.enum(COURT_TYPES, { errorMap: () => ({ message: "Invalid court type" }) }).default("DISTRICT_COURT"),
  judgeName: optionalText,
  notes: optionalText,
  caseId: required("Case"),
});

export const evidenceCreateSchema = z.object({
  caseId: required("Case"),
  tag: optionalText,
  description: optionalText,
});

/** Parses `data` with `schema`; on failure returns a 400 response with readable messages. */
export function validate<S extends ZodTypeAny>(
  schema: S,
  data: unknown
): { data: z.output<S>; error?: undefined } | { data?: undefined; error: NextResponse } {
  const result = schema.safeParse(data);
  if (result.success) return { data: result.data };
  const messages = result.error.issues.map((i) => i.message);
  return {
    error: NextResponse.json({ detail: messages.join("; "), errors: messages }, { status: 400 }),
  };
}

/** Reads a JSON body, returning null when it is missing or malformed. */
export async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export const unauthorized = () => NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
export const invalidBody = () => NextResponse.json({ detail: "Request body must be valid JSON" }, { status: 400 });
