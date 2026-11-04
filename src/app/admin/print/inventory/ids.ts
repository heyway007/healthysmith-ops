/** `?id=` (one or repeated) -> valid uuids, capped. */
export function idsFrom(param: string | string[] | undefined, max = 200) {
  return [param ?? []].flat().filter((s) => /^[0-9a-f-]{36}$/i.test(s)).slice(0, max);
}
