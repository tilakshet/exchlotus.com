import { useEffect, useState } from "react"

/** Delays reflecting `value` until it stops changing for `delayMs` — for search inputs wired to a server-side query, so typing doesn't fire a request per keystroke. */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])

  return debounced
}
