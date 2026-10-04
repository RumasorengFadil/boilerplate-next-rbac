// Local operational scripts only. Unlike the test loader, this never mocks auth or Next APIs.
import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import ts from "typescript";

registerHooks({
  resolve(specifier, context, next) {
    let base;
    if (specifier.startsWith("@/")) base = path.join(process.cwd(), "src", specifier.slice(2));
    else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    if (base) for (const candidate of [base + ".ts", base + ".tsx", path.join(base, "index.ts")])
      if (existsSync(candidate)) return { url: pathToFileURL(candidate).href, shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    if (/\.tsx?$/.test(url)) return { format: "module", source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText, shortCircuit: true };
    return next(url, context);
  },
});
