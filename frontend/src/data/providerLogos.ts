export interface ProviderLogo {
  name: string
  src: string
}

/**
 * Real provider wordmark logos, supplied directly (public/providers/) —
 * not derived from the live catalog API, which has no logo field at all
 * (ProviderV2 = { id, name, is_active, games_count }, see
 * backend/src/modules/provider-integration/gaming-provider/gaming-provider.types.ts).
 * A static curated list, same pattern as data/trendingGames.ts. Add more
 * providers here as logo files land in public/providers/.
 */
export const PROVIDER_LOGOS: ProviderLogo[] = [
  { name: "100HP", src: "/providers/100hp.png" },
  { name: "1X2 Gaming", src: "/providers/1x2gaming.png" },
  { name: "3 Oaks Gaming", src: "/providers/3oakgaming.png" },
  { name: "3 Oaks Partners", src: "/providers/3oaksgaming.png" },
  { name: "7Mojos", src: "/providers/7mojos.png" },
  { name: "7Mojos Slots", src: "/providers/7mojosslots.png" },
  { name: "7777", src: "/providers/7777.png" },
  { name: "Abracadabra Gaming", src: "/providers/abracadaragaming.png" },
  { name: "Absolute Gaming", src: "/providers/absgaming.png" },
  { name: "Ace365 Gaming", src: "/providers/ace365gaming.png" },
  { name: "Adlunam", src: "/providers/adlunam.png" },
  { name: "Advant-Play", src: "/providers/advant-play.png" },
  { name: "AirDice", src: "/providers/airdice.png" },
  { name: "Altente", src: "/providers/altente.png" },
  { name: "Amigo Gaming", src: "/providers/amigogaming.png" },
  { name: "Amusnet", src: "/providers/amusnet.png" },
  { name: "Amusnet Live", src: "/providers/amusnetlive.png" },
  { name: "Apparat", src: "/providers/Aapparat.png" },
  { name: "Armadillo Studios", src: "/providers/armadillo.png" },
  { name: "AvatarUX", src: "/providers/Avatarux.png" },
  { name: "Avatar Studios", src: "/providers/avatarstudio.png" },
  { name: "AvatarX Studios", src: "/providers/avatarx.png" },
  { name: "Aviator", src: "/providers/aviator.png" },
  { name: "Aviatrix", src: "/providers/aviatrix.png" },
  { name: "AviGroup", src: "/providers/avigroup.png" },
  { name: "Backseat", src: "/providers/backseat.png" },
  { name: "Barbara Bang", src: "/providers/barbarabang.png" },
  { name: "BeOn", src: "/providers/beon.png" },
  { name: "BetSoft", src: "/providers/betsoft.png" },
  { name: "BF Games", src: "/providers/bfgames_jpg.jpg" },
  { name: "BGaming", src: "/providers/bgaming.png" },
  { name: "BGP", src: "/providers/bgamingp.png" },
  { name: "BigPot Gaming", src: "/providers/bigpotgaming.png" },
  { name: "Big Time Gaming", src: "/providers/bigtimegaming.png" },
  { name: "Endorphina", src: "/providers/endorphina.png" },
  { name: "Espresso Games", src: "/providers/espressogames-a.png" },
  { name: "Evolution WC", src: "/providers/evolutionwc.png" },
  { name: "Evolution WCHS", src: "/providers/evolutionwchs.png" },
  { name: "Evolution WCLS", src: "/providers/evolutionwcls.png" },
  { name: "Evolution WCX", src: "/providers/evolutionwcx.png" },
  { name: "Evoplay", src: "/providers/evoplay.png" },
  { name: "Expanse Studios", src: "/providers/expanse-studio.png" },
  { name: "King X Gaming", src: "/providers/kingXgaming.png" },
  { name: "RubyPlay", src: "/providers/rubyplay.png" },
  { name: "SA Gaming", src: "/providers/sagaming.png" },
  { name: "Skywind", src: "/providers/skywind.png" },
  { name: "Spribe", src: "/providers/spribe.png" },
  { name: "Vortex Gaming", src: "/providers/vortex.png" },
]
