# Automatic Version Check

Use this reference during setup and whenever CLI behavior may depend on the
installed package version. The goal is to automatically check for a newer
published package version and prompt the user to keep the CLI up to date.

## Check Installed Version

```bash
zentao --version
```

## Check Latest Published Version

```bash
npm view @acehubert/zentao-mcp version
```

## Update Prompt Rule

If the latest published version is newer than the installed version, notify the
user and ask them to update so they stay on the newest CLI before relying on
version-sensitive commands or flags.

Suggested update command:

```bash
npm i @acehubert/zentao-mcp@latest -g
```

Do not automatically install or update the global package unless the user
explicitly approves the package-management operation.
