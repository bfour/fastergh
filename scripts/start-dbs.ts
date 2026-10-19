#!/usr/bin/env -S pnpm exec tsx

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const JAEGER_CONTAINER = "jaeger";

async function isContainerRunning(containerName: string): Promise<boolean> {
	try {
		const result = await execFileAsync("docker", [
			"ps",
			"--filter",
			`name=${containerName}`,
			"--format",
			"{{.Names}}",
		]);
		return result.stdout.trim() === containerName;
	} catch {
		return false;
	}
}

async function startDockerServices(): Promise<void> {
	const jaegerRunning = await isContainerRunning(JAEGER_CONTAINER);

	if (jaegerRunning) {
		console.log("✓ Docker services already running");
		return;
	}

	console.log("Starting Docker services...");
	try {
		await execFileAsync("docker", ["compose", "up", "-d"]);
		console.log("✓ Docker services started");
	} catch (error) {
		throw new Error(
			`Failed to start Docker services: ${error instanceof Error ? error.message : String(error)}\n` +
				"  Troubleshooting:\n" +
				"  1. Check if Docker is running: docker ps\n" +
				"  2. Check docker-compose.yml is valid\n" +
				"  3. Try running manually: docker compose up -d",
		);
	}
}

async function main() {
	try {
		await startDockerServices();
		console.log("\n✓ Database services are ready!");
	} catch (error) {
		console.error("\n❌ Error starting database services:");
		if (error instanceof Error) {
			console.error(error.message);
		} else {
			console.error(String(error));
		}
		console.error("\nFor more help, check the troubleshooting steps above.");
		process.exit(1);
	}
}

main();
