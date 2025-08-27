"use strict";
/**
 * @fileoverview Inquirer compatibility layer for CommonJS builds
 * Provides basic prompt functionality using readline
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const readline = tslib_1.__importStar(require("readline"));
const chalk_compat_1 = tslib_1.__importDefault(require("./chalk-compat"));
class InquirerCompat {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }
    askQuestion(question) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer);
            });
        });
    }
    async promptInput(question) {
        const defaultText = question.default ? chalk_compat_1.default.dim(` (${question.default})`) : '';
        const answer = await this.askQuestion(`${chalk_compat_1.default.green('?')} ${question.message}${defaultText} `);
        if (!answer && question.default !== undefined) {
            return question.default;
        }
        if (question.validate) {
            const validation = question.validate(answer);
            if (validation !== true) {
                console.log(chalk_compat_1.default.red(typeof validation === 'string' ? validation : 'Invalid input'));
                return this.promptInput(question);
            }
        }
        return answer;
    }
    async promptConfirm(question) {
        const defaultText = question.default !== undefined ? (question.default ? ' (Y/n)' : ' (y/N)') : ' (y/n)';
        const answer = await this.askQuestion(`${chalk_compat_1.default.green('?')} ${question.message}${defaultText} `);
        if (!answer && question.default !== undefined) {
            return question.default;
        }
        const normalized = answer.toLowerCase();
        if (normalized === 'y' || normalized === 'yes') {
            return true;
        }
        else if (normalized === 'n' || normalized === 'no') {
            return false;
        }
        else {
            console.log(chalk_compat_1.default.yellow('Please answer with y/yes or n/no'));
            return this.promptConfirm(question);
        }
    }
    async promptList(question) {
        const choices = question.choices || [];
        console.log(`${chalk_compat_1.default.green('?')} ${question.message}`);
        choices.forEach((choice, index) => {
            const name = typeof choice === 'string' ? choice : choice.name;
            console.log(`  ${index + 1}) ${name}`);
        });
        const answer = await this.askQuestion('Answer: ');
        const index = parseInt(answer) - 1;
        if (index >= 0 && index < choices.length) {
            const choice = choices[index];
            return typeof choice === 'string' ? choice : choice.value;
        }
        else {
            console.log(chalk_compat_1.default.red('Invalid selection. Please choose a number from the list.'));
            return this.promptList(question);
        }
    }
    async promptCheckbox(question) {
        try {
            console.log(chalk_compat_1.default.yellow('[DEBUG] promptCheckbox called'));
            const choices = question.choices || [];
            console.log(chalk_compat_1.default.yellow(`[DEBUG] choices length: ${choices.length}`));
            const selected = new Set();
            console.log(`${chalk_compat_1.default.green('?')} ${question.message} ${chalk_compat_1.default.dim('(Press space to select, enter to confirm)')}`);
            console.log(chalk_compat_1.default.dim('Enter numbers separated by commas (e.g., 1,3,5):'));
            choices.forEach((choice, index) => {
                const name = typeof choice === 'string' ? choice : choice.name;
                console.log(`  ${index + 1}) ${name}`);
            });
            const answer = await this.askQuestion('Select (comma-separated numbers): ');
            console.log(chalk_compat_1.default.yellow(`[DEBUG] User answer: "${answer}"`));
            if (!answer || answer.trim() === '') {
                console.log(chalk_compat_1.default.yellow('[DEBUG] Empty answer, returning empty array'));
                return [];
            }
            const parts = answer.split(',');
            console.log(chalk_compat_1.default.yellow(`[DEBUG] Split parts: ${JSON.stringify(parts)}`));
            const indices = parts.map(s => parseInt(s.trim()) - 1).filter(i => i >= 0 && i < choices.length);
            console.log(chalk_compat_1.default.yellow(`[DEBUG] Parsed indices: ${JSON.stringify(indices)}`));
            const result = indices.map(i => {
                console.log(chalk_compat_1.default.yellow(`[DEBUG] Processing index ${i}`));
                const choice = choices[i];
                if (!choice) {
                    console.log(chalk_compat_1.default.red(`Invalid choice index: ${i + 1}`));
                    return null;
                }
                const value = typeof choice === 'string' ? choice : (choice.value || choice.name || choice);
                console.log(chalk_compat_1.default.yellow(`[DEBUG] Returning value: ${value}`));
                return value;
            }).filter(Boolean);
            console.log(chalk_compat_1.default.yellow(`[DEBUG] Final result: ${JSON.stringify(result)}`));
            return result;
        }
        catch (error) {
            console.log(chalk_compat_1.default.red(`[DEBUG] Error in promptCheckbox: ${error}`));
            console.log(chalk_compat_1.default.red(`[DEBUG] Stack: ${error.stack}`));
            throw error;
        }
    }
    async prompt(questions) {
        const questionArray = Array.isArray(questions) ? questions : [questions];
        const answers = {};
        for (const question of questionArray) {
            // Check when condition
            if (question.when !== undefined) {
                const shouldAsk = typeof question.when === 'boolean' ? question.when : question.when(answers);
                if (!shouldAsk)
                    continue;
            }
            let answer;
            switch (question.type) {
                case 'input':
                case 'password':
                    answer = await this.promptInput(question);
                    break;
                case 'confirm':
                    answer = await this.promptConfirm(question);
                    break;
                case 'list':
                    answer = await this.promptList(question);
                    break;
                case 'checkbox':
                    answer = await this.promptCheckbox(question);
                    break;
                default:
                    answer = await this.promptInput(question);
            }
            answers[question.name] = answer;
        }
        this.rl.close();
        return answers;
    }
}
const inquirer = {
    prompt: (questions) => {
        const instance = new InquirerCompat();
        return instance.prompt(questions);
    }
};
exports.default = inquirer;
//# sourceMappingURL=inquirer-compat.js.map