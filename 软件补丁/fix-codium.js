const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");
const { execFileSync } = require("child_process");

const extensionsGallery = {
  serviceUrl: "https://marketplace.visualstudio.com/_apis/public/gallery",
  itemUrl: "https://marketplace.visualstudio.com/items",
  latestUrlTemplate:
    "https://marketplace.visualstudio.com/_apis/public/gallery/{publisher}/{name}/latest",
  controlUrl: "https://main.vscode-cdn.net/extensions/marketplace.json",
};

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function ensureFileExists(filePath) {
  if (!fileExists(filePath)) {
    throw new Error(`找不到文件: ${filePath}`);
  }
}

function ensureBackup(filePath, backupPath) {
  if (!fileExists(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
    console.log(`✔ 已创建备份: ${backupPath}`);
  } else {
    console.log(`ℹ 备份已存在: ${backupPath}`);
  }
}

function getPlatform() {
  return os.platform();
}

function getEnvExecutableCandidates() {
  const candidates = [];

  for (const key of ["CODIUM_BIN", "CODIUM_EXE", "VSCODIUM_BIN", "VSCODIUM_EXE"]) {
    if (process.env[key]) {
      candidates.push(process.env[key]);
    }
  }

  return candidates;
}

function runLocatorCommand() {
  try {
    if (getPlatform() === "win32") {
      const output = execFileSync("where", ["codium"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      return output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    }

    const output = execFileSync("which", ["codium"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function uniq(items) {
  return [...new Set(items.filter(Boolean))];
}

function candidateProductJsonFromExecutable(executablePath) {
  try {
    const realExecutablePath = fs.realpathSync(executablePath);

    if (getPlatform() === "darwin") {
      return path.resolve(realExecutablePath, "../../product.json");
    }

    if (getPlatform() === "linux") {
      return path.resolve(realExecutablePath, "../../resources/app/product.json");
    }

    if (getPlatform() === "win32") {
      return path.resolve(realExecutablePath, "../resources/app/product.json");
    }
  } catch {
    return null;
  }

  return null;
}

function getDefaultProductJsonCandidates() {
  const home = os.homedir();

  if (getPlatform() === "darwin") {
    return [
      "/Applications/VSCodium.app/Contents/Resources/app/product.json",
      path.join(home, "Applications/VSCodium.app/Contents/Resources/app/product.json"),
    ];
  }

  if (getPlatform() === "linux") {
    return [
      "/usr/share/codium/resources/app/product.json",
      "/var/lib/flatpak/app/com.vscodium.codium/current/active/files/extra/vscodium/resources/app/product.json",
      path.join(home, ".local/share/flatpak/app/com.vscodium.codium/current/active/files/extra/vscodium/resources/app/product.json"),
      "/snap/codium/current/usr/share/codium/resources/app/product.json",
    ];
  }

  if (getPlatform() === "win32") {
    return [
      path.join(process.env.LOCALAPPDATA || "", "Programs/VSCodium/resources/app/product.json"),
      path.join(process.env.ProgramFiles || "", "VSCodium/resources/app/product.json"),
      path.join(process.env["ProgramFiles(x86)"] || "", "VSCodium/resources/app/product.json"),
    ];
  }

  return [];
}

function getPathHints() {
  if (getPlatform() === "darwin") {
    return [
      "/Applications/VSCodium.app/Contents/Resources/app/product.json",
      "~/Applications/VSCodium.app/Contents/Resources/app/product.json",
    ];
  }

  if (getPlatform() === "linux") {
    return [
      "/usr/share/codium/resources/app/product.json",
      "/snap/codium/current/usr/share/codium/resources/app/product.json",
      "Flatpak 安装目录下的 resources/app/product.json",
    ];
  }

  if (getPlatform() === "win32") {
    return [
      "%LOCALAPPDATA%\\Programs\\VSCodium\\resources\\app\\product.json",
      "%ProgramFiles%\\VSCodium\\resources\\app\\product.json",
      "%ProgramFiles(x86)%\\VSCodium\\resources\\app\\product.json",
    ];
  }

  return [];
}

function findProductJsonPath() {
  const explicitPath = process.argv[2];
  if (explicitPath) {
    return path.resolve(explicitPath);
  }

  const executableCandidates = uniq([
    ...getEnvExecutableCandidates(),
    ...runLocatorCommand(),
  ]);

  for (const executablePath of executableCandidates) {
    const productJsonPath = candidateProductJsonFromExecutable(executablePath);
    if (productJsonPath && fileExists(productJsonPath)) {
      return productJsonPath;
    }
  }

  for (const candidate of getDefaultProductJsonCandidates()) {
    if (candidate && fileExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function promptForProductJsonPath() {
  console.log("✘ 自动定位失败，需手动输入 product.json 路径");
  console.log("常见路径:");
  for (const hint of getPathHints()) {
    console.log(`- ${hint}`);
  }
  console.log("也可直接这样执行:");
  console.log("node fix-codium.js /path/to/product.json");

  const input = await ask("请输入 product.json 完整路径: ");
  if (!input) {
    throw new Error("未提供 product.json 路径");
  }

  return path.resolve(input);
}

async function resolveProductJsonPath() {
  const detectedPath = findProductJsonPath();
  if (detectedPath) {
    console.log(`✔ 已定位 product.json: ${detectedPath}`);
    return detectedPath;
  }

  return promptForProductJsonPath();
}

async function main() {
  const productJsonPath = await resolveProductJsonPath();
  const backupPath = `${productJsonPath}.bak`;

  ensureFileExists(productJsonPath);

  const raw = fs.readFileSync(productJsonPath, "utf8");
  const product = JSON.parse(raw);

  ensureBackup(productJsonPath, backupPath);

  product.extensionsGallery = extensionsGallery;

  fs.writeFileSync(
    productJsonPath,
    `${JSON.stringify(product, null, 2)}\n`,
    "utf8"
  );

  console.log("✔ 已更新 extensionsGallery");
  console.log(`✔ 已写回: ${productJsonPath}`);

  if (getPlatform() === "win32") {
    console.log("\n如果提示权限不足，请用管理员权限运行终端后重试。");
  } else {
    console.log("\n如果提示权限不足，请提权后重试，例如:");
    console.log("sudo node fix-codium.js");
  }
}

main().catch((error) => {
  console.error(`✘ ${error.message}`);
  process.exit(1);
});
