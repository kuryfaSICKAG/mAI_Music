// Einheitliche Prompt-Hilfsfunktionen fuer Konsoleneingaben.
import inquirer from "inquirer";

export async function ask(message: string): Promise<string> {
  const answer: { value: string } = await inquirer.prompt([
    { type: "input", name: "value", message },
  ]);
  return answer.value;
}

export async function askPassword(message: string): Promise<string> {
  const answer: { value: string } = await inquirer.prompt([
    { type: "password", name: "value", message, mask: "*" },
  ]);
  return answer.value;
}

export async function askInt(message: string): Promise<number> {
  const answer: { value: number } = await inquirer.prompt([
    {
      type: "input",
      name: "value",
      message,
      validate: (input: string) => {
        const n = Number(input);
        return Number.isInteger(n) ? true : "Bitte eine ganze Zahl eingeben.";
      },
      filter: (input: string) => Number(input),
    },
  ]);
  return answer.value;
}

export async function askConfirm(
  message: string,
  defaultVal = true,
): Promise<boolean> {
  const answer: { value: boolean } = await inquirer.prompt([
    { type: "confirm", name: "value", message, default: defaultVal },
  ]);
  return answer.value;
}

export async function askChoice<T = string>(
  message: string,
  choices: Array<T | { name: string; value: T; short?: string }>,
  pageSize = 30,
): Promise<T> {
  const answer: { value: T } = await inquirer.prompt([
    {
      type: "select", // Verwendet eine Auswahlsteuerung fuer bessere Navigation.
      name: "value",
      message,
      choices: choices as any,
      pageSize, // Definiert die Anzahl sichtbarer Eintraege pro Seite.
    },
  ]);
  return answer.value;
}

export async function waitEnter(message = "(Enter)…"): Promise<void> {
  await inquirer.prompt([{ type: "input", name: "_", message }]);
}
