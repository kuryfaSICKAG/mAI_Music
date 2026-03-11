import chalk from "chalk";

export function header(title: string) {
  const padding = 2; // Abstand links/rechts um den Text
  const contentWidth = title.length + padding * 2;

  const top = "┌" + "─".repeat(contentWidth) + "┐";
  const middle = "│" + " ".repeat(padding) + title + " ".repeat(padding) + "│";
  const bottom = "└" + "─".repeat(contentWidth) + "┘";

  console.log(chalk.white(`\n${top}\n${middle}\n${bottom}`));
}
