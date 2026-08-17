import type { Agent, AgentCommands, AgentCommandValue, Command, ResolveCommandOptions, ResolvedCommand } from './types'
/**
 * Split `run` arguments around the script name for package managers that
 * require `--` to forward extra arguments to the script (npm, pnpm@6).
 *
 * The script name is the first positional argument that is neither a flag
 * nor the value of a preceding value-taking flag (e.g. `-w <workspace>`).
 * Everything before it (workspace/filter flags) stays in front; everything
 * after it is the script's own arguments.
 *
 * @param args The arguments passed after the `run` command.
 * @param valueFlags Flags that consume the following argument as their value.
 * @returns The args split into `before` the script, the `script` itself
 * (or `undefined` when there is no script name), and the `after` args.
 */
export function splitRunArgs(args: string[], valueFlags: string[] = []): {
  before: string[]
  script: string | undefined
  after: string[]
} {
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('-'))
      continue
    if (i > 0 && valueFlags.includes(args[i - 1]))
      continue
    return { before: args.slice(0, i), script: args[i], after: args.slice(i + 1) }
  }
  return { before: args, script: undefined, after: [] }
}

function dashDashArg(agent: string, agentCommand: string, valueFlags: string[] = []) {
  return (args: string[]) => {
    const { before, script, after } = splitRunArgs(args, valueFlags)
    if (script === undefined)
      return [agent, agentCommand, ...before]
    if (after.length > 0)
      return [agent, agentCommand, ...before, script, '--', ...after]
    return [agent, agentCommand, ...before, script]
  }
}

const npm: AgentCommands = {
  'agent': ['npm', 0],
  'run': dashDashArg('npm', 'run', ['-w', '--workspace']),
  'install': ['npm', 'i', 0],
  'frozen': ['npm', 'ci', 0],
  'global': ['npm', 'i', '-g', 0],
  'add': ['npm', 'i', 0],
  'upgrade': ['npm', 'update', 0],
  'upgrade-interactive': null,
  'dedupe': ['npm', 'dedupe', 0],
  'execute': ['npx', 0],
  'execute-local': ['npx', 0],
  'uninstall': ['npm', 'uninstall', 0],
  'global_uninstall': ['npm', 'uninstall', '-g', 0],
}

/** yarn 1 */
const yarn: AgentCommands = {
  'agent': ['yarn', 0],
  'run': ['yarn', 'run', 0],
  'install': ['yarn', 'install', 0],
  'frozen': ['yarn', 'install', '--frozen-lockfile', 0],
  'global': ['yarn', 'global', 'add', 0],
  'add': ['yarn', 'add', 0],
  'upgrade': ['yarn', 'upgrade', 0],
  'upgrade-interactive': ['yarn', 'upgrade-interactive', 0],
  'dedupe': null,
  'execute': ['npx', 0],
  'execute-local': dashDashArg('yarn', 'exec'),
  'uninstall': ['yarn', 'remove', 0],
  'global_uninstall': ['yarn', 'global', 'remove', 0],
}

/** yarn 2+ */
const yarnBerry: AgentCommands = {
  ...yarn,
  'frozen': ['yarn', 'install', '--immutable', 0],
  'upgrade': ['yarn', 'up', 0],
  'upgrade-interactive': ['yarn', 'up', '-i', 0],
  'dedupe': ['yarn', 'dedupe', 0],
  'execute': ['yarn', 'dlx', 0],
  'execute-local': ['yarn', 'exec', 0],
  // Yarn 2+ removed 'global', see https://github.com/yarnpkg/berry/issues/821
  'global': ['npm', 'i', '-g', 0],
  'global_uninstall': ['npm', 'uninstall', '-g', 0],
}

/** pnpm command set, parameterized by the CLI executable name (`pnpm` / `rush-pnpm`) */
function createPnpmCommands(cli: string): AgentCommands {
  return {
    'agent': [cli, 0],
    'run': [cli, 'run', 0],
    'install': [cli, 'i', 0],
    'frozen': [cli, 'i', '--frozen-lockfile', 0],
    'global': [cli, 'add', '-g', 0],
    'add': [cli, 'add', 0],
    'upgrade': [cli, 'update', 0],
    'upgrade-interactive': [cli, 'update', '-i', 0],
    'dedupe': [cli, 'dedupe', 0],
    'execute': [cli, 'dlx', 0],
    'execute-local': [cli, 'exec', 0],
    'uninstall': [cli, 'remove', 0],
    'global_uninstall': [cli, 'remove', '--global', 0],
  }
}

const pnpm: AgentCommands = createPnpmCommands('pnpm')

/** pnpm via Rush (rush-pnpm) */
const pnpmRush: AgentCommands = createPnpmCommands('rush-pnpm')

const bun: AgentCommands = {
  'agent': ['bun', 0],
  'run': ['bun', 'run', 0],
  'install': ['bun', 'install', 0],
  'frozen': ['bun', 'install', '--frozen-lockfile', 0],
  'global': ['bun', 'add', '-g', 0],
  'add': ['bun', 'add', 0],
  'upgrade': ['bun', 'update', 0],
  'upgrade-interactive': ['bun', 'update', '-i', 0],
  'dedupe': null,
  'execute': ['bun', 'x', 0],
  'execute-local': ['bun', 'x', 0],
  'uninstall': ['bun', 'remove', 0],
  'global_uninstall': ['bun', 'remove', '-g', 0],
}

const aube: AgentCommands = {
  'agent': ['aube', 0],
  'run': ['aube', 'run', 0],
  'install': ['aube', 'install', 0],
  'frozen': ['aube', 'install', '--frozen-lockfile', 0],
  'global': ['aube', 'add', '-g', 0],
  'add': ['aube', 'add', 0],
  'upgrade': ['aube', 'update', 0],
  'upgrade-interactive': ['aube', 'update', '-i', 0],
  'dedupe': ['aube', 'dedupe', 0],
  'execute': ['aube', 'dlx', 0],
  'execute-local': ['aube', 'exec', 0],
  'uninstall': ['aube', 'remove', 0],
  'global_uninstall': ['aube', 'remove', '-g', 0],
}

const deno: AgentCommands = {
  'agent': ['deno', 0],
  'run': ['deno', 'task', 0],
  'install': ['deno', 'install', 0],
  'frozen': ['deno', 'install', '--frozen', 0],
  'global': ['deno', 'install', '-g', 0],
  'add': ['deno', 'add', 0],
  'upgrade': ['deno', 'outdated', '--update', 0],
  'upgrade-interactive': ['deno', 'outdated', '--update', 0],
  'dedupe': null,
  'execute': ['deno', 'x', 0],
  'execute-local': ['deno', 'task', '--eval', 0],
  'uninstall': ['deno', 'remove', 0],
  'global_uninstall': ['deno', 'uninstall', '-g', 0],
}

// nub mirrors pnpm's CLI grammar, with two deliberate divergences encoded
// here: `upgrade` maps to `nub update` (nub reserves `nub upgrade` for its
// own self-update, which rejects a package argument), and `execute` (dlx) is
// the dedicated `nubx` binary, not a `nub` subcommand.
const nub: AgentCommands = {
  'agent': ['nub', 0],
  'run': ['nub', 'run', 0],
  'install': ['nub', 'install', 0],
  'frozen': ['nub', 'install', '--frozen-lockfile', 0],
  'global': ['nub', 'add', '-g', 0],
  'add': ['nub', 'add', 0],
  'upgrade': ['nub', 'update', 0],
  'upgrade-interactive': ['nub', 'update', '-i', 0],
  'dedupe': ['nub', 'dedupe', 0],
  'execute': ['nubx', 0],
  'execute-local': ['nub', 'exec', 0],
  'uninstall': ['nub', 'remove', 0],
  'global_uninstall': ['nub', 'remove', '-g', 0],
}

export const COMMANDS = {
  'npm': npm,
  'yarn': yarn,
  'yarn@berry': yarnBerry,
  'pnpm': pnpm,
  // pnpm v6.x or below
  'pnpm@6': <AgentCommands>{
    ...pnpm,
    run: dashDashArg('pnpm', 'run', ['-F', '--filter']),
  },
  'pnpm-rush': pnpmRush,
  'bun': bun,
  'aube': aube,
  'deno': deno,
  'nub': nub,
} satisfies Record<Agent, AgentCommands>

/**
 * Generate workspace CLI flags for the given agent and workspace names.
 *
 * @param agent The package manager agent.
 * @param workspaces The workspace names to scope to.
 * @returns An array of CLI arguments (e.g. `['-w', 'pkg-a']`), or `undefined`
 *   when no workspace mapping exists for the agent.
 */
function workspaceArgs(agent: Agent, workspaces: string[]): string[] | undefined {
  const name = agent.replace(/@.*$/, '')
  switch (name) {
    case 'npm':
      return workspaces.flatMap(w => ['-w', w])
    case 'pnpm':
      return workspaces.flatMap(w => ['--filter', w])
    case 'bun':
      return workspaces.flatMap(w => ['--filter', w])
    case 'yarn':
      // Yarn uses `workspace <name>` as a prefix; additional args follow after.
      return ['workspace', ...workspaces]
    default:
      return undefined
  }
}

/**
 * Resolve the command for the agent merging the command arguments with the provided arguments.
 *
 * For example, to show how to install `@antfu/ni` globally using `pnpm`:
 * ```js
 * import { resolveCommand } from 'package-manager-detector/commands'
 * const { command, args } = resolveCommand('pnpm', 'global', ['@antfu/ni'])
 * console.log(`${command} ${args.join(' ')}`) // 'pnpm add -g @antfu/ni'
 * ```
 *
 * With workspace scoping:
 * ```js
 * const { command, args } = resolveCommand('npm', 'add', ['lodash'], { workspaces: ['pkg-a'] })
 * console.log(`${command} ${args.join(' ')}`) // 'npm i lodash -w pkg-a'
 * ```
 *
 * @param agent The agent to use.
 * @param command the command to resolve.
 * @param args The arguments to pass to the command.
 * @param options Optional settings such as `workspaces`.
 * @returns {ResolvedCommand} The resolved command or `null` if the agent command is not found.
 */
export function resolveCommand(
  agent: Agent,
  command: Command,
  args: string[],
  options?: ResolveCommandOptions,
): ResolvedCommand | null {
  const value = COMMANDS[agent][command] as AgentCommandValue
  const resolved = constructCommand(value, args)
  if (resolved == null)
    return null

  if (options?.workspaces?.length) {
    const wsArgs = workspaceArgs(agent, options.workspaces)
    if (wsArgs) {
      if (command === 'run') {
        // For `run`, workspace flags must appear before the script name.
        // Yarn: `yarn workspace <name> run <script>` → insert before `run` (index 0)
        // Others: `npm run -w <name> <script>` → insert after `run` (index 1)
        const agentName = agent.replace(/@.*$/, '')
        resolved.args.splice(agentName === 'yarn' ? 0 : 1, 0, ...wsArgs)
      }
      else {
        resolved.args.push(...wsArgs)
      }
    }
  }

  return resolved
}

/**
 * Construct the command from the agent command merging the command arguments with the provided arguments.
 * @param value {AgentCommandValue} The agent command to use.
 * @param args The arguments to pass to the command.
 * @returns {ResolvedCommand} The resolved command or `null` if the command is `null`.
 */
export function constructCommand(value: AgentCommandValue, args: string[]): ResolvedCommand | null {
  if (value == null)
    return null

  const list = typeof value === 'function'
    ? value(args)
    : value.flatMap((v) => {
        if (typeof v === 'number')
          return args
        return [v]
      })

  return {
    command: list[0],
    args: list.slice(1),
  }
}
