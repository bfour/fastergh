import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const opencode = async (args: Array<string>) =>
	(await execFileAsync("opencode", args, { maxBuffer: 64 * 1024 * 1024 }))
		.stdout;

const STOP_TOKEN = "<I HAVE COMPLETED THE TASK>";
const PLAN_PATH = "./PLAN.md";
const ACTIVE_SCOPE_START = "<!-- ACTIVE_SCOPE_START -->";
const ACTIVE_SCOPE_END = "<!-- ACTIVE_SCOPE_END -->";
const ATTACH_URL = "http://100.81.219.45:39821";
const DEFAULT_MODEL = "anthropic/claude-opus-4-6";
const DEFAULT_MAX_ITERATIONS = 30;

type Model = "openai/gpt-5.3-codex" | "anthropic/claude-opus-4-6";

const makePrompt = (goal: string) =>
	`Continue working until you believe the task is complete. As a reminder, the goal is: ${goal}. The above goal was copy pasted in, resume from where you left off. Output ${STOP_TOKEN} when you have completed the task.`;

const parseModel = (value: string | undefined): Model => {
	if (value === "openai/gpt-5.3-codex") {
		return value;
	}
	if (value === "anthropic/claude-opus-4-6") {
		return value;
	}
	return DEFAULT_MODEL;
};

const parseMaxIterations = (value: string | undefined) => {
	if (value === undefined) {
		return DEFAULT_MAX_ITERATIONS;
	}

	const parsed = Number.parseInt(value, 10);
	if (Number.isFinite(parsed) && parsed > 0) {
		return parsed;
	}

	return DEFAULT_MAX_ITERATIONS;
};

const readActiveScope = (planContents: string) => {
	const scopeStart = planContents.indexOf(ACTIVE_SCOPE_START);
	const scopeEnd = planContents.indexOf(ACTIVE_SCOPE_END);

	if (
		scopeStart === -1 ||
		scopeEnd === -1 ||
		scopeEnd <= scopeStart + ACTIVE_SCOPE_START.length
	) {
		return planContents;
	}

	return planContents
		.slice(scopeStart + ACTIVE_SCOPE_START.length, scopeEnd)
		.trim();
};

async function run(goal: string, model: Model, maxIterations: number) {
	const prompt = makePrompt(goal);
	let output = "";
	let iteration = 1;
	while (!output.includes(STOP_TOKEN) && iteration <= maxIterations) {
		output = await opencode(
			iteration === 1
				? ["run", "--attach", ATTACH_URL, "--model", model, prompt]
				: [
						"run",
						"--attach",
						ATTACH_URL,
						"--model",
						model,
						"--continue",
						prompt,
					],
		);
		iteration += 1;
	}

	if (!output.includes(STOP_TOKEN)) {
		throw new Error(
			`Stopped after ${maxIterations} iterations without receiving ${STOP_TOKEN}.`,
		);
	}

	await opencode(["run", "Make a git commit of your changes, do not push"]);
}

const planContents = readFileSync(PLAN_PATH, "utf-8");
const activeScope = readActiveScope(planContents);
const model = parseModel(process.env.RALPH_MODEL);
const maxIterations = parseMaxIterations(process.env.RALPH_MAX_ITERATIONS);

await run(activeScope, model, maxIterations);
