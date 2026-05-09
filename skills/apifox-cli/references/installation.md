# Installation

Install the package globally to make both `apifox` and `apifox-mcp` available:

```sh
npm i @acehubert/apifox-mcp@latest -g
apifox --version
```

## Configuration

Prefer keeping only the token in the environment:

```sh
export APIFOX_ACCESS_TOKEN="your_access_token"
```

Source selection must be passed explicitly per command, for example:

```sh
apifox cache info --projectId 12345
apifox cache info --siteId 67890
apifox cache info --oas /path/to/openapi.json
```

You can also pass the token directly:

```sh
apifox cache info \
  --projectId 12345 \
  --token "your_access_token"
```

## Optional Configuration

```sh
export APIFOX_API_BASE_URL="https://api.apifox.com"
export APIFOX_API_VERSION="2024-03-28"
export APIFOX_API_PAGE_SIZE="300"
export APIFOX_DATA_LOCATION="/tmp"
```

- `APIFOX_API_BASE_URL`: override for private deployment environments
- `APIFOX_API_PAGE_SIZE`: controls path pagination size
- `APIFOX_DATA_LOCATION`: controls the cache root directory

## Troubleshooting

- **Command not found**: Ensure the global npm `bin` directory is in `PATH`,
  then restart your terminal.
- **Permission errors**: Avoid `sudo`; prefer `nvm` or a custom npm global
  directory.
- **Wrong version**: Run `npm uninstall -g @acehubert/apifox-mcp` and
  reinstall.
- **Cache path not writable**: Set `APIFOX_DATA_LOCATION` to a writable path.
