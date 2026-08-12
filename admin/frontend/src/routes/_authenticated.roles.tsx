import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { KeyRound, Lock } from "lucide-react"
import { listPermissions, listRoles, updateRolePermissions } from "@/api/roles.api"
import { useAdminAuth } from "@/hooks/useAdminAuth"
import { toast } from "@/lib/toast"
import { PageHeader } from "@/components/shared/PageHeader"
import { Badge } from "@/components/ui/badge"
import { ErrorState } from "@/components/shared/ErrorState"
import { CardSkeletonGrid } from "@/components/shared/TableSkeleton"
import { ApiError } from "@/api/api-error"

export const Route = createFileRoute("/_authenticated/roles")({
  component: RolesPage,
})

function humanizePermission(code: string): string {
  const [resource, action] = code.split(".")
  return `${resource[0].toUpperCase()}${resource.slice(1)}: ${action}`
}

function RolesPage() {
  const { hasPermission } = useAdminAuth()
  const queryClient = useQueryClient()
  const { data: roles, isLoading, isError, refetch } = useQuery({ queryKey: ["roles"], queryFn: listRoles })
  const { data: permissions } = useQuery({ queryKey: ["permissions"], queryFn: listPermissions })

  const canManage = hasPermission("roles.manage")

  const mutation = useMutation({
    mutationFn: ({ roleId, permissionCodes }: { roleId: string; permissionCodes: string[] }) => updateRolePermissions(roleId, permissionCodes),
    onSuccess: (role) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] })
      toast({ title: "Permissions updated", description: role.name.replaceAll("_", " "), variant: "success" })
    },
    onError: (err) => toast({ title: "Failed to update permissions", description: err instanceof ApiError ? err.message : undefined, variant: "destructive" }),
  })

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Roles & permissions" description="Every permission check is enforced server-side — this only controls what each role can reach." />

      {isError && <ErrorState title="Unable to load roles" onRetry={() => refetch()} />}
      {isLoading && <CardSkeletonGrid count={4} />}

      {roles && permissions && (
        <div className="grid gap-4 lg:grid-cols-2">
          {roles.map((role) => (
            <div key={role.id} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <KeyRound className="size-4 text-muted-foreground" aria-hidden="true" />
                    {role.name.replaceAll("_", " ")}
                  </p>
                  {role.description && <p className="mt-0.5 text-xs text-muted-foreground">{role.description}</p>}
                </div>
                {role.isSystem && (
                  <Badge variant="default">
                    <Lock className="size-3" aria-hidden="true" />
                    Built-in
                  </Badge>
                )}
              </div>

              <div className="flex flex-col gap-0.5 border-t border-border pt-2">
                {permissions.map((perm) => {
                  const checked = role.permissions.includes(perm.code)
                  return (
                    <label
                      key={perm.code}
                      className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1.5 text-sm transition-colors hover:bg-hover-tint has-disabled:opacity-60"
                    >
                      <span>{humanizePermission(perm.code)}</span>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!canManage || mutation.isPending}
                        onChange={(e) => {
                          const next = e.target.checked ? [...role.permissions, perm.code] : role.permissions.filter((c) => c !== perm.code)
                          mutation.mutate({ roleId: role.id, permissionCodes: next })
                        }}
                        className="size-4 accent-primary"
                      />
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
