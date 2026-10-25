#!/usr/bin/env node
// Project guard for Claude Code (PreToolUse hook).
// 1. Blocks TypeScript files and TypeScript setup (this project is JavaScript only).
// 2. Blocks shell commands that print secret .env files (.env.example is allowed).
// Claude Code sends the tool call as JSON on stdin.
// Exit code 2 = block the action and show stderr to Claude.

let raw = "";
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let input = {};
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0); // unreadable input: do not block
  }

  const toolInput = input.tool_input || {};

  // Write / Edit: check the file name
  const filePath = toolInput.file_path || "";
  if (/\.(ts|tsx)$/i.test(filePath) && !/\.d\.ts$/i.test(filePath)) {
    block("This project is JavaScript only. Use .js or .jsx instead of " + filePath);
  }

  // Bash: check the command
  const command = toolInput.command || "";

  const tsSetup = [
    /--template\s+\S*-ts\b/i, // npm create vite -- --template react-ts
    /\btsc\s+--init\b/i,
    /\bnpm\s+(i|install|add)\b[^\n]*\btypescript\b/i,
  ];
  if (tsSetup.some((re) => re.test(command))) {
    block("This project is JavaScript only. Use the JavaScript template, for example `npm create vite@latest client -- --template react`.");
  }

  if (readsSecretEnv(command)) {
    block("Do not print secret .env files. Read .env.example for variable names, or ask the user for a value.");
  }

  process.exit(0);
});

// True when a command like `cat .env` or `grep KEY server/.env.local` reads a secret env file.
// .env.example is allowed. Copying (`cp .env.example .env`) is allowed.
function readsSecretEnv(command) {
  const readers = new Set(["cat", "less", "more", "head", "tail", "grep", "bat", "type", "source", ".", "nl", "strings"]);
  const isSecretEnv = (word) => {
    const name = word.replace(/^["']|["']$/g, "").split("/").pop();
    return /^\.env(\..+)?$/i.test(name) && !/^\.env\.example$/i.test(name);
  };
  // Split into simple commands at ; && || | and new lines
  return command.split(/;|&&|\|\||\||\n/).some((part) => {
    const words = part.trim().split(/\s+/);
    return readers.has(words[0]) && words.slice(1).some(isSecretEnv);
  });
}

function block(message) {
  console.error("Blocked: " + message);
  process.exit(2);
}
