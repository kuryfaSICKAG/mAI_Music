#!/usr/bin/env ts-node
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ANSI color codes for pretty terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

interface TestResult {
  file: string;
  status: 'pass' | 'fail' | 'pending';
  duration: number;
  tests: number;
  passed: number;
  failed: number;
}

class TestRunner {
  private results: TestResult[] = [];
  private startTime: number = Date.now();
  private testDir: string;
  private projectRoot: string;

  constructor() {
    // Handle being run from either project root or unit_tests directory
    if (path.basename(__dirname) === 'unit_tests') {
      this.projectRoot = path.dirname(__dirname);
      this.testDir = __dirname;
    } else {
      this.projectRoot = __dirname;
      this.testDir = path.join(__dirname, 'unit_tests');
    }
    this.printHeader();
  }

  private printHeader(): void {
    console.log('\n' + colors.bright + colors.blue);
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║         🎵 mAI_Music Unit Test Runner 🎵                        ║');
    console.log('║  Executing comprehensive test suite for all modules             ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log(colors.reset + '\n');
  }

  private getTestFiles(): string[] {
    const files = fs.readdirSync(this.testDir);
    return files
      .filter((f) => f.endsWith('.test.ts'))
      .sort()
      .map((f) => path.join(this.testDir, f));
  }

  private getTestName(filePath: string): string {
    return path.basename(filePath).replace('.test.ts', '');
  }

  private async runTests(): Promise<void> {
    const testFiles = this.getTestFiles();

    if (testFiles.length === 0) {
      console.error(colors.red + '❌ No test files found!' + colors.reset);
      return;
    }

    console.log(
      colors.bright +
        `📋 Found ${testFiles.length} test file(s):\n` +
        colors.reset
    );

    testFiles.forEach((file, index) => {
      console.log(
        `   ${colors.cyan}${index + 1}.${colors.reset} ${this.getTestName(file)}`
      );
    });

    console.log(
      '\n' +
        colors.blue +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' +
        colors.reset +
        '\n'
    );

    // Run vitest
    await this.executeVitest();
  }

  private executeVitest(): Promise<void> {
    return new Promise((resolve) => {
      console.log(colors.yellow + '⏳ Running tests...\n' + colors.reset);

      const vitestProcess = spawn('npm', ['test'], {
        cwd: this.projectRoot,
        stdio: 'inherit',
        shell: true,
      });

      vitestProcess.on('exit', (code) => {
        this.printSummary(code === 0);
        resolve();
      });

      vitestProcess.on('error', (err) => {
        console.error(
          colors.red + `❌ Failed to run tests: ${err.message}` + colors.reset
        );
        this.printErrorSummary();
        resolve();
      });
    });
  }

  private printSummary(success: boolean): void {
    const duration = Date.now() - this.startTime;
    const durationSeconds = (duration / 1000).toFixed(2);

    console.log(
      '\n' +
        colors.blue +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' +
        colors.reset
    );

    if (success) {
      console.log(
        colors.green +
          colors.bright +
          '\n✅ All tests passed successfully!\n' +
          colors.reset
      );
    } else {
      console.log(
        colors.red +
          colors.bright +
          '\n❌ Some tests failed. Check the output above for details.\n' +
          colors.reset
      );
    }

    console.log(
      `${colors.cyan}⏱️  Total execution time: ${durationSeconds}s${colors.reset}`
    );

    console.log(
      '\n' +
        colors.bright +
        colors.blue +
        '╔════════════════════════════════════════════════════════════════╗' +
        colors.reset
    );
    console.log(
      colors.blue + '║  Test Modules:' + colors.reset
    );

    const testFiles = this.getTestFiles();
    testFiles.forEach((file) => {
      const name = this.getTestName(file);
      const icon = name.includes('deezer')
        ? '🎵'
        : name.includes('service')
        ? '🔧'
        : name.includes('ai')
        ? '🤖'
        : name.includes('playlist')
        ? '📝'
        : name.includes('model')
        ? '📊'
        : name.includes('server')
        ? '🖥️'
        : name.includes('data')
        ? '💾'
        : '✓';

      console.log(
        colors.blue +
          `║  ${icon} ${this.padString(name, 52)}` +
          colors.reset
      );
    });

    console.log(
      colors.bright +
        colors.blue +
        '╚════════════════════════════════════════════════════════════════╝' +
        colors.reset
    );

    console.log(
      '\n' +
        colors.cyan +
        'Run "npm run test:watch" for watch mode or "npm run test:ui" for UI mode\n' +
        colors.reset
    );
  }

  private printErrorSummary(): void {
    const duration = Date.now() - this.startTime;
    const durationSeconds = (duration / 1000).toFixed(2);

    console.log(
      '\n' +
        colors.red +
        '╔════════════════════════════════════════════════════════════════╗' +
        colors.reset
    );
    console.log(
      colors.red +
        `║  Error running tests (${durationSeconds}s)${' '.repeat(
          25 - durationSeconds.length
        )}║` +
        colors.reset
    );
    console.log(
      colors.red +
        '╚════════════════════════════════════════════════════════════════╝' +
        colors.reset
    );
  }

  private padString(str: string, length: number): string {
    return str + ' '.repeat(Math.max(0, length - str.length));
  }

  public async run(): Promise<void> {
    try {
      await this.runTests();
    } catch (error) {
      console.error(
        colors.red +
          `Test runner error: ${error instanceof Error ? error.message : String(error)}` +
          colors.reset
      );
      process.exit(1);
    }
  }
}

// Main entry point
const runner = new TestRunner();
runner.run().catch((error) => {
  console.error(colors.red + `Fatal error: ${error}` + colors.reset);
  process.exit(1);
});
