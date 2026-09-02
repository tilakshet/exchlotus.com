import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { KeyRound, MoreHorizontal, ShieldPlus, UserPlus, Users as UsersIcon } from "lucide-react"
import { createAdmin, listAdmins, resetAdminMfa, setAdminEnabled, updateAdminRole } from "@/api/admins.api"
import { listRoles } from "@/api/roles.api"
import { useAdminAuth } from "@/hooks/useAdminAuth"
import { toast } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PageHeader } from "@/components/shared/PageHeader"
import { SearchInput } from "@/components/shared/SearchInput"
import { FilterBar, type ActiveFilter } from "@/components/shared/FilterBar"
import { StatusBadge, ADMIN_STATUS_CONFIG, MFA_STATUS_CONFIG } from "@/components/shared/StatusBadge"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { EmptyState } from "@/components/shared/EmptyState"
import { ErrorState } from "@/components/shared/ErrorState"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableSkeletonRows } from "@/components/shared/TableSkeleton"
import { formatDateTime } from "@/lib/utils"
import { ApiError } from "@/api/api-error"
import type { AdminSummary } from "@/api/admins.api"
import type { RoleSummary } from "@/api/roles.api"

export const Route = createFileRoute("/_authenticated/admins")({
  component: AdminsPage,
})

function CreateAdminDialog({ roles }: { roles: RoleSummary[] }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "", roleId: roles[0]?.id ?? "" })

  const mutation = useMutation({
    mutationFn: () => createAdmin(form),
    onSuccess: (admin) => {
      setOpen(false)
      setForm({ email: "", password: "", firstName: "", lastName: "", roleId: roles[0]?.id ?? "" })
      queryClient.invalidateQueries({ queryKey: ["admins"] })
      toast({ title: "Admin created", description: admin.email, variant: "success" })
    },
    onError: (err) => toast({ title: "Failed to create admin", description: err instanceof ApiError ? err.message : undefined, variant: "destructive" }),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="size-3.5" />
          New admin
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create admin</DialogTitle>
          <DialogDescription>They'll sign in with this email and temporary password — encourage them to enroll MFA immediately.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate()
          }}
        >
          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs text-muted-foreground">First name</label>
              <Input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs text-muted-foreground">Last name</label>
              <Input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Email</label>
            <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Temporary password</label>
            <Input type="password" required minLength={12} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Role</label>
            <Select value={form.roleId} onValueChange={(v) => setForm({ ...form, roleId: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating…" : "Create admin"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AdminRowActions({ admin, roles, isSelf }: { admin: AdminSummary; roles: RoleSummary[]; isSelf: boolean }) {
  const queryClient = useQueryClient()
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false)
  const nextEnabled = admin.status !== "ACTIVE"

  const statusMutation = useMutation({
    mutationFn: () => setAdminEnabled(admin.id, nextEnabled),
    onSuccess: () => {
      setStatusConfirmOpen(false)
      queryClient.invalidateQueries({ queryKey: ["admins"] })
      toast({ title: nextEnabled ? "Admin enabled" : "Admin disabled", description: admin.email, variant: "success" })
    },
    onError: (err) => toast({ title: "Action failed", description: err instanceof ApiError ? err.message : undefined, variant: "destructive" }),
  })

  const roleMutation = useMutation({
    mutationFn: (roleId: string) => updateAdminRole(admin.id, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] })
      toast({ title: "Role updated", description: admin.email, variant: "success" })
    },
    onError: (err) => toast({ title: "Failed to change role", description: err instanceof ApiError ? err.message : undefined, variant: "destructive" }),
  })

  const mfaResetMutation = useMutation({
    mutationFn: () => resetAdminMfa(admin.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] })
      toast({ title: "MFA reset", description: `${admin.email} must enroll again and every session was signed out`, variant: "success" })
    },
    onError: (err) => toast({ title: "Failed to reset MFA", description: err instanceof ApiError ? err.message : undefined, variant: "destructive" }),
  })

  if (isSelf) return <span className="text-xs text-muted-foreground">This is you</span>

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions for ${admin.email}`}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {roles.map((r) => (
            <DropdownMenuItem key={r.id} disabled={r.id === admin.roleId || roleMutation.isPending} onSelect={() => roleMutation.mutate(r.id)}>
              <KeyRound className="size-3.5" />
              Set role: {r.name.replaceAll("_", " ")}
            </DropdownMenuItem>
          ))}
          {admin.mfaEnabled && (
            <DropdownMenuItem onSelect={() => mfaResetMutation.mutate()}>
              <ShieldPlus className="size-3.5" />
              Reset MFA
            </DropdownMenuItem>
          )}
          <DropdownMenuItem variant="destructive" onSelect={() => setStatusConfirmOpen(true)}>
            {admin.status === "ACTIVE" ? "Disable admin" : "Enable admin"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={statusConfirmOpen}
        onOpenChange={setStatusConfirmOpen}
        title={admin.status === "ACTIVE" ? `Disable ${admin.email}?` : `Enable ${admin.email}?`}
        description={admin.status === "ACTIVE" ? "They'll be signed out immediately and can't log in again until re-enabled." : "They'll regain access immediately."}
        confirmLabel={admin.status === "ACTIVE" ? "Disable admin" : "Enable admin"}
        variant={admin.status === "ACTIVE" ? "destructive" : "default"}
        loading={statusMutation.isPending}
        onConfirm={() => statusMutation.mutate()}
      />
    </>
  )
}

function AdminsPage() {
  const { hasPermission, user: currentAdmin } = useAdminAuth()
  const { data: admins, isLoading, isError, refetch } = useQuery({ queryKey: ["admins"], queryFn: listAdmins })
  const { data: roles } = useQuery({ queryKey: ["roles"], queryFn: listRoles })
  const [search, setSearch] = useState("")
  const [roleId, setRoleId] = useState("ALL")

  const canManage = hasPermission("admins.manage")

  // Client-side, not a server query param: staff accounts are a small,
  // bounded list (organizational headcount, not customer volume) — unlike
  // Users/Withdrawals/KYC, there's no realistic scale here that needs
  // server-side search/pagination.
  const filtered = (admins ?? []).filter((a) => {
    if (roleId !== "ALL" && a.roleId !== roleId) return false
    if (!search) return true
    const q = search.toLowerCase()
    return a.email.toLowerCase().includes(q) || `${a.firstName} ${a.lastName}`.toLowerCase().includes(q)
  })

  const activeFilters: ActiveFilter[] = []
  if (search) activeFilters.push({ key: "search", label: `Search: ${search}`, onClear: () => setSearch("") })
  if (roleId !== "ALL") {
    const role = roles?.find((r) => r.id === roleId)
    activeFilters.push({ key: "role", label: `Role: ${role?.name.replaceAll("_", " ") ?? roleId}`, onClear: () => setRoleId("ALL") })
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Admins"
        description="Platform staff accounts, roles, and MFA status."
        actions={canManage && roles ? <CreateAdminDialog roles={roles} /> : undefined}
      />

      <FilterBar
        activeFilters={activeFilters}
        onClearAll={() => {
          setSearch("")
          setRoleId("ALL")
        }}
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Search name or email…" className="w-64" />
        <Select value={roleId} onValueChange={setRoleId}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All roles</SelectItem>
            {roles?.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name.replaceAll("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      {isError ? (
        <ErrorState title="Unable to load admins" onRetry={() => refetch()} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>MFA</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last login</TableHead>
              {canManage && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeletonRows columns={canManage ? 7 : 6} />}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <EmptyState icon={UsersIcon} title={search || roleId !== "ALL" ? "No admins match these filters" : "No admins yet"} />
                </TableCell>
              </TableRow>
            )}
            {filtered.map((admin) => (
              <TableRow key={admin.id}>
                <TableCell>
                  {admin.firstName} {admin.lastName}
                </TableCell>
                <TableCell className="text-muted-foreground">{admin.email}</TableCell>
                <TableCell className="text-muted-foreground">{admin.roleName.replaceAll("_", " ")}</TableCell>
                <TableCell>
                  <StatusBadge config={MFA_STATUS_CONFIG} status={String(admin.mfaEnabled)} />
                </TableCell>
                <TableCell>
                  <StatusBadge config={ADMIN_STATUS_CONFIG} status={admin.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">{admin.lastLoginAt ? formatDateTime(admin.lastLoginAt) : "Never"}</TableCell>
                {canManage && (
                  <TableCell>
                    <AdminRowActions admin={admin} roles={roles ?? []} isSelf={admin.id === currentAdmin?.id} />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
