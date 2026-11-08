/** Règles du mot de passe de l'espace étudiant (partagées client / serveur). */
export const PASSWORD_MIN = 8;

export function isAcceptablePassword(password: string) {
  return typeof password === "string" && password.length >= PASSWORD_MIN && password.length <= 200 && /\D/.test(password);
}
