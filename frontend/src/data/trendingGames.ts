/**
 * Curated, not computed — there's no real "trending" metric (play counts,
 * session volume) tracked anywhere in this system to rank by, same
 * reasoning as home.service.ts's PINNED_BANNERS on the backend. Picked to
 * cover the specific titles requested plus the same crash/instant-win
 * genre they all belong to, preferring well-known providers (spribe, the
 * studio behind most of this genre) where more than one option existed.
 * Some requested titles don't exist verbatim in the real catalog — noted
 * inline where a close substitute was used instead of dropping the slot.
 *
 * The block below adds the real Live Casino / Casino table games most
 * played in the Indian exchange market alongside the crash/instant-win
 * picks above — Andar Bahar, Teen Patti, Dragon Tiger, Lightning Roulette
 * and Crazy Time are consistently the most-searched live titles here, so
 * Trending Games surfaces them too instead of only the crash genre.
 */
export const TRENDING_GAME_IDS = [
  "cmsgedoms0mwwuz1dlk6texzt", // Aviator (avigroup)
  "cmsge9kcs0j6guz1duvextsht", // Chicken Road (in-out) — no exact "Chicken Rush" in the catalog
  "cmsgdrv050324uz1dj1xafzfu", // Mines (spribe)
  "cmsge9xfc0jiwuz1dotfu4tjv", // 7 Up Down (funkygames)
  "cmsgdrv410328uz1dvbo4cz4w", // Keno (spribe)
  "cmsgdvpld06yquz1dktc7elg7", // Sic Bo (pragmatic-live)
  "cmsgdruue031yuz1dd96q9i7p", // Dice (spribe) — no exact "Olympus Dice" in the catalog
  "cmsgdruya0322uz1diwpo19iv", // Plinko (spribe)
  "cmsgdxs7d090cuz1dqbkau9l5", // Limbo (hacksaw)
  "cmsge1ego0ckiuz1d59b87m9j", // HiLo (turbo-games)
  "cmsge8pu60idcuz1dqe1v82nz", // Balloon (spribe)
  "cmsgdruwc0320uz1db4o2g3u5", // Goal (spribe)
  "cmsgdrv7x032cuz1drfhjpj2x", // Hotline (spribe)
  "cmsgdzaiz0agmuz1dxls5wemb", // JetX (jetx)
  "cmsgdvf8o06oouz1d0xuh4ot3", // Spaceman (pragmatic)
  "cmsge42ze0f56uz1d0grv0m2l", // Coin Flip (100hp)
  "cmsgdxpfq08xiuz1d9a4podzr", // Wheel (hacksaw)
  "cmsge9isr0j4yuz1dpt6awf08", // Chicken Road 2.0 (in-out)
  "cmsge0to30c14uz1du5dsnxim", // Crash (galaxsys)
  "cmsge9bhi0ixyuz1d9uj0apn9", // Cricket War (ezugi)
  "cmsge9b1o0ixiuz1dy3qmlbgt", // Andar Bahar (ezugiZ)
  "cmsge96sp0itcuz1dmw3f7q84", // Teen Patti Auto (jacktop)
  "cmsgdv5kr06f8uz1dn7vxt2ti", // Dragon Tiger (pragmatic-live)
  "cmsge2ank0dgwuz1d0186lyqh", // Lightning Roulette (evolutionWCX)
  "cmsge2bh50dhsuz1djcyonmyr", // First Person Baccarat (evolutionWC)
  "cmsge2bqd0di2uz1d80gy4dv3", // First Person Blackjack (evolutionWCX)
  "cmsge29nn0dfsuz1dcsmbak97", // Casino Hold'em (evolutionWCX)
  "cmsge291n0df4uz1dibolvt3o", // Crazy Time (evolutionWCX)
] as const
