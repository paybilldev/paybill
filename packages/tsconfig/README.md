<p align="center">
  <a href="https://paybill.dev" target="_blank">
    <picture>
      <!-- Dark mode -->
      <source srcset="https://paybill.dev/logo-wordmark--dark.png" media="(prefers-color-scheme: dark)" />
      <!-- Light mode (default) -->
      <img src="https://paybill.dev/logo-wordmark--light.png" width="180" alt="Logo" />
    </picture>
  </a>
</p>

**Paybill** builds foundational platforms for **modern SaaS systems** and **safe AI-driven applications**.

We focus on **control, predictability, and security** — enabling platforms and agents to operate within clearly defined boundaries rather than unchecked automation.

# @paybilldev/tsconfig

[![NPM version][npm-image]][npm-url]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/@paybilldev/tsconfig.svg?style=flat)](https://nodejs.org/en/download/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://makeapullrequest.com)
![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/paybilldev/paybill)

[npm-image]: https://img.shields.io/npm/v/@paybilldev/tsconfig.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@paybilldev/tsconfig
[download-image]: https://img.shields.io/npm/dm/@paybilldev/tsconfig.svg?style=flat-square
[download-url]: https://npmjs.org/package/@paybilldev/tsconfig

Base tsconfig file for paybill project

## Install

```shell
npm i --save-dev @paybilldev/tsconfig
```

## Usage

```json
// tsconfig.json
{
  "extends": "@paybilldev/tsconfig",
  // custom config
  "compilerOptions": {
    // override @paybilldev/tsconfig options here
  }
}
```
