import { stdin, stdout } from 'node:process';
import { parseArgs } from 'node:util';
import { openDatabase } from './db/database';
import { createStore } from './db/store';
import { createStaffService, StaffError } from './services/staff';

/**
 * Owner's command line for staff accounts (there is no sign-up page):
 *
 *   node dist-server/cli.js staff:add --email anna@sushiriga.lv --name Anna --role admin
 *   node dist-server/cli.js staff:list
 *   node dist-server/cli.js staff:password --email anna@sushiriga.lv
 *   node dist-server/cli.js staff:disable --email anna@sushiriga.lv   (staff:enable to undo)
 *
 * The password is asked for without echo, or read from SUSHIRIGA_STAFF_PASSWORD (automation).
 * Uses the same DATABASE_PATH as the server.
 */
async function askPassword(prompt: string): Promise<string> {
  const fromEnv = process.env.SUSHIRIGA_STAFF_PASSWORD;
  if (fromEnv) return fromEnv;
  if (!stdin.isTTY) throw new Error('No terminal: set SUSHIRIGA_STAFF_PASSWORD instead');
  stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');
  return new Promise((resolve, reject) => {
    let value = '';
    const onData = (char: string) => {
      if (char === '\r' || char === '\n') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.off('data', onData);
        stdout.write('\n');
        resolve(value);
      } else if (char === '\u0003') {
        stdin.setRawMode(false);
        reject(new Error('Cancelled'));
      } else if (char === '\u007f') {
        value = value.slice(0, -1);
      } else {
        value += char;
      }
    };
    stdin.on('data', onData);
  });
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const { values } = parseArgs({
    args: rest,
    options: {
      email: { type: 'string' },
      name: { type: 'string' },
      role: { type: 'string', default: 'staff' },
    },
  });

  const db = openDatabase(process.env.DATABASE_PATH?.trim() || './data/sushiriga.db');
  const staff = createStaffService(createStore(db), () => new Date());
  try {
    switch (command) {
      case 'staff:add': {
        if (!values.email) throw new Error('--email is required');
        if (values.role !== 'admin' && values.role !== 'staff') {
          throw new Error('--role must be "admin" or "staff"');
        }
        const password = await askPassword('Password (min. 12 characters): ');
        const user = await staff.createUser({
          email: values.email,
          name: values.name ?? '',
          role: values.role,
          password,
        });
        console.log(`Created ${user.role} ${user.email}`);
        break;
      }
      case 'staff:list':
        for (const user of staff.list()) {
          console.log(
            `${user.email}\t${user.role}\t${user.name}${user.disabled ? '\t(disabled)' : ''}`,
          );
        }
        break;
      case 'staff:password': {
        if (!values.email) throw new Error('--email is required');
        await staff.setPassword(values.email, await askPassword('New password: '));
        console.log('Password changed; the user was signed out everywhere.');
        break;
      }
      case 'staff:disable':
      case 'staff:enable':
        if (!values.email) throw new Error('--email is required');
        staff.setDisabled(values.email, command === 'staff:disable');
        console.log(command === 'staff:disable' ? 'Disabled.' : 'Enabled.');
        break;
      default:
        console.log('Commands: staff:add, staff:list, staff:password, staff:disable, staff:enable');
        process.exitCode = command ? 1 : 0;
    }
  } catch (error) {
    if (error instanceof StaffError || error instanceof Error) {
      console.error(`Error: ${error.message}`);
      process.exitCode = 1;
    } else {
      throw error;
    }
  } finally {
    db.close();
  }
}

void main();
