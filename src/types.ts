export type Agent = 'npm' | 'yarn' | 'yarn@berry' | 'pnpm' | 'pnpm@6' | 'pnpm-rush' | 'bun' | 'deno' | 'nub' | 'aube'
export type AgentName = 'npm' | 'yarn' | 'pnpm' | 'bun' | 'deno' | 'nub' | 'aube'

export type AgentCommandValue = (string | number)[] | ((args: string[]) => string[]) | null

export interface AgentCommands {
  'agent': AgentCommandValue
  'run': AgentCommandValue
  'install': AgentCommandValue
  'frozen': AgentCommandValue
  'global': AgentCommandValue
  'add': AgentCommandValue
  'upgrade': AgentCommandValue
  'upgrade-interactive': AgentCommandValue
  'dedupe': AgentCommandValue
  'execute': AgentCommandValue
  'execute-local': AgentCommandValue
  'uninstall': AgentCommandValue
  'global_uninstall': AgentCommandValue
}

export type Command = keyof AgentCommands

export interface ResolvedCommand {
  /**
   * CLI command.
   */
  command: string
  /**
   * Arguments for the CLI command, merged with user arguments.
   */
  args: string[]
}

export interface ResolveCommandOptions {
  /**
   * Target workspace(s) to scope the command to.
   *
   * The workspace names are translated to the correct CLI flags
   * for each package manager:
   * - npm / pnpm / bun: `-w <name>` / `--filter <name>` / `--filter <name>`
   * - yarn / yarn@berry: `workspace <name>`
   */
  workspaces?: string[]
}

export type DetectStrategy = 'lockfile' | 'packageManager-field' | 'devEngines-field' | 'install-metadata'

export interface DetectOptions {
  /**
   * Current working directory to start looking up for package manager.
   * @default `process.cwd()`
   */
  cwd?: string
  /**
   * The strategies to use for detecting the package manager. The strategies
   * are executed in the order it's specified for every directory that it iterates
   * upwards from the `cwd`.
   *
   * - `'lockfile'`: Look up for lock files.
   * - `'packageManager-field'`: Look up for the `packageManager` field in package.json.
   * - `'devEngines-field'`: Look up for the `devEngines.packageManager` field in package.json.
   * - `'install-metadata'`: Look up for installation metadata added by package managers.
   *
   * @default ['lockfile', 'packageManager-field', 'devEngines-field']
   */
  strategies?: DetectStrategy[]
  /**
   * Callback when unknown package manager from package.json.
   * @param packageManager - The `packageManager` value from package.json file.
   */
  onUnknown?: (packageManager: string) => DetectResult | null | undefined
  /**
   * The path to stop traversing up the directory.
   */
  stopDir?: string | ((currentDir: string) => boolean)

  /**
   * Optional custom parser for `package.json` content.
   *
   * If provided, it will be used instead of `JSON.parse` when reading `package.json` files.
   * This can be used to support JSONC, YAML, or other formats.
   *
   * @param content - The content of the file.
   * @param filepath - The absolute path to the file.
   * @returns The parsed object or a Promise resolving to it.
   * @default JSON.parse
   */
  packageJsonParser?: (content: string, filepath: string) => any | Promise<any>
}

export interface DetectResult {
  /**
   * Agent name without the specifier.
   *
   * Can be `npm`, `yarn`, `pnpm`, `bun`, `deno`, `nub`, or `aube`.
   */
  name: AgentName
  /**
   * Agent specifier to resolve the command.
   *
   * May contain '@' to differentiate the version (e.g. 'yarn@berry').
   * Use `name` for the agent name without the specifier.
   */
  agent: Agent
  /**
   * Specific version of the agent, read from `packageManager` field in package.json.
   */
  version?: string
}
