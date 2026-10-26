/**
 * Détection du sous-domaine équipe (team.odysseo-education.com, team.localhost en dev).
 * Partagé par le middleware et les pages (404 adaptée au domaine).
 */
export function isTeamHost(host: string) {
  const bare = host.split(":")[0];
  const configured = (process.env.TEAM_HOSTNAME || "team.odysseo-education.com").split(":")[0];
  // "team." en préfixe couvre aussi team.localhost en développement.
  return bare === configured || bare.startsWith("team.");
}
