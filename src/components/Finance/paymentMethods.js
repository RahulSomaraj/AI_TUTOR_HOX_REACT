// Payment-method configuration, kept out of the component file so Fast Refresh
// keeps working (a module that exports both a component and constants can't be
// hot-swapped).
//
// The backend has exactly one free-text reference column (`referenceNo`,
// max 64) shared by every payment method — there is no dedicated cheque-number
// or UTR field. So rather than a generic "Reference" box that means something
// different each time, each method relabels that one field and decides whether
// it's mandatory.

export const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "DEBIT_CARD", label: "Debit Card" },
  { value: "NET_BANKING", label: "Net Banking" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
];

export const METHOD_LABELS = Object.fromEntries(
  PAYMENT_METHODS.map((method) => [method.value, method.label])
);

export const REFERENCE_MAX_LENGTH = 64;

// `null` means the method has nothing meaningful to reference, so the field is
// hidden entirely rather than shown empty and ignored.
const METHOD_REFERENCE = {
  CASH: null,
  UPI: {
    label: "UPI Reference",
    placeholder: "e.g. UPI-8829911",
    required: true,
    hint: "The transaction id from the UPI app.",
  },
  CREDIT_CARD: {
    label: "Approval Code / Last 4 Digits",
    placeholder: "e.g. 4421 or approval code",
    required: false,
    hint: "Never record a full card number.",
  },
  DEBIT_CARD: {
    label: "Approval Code / Last 4 Digits",
    placeholder: "e.g. 4421 or approval code",
    required: false,
    hint: "Never record a full card number.",
  },
  NET_BANKING: {
    label: "Bank Transaction Reference",
    placeholder: "e.g. NB-77219034",
    required: true,
    hint: "",
  },
  CHEQUE: {
    label: "Cheque Number",
    placeholder: "e.g. 004512",
    required: true,
    hint: "Set the payment date to the cheque date if it isn't today.",
  },
  BANK_TRANSFER: {
    label: "UTR / Transfer Reference",
    placeholder: "e.g. UTR2026080312345",
    required: true,
    hint: "",
  },
};

export function referenceConfigFor(method) {
  return METHOD_REFERENCE[method] ?? null;
}

/** Whether this method can be submitted with the reference the user has typed. */
export function isReferenceSatisfied(method, referenceNo) {
  const config = referenceConfigFor(method);
  if (!config?.required) return true;
  return Boolean(referenceNo?.trim());
}
