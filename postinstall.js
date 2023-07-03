const fs = require("fs")
const cp = require("child_process")

fs.mkdir("./node_modules/@dir", { recursive: true }, err => {
	if (err) return
	if (!fs.existsSync("./node_modules/@dir/config")) cp.spawnSync("ln", ["-sf", "../../config", "config"], { cwd: "./node_modules/@dir" })
	if (!fs.existsSync("./node_modules/@dir/service")) cp.spawnSync("ln", ["-sf", "../../service", "service"], { cwd: "./node_modules/@dir" })
	if (!fs.existsSync("./node_modules/@dir/utils")) cp.spawnSync("ln", ["-sf", "../../utils", "utils"], { cwd: "./node_modules/@dir" })
})