require("dotenv").config({ path: "./config/config.env" })
const { handle } = require("@dir/service/handler")
const express = require("express")

const app = express()
app.use(require("cors")())
app.use(express.json({ limit: "500kb" }))
app.use(async (req, res) => res.send(await handle(req.body)))
app.listen(3000, () => console.log("App listening at http://localhost:3000"))

process.on("uncaughtException", e => {
  console.log("uncaughtException", e)
  e.message.includes("[__EXIT__]") && process.exit(0)
})
process.on("unhandledRejection", e => {
  console.log("unhandledRejection", e)
  e.message.includes("[__EXIT__]") && process.exit(0)
})