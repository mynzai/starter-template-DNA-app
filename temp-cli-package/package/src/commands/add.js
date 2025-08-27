"use strict";
/**
 * @fileoverview Add command - Add DNA modules to existing projects
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCommand = void 0;
const tslib_1 = require("tslib");
const commander_1 = require("commander");
const chalk_compat_1 = tslib_1.__importDefault(require("../utils/chalk-compat"));
const ora_compat_1 = tslib_1.__importDefault(require("../utils/ora-compat"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const error_handler_1 = require("../utils/error-handler");
const logger_1 = require("../utils/logger");
exports.addCommand = new commander_1.Command('add')
    .description('Add DNA modules to existing project')
    .argument('<module>', 'DNA module to add')
    .option('-p, --path <path>', 'project path (default: current directory)', process.cwd())
    .option('--force', 'force add even with conflicts')
    .option('--dry-run', 'preview changes without modifying files')
    .action(async (module, options) => {
    const spinner = (0, ora_compat_1.default)('Adding DNA module...').start();
    try {
        const projectPath = path_1.default.resolve(options.path || process.cwd());
        // Check if project exists
        if (!await fs_extra_1.default.pathExists(projectPath)) {
            throw (0, error_handler_1.createCLIError)(`Project path does not exist: ${projectPath}`, 'PATH_NOT_FOUND');
        }
        // Check for package.json or other project indicators
        const hasPackageJson = await fs_extra_1.default.pathExists(path_1.default.join(projectPath, 'package.json'));
        const hasPubspec = await fs_extra_1.default.pathExists(path_1.default.join(projectPath, 'pubspec.yaml'));
        const hasCargo = await fs_extra_1.default.pathExists(path_1.default.join(projectPath, 'Cargo.toml'));
        if (!hasPackageJson && !hasPubspec && !hasCargo) {
            throw (0, error_handler_1.createCLIError)('No project found in the specified path', 'PROJECT_NOT_FOUND', 'Make sure you are in a project directory');
        }
        spinner.text = `Adding ${module} to project...`;
        // Map of modules to their implementation details
        const moduleImplementations = {
            'auth-jwt': {
                packages: ['jsonwebtoken', 'bcryptjs'],
                devPackages: ['@types/jsonwebtoken', '@types/bcryptjs'],
                files: [
                    {
                        path: 'src/lib/auth.ts',
                        content: `// JWT Authentication Module
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '7d'
  });
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, process.env.JWT_SECRET || 'secret');
};

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};`
                    }
                ],
                instructions: 'Add JWT_SECRET to your .env file'
            },
            'payments-stripe': {
                packages: ['stripe'],
                files: [
                    {
                        path: 'src/lib/stripe.ts',
                        content: `// Stripe Payment Module
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export const createCheckoutSession = async (priceId: string, customerId?: string) => {
  return stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: process.env.STRIPE_SUCCESS_URL || 'http://localhost:3000/success',
    cancel_url: process.env.STRIPE_CANCEL_URL || 'http://localhost:3000/cancel',
    customer: customerId,
  });
};

export const createCustomer = async (email: string) => {
  return stripe.customers.create({ email });
};

export default stripe;`
                    }
                ],
                instructions: 'Add STRIPE_SECRET_KEY to your .env file'
            },
            'ai-openai': {
                packages: ['openai'],
                files: [
                    {
                        path: 'src/lib/openai.ts',
                        content: `// OpenAI Integration Module
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const generateText = async (prompt: string, options = {}) => {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    ...options,
  });
  return response.choices[0].message.content;
};

export const generateStream = async function* (prompt: string, options = {}) {
  const stream = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    stream: true,
    ...options,
  });

  for await (const chunk of stream) {
    yield chunk.choices[0]?.delta?.content || '';
  }
};

export default openai;`
                    }
                ],
                instructions: 'Add OPENAI_API_KEY to your .env file'
            },
            'real-time-websocket': {
                packages: ['ws', 'socket.io', 'socket.io-client'],
                devPackages: ['@types/ws'],
                files: [
                    {
                        path: 'src/lib/websocket.ts',
                        content: `// WebSocket Real-time Module
import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';

export const initializeWebSocket = (server: HTTPServer) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('message', (data) => {
      // Broadcast to all clients
      io.emit('message', data);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
};`
                    }
                ],
                instructions: 'Initialize WebSocket with your HTTP server'
            }
        };
        const implementation = moduleImplementations[module];
        if (!implementation) {
            spinner.warn(`Module ${module} is not yet implemented`);
            console.log(chalk_compat_1.default.yellow('\nThis module needs manual implementation.'));
            console.log(chalk_compat_1.default.dim('Check the documentation for integration guides.'));
            return;
        }
        if (options.dryRun) {
            spinner.info('Dry run mode - no changes will be made');
            console.log(chalk_compat_1.default.cyan('\n📦 Packages to install:'));
            if (implementation.packages) {
                console.log('  Dependencies:', implementation.packages.join(', '));
            }
            if (implementation.devPackages) {
                console.log('  Dev dependencies:', implementation.devPackages.join(', '));
            }
            if (implementation.files) {
                console.log(chalk_compat_1.default.cyan('\n📄 Files to create:'));
                implementation.files.forEach(f => console.log(`  ${f.path}`));
            }
            if (implementation.instructions) {
                console.log(chalk_compat_1.default.cyan('\n📝 Instructions:'));
                console.log(`  ${implementation.instructions}`);
            }
            return;
        }
        // Install packages if package.json exists
        if (hasPackageJson && (implementation.packages || implementation.devPackages)) {
            spinner.text = 'Installing dependencies...';
            const { execSync } = require('child_process');
            if (implementation.packages && implementation.packages.length > 0) {
                const cmd = `npm install ${implementation.packages.join(' ')}`;
                logger_1.logger.debug(`Running: ${cmd}`);
                execSync(cmd, { cwd: projectPath, stdio: 'inherit' });
            }
            if (implementation.devPackages && implementation.devPackages.length > 0) {
                const cmd = `npm install --save-dev ${implementation.devPackages.join(' ')}`;
                logger_1.logger.debug(`Running: ${cmd}`);
                execSync(cmd, { cwd: projectPath, stdio: 'inherit' });
            }
        }
        // Create files
        if (implementation.files) {
            spinner.text = 'Creating module files...';
            for (const file of implementation.files) {
                const filePath = path_1.default.join(projectPath, file.path);
                // Check if file exists
                if (await fs_extra_1.default.pathExists(filePath) && !options.force) {
                    spinner.warn(`File ${file.path} already exists (use --force to overwrite)`);
                    continue;
                }
                // Ensure directory exists
                await fs_extra_1.default.ensureDir(path_1.default.dirname(filePath));
                // Write file
                await fs_extra_1.default.writeFile(filePath, file.content, 'utf-8');
                logger_1.logger.debug(`Created file: ${filePath}`);
            }
        }
        spinner.succeed(`Successfully added ${chalk_compat_1.default.green(module)} to your project!`);
        if (implementation.instructions) {
            console.log(chalk_compat_1.default.yellow('\n⚠️  Additional setup required:'));
            console.log(`   ${implementation.instructions}`);
        }
        console.log(chalk_compat_1.default.dim('\n💡 Check the created files and customize them for your needs'));
    }
    catch (error) {
        spinner.fail('Failed to add module');
        throw error;
    }
});
//# sourceMappingURL=add.js.map