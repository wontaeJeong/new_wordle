#!/usr/bin/env node
import { stdin } from 'node:process';
import { createPasswordHash } from './auth-crypto.mjs';

async function readStdin() {
  if (stdin.isTTY) {
    return '';
  }

  let input = '';
  stdin.setEncoding('utf8');

  for await (const chunk of stdin) {
    input += chunk;
  }

  return input;
}

function stripSingleTrailingNewline(value) {
  return value.replace(/\r?\n$/, '');
}

const rawPassword = process.env.AUTH_PASSWORD ?? process.argv[2] ?? await readStdin();
const password = stripSingleTrailingNewline(rawPassword);

if (!password) {
  console.error('Provide a password through AUTH_PASSWORD, argv, or stdin.');
  process.exit(1);
}

console.log(createPasswordHash(password));
