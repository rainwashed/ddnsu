import { start } from "./service";

if (process.send !== undefined) process.send(`My current PID: ${process.pid}`);
start();
