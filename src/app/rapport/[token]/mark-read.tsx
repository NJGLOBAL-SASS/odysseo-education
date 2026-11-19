"use client";

import { useEffect } from "react";

/** 1re ouverture par l'étudiant → « Lu ». En JavaScript : les robots d'aperçu ne comptent pas. */
export function MarkRead({ token }: { token: string }) {
  useEffect(() => {
    fetch(`/api/rapport/${token}/lu`, { method: "POST", keepalive: true }).catch(() => undefined);
  }, [token]);
  return null;
}
