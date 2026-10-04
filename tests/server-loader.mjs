import { registerHooks } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import ts from "typescript";
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return { url: "data:text/javascript,export {}", shortCircuit: true };
    if (specifier === "next/og") return next("next/og.js", context);
    if (["next/link", "next/image"].includes(specifier)) return next(specifier + ".js", context);
    if (specifier === "next/headers") return { url: 'data:text/javascript,export async function cookies(){return {get(name){const value=name==="session"?globalThis.__phase2TestCookie:globalThis.__phase2SubmissionCookie;return value?{value}:undefined},set(name,value){if(name==="public_submission")globalThis.__phase2SubmissionCookie=value}}};export async function headers(){return new Headers({"x-forwarded-for":globalThis.__phase2TestIp||"127.0.0.1"})}', shortCircuit: true };
    if (specifier === "next/cache") return { url: "data:text/javascript,export function revalidatePath(){};export function updateTag(){globalThis.__portfolioCache?.clear()};export function unstable_cache(fn,keys){return async(...args)=>{const cache=globalThis.__portfolioCache;if(!cache)return fn(...args);const key=JSON.stringify([keys,args]);if(!cache.has(key))cache.set(key,await fn(...args));return cache.get(key)}}", shortCircuit: true };
    if (specifier === "next/navigation") return { url: 'data:text/javascript,export function redirect(){throw new Error("Unauthorized")};export function notFound(){throw new Error("Not found")}', shortCircuit: true };
    let base;
    if (specifier.startsWith("@/")) base = path.join(process.cwd(), "src", specifier.slice(2));
    else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    if (base) for (const candidate of [base+".ts",base+".tsx",path.join(base,"index.ts")]) if (existsSync(candidate)) return { url: pathToFileURL(candidate).href, shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    if (/\.tsx?$/.test(url)) return { format: "module", source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, shortCircuit: true };
    return next(url, context);
  },
});
