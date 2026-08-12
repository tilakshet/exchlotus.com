import { Router } from "express"
import { listHeroBanners, listRecentBigWins } from "./home.service"

export const homeRouter = Router()

homeRouter.get("/hero-banners", async (_req, res) => {
  res.json(await listHeroBanners())
})

homeRouter.get("/recent-wins", async (_req, res) => {
  res.json(await listRecentBigWins())
})
