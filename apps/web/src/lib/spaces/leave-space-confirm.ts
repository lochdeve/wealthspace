/** C-05: extra copy when the viewer is the only ACTIVE member listed by the API. */
export function isSoleActiveMember(activeMemberCount: number): boolean {
  return activeMemberCount === 1;
}

export function appendLastActiveMemberLeaveNotice(
  baseMessage: string,
  activeMemberCount: number,
): string {
  if (!isSoleActiveMember(activeMemberCount)) {
    return baseMessage;
  }
  return `${baseMessage}\n\nATENCIÓN (C-05): Eres la única persona activa en este espacio. Si sales, no quedará nadie con acceso hasta que alguien acepte una invitación. Los datos históricos se conservan.`;
}

export const LAST_ACTIVE_LEAVE_SECOND_CONFIRM =
  '¿Seguro? Nadie más podrá usar este espacio compartido hasta una nueva invitación.';