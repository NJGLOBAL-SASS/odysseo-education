export const COUNTRIES: { value: string; dial: string }[] = [
  { value: "Cameroun", dial: "+237" },
  { value: "Gabon", dial: "+241" },
  { value: "Tchad", dial: "+235" },
  { value: "Côte d'Ivoire", dial: "+225" },
  { value: "Sénégal", dial: "+221" },
  { value: "Mali", dial: "+223" },
  { value: "Guinée", dial: "+224" },
  { value: "Congo", dial: "+242" },
  { value: "RD Congo", dial: "+243" },
  { value: "Bénin", dial: "+229" },
  { value: "Togo", dial: "+228" },
  { value: "Burkina Faso", dial: "+226" },
  { value: "Centrafrique", dial: "+236" },
  { value: "Autre", dial: "" },
];

export function dialCodeFor(country: string) {
  return COUNTRIES.find((c) => c.value === country)?.dial ?? "";
}
