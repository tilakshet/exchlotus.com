import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Dices } from "lucide-react"
import { listCategories, listGames, listProviders } from "@/api/games.api"
import { PageHeader } from "@/components/shared/PageHeader"
import { SearchInput } from "@/components/shared/SearchInput"
import { FilterBar, type ActiveFilter } from "@/components/shared/FilterBar"
import { EmptyState } from "@/components/shared/EmptyState"
import { ErrorState } from "@/components/shared/ErrorState"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ExportButton } from "@/components/shared/ExportButton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableSkeletonRows } from "@/components/shared/TableSkeleton"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"

export const Route = createFileRoute("/_authenticated/games/")({
  component: GamesPage,
})

const GAME_STATUS_CONFIG = {
  true: { label: "Enabled", tone: "success" as const, icon: Dices },
  false: { label: "Disabled", tone: "destructive" as const, icon: Dices },
}

type EnabledFilter = "ALL" | "true" | "false"

function GamesPage() {
  const [search, setSearch] = useState("")
  const [providerCode, setProviderCode] = useState("ALL")
  const [categoryCode, setCategoryCode] = useState("ALL")
  const [enabled, setEnabled] = useState<EnabledFilter>("ALL")
  const debouncedSearch = useDebouncedValue(search, 300)

  const providers = useQuery({ queryKey: ["games", "providers"], queryFn: listProviders })
  const categories = useQuery({ queryKey: ["games", "categories"], queryFn: listCategories })

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["games", debouncedSearch, providerCode, categoryCode, enabled],
    queryFn: () =>
      listGames({
        search: debouncedSearch || undefined,
        providerCode: providerCode === "ALL" ? undefined : providerCode,
        categoryCode: categoryCode === "ALL" ? undefined : categoryCode,
        enabled: enabled === "ALL" ? undefined : enabled === "true",
        pageSize: 50,
      }),
  })

  const activeFilters: ActiveFilter[] = []
  if (providerCode !== "ALL") activeFilters.push({ key: "provider", label: `Provider: ${providerCode}`, onClear: () => setProviderCode("ALL") })
  if (categoryCode !== "ALL") {
    const cat = categories.data?.find((c) => c.code === categoryCode)
    activeFilters.push({ key: "category", label: `Category: ${cat?.name ?? categoryCode}`, onClear: () => setCategoryCode("ALL") })
  }
  if (enabled !== "ALL") activeFilters.push({ key: "enabled", label: enabled === "true" ? "Enabled only" : "Disabled only", onClear: () => setEnabled("ALL") })
  if (search) activeFilters.push({ key: "search", label: `Search: ${search}`, onClear: () => setSearch("") })

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Games"
        description="The synced provider catalog — enable or disable a game to control player-facing visibility."
        actions={
          <ExportButton
            module="games"
            filters={{
              search: debouncedSearch || undefined,
              providerCode: providerCode === "ALL" ? undefined : providerCode,
              categoryCode: categoryCode === "ALL" ? undefined : categoryCode,
              enabled: enabled === "ALL" ? undefined : enabled,
            }}
          />
        }
      />

      <FilterBar
        activeFilters={activeFilters}
        onClearAll={() => {
          setSearch("")
          setProviderCode("ALL")
          setCategoryCode("ALL")
          setEnabled("ALL")
        }}
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Search game or provider…" className="w-72" />
        <Select value={providerCode} onValueChange={setProviderCode}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All providers</SelectItem>
            {providers.data?.map((p) => (
              <SelectItem key={p.code} value={p.code}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryCode} onValueChange={setCategoryCode}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            {categories.data?.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={enabled} onValueChange={(v) => setEnabled(v as EnabledFilter)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="true">Enabled</SelectItem>
            <SelectItem value="false">Disabled</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {isError ? (
        <ErrorState title="Unable to load games" onRetry={() => refetch()} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Game</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>RTP</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeletonRows columns={5} />}
            {!isLoading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <EmptyState icon={Dices} title="No games match these filters" description="Try clearing the search or filters." />
                </TableCell>
              </TableRow>
            )}
            {data?.items.map((game) => (
              <TableRow key={game.id}>
                <TableCell>
                  <Link
                    to="/games/$id"
                    params={{ id: game.id }}
                    className="font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  >
                    {game.gameName}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{game.provider.name}</TableCell>
                <TableCell className="text-muted-foreground">{game.category?.name ?? "—"}</TableCell>
                <TableCell className="tabular-nums text-muted-foreground">{game.rtp !== null ? `${game.rtp.toFixed(1)}%` : "—"}</TableCell>
                <TableCell>
                  <StatusBadge config={GAME_STATUS_CONFIG} status={String(game.enabled)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
