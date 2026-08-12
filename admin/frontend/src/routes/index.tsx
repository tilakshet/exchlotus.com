import { createFileRoute, redirect } from "@tanstack/react-router"
import { store } from "@/store"

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: store.getState().adminAuth.user ? "/dashboard" : "/login" })
  },
})
