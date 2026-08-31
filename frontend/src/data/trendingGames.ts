/**
 * Curated, not computed — there's no real "trending" metric (play counts,
 * session volume) tracked anywhere in this system to rank by, same
 * reasoning as home.service.ts's PINNED_BANNERS on the backend.
 *
 * Every title below was individually verified with a direct
 * POST /v1/sessions/launch call against the real provider, mode:"real" —
 * each one confirmed to return an actual session.mode:"real" session, not
 * a silent fun-mode downgrade. Don't add a game back without re-verifying
 * it the same way, since a game "existing in the catalog" doesn't mean
 * real-money actually works for it right now.
 *
 * Batches 1-2 (2026-08-27/28) were restricted to 3 studios (7mojos,
 * abracadabra, absolute) — the only ones with real-money launches enabled
 * at the time. That account-level restriction has since lifted: a broad
 * re-test (2026-08-31) across every provider with an available game found
 * 53 studios, 197/197 sampled titles launching correctly in real mode —
 * see Provider.realMoneyVerified in the backend, now populated from this
 * same test run and already used to sort verified-provider games first in
 * every category (catalog.service.ts). Batch 3 below draws specifically
 * from well-known, high-demand titles in the real-money casino market
 * (Evolution's game-show/live-casino lineup, Pragmatic Live, popular
 * Andar Bahar/Teen Patti/Dragon Tiger variants for this market) that
 * turned up among those 53 verified studios — market popularity, not just
 * "first available game," picked the specific titles.
 */
export const TRENDING_GAME_IDS = [
  "cmsge6sev0hqkuz1dtkua3d2x", // Andar Bahar (7mojos)
  "cmsgdv6qm06geuz1d2dxos1z4", // Andar Bahar, second listing (7mojos)
  "cmsge6sm40hqsuz1duppig9ad", // Dragon Tiger (7mojos)
  "cmsge6so20hquuz1dsb14eewd", // Teen Patti Face Off (7mojos)
  "cmsge6sih0hqouz1dtbehm1c1", // Neon Roulette (7mojos)
  "cmsge9vq50jh4uz1dqjy3vhqq", // Spinning Ball roulette (abracadabra)
  "cmsge9vma0jh0uz1di9h46dw2", // Crash (abracadabra)
  "cmsge9vic0jgwuz1d1yzcafqk", // Golf Plinko (abracadabra)
  "cmsge9w1x0jhguz1dpe2va3kj", // Mayan Plinko (abracadabra)
  "cmsge9vo80jh2uz1dwpgpjaw8", // Crazy Ball (abracadabra)
  "cmsgec6ec0lkouz1d1e146xyw", // Portal Roulette (absolute)
  "cmsgec66k0lkguz1dqqzdcd27", // American Roulette (absolute)
  "cmsge3glv0emsuz1dw9qml7rb", // Desert Roulette (absolute)

  // Batch 2 (2026-08-28) — same verification method: every ID below
  // individually confirmed via a direct POST /v1/sessions/launch,
  // mode:"real", returning session.mode:"real". Deliberately spans every
  // category these 3 studios offer (keno, lottery, slots, crashgame,
  // instantgame, interactivegame, tablegames, roulette), not just
  // roulette/live-casino — the studio-wide enablement was re-confirmed
  // across all of them, not assumed from category name.
  "cmsge9w7f0jhmuz1dod9hwra8", // Golden Lucky Six, keno (abracadabra)
  "cmsge9v0g0jgeuz1dp72o13p6", // Lucky Six, lottery (abracadabra)
  "cmsge9vua0jh8uz1dc88rx9lz", // Basket Plinko, instantgame (abracadabra)
  "cmsgedqy10mz8uz1dc0o7o9kl", // Wizard's Realm, slots (abracadabra) — verified live
  "cmsgedqo30myyuz1dq0lrth3i", // Urban Rush, slots (abracadabra)
  "cmsge9v2f0jgguz1dyajehvqv", // Keno 80 (abracadabra)
  "cmsgedv690n3cuz1dbbh72w9o", // Midnight Auto Roulette (7mojos)
  "cmsge9w3p0jhiuz1d4xvirsye", // Neo Keno (abracadabra)
  "cmsgec68s0lkiuz1d963zofvm", // Las Vegas Roulette (absolute)
  "cmsgec6ap0lkkuz1dkah08zd8", // 360 Roulette (absolute)
  "cmsge9uum0jg8uz1d73adah0g", // Plinko, instantgame (abracadabra)
  "cmsge9vw50jhauz1dvgywsmho", // Football Numbers, keno (abracadabra)
  "cmsgedva20n3guz1dst4qi9u3", // Real Casino Roulette (7mojos)
  "cmsge9vg40jguuz1dg4tnqxuw", // Turbo Keno (abracadabra)
  "b317321a-7bd5-4de0-89f7-8f91f9014f3e", // Favela Rush, crashgame (abracadabra)
  "cmsge6tdx0hrmuz1d6m39prjx", // Auto Roulette Opal (7mojos)
  "cmsge9vy40jhcuz1d7bbfdzzj", // Mines, interactivegame (abracadabra) — verified live
  "cmsgec6g90lkquz1dlb78016k", // Real Casino Roulette (absolute)
  "cmsge6sgi0hqmuz1dikf485we", // Turkish Roulette (7mojos)
  "cmsge8hby0i5yuz1d1hswg6u4", // 777x Gold Club Auto Roulette (7mojos)
  "a9482f06-5060-41eb-8a70-9a8a1de139e1", // Tower, instantgame (abracadabra)
  "cmsge9ve80jgsuz1duhmbgdzt", // Aircraft, crashgame (abracadabra)
  "cmsge9v840jgmuz1dm3009ax8", // Coin Flip, instantgame (abracadabra)
  "cmsgec6ci0lkmuz1djaz72con", // Bond La Partage (absolute)
  "cmsge9vkc0jgyuz1dz96f9hsv", // Football Keno (abracadabra)
  "cmsgedqu10mz4uz1dkwx9wfkg", // Lucky Farm, slots (abracadabra)
  "cmsge9va30jgouz1dd7bnprnr", // Keno 40 (abracadabra)
  "cmsge6sk90hqquz1d7260rr3j", // Galaxy Roulette (7mojos)
  "cmsgdwtki081suz1d7usr2qyd", // Absolute RNG (absolute)
  "cmsge9v490jgiuz1dwybv1fki", // Turbo WoF, roulette (abracadabra)
  "cmsgec64o0lkeuz1dz0rj97fi", // VIP Roulette (absolute)
  "cmsge6sxf0hr4uz1daqiyrdoo", // 777x Galaxy Roulette (7mojos)
  "cmsge6spv0hqwuz1dwdmfto9x", // Auto Roulette Noir (7mojos)
  "cmsge6sti0hr0uz1dms21rga7", // Auto Roulette Royal (7mojos)
  "c7605855-fcae-4312-956d-5dfd40fc24ac", // Hi-Lo, instantgame (abracadabra)
  "cmsge9vbz0jgquz1dyhy67mpt", // Happy Bird's Day, crashgame (abracadabra)
  "cmsgdwtmb081uuz1dk2z4llka", // MSC Casino (absolute)
  "cmsge6tjn0hrsuz1dwjvd2i73", // 777x Auto Roulette Solaris (7mojos)
  "cmsge8hdn0i60uz1d9b8bxsls", // 777x Lotus Auto Roulette (7mojos)
  "cmsgedqq80mz0uz1dfp9m5e0z", // Sugar Pop Spins, slots (abracadabra)
  "cmsgdwtid081quz1dx661rjst", // Absolute Brown (absolute)
  "cmsge9uwi0jgauz1d5sanod43", // Crazy Rocket, crashgame (abracadabra)
  "cmsgedqw30mz6uz1dgd3r8lon", // Virus Lab, slots (abracadabra)
  "cmsgdwtge081ouz1dcb7zin0r", // Absolute Black (absolute)
  "cmsge9v650jgkuz1d9fqmb1lx", // Lucky Fish, crashgame (abracadabra)
  "cmsge9w010jheuz1dhxofr152", // Narco Mines, instantgame (abracadabra)
  "cmsge9vsa0jh6uz1dkpvfkykh", // Lucky Helicopter, crashgame (abracadabra)
  "8f314f37-4da2-4d81-be66-b9c8126ab43a", // Blackjack Bar, tablegames (abracadabra) — verified live
  "cmsged2en0mdcuz1dvatqpfcc", // Arcane Roulette (absolute)

  // Batch 3 (2026-08-31) — market-popular titles, verified live via the
  // same POST /v1/sessions/launch, mode:"real" method, drawn from the 53
  // studios confirmed working in the broader re-test (see header comment).
  "cmsge291n0df4uz1dibolvt3o", // Crazy Time, gameshow (evolutionWCX)
  "cmsge29yd0dg4uz1dbs6ljx7u", // MONOPOLY Live, gameshow (evolutionWCY)
  "cmsge2ank0dgwuz1d0186lyqh", // Lightning Roulette (evolutionWCX)
  "cmsge29lt0dfquz1di5hjozgq", // Funky Time, gameshow (evolutionWCX)
  "cmsge29um0dg0uz1dxttaywh4", // Dream Catcher, gameshow (evolutionWCX)
  "cmsge2ax90dh6uz1d40x7zq20", // XXXtreme Lightning Roulette (evolutionWCX)
  "cmsgdvbqv06l4uz1dqb47lir0", // Sweet Bonanza CandyLand, gameshow (pragmatic-live)
  "cmsge96sp0itcuz1dmw3f7q84", // Teen Patti Auto (jacktop)
  "cmsge232a0d98uz1daunmngk9", // Super Andar Bahar (evolutionWC)
  "cmsge5rci0goauz1dnspsb9hv", // Dragon Tiger Phoenix (evolutionWCX)
  "cmsge267k0dc8uz1dz49pxx29", // Speed Baccarat 9 (evolutionWC)
  "cmsgecomq0m08uz1dw0y3z4if", // Avi Crash, gameshow (creedroomz)
  "cmsge90zy0in8uz1dzvvvl7ky", // Cash balloon, crashgame (tada)
  "cmsge3bl10ehmuz1dpp871i9a", // Diamond Mines, instantgame (betsoft-a)
  "cmsgeblaa0l12uz1d6cxzpyxi", // Symphony Private Blackjack 1 (winfinity)
  "cmsge9cya0izauz1ddytb44j1", // Ultimate Auto Roulette (ezugi)
  "cmsgeb9u40kr6uz1dh9neak89", // Plinko, instantgame (pascalgaming)

  // Batch 4 (2026-08-31) — every crash-category game currently available
  // from a realMoneyVerified provider, not already listed above. Same
  // verification method (POST /v1/sessions/launch, mode:"real", confirmed
  // session.mode:"real") — 58/58 succeeded.
  "cmsge8on30iccuz1dqgqm2pur", // Archer, crashgame (onetouch)
  "cmsgeba1n0kreuz1dr4on349q", // AviaBET, crashgame (pascalgaming)
  "cmsgeatzm0kdauz1djfehzng4", // Blast, crashgame (pascalgaming)
  "cmsge5jro0ggyuz1dggn33kmz", // Cash Stack, crashgame (tada)
  "cmsgeauoh0kduuz1dawl7tsmo", // Catch Me, crashgame (pascalgaming)
  "cmsgeb8j70kpyuz1dc0lkgwov", // ChartX, crashgame (pascalgaming)
  "cmsgdzqir0aw8uz1d8l8c5fh1", // Chicky Run, crashgame (pgsoft)
  "cmsgebpjc0l5auz1dxik7vvsm", // Comet, crashgame (splitthepot-a)
  "cmsgeb9ct0kqouz1d6z9skohw", // Crash, crashgame (pascalgaming)
  "cmsgeatvq0kd6uz1d3nw6rzhm", // Crash, crashgame (pascalgaming)
  "cmsgeb9ev0kqquz1dt0yzpca6", // Crash ball, crashgame (pascalgaming)
  "cmsgdqqac01viuz1d8qye51o2", // Crash Bonus, crashgame (tada)
  "8edff6da-bdc9-4d9b-a43f-6bd189a60cff", // Crash Fireworks, crashgame (tada)
  "cmsge7agv0i48uz1ddkvfo25f", // Crash Fruit, crashgame (tada)
  "cmsgdqret01wmuz1dpumpqq1k", // Crash Goal, crashgame (tada)
  "cmsge3hrw0eo2uz1du3oox2hw", // Crash Puck, crashgame (tada)
  "cmsgdqro501wwuz1dhlkjx5t3", // Crash Touchdown, crashgame (tada)
  "cmsgdphfs00lwuz1dl8bowzfh", // Crash Wonder Blonde, crashgame (bigpot)
  "cmsgebp870l4yuz1dr6stkqq4", // DareDevil, crashgame (splitthepot-a)
  "cmsge5ezb0gc8uz1dtm0czyep", // DRONE, crashgame (livegames)
  "cmsgebopk0l4euz1dunibgdh1", // Exploding Ducks, crashgame (splitthepot-a)
  "cmsgeb8pc0kq4uz1du7ym0d3t", // Fast Flip, crashgame (pascalgaming)
  "cmsgeaukm0kdquz1d4o6dlsmx", // Fighter xXx, crashgame (pascalgaming)
  "cmsge2dw60dk0uz1dmewx52c6", // First Person Stock Market, crashgame (evolutionWC)
  "cmsgeb9mo0kqyuz1diqy9cil0", // Fishing, crashgame (pascalgaming)
  "cmsgeauew0kdkuz1darno7c3s", // Fishing, crashgame (pascalgaming)
  "cmsge0a820bguuz1dbsts3d4g", // FlyX, crashgame (micro-gaming)
  "cmsge8r120ieeuz1d2yma1t4a", // Flyx Cash Turbo, crashgame (micro-gaming)
  "cmsge6aj50h7yuz1de095h0bz", // Frog Dash, crashgame (tada)
  "cmsgecq4w0m1cuz1dzbjmj9c7", // Frog Dash 10000, crashgame (tada)
  "cmsgdwuyk0838uz1d3ig4b54w", // Golden Escape, crashgame (altente)
  "cmsge9w9e0jhouz1dmt2wkqeb", // GrandMa Road, crashgame (abracadabra)
  "cmsgeb92p0kqeuz1d1yn0kfrw", // Gravity, crashgame (pascalgaming)
  "cmsgdug5o05qeuz1d02ad66ty", // Hippodrome, crashgame (livegames)
  "cmsgeb90v0kqcuz1dkf4ql33b", // Hot Cricket, crashgame (pascalgaming)
  "cmsgebc0b0ktguz1dlg8zyuud", // Jacka and Cheeky Duck, crashgame (pascalgaming)
  "cmsge8ihy0i72uz1d8k2nk9m3", // Limbosphere, crashgame (livegames)
  "cmsge97uv0iucuz1dw7odqnnt", // Mega Deal, crashgame (jacktop-slots)
  "cmsgeb9ok0kr0uz1d32i36a97", // Mines, crashgame (pascalgaming)
  "cmsge3u250ewmuz1d88yo65tr", // Mines Grand, crashgame (tada)
  "cmsgebpa10l50uz1dq6el1eyg", // Monkey Bizniz, crashgame (splitthepot-a)
  "cmsge97t20iuauz1dfro9nq1b", // Mr. Mars, crashgame (jacktop-slots)
  "cmsgdraby02fyuz1d3td6kcmu", // Mriya, crashgame (netgame)
  "cmsgeatts0kd4uz1dgcrmmdup", // OddBall, crashgame (pascalgaming)
  "cmsgebpdp0l54uz1d7rnk4kvu", // Paperplane, crashgame (splitthepot-a)
  "cmsgeauis0kdouz1dk12pwxmz", // Pascal, crashgame (pascalgaming)
  "cmsged09x0mb4uz1diouzs3jj", // Red Baron RNG, crashgame (evolutionWC)
  "cmsgebpfi0l56uz1d9rrbg7p5", // Rugby Run, crashgame (splitthepot-a)
  "cmsgecdo70lqsuz1d8rll46p4", // Sky Jumper, crashgame (winfinity)
  "cmsge2dy80dk2uz1dlqtp02gg", // Stock Market, crashgame (evolutionWC)
  "cmsge8ifz0i70uz1d5rgnvt5g", // Street Skater, crashgame (livegames)
  "cmsgedl7a0mtmuz1dni10xuve", // StrikerX, crashgame (micro-gaming)
  "cmsgebc3y0ktkuz1dmpl0tj3c", // Super Blaise, crashgame (pascalgaming)
  "cmsge9uyf0jgcuz1d8ld8cctx", // Super Jet, crashgame (abracadabra)
  "cmsgebphf0l58uz1d7umrnfce", // Taxi Ride, crashgame (splitthepot-a)
  "cmsge4dss0ffwuz1d6kcb38ca", // Texas Rush, crashgame (netgame)
  "cmsgeb9zp0krcuz1drpfwegk8", // Tower, crashgame (pascalgaming)
  "cmsgdpt7z00xauz1dr2j5i47g", // Triple Cash or Crash, crashgame (betsoft-a)
] as const
