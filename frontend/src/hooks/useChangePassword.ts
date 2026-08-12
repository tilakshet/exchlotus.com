import { useMutation } from "@tanstack/react-query"
import { changePassword } from "@/api/auth.api"

export function useChangePassword() {
  return useMutation({ mutationFn: changePassword })
}
