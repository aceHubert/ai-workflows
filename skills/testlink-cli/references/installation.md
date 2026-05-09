# Installation

Install the package globally to make the `testlink` command available. You only
need to do this the first time you use it.

```sh
npm i @acehubert/testlink-mcp@latest -g
testlink --version # check if install worked
```

## Configuration

Prefer environment variables for connection details:

```sh
export TESTLINK_URL="https://testlink.example.com"
export TESTLINK_API_KEY="your_api_key"
```

You can also pass connection flags per command:

```sh
testlink projects list \
  --url "https://testlink.example.com" \
  --apiKey "your_api_key"
```

## Troubleshooting

- **Command not found:** If `testlink` is not recognized, ensure your global
  npm `bin` directory is in your system's `PATH`. Restart your terminal or
  source your shell configuration file, such as `.bashrc` or `.zshrc`.
- **Permission errors:** If you encounter `EACCES` or permission errors during
  installation, avoid using `sudo`. Instead, use a node version manager like
  `nvm`, or configure npm to use a different global directory.
- **Old version running:** Run `npm uninstall -g @acehubert/testlink-mcp` before
  reinstalling, or ensure the latest version is being picked up by your path.
