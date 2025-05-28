const { CronJob } = require("cron");
const JSON5 = require("json5");
const file = require("node:fs");

const CheckIn = require("./check-in/index.js");
const CodeRedeem = require("./code-redeem/index.js");
const DailiesReminder = require("./dailies-reminder/index.js");
const Expedition = require("./expedition/index.js");
const HowlScratchCard = require("./howl-scratch-card/index.js");
const MissedCheckIn = require("./missed-check-in/index.js");
const RealmCurrency = require("./realm-currency/index.js");
const ShopStatus = require("./shop-status/index.js");
const Stamina = require("./stamina/index.js");
const UpdateCookie = require("./update-cookie/index.js");
const WeekliesReminder = require("./weeklies-reminder/index.js");

let config;
try {
	config = JSON5.parse(file.readFileSync("./config.json5"));
} catch {
	config = JSON5.parse(file.readFileSync("./default.config.json5"));
}

const definitions = [
	CheckIn,
	CodeRedeem,
	DailiesReminder,
	Expedition,
	HowlScratchCard,
	MissedCheckIn,
	RealmCurrency,
	ShopStatus,
	Stamina,
	UpdateCookie,
	WeekliesReminder
];

const BlacklistedCrons = [
	"dailiesReminder",
	"howlScratchCard",
	"weekliesReminder"
];

let crons = [];

const initCrons = () => {
	const { blacklist = [], whitelist = [] } = config.crons;
	if (blacklist.length > 0 && whitelist.length > 0) {
		throw new Error(`Cannot have both a blacklist and a whitelist for crons`);
	}

	crons = [];
	for (const definition of definitions) {
		if (blacklist.length > 0 && blacklist.includes(definition.name)) continue;
		if (whitelist.length > 0 && !whitelist.includes(definition.name)) continue;

		const name = app.Utils.convertCase(definition.name, "kebab", "camel");
		const expression = config.crons[name] || definition.expression;
		const taskFn = definition.code;

		const job = new CronJob(expression, () => taskFn());
		job.start();

		crons.push({ name, job, task: taskFn });
	}

	app.Logger.info("Cron", `Initialized ${crons.length} cron jobs`);
	return crons;
};

const runCrons = async () => {
	for (const cron of crons) {
		try {
			app.Logger.info("Cron", `Running ${cron.name}`);
			await cron.task();
		} catch (err) {
			app.Logger.error("Cron", `Error running ${cron.name}: ${err.message}`);
		}
	}
};

module.exports = {
	initCrons,
	runCrons
};
